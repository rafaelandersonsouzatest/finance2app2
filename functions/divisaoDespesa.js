// functions/divisaoDespesa.js
// Colaboração entre Usuários — Divisão de despesa (Etapa 3, ver
// COLABORACAO_ARQUITETURA_V1.md seções 2, 2.1, 4, 5, 6.1, 11.1). Etapa 3.1:
// criarDivisaoDespesa, do zero e a partir de um gasto já existente (3.5), só
// entre conexões já aceitas — sem participante sem conta, sem UI ainda.
// Etapa 3.2: aceitarConviteDivisao/recusarConviteDivisao. Etapa 3.3:
// cancelarConviteDivisao. Etapa 3.4: atualizarDivisaoDespesa. Etapa 3.6
// (2026-08-14, seção 11.1): soft delete (`status: 'ativa'|'encerrada'`) +
// encerrarCompartilhamento, disparado por um teste manual que encontrou uma
// divisão órfã (gasto original excluído, convite continuava aceitável).
// Etapa 3.7 (2026-08-17, seção 11.3): modelo de "valor sem destino" —
// cancelar um convite pendente nunca decide sozinho o destino do valor
// (`cancelarConviteDivisao` ganha `destino` opcional; sem ele, o valor
// acumula em `valorSemDestinoCentavos` até `resolverValorSemDestino`).
// `encerrarCompartilhamento` é a exceção: devolve tudo automaticamente pro
// criador, porque não sobra divisão nenhuma pra decidir depois.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { registrarEvento } = require("./registrarEvento");
const { diasDesde, EXPIRACAO_PENDENTE_DIAS } = require("./tempoUtil");

const db = getFirestore();

function hojeISO() {
  const agora = new Date();
  const yyyy = agora.getFullYear();
  const mm = String(agora.getMonth() + 1).padStart(2, "0");
  const dd = String(agora.getDate()).padStart(2, "0");
  return { iso: `${yyyy}-${mm}-${dd}`, mes: agora.getMonth() + 1, ano: yyyy };
}

// Troca o status (e opcionalmente outros campos, ex.: `gastoId` no aceite)
// de uma única cota dentro do array `cotas[]` da despesaCompartilhada —
// Firestore não tem "update de elemento por índice" em array, então lemos o
// array inteiro e gravamos de volta (dentro de uma transação, para não
// perder a atualização de outro participante respondendo ao mesmo tempo —
// ver ARQUITETURA.md seção 8 sobre `runTransaction` em cenários de
// concorrência).
function atualizarStatusCota(cotas, participanteId, novoStatus, extra = {}) {
  return (cotas || []).map((cota) =>
    cota.participanteId === participanteId ? { ...cota, status: novoStatus, ...extra } : cota
  );
}

// Id do GASTO de um participante específico dentro de uma despesaCompartilhada
// já carregada — `null` enquanto ele ainda não tiver gasto próprio (pendente,
// ou recusou/cancelou antes de aceitar). Único mecanismo pra localizar o
// gasto de qualquer lado (criador ou convidado) sem query entre contas — ver
// seção 11.1 (substitui o antigo campo solto `gastoCriadorId`).
function gastoIdDoParticipante(despesa, participanteId) {
  const cota = (despesa.cotas || []).find((c) => c.participanteId === participanteId);
  return cota?.gastoId || null;
}

// Valida o formato de um `destino` (seção 11.3) — não valida se o
// participante referido existe/está pendente, isso depende do estado atual
// das cotas e é checado dentro de `aplicarDestino`.
function validarDestino(destino) {
  if (!destino || typeof destino !== "object") {
    throw new HttpsError("invalid-argument", "Destino inválido.");
  }
  if (destino.tipo === "participante") {
    if (typeof destino.participanteId !== "string" || !destino.participanteId.trim()) {
      throw new HttpsError("invalid-argument", "Participante do destino inválido.");
    }
    return;
  }
  // Destinar a alguém que AINDA NÃO faz parte da divisão (2026-08-17) — cria
  // um convite novo pra essa pessoa, com o valor todo. Diferente de
  // "participante" acima (que só atribui a quem já está `pendente` na mesma
  // divisão). Nunca pra quem já aceitou (mudar a cota de quem já aceitou
  // sempre passa por `proporAlteracaoCota`, nunca por aqui).
  if (destino.tipo === "novoParticipante") {
    const ehMembro = typeof destino.membroId === "string" && destino.membroId.trim();
    const ehUsuario = typeof destino.uidParticipante === "string" && destino.uidParticipante.trim();
    if (!ehMembro && !ehUsuario) {
      throw new HttpsError("invalid-argument", "Informe uma pessoa para o novo destino.");
    }
    return;
  }
  if (destino.tipo !== "criador" && destino.tipo !== "redistribuir") {
    throw new HttpsError("invalid-argument", "Destino inválido.");
  }
}

// Resolve (com leituras — precisa rodar ANTES de qualquer escrita da
// transação que a chamar) quem é o novo participante de um destino
// `{tipo: 'novoParticipante'}` — conexão com conta (ganha convite normal) ou
// Membro sem conta (entra direto confirmado). Rejeita se a pessoa já fizer
// parte da divisão (usar "participante"/proposta pra isso, não este).
async function resolverNovoParticipante(tx, meuUid, destino, despesa) {
  const ehMembro = typeof destino.membroId === "string" && destino.membroId.trim();
  const id = ehMembro ? destino.membroId : destino.uidParticipante;

  if ((despesa.cotas || []).some((c) => c.participanteId === id)) {
    throw new HttpsError(
      "invalid-argument",
      "Esta pessoa já faz parte da divisão — use outro destino."
    );
  }

  if (ehMembro) {
    const membroSnap = await tx.get(db.doc(`users/${meuUid}/membros/${id}`));
    if (!membroSnap.exists) {
      throw new HttpsError("not-found", "Membro não encontrado.");
    }
    return { ehMembro: true, id, nome: membroSnap.data().nome || "" };
  }

  const conexaoSnap = await tx.get(
    db
      .collection(`users/${meuUid}/conexoes`)
      .where("usuarioConectadoId", "==", id)
      .where("status", "==", "aceita")
  );
  if (conexaoSnap.empty) {
    throw new HttpsError("failed-precondition", "Só é possível destinar a uma conexão já aceita.");
  }
  const perfilSnap = await tx.get(db.doc(`users/${id}`));
  if (!perfilSnap.exists) {
    throw new HttpsError("not-found", "Participante não encontrado.");
  }
  const perfil = perfilSnap.data() || {};
  return { ehMembro: false, id, nome: perfil.apelido || perfil.nome || "" };
}

// Grava o convite (só se com conta) + eventos de Linha do Tempo de um novo
// participante criado a partir de um destino `novoParticipante` — chamado
// depois de já ter as leituras resolvidas (`resolverNovoParticipante`) e a
// cota nova já incluída em `cotas` pelo chamador.
function registrarNovoParticipanteDestino(tx, { eventoId, meuUid, meuNome, despesa, resolvido, valorCentavos }) {
  if (!resolvido.ehMembro) {
    tx.set(db.doc(`users/${resolvido.id}/convitesDeDivisao/${eventoId}`), {
      eventoId,
      deUsuarioId: meuUid,
      deNome: meuNome,
      descricao: despesa.descricao,
      minhaCotaCentavos: valorCentavos,
      status: "pendente",
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    registrarEvento(tx, `users/${resolvido.id}`, {
      acao: "convite_recebido",
      entidade: "divisaoDespesa",
      entidadeId: eventoId,
      participantes: [{ uid: meuUid, nome: meuNome }],
      origem: { agente: "usuario", canal: "valor_sem_destino" },
      usuarioId: meuUid,
    });
  }
  registrarEvento(tx, `users/${meuUid}`, {
    acao: "participante_adicionado",
    entidade: "divisaoDespesa",
    entidadeId: gastoIdDoParticipante(despesa, meuUid) || eventoId,
    participantes: [{ uid: resolvido.id, nome: resolvido.nome }],
    origem: { agente: "usuario", canal: "valor_sem_destino" },
    usuarioId: meuUid,
  });
}

// Aplica um `destino` (seção 11.3) a um valor em centavos que ficou "sem
// destino" (de um cancelamento) — nunca toca em cota `aceito` (regra "cada
// um dono da própria cópia", seção 11). Devolve o array de cotas atualizado
// e a lista de quem teve o próprio valor alterado (`afetados`), pra quem
// chama saber quais gastos/convites precisa atualizar e quais eventos
// registrar na Linha do Tempo.
function aplicarDestino(cotas, destino, valorCentavos, meuUid) {
  if (!(valorCentavos > 0)) {
    return { cotas, afetados: [] };
  }

  if (destino.tipo === "criador") {
    const novoValorCriador = (cotas.find((c) => c.participanteId === meuUid)?.valorCentavos || 0) + valorCentavos;
    const novasCotas = cotas.map((c) =>
      c.participanteId === meuUid ? { ...c, valorCentavos: novoValorCriador } : c
    );
    return { cotas: novasCotas, afetados: [{ participanteId: meuUid, novoValorCentavos: novoValorCriador }] };
  }

  if (destino.tipo === "participante") {
    const alvo = cotas.find(
      (c) => c.participanteId === destino.participanteId && c.status === "pendente"
    );
    if (!alvo) {
      throw new HttpsError(
        "invalid-argument",
        "Só é possível atribuir a um participante ainda pendente nesta divisão."
      );
    }
    const novoValorAlvo = alvo.valorCentavos + valorCentavos;
    const novasCotas = cotas.map((c) =>
      c.participanteId === destino.participanteId ? { ...c, valorCentavos: novoValorAlvo } : c
    );
    return {
      cotas: novasCotas,
      afetados: [{ participanteId: destino.participanteId, novoValorCentavos: novoValorAlvo }],
    };
  }

  if (destino.tipo === "redistribuir") {
    const pendentes = cotas.filter((c) => c.status === "pendente");
    if (pendentes.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "Não há participantes pendentes para redistribuir — escolha outro destino."
      );
    }

    // Duas formas de repartir (seção 11.3, 2026-08-17): em partes iguais
    // (padrão original) ou proporcional ao que cada pendente já tinha —
    // nos dois casos, o resto da divisão por arredondamento (que nunca pode
    // simplesmente desaparecer) vai pro criador.
    const partesPorId = new Map();
    if (destino.proporcional) {
      const somaPendentes = pendentes.reduce((soma, c) => soma + c.valorCentavos, 0);
      for (const c of pendentes) {
        partesPorId.set(c.participanteId, Math.floor((valorCentavos * c.valorCentavos) / somaPendentes));
      }
    } else {
      const parteIgual = Math.floor(valorCentavos / pendentes.length);
      for (const c of pendentes) {
        partesPorId.set(c.participanteId, parteIgual);
      }
    }
    const distribuido = [...partesPorId.values()].reduce((soma, v) => soma + v, 0);
    const resto = valorCentavos - distribuido;

    const afetados = [];
    let novasCotas = cotas.map((c) => {
      if (!partesPorId.has(c.participanteId)) return c;
      const novoValor = c.valorCentavos + partesPorId.get(c.participanteId);
      afetados.push({ participanteId: c.participanteId, novoValorCentavos: novoValor });
      return { ...c, valorCentavos: novoValor };
    });

    if (resto > 0) {
      const cotaCriadorAtual = novasCotas.find((c) => c.participanteId === meuUid);
      const novoValorCriador = (cotaCriadorAtual?.valorCentavos || 0) + resto;
      novasCotas = novasCotas.map((c) =>
        c.participanteId === meuUid ? { ...c, valorCentavos: novoValorCriador } : c
      );
      const jaAfetado = afetados.find((a) => a.participanteId === meuUid);
      if (jaAfetado) {
        jaAfetado.novoValorCentavos = novoValorCriador;
      } else {
        afetados.push({ participanteId: meuUid, novoValorCentavos: novoValorCriador });
      }
    }

    return { cotas: novasCotas, afetados };
  }

  throw new HttpsError("invalid-argument", "Destino inválido.");
}

// Registra, dos dois lados, o evento de Linha do Tempo de uma resolução de
// valor "sem destino" (seção 11.3) — reaproveita a `acao: 'redistribuido'`
// que já existe (ícone `swap-horizontal`, hoje usado em exclusão de parcela
// de cartão/empréstimo).
function registrarEventosRedistribuicao(tx, { eventoId, meuUid, meuNome, afetados, cotasAntes, canal }) {
  const outrosAfetados = afetados.filter((a) => a.participanteId !== meuUid);

  registrarEvento(tx, `users/${meuUid}`, {
    acao: "redistribuido",
    entidade: "divisaoDespesa",
    entidadeId: gastoIdDoParticipante({ cotas: cotasAntes }, meuUid) || eventoId,
    participantes: outrosAfetados.map((a) => {
      const cota = cotasAntes.find((c) => c.participanteId === a.participanteId);
      return { uid: a.participanteId, nome: cota?.nomeExibicao || "" };
    }),
    origem: { agente: "usuario", canal },
    usuarioId: meuUid,
  });

  for (const a of outrosAfetados) {
    registrarEvento(tx, `users/${a.participanteId}`, {
      acao: "redistribuido",
      entidade: "divisaoDespesa",
      entidadeId: eventoId,
      participantes: [{ uid: meuUid, nome: meuNome }],
      origem: { agente: "usuario", canal },
      usuarioId: meuUid,
    });
  }
}

exports.criarDivisaoDespesa = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { descricao, cotas, origemLancamentoId, dataVencimento } = request.data || {};
  let { valorTotalCentavos } = request.data || {};

  if (typeof descricao !== "string" || !descricao.trim()) {
    throw new HttpsError("invalid-argument", "Descrição é obrigatória.");
  }
  if (!Array.isArray(cotas) || cotas.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Informe pelo menos um participante além de você."
    );
  }

  // Compartilhar um gasto já existente (Etapa 3.5, seção 4/6.1) — o valor
  // total nunca vem do cliente nesse caso, é sempre derivado do gasto real
  // (nunca confia no que o cliente afirma sobre dinheiro). `gastoExistente`
  // fica null quando a despesa nasce do zero.
  let gastoExistente = null;
  let gastoExistenteRef = null;
  if (origemLancamentoId) {
    if (typeof origemLancamentoId !== "string" || !origemLancamentoId.trim()) {
      throw new HttpsError("invalid-argument", "Gasto de origem inválido.");
    }
    gastoExistenteRef = db.doc(`users/${meuUid}/gastos/${origemLancamentoId}`);
    const gastoSnap = await gastoExistenteRef.get();
    if (!gastoSnap.exists) {
      throw new HttpsError("not-found", "Gasto de origem não encontrado.");
    }
    gastoExistente = gastoSnap.data();
    if (gastoExistente.compartilhamentoId) {
      // Um gasto só pode ter UMA divisão ATIVA por vez (seção 6.1) — mas
      // depois que ela é encerrada, compartilhar de novo cria uma divisão
      // NOVA (decisão 2026-08-17): o `compartilhamentoId` do gasto passa a
      // apontar pra essa nova, a antiga continua existindo (soft delete,
      // histórico preservado, seção 11.1) só sem mais nenhuma referência
      // direta do gasto.
      const despesaAnteriorSnap = await db
        .doc(`users/${meuUid}/despesasCompartilhadas/${gastoExistente.compartilhamentoId}`)
        .get();
      if (despesaAnteriorSnap.exists && despesaAnteriorSnap.data().status !== "encerrada") {
        throw new HttpsError(
          "failed-precondition",
          "Este gasto já foi compartilhado antes."
        );
      }
    }
    valorTotalCentavos = Math.round((gastoExistente.valor || 0) * 100);
  }

  if (!Number.isInteger(valorTotalCentavos) || valorTotalCentavos <= 0) {
    throw new HttpsError("invalid-argument", "Valor total inválido.");
  }

  // Valida formato de cada cota e soma o que não é do criador — nunca
  // aceita a cota do próprio criador no array (ela é sempre calculada, ver
  // seção 5 da arquitetura). Cada cota é OU uma conexão com conta
  // (`uidParticipante`) OU um Membro sem conta (`membroId`, seção 7) — nunca
  // os dois.
  let somaOutros = 0;
  const idsVistos = new Set();
  for (const cota of cotas) {
    const ehMembro = typeof cota?.membroId === "string" && cota.membroId.trim();
    const ehUsuario = typeof cota?.uidParticipante === "string" && cota.uidParticipante.trim();
    if (!ehMembro && !ehUsuario) {
      throw new HttpsError("invalid-argument", "Participante inválido.");
    }
    if (ehUsuario && cota.uidParticipante === meuUid) {
      throw new HttpsError(
        "invalid-argument",
        "Não inclua sua própria cota — ela é calculada automaticamente."
      );
    }
    const chave = ehMembro ? `membro:${cota.membroId}` : `usuario:${cota.uidParticipante}`;
    if (idsVistos.has(chave)) {
      throw new HttpsError("invalid-argument", "Participante duplicado.");
    }
    idsVistos.add(chave);

    if (!Number.isInteger(cota.valorCentavos) || cota.valorCentavos <= 0) {
      throw new HttpsError(
        "invalid-argument",
        "Cada cota precisa ser um valor em centavos maior que zero."
      );
    }
    somaOutros += cota.valorCentavos;
  }

  // Cota do criador pode ser zero, nunca negativa (seção 5, 2026-08-14).
  const minhaCotaCentavos = valorTotalCentavos - somaOutros;
  if (minhaCotaCentavos < 0) {
    throw new HttpsError(
      "invalid-argument",
      "A soma das cotas dos participantes não pode passar do valor total."
    );
  }

  const meuPerfilSnap = await db.doc(`users/${meuUid}`).get();
  const meuPerfil = meuPerfilSnap.data() || {};
  const meuNome = meuPerfil.apelido || meuPerfil.nome || "";

  // Cada participante com conta precisa ser, de fato, uma conexão já aceita
  // do chamador — nunca confia só no que o cliente afirma (seção 2). Um
  // Membro sem conta (seção 7) só precisa existir na própria conta do
  // criador — não é uma "conexão", é um registro informativo dele mesmo.
  const participantes = [];
  const membrosParticipantes = [];
  for (const cota of cotas) {
    if (cota.membroId) {
      const membroSnap = await db.doc(`users/${meuUid}/membros/${cota.membroId}`).get();
      if (!membroSnap.exists) {
        throw new HttpsError("not-found", "Membro não encontrado.");
      }
      membrosParticipantes.push({
        membroId: cota.membroId,
        nome: membroSnap.data().nome || "",
        valorCentavos: cota.valorCentavos,
      });
      continue;
    }

    const conexaoSnap = await db
      .collection(`users/${meuUid}/conexoes`)
      .where("usuarioConectadoId", "==", cota.uidParticipante)
      .where("status", "==", "aceita")
      .get();
    if (conexaoSnap.empty) {
      throw new HttpsError(
        "failed-precondition",
        "Todos os participantes precisam ser conexões já aceitas."
      );
    }

    const perfilSnap = await db.doc(`users/${cota.uidParticipante}`).get();
    if (!perfilSnap.exists) {
      throw new HttpsError("not-found", "Participante não encontrado.");
    }
    const perfil = perfilSnap.data() || {};

    participantes.push({
      uid: cota.uidParticipante,
      nome: perfil.apelido || perfil.nome || "",
      avatarSnapshot: perfil.avatarUrl || null,
      valorCentavos: cota.valorCentavos,
    });
  }

  const descricaoFinal = descricao.trim();
  const { iso: vencimentoPadrao, mes, ano } = hojeISO();
  const dataFinal =
    typeof dataVencimento === "string" && dataVencimento.trim()
      ? dataVencimento.trim()
      : vencimentoPadrao;

  const batch = db.batch();

  const eventoRef = db.collection(`users/${meuUid}/despesasCompartilhadas`).doc();
  const eventoId = eventoRef.id;

  // Gasto da cota do próprio criador — decidido aqui, antes de gravar
  // `despesaCompartilhada`, porque o id precisa ir junto na própria cota do
  // criador (`cotas[].gastoId`, seção 11.1). Do zero (seção 5): ainda não
  // existe, ganha um id novo. A partir de um gasto já existente (seção
  // 4/3.5): é o próprio `gastoExistenteRef`.
  const gastoRef = gastoExistente
    ? gastoExistenteRef
    : db.collection(`users/${meuUid}/gastos`).doc();
  const gastoId = gastoRef.id;

  const cotasFinal = [
    {
      participanteTipo: "usuario",
      participanteId: meuUid,
      nomeExibicao: meuNome,
      valorCentavos: minhaCotaCentavos,
      status: "aceito",
      // Criador já tem gasto próprio desde a criação — nunca fica `null`
      // (diferente de um participante convidado, que só ganha o dele se
      // aceitar). Ver seção 11.1: mesmo campo serve pros dois lados.
      gastoId,
    },
    ...participantes.map((p) => ({
      participanteTipo: "usuario",
      participanteId: p.uid,
      nomeExibicao: p.nome,
      valorCentavos: p.valorCentavos,
      status: "pendente",
      gastoId: null,
    })),
    // Membro sem conta (seção 7) — nasce direto "aceito": não existe convite
    // nem ninguém pra responder, é só um registro informativo do próprio
    // criador. Nunca tem `gastoId` (não tem conta pra ter um gasto próprio).
    ...membrosParticipantes.map((m) => ({
      participanteTipo: "membroSemConta",
      participanteId: m.membroId,
      nomeExibicao: m.nome,
      valorCentavos: m.valorCentavos,
      status: "aceito",
      gastoId: null,
    })),
  ];

  batch.set(eventoRef, {
    descricao: descricaoFinal,
    valorTotalCentavos,
    criadoPor: meuUid,
    // Soft delete (seção 11.1) — nunca apaga o documento fisicamente, só
    // marca 'encerrada'. `encerrarCompartilhamento` é o único jeito de virar
    // 'encerrada'.
    status: "ativa",
    // Soma acumulada de valor cancelado ainda sem decisão do criador (seção
    // 11.3) — nunca decidido automaticamente; fica aqui até `destino` ser
    // informado (no próprio cancelamento ou depois, via
    // `resolverValorSemDestino`).
    valorSemDestinoCentavos: 0,
    origemLancamentoId: origemLancamentoId || null,
    cotas: cotasFinal,
    criadoEm: FieldValue.serverTimestamp(),
  });

  // Gasto da cota do próprio criador. Do zero (seção 5): nasce agora,
  // atomicamente, sem passo extra, e ganha seu próprio evento de "criado"
  // (nunca existiu antes). A partir de um gasto já existente (seção 4/3.5):
  // só ganha `compartilhamentoId` — o gasto e o evento de criação dele já
  // existiam, então NÃO emitimos "criado" de novo (ver seção 2.1: criação e
  // compartilhamento são sempre eventos separados, cada um só uma vez).
  if (gastoExistente) {
    // O gasto do criador precisa refletir a PRÓPRIA cota, não o valor total
    // da compra — mesma regra já aplicada ao gasto novo no branch "do zero"
    // abaixo (bug encontrado em teste manual, 2026-08-14: o valor ficava
    // intocado no valor original inteiro).
    batch.update(gastoExistenteRef, {
      valor: minhaCotaCentavos / 100,
      compartilhamentoId: eventoId,
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  } else {
    batch.set(gastoRef, {
      descricao: descricaoFinal,
      valor: minhaCotaCentavos / 100,
      categoriaId: null,
      categoria: null,
      dataVencimento: dataFinal,
      mes,
      ano,
      pago: false,
      compartilhamentoId: eventoId,
      criadoEm: FieldValue.serverTimestamp(),
    });

    registrarEvento(batch, `users/${meuUid}`, {
      acao: "criado",
      entidade: "gasto",
      entidadeId: gastoId,
      origem: { agente: "usuario", canal: "divisao_despesa" },
      usuarioId: meuUid,
    });
  }

  registrarEvento(batch, `users/${meuUid}`, {
    acao: "compartilhado",
    entidade: "divisaoDespesa",
    // `entidadeId` é o do GASTO do criador (não o desta despesaCompartilhada)
    // — a Linha do Tempo de um item busca por `entidadeId === item.id` (ver
    // useLinhaDoTempo.js `buscarEventosDoItem`), então só assim este evento
    // aparece no histórico do próprio gasto.
    entidadeId: gastoId,
    participantes: [
      ...participantes.map((p) => ({ uid: p.uid, nome: p.nome })),
      ...membrosParticipantes.map((m) => ({ uid: m.membroId, nome: m.nome })),
    ],
    origem: { agente: "usuario", canal: "criacao" },
    usuarioId: meuUid,
  });

  // Convite-espelho + evento de "convite recebido" só para participantes COM
  // conta — Membro sem conta nunca ganha convite (seção 7).
  for (const p of participantes) {
    const conviteRef = db.doc(`users/${p.uid}/convitesDeDivisao/${eventoId}`);
    batch.set(conviteRef, {
      eventoId,
      deUsuarioId: meuUid,
      deNome: meuNome,
      descricao: descricaoFinal,
      minhaCotaCentavos: p.valorCentavos,
      status: "pendente",
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // Aqui `entidadeId` fica com o id da própria despesaCompartilhada
    // (`eventoId`), não de um gasto — o participante ainda não tem gasto
    // nenhum atrelado a este convite (só ganha um se aceitar, ver
    // responderConviteDivisao). Este evento não aparece em nenhuma tela hoje
    // (não há Linha do Tempo global ainda), fica gravado para quando houver.
    registrarEvento(batch, `users/${p.uid}`, {
      acao: "convite_recebido",
      entidade: "divisaoDespesa",
      entidadeId: eventoId,
      participantes: [{ uid: meuUid, nome: meuNome }],
      origem: { agente: "usuario", canal: "criacao" },
      usuarioId: meuUid,
    });
  }

  await batch.commit();

  return { ok: true, eventoId, gastoId, minhaCotaCentavos };
});

// Núcleo compartilhado por aceitar/recusar — ver seção 2.1 da arquitetura
// para o desenho completo dos eventos de Linha do Tempo.
async function responderConviteDivisao(meuUid, eventoId, aceitar) {
  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Convite inválido.");
  }

  const conviteRef = db.doc(`users/${meuUid}/convitesDeDivisao/${eventoId}`);
  const conviteSnap = await conviteRef.get();
  if (!conviteSnap.exists) {
    throw new HttpsError("not-found", "Convite não encontrado.");
  }
  const convite = conviteSnap.data();
  if (convite.status !== "pendente") {
    throw new HttpsError("failed-precondition", "Este convite já foi respondido.");
  }

  const criadorUid = convite.deUsuarioId;
  const despesaRef = db.doc(`users/${criadorUid}/despesasCompartilhadas/${eventoId}`);

  // Expiração "preguiçosa" (mesmo critério de solicitarConexao) — se
  // detectada, grava a expiração como sua própria operação atômica (não
  // dentro da transação principal: lançar erro depois de `tx.update` desfaz
  // TUDO na transação, então a marcação de expirado precisa ser uma
  // operação própria, comitada antes de informar o erro).
  if (diasDesde(convite.criadoEm) > EXPIRACAO_PENDENTE_DIAS) {
    const despesaSnapExpira = await despesaRef.get();
    const batchExpira = db.batch();
    batchExpira.update(conviteRef, {
      status: "expirado",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    if (despesaSnapExpira.exists) {
      batchExpira.update(despesaRef, {
        cotas: atualizarStatusCota(despesaSnapExpira.data().cotas, meuUid, "expirado"),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }
    await batchExpira.commit();
    throw new HttpsError("failed-precondition", "Este convite expirou.");
  }

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    if (despesa.status === "encerrada") {
      throw new HttpsError("failed-precondition", "Esta despesa foi encerrada.");
    }
    const minhaCota = (despesa.cotas || []).find((c) => c.participanteId === meuUid);
    const meuNome = minhaCota?.nomeExibicao || "";

    const novoStatus = aceitar ? "aceito" : "recusado";

    let gastoId = null;
    if (aceitar) {
      const gastoRef = db.collection(`users/${meuUid}/gastos`).doc();
      gastoId = gastoRef.id;
      const { iso, mes, ano } = hojeISO();
      tx.set(gastoRef, {
        descricao: convite.descricao,
        valor: convite.minhaCotaCentavos / 100,
        categoriaId: null,
        categoria: null,
        dataVencimento: iso,
        mes,
        ano,
        pago: false,
        origemCompartilhamento: { eventoId, deUsuarioId: criadorUid },
        criadoEm: FieldValue.serverTimestamp(),
      });

      registrarEvento(tx, `users/${meuUid}`, {
        acao: "criado",
        entidade: "gasto",
        entidadeId: gastoId,
        origem: { agente: "usuario", canal: "divisao_despesa" },
        usuarioId: meuUid,
      });
    }

    tx.update(conviteRef, { status: novoStatus, atualizadoEm: FieldValue.serverTimestamp() });
    tx.update(despesaRef, {
      cotas: atualizarStatusCota(despesa.cotas, meuUid, novoStatus, { gastoId }),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // `entidadeId` de cada lado aponta pro gasto de quem É DONO da timeline
    // que está recebendo o evento (não pro id da despesaCompartilhada) — só
    // assim ele aparece na Linha do Tempo daquele gasto (ver
    // useLinhaDoTempo.js `buscarEventosDoItem`). Quem aceita ganha um gasto
    // agora mesmo (`gastoId` acima); quem recusa nunca chega a ter um, então
    // fica com `eventoId` mesmo (evento gravado, sem tela pra mostrá-lo
    // ainda). O criador sempre tem gasto próprio desde a criação (ver
    // `gastoIdDoParticipante`, seção 11.1).
    const acaoEvento = aceitar ? "convite_aceito" : "convite_recusado";
    registrarEvento(tx, `users/${meuUid}`, {
      acao: acaoEvento,
      entidade: "divisaoDespesa",
      entidadeId: aceitar ? gastoId : eventoId,
      participantes: [{ uid: criadorUid, nome: convite.deNome }],
      origem: { agente: "usuario", canal: "resposta" },
      usuarioId: meuUid,
    });
    registrarEvento(tx, `users/${criadorUid}`, {
      acao: acaoEvento,
      entidade: "divisaoDespesa",
      entidadeId: gastoIdDoParticipante(despesa, criadorUid) || eventoId,
      participantes: [{ uid: meuUid, nome: meuNome }],
      origem: { agente: "usuario", canal: "resposta" },
      usuarioId: meuUid,
    });

    return { ok: true, status: novoStatus, gastoId };
  });
}

exports.aceitarConviteDivisao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }
  return responderConviteDivisao(request.auth.uid, request.data?.eventoId, true);
});

exports.recusarConviteDivisao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }
  return responderConviteDivisao(request.auth.uid, request.data?.eventoId, false);
});

// Etapa 3.3 — só quem criou a divisão pode cancelar, e só um convite ainda
// `pendente` (seção 10 da arquitetura). Depois de aceito, não é mais
// cancelável — isso é a Etapa 3.4 (trava simples de edição) que impede, não
// esta Function.
exports.cancelarConviteDivisao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { eventoId, uidParticipante, destino } = request.data || {};

  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Divisão inválida.");
  }
  if (typeof uidParticipante !== "string" || !uidParticipante.trim()) {
    throw new HttpsError("invalid-argument", "Participante inválido.");
  }
  // `destino` é opcional aqui (seção 11.3) — se vier, resolve o valor na
  // hora; se não vier, o valor fica "sem destino" até uma decisão posterior
  // via `resolverValorSemDestino`.
  if (destino !== undefined && destino !== null) {
    validarDestino(destino);
  }

  const despesaRef = db.doc(`users/${meuUid}/despesasCompartilhadas/${eventoId}`);
  const conviteRef = db.doc(`users/${uidParticipante}/convitesDeDivisao/${eventoId}`);

  const conviteSnapPre = await conviteRef.get();
  if (!conviteSnapPre.exists) {
    throw new HttpsError("not-found", "Convite não encontrado.");
  }
  const convitePre = conviteSnapPre.data();
  if (convitePre.deUsuarioId !== meuUid) {
    throw new HttpsError(
      "failed-precondition",
      "Só quem criou a divisão pode cancelar um convite."
    );
  }
  if (convitePre.status !== "pendente") {
    throw new HttpsError("failed-precondition", "Este convite já foi respondido ou cancelado.");
  }

  // Mesmo cuidado de responderConviteDivisao: a marcação de expirado precisa
  // ser uma operação própria, comitada antes de informar o erro — lançar
  // dentro de uma transação desfaz tudo, inclusive a marcação.
  if (diasDesde(convitePre.criadoEm) > EXPIRACAO_PENDENTE_DIAS) {
    const despesaSnapExpira = await despesaRef.get();
    const batchExpira = db.batch();
    batchExpira.update(conviteRef, {
      status: "expirado",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    if (despesaSnapExpira.exists) {
      batchExpira.update(despesaRef, {
        cotas: atualizarStatusCota(despesaSnapExpira.data().cotas, uidParticipante, "expirado"),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }
    await batchExpira.commit();
    throw new HttpsError("failed-precondition", "Este convite já havia expirado.");
  }

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    const cotaParticipante = (despesa.cotas || []).find((c) => c.participanteId === uidParticipante);
    const cotaCriador = (despesa.cotas || []).find((c) => c.participanteId === meuUid);
    const valorLiberado = cotaParticipante?.valorCentavos || 0;

    // Se o destino é uma pessoa NOVA (ainda não faz parte da divisão), as
    // leituras pra resolvê-la precisam acontecer AGORA — antes de qualquer
    // escrita nesta transação (regra do Firestore: toda leitura antes de
    // qualquer escrita).
    const novoParticipanteResolvido =
      destino?.tipo === "novoParticipante"
        ? await resolverNovoParticipante(tx, meuUid, destino, despesa)
        : null;

    tx.update(conviteRef, { status: "cancelado", atualizadoEm: FieldValue.serverTimestamp() });

    // `valorCentavos` da cota cancelada zera — o valor real passa a viver ou
    // numa cota diferente (via `destino`) ou em `valorSemDestinoCentavos`
    // (seção 11.3); sem zerar aqui, `atualizarDivisaoDespesa` contaria esse
    // valor duas vezes ao somar `naoPendentes`.
    let cotasAtualizadas = atualizarStatusCota(despesa.cotas, uidParticipante, "cancelado", {
      valorCentavos: 0,
    });
    let novoValorSemDestino = despesa.valorSemDestinoCentavos || 0;
    let afetados = [];

    // Seção 11.3 — cancelar nunca decide o destino do valor por conta
    // própria. Se `destino` vier preenchido, resolve na hora (mesma
    // transação); se não vier, o valor só se acumula em
    // `valorSemDestinoCentavos`, aguardando uma decisão via
    // `resolverValorSemDestino`.
    if (novoParticipanteResolvido) {
      cotasAtualizadas = [
        ...cotasAtualizadas,
        {
          participanteTipo: novoParticipanteResolvido.ehMembro ? "membroSemConta" : "usuario",
          participanteId: novoParticipanteResolvido.id,
          nomeExibicao: novoParticipanteResolvido.nome,
          valorCentavos: valorLiberado,
          status: novoParticipanteResolvido.ehMembro ? "aceito" : "pendente",
          gastoId: null,
        },
      ];
    } else if (destino) {
      const resultado = aplicarDestino(cotasAtualizadas, destino, valorLiberado, meuUid);
      cotasAtualizadas = resultado.cotas;
      afetados = resultado.afetados;
    } else {
      novoValorSemDestino += valorLiberado;
    }

    tx.update(despesaRef, {
      cotas: cotasAtualizadas,
      valorSemDestinoCentavos: novoValorSemDestino,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    for (const a of afetados) {
      if (a.participanteId === meuUid) {
        const gastoCriadorId = gastoIdDoParticipante(despesa, meuUid);
        if (gastoCriadorId) {
          tx.update(db.doc(`users/${meuUid}/gastos/${gastoCriadorId}`), {
            valor: a.novoValorCentavos / 100,
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        }
      } else {
        // Só participante ainda `pendente` pode ser afetado por um destino
        // (ver `aplicarDestino`) — nunca tem gasto próprio ainda, só o
        // convite-espelho precisa refletir o valor novo.
        tx.update(db.doc(`users/${a.participanteId}/convitesDeDivisao/${eventoId}`), {
          minhaCotaCentavos: a.novoValorCentavos,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
    }

    // `meuUid` é sempre o criador nesta Function (só ele pode cancelar) — tem
    // gasto próprio desde a criação. `uidParticipante` nunca chegou a ter
    // gasto (só cancela convite ainda `pendente`), então fica com `eventoId`
    // (mesmo raciocínio de responderConviteDivisao acima).
    registrarEvento(tx, `users/${meuUid}`, {
      acao: "convite_cancelado",
      entidade: "divisaoDespesa",
      entidadeId: gastoIdDoParticipante(despesa, meuUid) || eventoId,
      participantes: [{ uid: uidParticipante, nome: cotaParticipante?.nomeExibicao || "" }],
      origem: { agente: "usuario", canal: "cancelamento" },
      usuarioId: meuUid,
    });
    registrarEvento(tx, `users/${uidParticipante}`, {
      acao: "convite_cancelado",
      entidade: "divisaoDespesa",
      entidadeId: eventoId,
      participantes: [{ uid: meuUid, nome: cotaCriador?.nomeExibicao || "" }],
      origem: { agente: "usuario", canal: "cancelamento" },
      usuarioId: meuUid,
    });

    if (novoParticipanteResolvido) {
      registrarNovoParticipanteDestino(tx, {
        eventoId,
        meuUid,
        meuNome: cotaCriador?.nomeExibicao || "",
        despesa,
        resolvido: novoParticipanteResolvido,
        valorCentavos: valorLiberado,
      });
    } else if (destino && afetados.length > 0) {
      registrarEventosRedistribuicao(tx, {
        eventoId,
        meuUid,
        meuNome: cotaCriador?.nomeExibicao || "",
        afetados,
        cotasAntes: despesa.cotas,
        canal: "resolucao_valor",
      });
    }

    return { ok: true, status: "cancelado", valorSemDestinoCentavos: novoValorSemDestino };
  });
});

// Remove um Membro sem conta (seção 7) de uma divisão ativa — só quem criou
// pode chamar, e SEM precisar de consentimento (não existe ninguém do outro
// lado pra concordar, mesma razão de atualizarDivisaoDespesa já permitir
// editar a cota dele direto). Reaproveita o mesmo mecanismo de destino do
// cancelamento de convite (seção 11.3): devolver/redistribuir/atribuir a
// alguém (existente ou novo) ou deixar "sem destino" pra decidir depois.
// Participante COM conta (`usuario`) nunca é removido por aqui — precisa
// sempre do fluxo de proposta + concordância (proporAlteracaoCota com
// novoValorCentavos: 0), porque o dinheiro é dele (decisão 2026-08-17).
exports.removerParticipanteSemConta = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { eventoId, participanteId, destino } = request.data || {};

  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Divisão inválida.");
  }
  if (typeof participanteId !== "string" || !participanteId.trim()) {
    throw new HttpsError("invalid-argument", "Participante inválido.");
  }
  if (destino !== undefined && destino !== null) {
    validarDestino(destino);
  }

  const despesaRef = db.doc(`users/${meuUid}/despesasCompartilhadas/${eventoId}`);

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    if (despesa.criadoPor !== meuUid) {
      throw new HttpsError(
        "failed-precondition",
        "Só quem criou a divisão pode remover um participante."
      );
    }
    if (despesa.status === "encerrada") {
      throw new HttpsError("failed-precondition", "Não é possível alterar uma divisão encerrada.");
    }

    const cotaAlvo = despesa.cotas.find(
      (c) => c.participanteId === participanteId && c.participanteTipo === "membroSemConta"
    );
    if (!cotaAlvo) {
      throw new HttpsError("not-found", "Membro sem conta não encontrado nesta divisão.");
    }

    // Mesmo cuidado de cancelarConviteDivisao: se o destino é uma pessoa
    // NOVA, a leitura pra resolvê-la precisa acontecer antes de qualquer
    // escrita desta transação.
    const novoParticipanteResolvido =
      destino?.tipo === "novoParticipante"
        ? await resolverNovoParticipante(tx, meuUid, destino, despesa)
        : null;

    const valorLiberado = cotaAlvo.valorCentavos;
    const cotaCriador = despesa.cotas.find((c) => c.participanteId === meuUid);
    let cotasAtualizadas = despesa.cotas.filter((c) => c.participanteId !== participanteId);
    let novoValorSemDestino = despesa.valorSemDestinoCentavos || 0;
    let afetados = [];

    if (novoParticipanteResolvido) {
      cotasAtualizadas = [
        ...cotasAtualizadas,
        {
          participanteTipo: novoParticipanteResolvido.ehMembro ? "membroSemConta" : "usuario",
          participanteId: novoParticipanteResolvido.id,
          nomeExibicao: novoParticipanteResolvido.nome,
          valorCentavos: valorLiberado,
          status: novoParticipanteResolvido.ehMembro ? "aceito" : "pendente",
          gastoId: null,
        },
      ];
    } else if (destino) {
      const resultado = aplicarDestino(cotasAtualizadas, destino, valorLiberado, meuUid);
      cotasAtualizadas = resultado.cotas;
      afetados = resultado.afetados;
    } else {
      novoValorSemDestino += valorLiberado;
    }

    tx.update(despesaRef, {
      cotas: cotasAtualizadas,
      valorSemDestinoCentavos: novoValorSemDestino,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    for (const a of afetados) {
      if (a.participanteId === meuUid) {
        const gastoCriadorId = gastoIdDoParticipante(despesa, meuUid);
        if (gastoCriadorId) {
          tx.update(db.doc(`users/${meuUid}/gastos/${gastoCriadorId}`), {
            valor: a.novoValorCentavos / 100,
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        }
      } else {
        tx.update(db.doc(`users/${a.participanteId}/convitesDeDivisao/${eventoId}`), {
          minhaCotaCentavos: a.novoValorCentavos,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
    }

    // Membro sem conta nunca tem gasto/conta própria — só o lado do criador
    // registra o evento (mesmo raciocínio de adicionarParticipante).
    registrarEvento(tx, `users/${meuUid}`, {
      acao: "participante_removido",
      entidade: "divisaoDespesa",
      entidadeId: gastoIdDoParticipante(despesa, meuUid) || eventoId,
      participantes: [{ uid: participanteId, nome: cotaAlvo.nomeExibicao }],
      origem: { agente: "usuario", canal: "remocao" },
      usuarioId: meuUid,
    });

    if (novoParticipanteResolvido) {
      registrarNovoParticipanteDestino(tx, {
        eventoId,
        meuUid,
        meuNome: cotaCriador?.nomeExibicao || "",
        despesa,
        resolvido: novoParticipanteResolvido,
        valorCentavos: valorLiberado,
      });
    } else if (destino && afetados.length > 0) {
      registrarEventosRedistribuicao(tx, {
        eventoId,
        meuUid,
        meuNome: cotaCriador?.nomeExibicao || "",
        afetados,
        cotasAntes: despesa.cotas,
        canal: "resolucao_valor",
      });
    }

    return { ok: true, valorSemDestinoCentavos: novoValorSemDestino };
  });
});

// Etapa 3.4 — editar descrição/valor total/cotas antes de qualquer aceite
// (seção 9: trava assim que alguém aceitar). Escopo desta etapa: só altera
// valores de participantes que já estão na divisão como `pendente` — não
// adiciona nem remove participante (isso exigiria compor com
// cancelarConviteDivisao + uma nova solicitação, fora do escopo aqui).
exports.atualizarDivisaoDespesa = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { eventoId, descricao, valorTotalCentavos, cotas } = request.data || {};

  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Divisão inválida.");
  }

  const despesaRef = db.doc(`users/${meuUid}/despesasCompartilhadas/${eventoId}`);

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    if (despesa.criadoPor !== meuUid) {
      throw new HttpsError("failed-precondition", "Só quem criou a divisão pode editá-la.");
    }
    if (despesa.status === "encerrada") {
      throw new HttpsError("failed-precondition", "Não é possível editar uma divisão encerrada.");
    }

    const descricaoFinal =
      typeof descricao === "string" && descricao.trim() ? descricao.trim() : despesa.descricao;
    const valorTotalFinal =
      Number.isInteger(valorTotalCentavos) && valorTotalCentavos > 0
        ? valorTotalCentavos
        : despesa.valorTotalCentavos;

    // Só cota de participante COM conta (`usuario`) conta como "já aceite"
    // pra travar a edição — a cota de um Membro sem conta (seção 7) já nasce
    // `aceito` só porque não existe ninguém pra responder, não representa
    // consentimento de terceiro nenhum. A trava só se aplica quando a
    // chamada tenta mudar DESCRIÇÃO ou VALOR TOTAL (isso sim afetaria o que
    // quem já aceitou concordou) — editar só uma cota (Membro sem conta, ou
    // participante com conta ainda `pendente`) nunca toca no valor de quem já
    // aceitou, a diferença sempre fica entre o criador e essa cota (decisão
    // 2026-08-17, revista: antes bloqueava qualquer edição, mesmo sem mexer
    // em descrição/valor total).
    const jaTemAceite = despesa.cotas.some(
      (c) => c.participanteTipo === "usuario" && c.participanteId !== meuUid && c.status === "aceito"
    );
    const alterandoDescricaoOuValorTotal =
      descricaoFinal !== despesa.descricao || valorTotalFinal !== despesa.valorTotalCentavos;
    if (jaTemAceite && alterandoDescricaoOuValorTotal) {
      throw new HttpsError(
        "failed-precondition",
        "Não é possível editar a descrição ou o valor total depois que algum participante já aceitou."
      );
    }

    // "Editável" = ainda `pendente` (participante com conta) OU Membro sem
    // conta (sempre editável enquanto nenhum participante com conta tiver
    // aceitado — mesma trava acima, seção 7/11.3). "Bloqueada" = participante
    // com conta que já respondeu de alguma forma (aceito/recusado/
    // cancelado/expirado) — nunca editável por aqui.
    const editaveisAtuais = despesa.cotas.filter(
      (c) =>
        c.participanteId !== meuUid &&
        (c.status === "pendente" || c.participanteTipo === "membroSemConta")
    );
    const bloqueadas = despesa.cotas.filter(
      (c) =>
        c.participanteId !== meuUid &&
        !(c.status === "pendente" || c.participanteTipo === "membroSemConta")
    );

    // Cada cota no array de entrada é identificada por `uidParticipante`
    // (com conta) ou `membroId` (sem conta) — nunca os dois.
    const chaveDaCota = (c) =>
      c.participanteTipo === "membroSemConta" ? `membro:${c.participanteId}` : `usuario:${c.participanteId}`;
    const chaveDoInput = (c) => (c.membroId ? `membro:${c.membroId}` : `usuario:${c.uidParticipante}`);

    let novasCotasEditaveis = editaveisAtuais;
    if (Array.isArray(cotas)) {
      const chavesAtuais = new Set(editaveisAtuais.map(chaveDaCota));
      const chavesNovas = new Set(cotas.map(chaveDoInput));
      const mesmoConjunto =
        chavesAtuais.size === chavesNovas.size && [...chavesAtuais].every((k) => chavesNovas.has(k));
      if (!mesmoConjunto) {
        throw new HttpsError(
          "invalid-argument",
          "Esta etapa só permite alterar valores de participantes já existentes — adicionar ou " +
            "remover participante não está disponível por aqui."
        );
      }

      novasCotasEditaveis = cotas.map((cota) => {
        if (!Number.isInteger(cota.valorCentavos) || cota.valorCentavos <= 0) {
          throw new HttpsError(
            "invalid-argument",
            "Cada cota precisa ser um valor em centavos maior que zero."
          );
        }
        const chave = chaveDoInput(cota);
        const existente = editaveisAtuais.find((c) => chaveDaCota(c) === chave);
        return { ...existente, valorCentavos: cota.valorCentavos };
      });
    }

    // Invariante (seção 11.3): valorTotalCentavos == soma(cotas relevantes) +
    // valorSemDestinoCentavos — sem subtrair isso aqui, o total pararia de
    // bater sempre que houver um valor ainda sem destino de um cancelamento
    // anterior.
    const somaBloqueadas = bloqueadas.reduce((soma, c) => soma + c.valorCentavos, 0);
    const somaEditaveisNovas = novasCotasEditaveis.reduce((soma, c) => soma + c.valorCentavos, 0);
    const minhaCotaNova =
      valorTotalFinal - somaBloqueadas - somaEditaveisNovas - (despesa.valorSemDestinoCentavos || 0);
    if (minhaCotaNova < 0) {
      throw new HttpsError(
        "invalid-argument",
        "A soma das cotas dos participantes não pode passar do valor total."
      );
    }

    const cotaCriadorExistente = despesa.cotas.find((c) => c.participanteId === meuUid);
    const cotasFinal = [
      { ...cotaCriadorExistente, valorCentavos: minhaCotaNova },
      ...bloqueadas,
      ...novasCotasEditaveis,
    ];

    tx.update(despesaRef, {
      descricao: descricaoFinal,
      valorTotalCentavos: valorTotalFinal,
      cotas: cotasFinal,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // O gasto do criador precisa refletir a cota nova — sem isso, editar a
    // divisão (ex.: reatribuir a si mesmo o valor de quem recusou, decisão
    // 2026-08-14: isso é sempre manual, nunca automático) não mudava nada no
    // valor exibido no app (mesma classe de bug corrigido em
    // criarDivisaoDespesa para o compartilhamento de gasto existente).
    const gastoCriadorId = gastoIdDoParticipante(despesa, meuUid);
    if (gastoCriadorId) {
      tx.update(db.doc(`users/${meuUid}/gastos/${gastoCriadorId}`), {
        valor: minhaCotaNova / 100,
        descricao: descricaoFinal,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    const alteracoes = {};
    if (descricaoFinal !== despesa.descricao) {
      alteracoes.descricao = { antes: despesa.descricao, depois: descricaoFinal };
    }
    if (valorTotalFinal !== despesa.valorTotalCentavos) {
      alteracoes.valorTotalCentavos = {
        antes: despesa.valorTotalCentavos,
        depois: valorTotalFinal,
      };
    }

    // Atualiza o convite de cada participante COM conta ainda pendente +
    // registra o evento também do lado dele (a cota dele pode ter mudado).
    // Membro sem conta (seção 7) nunca tem convite nem conta própria — só
    // conta pro cálculo acima, sem nenhum evento/atualização do lado dele.
    for (const cota of novasCotasEditaveis) {
      if (cota.participanteTipo === "membroSemConta") continue;

      const conviteRef = db.doc(`users/${cota.participanteId}/convitesDeDivisao/${eventoId}`);
      tx.update(conviteRef, {
        descricao: descricaoFinal,
        minhaCotaCentavos: cota.valorCentavos,
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      if (Object.keys(alteracoes).length > 0) {
        // Só edita cotas ainda `pendente` (ver validação acima) — o
        // participante nunca tem gasto próprio neste ponto, então fica com
        // `eventoId` mesmo (mesmo raciocínio de responderConviteDivisao).
        registrarEvento(tx, `users/${cota.participanteId}`, {
          acao: "editado",
          entidade: "divisaoDespesa",
          entidadeId: eventoId,
          alteracoes,
          participantes: [{ uid: meuUid, nome: cotaCriadorExistente?.nomeExibicao || "" }],
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: meuUid,
        });
      }
    }

    if (Object.keys(alteracoes).length > 0) {
      // `meuUid` é sempre o criador aqui (só ele pode editar) — tem gasto
      // próprio desde a criação (ver `gastoIdDoParticipante`, seção 11.1).
      registrarEvento(tx, `users/${meuUid}`, {
        acao: "editado",
        entidade: "divisaoDespesa",
        entidadeId: gastoCriadorId || eventoId,
        alteracoes,
        participantes: novasCotasEditaveis.map((c) => ({ uid: c.participanteId, nome: c.nomeExibicao })),
        origem: { agente: "usuario", canal: "edicao" },
        usuarioId: meuUid,
      });
    }

    return { ok: true, minhaCotaCentavos: minhaCotaNova };
  });
});

// Seção 11.3 (2026-08-17) — resolve um valor que ficou "sem destino" de um
// cancelamento anterior (quando `cancelarConviteDivisao` foi chamada sem
// `destino`, decidindo mais tarde). Mesma lógica de aplicação de destino
// usada ali, só que sobre o total acumulado em `valorSemDestinoCentavos` em
// vez do valor de um único cancelamento.
exports.resolverValorSemDestino = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { eventoId, destino } = request.data || {};

  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Divisão inválida.");
  }
  validarDestino(destino);

  const despesaRef = db.doc(`users/${meuUid}/despesasCompartilhadas/${eventoId}`);

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    if (despesa.criadoPor !== meuUid) {
      throw new HttpsError("failed-precondition", "Só quem criou a divisão pode decidir o destino.");
    }

    const valorPendente = despesa.valorSemDestinoCentavos || 0;
    if (valorPendente <= 0) {
      throw new HttpsError("failed-precondition", "Não há valor sem destino nesta divisão.");
    }

    const cotaCriador = despesa.cotas.find((c) => c.participanteId === meuUid);

    // Destinar a uma pessoa NOVA (2026-08-17) — leitura precisa vir antes de
    // qualquer escrita desta transação (não há nenhuma escrita antes deste
    // ponto ainda, então é seguro fazer aqui).
    if (destino.tipo === "novoParticipante") {
      const resolvido = await resolverNovoParticipante(tx, meuUid, destino, despesa);
      const cotasFinal = [
        ...despesa.cotas,
        {
          participanteTipo: resolvido.ehMembro ? "membroSemConta" : "usuario",
          participanteId: resolvido.id,
          nomeExibicao: resolvido.nome,
          valorCentavos: valorPendente,
          status: resolvido.ehMembro ? "aceito" : "pendente",
          gastoId: null,
        },
      ];
      tx.update(despesaRef, {
        cotas: cotasFinal,
        valorSemDestinoCentavos: 0,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      registrarNovoParticipanteDestino(tx, {
        eventoId,
        meuUid,
        meuNome: cotaCriador?.nomeExibicao || "",
        despesa,
        resolvido,
        valorCentavos: valorPendente,
      });
      return { ok: true, valorResolvidoCentavos: valorPendente };
    }

    const { cotas: cotasFinal, afetados } = aplicarDestino(despesa.cotas, destino, valorPendente, meuUid);

    tx.update(despesaRef, {
      cotas: cotasFinal,
      valorSemDestinoCentavos: 0,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    for (const a of afetados) {
      if (a.participanteId === meuUid) {
        const gastoCriadorId = gastoIdDoParticipante(despesa, meuUid);
        if (gastoCriadorId) {
          tx.update(db.doc(`users/${meuUid}/gastos/${gastoCriadorId}`), {
            valor: a.novoValorCentavos / 100,
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        }
      } else {
        tx.update(db.doc(`users/${a.participanteId}/convitesDeDivisao/${eventoId}`), {
          minhaCotaCentavos: a.novoValorCentavos,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
    }

    registrarEventosRedistribuicao(tx, {
      eventoId,
      meuUid,
      meuNome: cotaCriador?.nomeExibicao || "",
      afetados,
      cotasAntes: despesa.cotas,
      canal: "resolucao_valor",
    });

    return { ok: true, valorResolvidoCentavos: valorPendente };
  });
});

// Etapa 3.6 (seção 11.1, 2026-08-14) — único caminho pra remover uma despesa
// compartilhada: soft delete (nunca apaga o documento), cancela de uma vez
// todos os convites ainda `pendente` e avisa quem já aceitou (o gasto dela
// permanece intocado — propriedade dela, seção 11). É chamada SEMPRE antes
// de excluir o gasto do criador, mesmo quando ninguém aceitou ainda ainda
// (ver SaidasScreen.js) — "excluir só para mim" deixando a divisão órfã não
// é mais possível depois desta etapa.
exports.encerrarCompartilhamento = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { eventoId } = request.data || {};

  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Divisão inválida.");
  }

  const despesaRef = db.doc(`users/${meuUid}/despesasCompartilhadas/${eventoId}`);

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    if (despesa.criadoPor !== meuUid) {
      throw new HttpsError("failed-precondition", "Só quem criou a divisão pode encerrá-la.");
    }
    if (despesa.status === "encerrada") {
      throw new HttpsError("failed-precondition", "Esta divisão já está encerrada.");
    }

    const cotaCriador = (despesa.cotas || []).find((c) => c.participanteId === meuUid);
    const outrasCotas = (despesa.cotas || []).filter((c) => c.participanteId !== meuUid);

    // Seção 11.3 (2026-08-17) — encerrar é diferente de cancelar um convite
    // individual: como a divisão inteira está sendo fechada, não existe mais
    // contexto pra "decidir depois" nem pra redistribuir entre participantes
    // (não vai sobrar divisão nenhuma pra reabrir) — todo valor ainda
    // pendente (dos convites cancelados agora + qualquer `valorSemDestino`
    // de um cancelamento anterior) volta automaticamente pro criador, sem
    // perguntar. Participantes que já aceitaram nunca são afetados.
    let valorDevolvidoAoCriador = despesa.valorSemDestinoCentavos || 0;
    const novasCotas = [];
    for (const cota of outrasCotas) {
      if (cota.status === "pendente") {
        const conviteRef = db.doc(`users/${cota.participanteId}/convitesDeDivisao/${eventoId}`);
        tx.update(conviteRef, { status: "cancelado", atualizadoEm: FieldValue.serverTimestamp() });
        // Zera o valorCentavos da cota — já foi somado em
        // valorDevolvidoAoCriador (mesmo cuidado de cancelarConviteDivisao,
        // evita contar duas vezes em atualizarDivisaoDespesa).
        valorDevolvidoAoCriador += cota.valorCentavos;
        novasCotas.push({ ...cota, status: "cancelado", valorCentavos: 0 });
        registrarEvento(tx, `users/${cota.participanteId}`, {
          acao: "convite_cancelado",
          entidade: "divisaoDespesa",
          entidadeId: eventoId,
          participantes: [{ uid: meuUid, nome: cotaCriador?.nomeExibicao || "" }],
          origem: { agente: "usuario", canal: "encerramento" },
          usuarioId: meuUid,
        });
      } else if (cota.status === "aceito") {
        novasCotas.push(cota);
        // Marca o gasto de quem já aceitou como "de uma divisão encerrada"
        // (2026-08-17) — o gasto continua intocado (propriedade dela, seção
        // 11: valor, descrição, tudo igual), só ganha esse sinal pra UI dela
        // também parar de mostrar o ícone de "compartilhado ativo" (pedido
        // do usuário — sem isso, só o lado do criador saberia da mudança).
        if (cota.gastoId) {
          tx.update(db.doc(`users/${cota.participanteId}/gastos/${cota.gastoId}`), {
            "origemCompartilhamento.encerrado": true,
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        }
        registrarEvento(tx, `users/${cota.participanteId}`, {
          acao: "compartilhamento_encerrado",
          entidade: "divisaoDespesa",
          entidadeId: cota.gastoId || eventoId,
          participantes: [{ uid: meuUid, nome: cotaCriador?.nomeExibicao || "" }],
          origem: { agente: "usuario", canal: "encerramento" },
          usuarioId: meuUid,
        });
      } else {
        novasCotas.push(cota);
      }
    }

    const cotaCriadorFinal = cotaCriador
      ? { ...cotaCriador, valorCentavos: cotaCriador.valorCentavos + valorDevolvidoAoCriador }
      : cotaCriador;

    tx.update(despesaRef, {
      status: "encerrada",
      encerradaEm: FieldValue.serverTimestamp(),
      encerradaPor: meuUid,
      cotas: [cotaCriadorFinal, ...novasCotas],
      valorSemDestinoCentavos: 0,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    if (cotaCriadorFinal && valorDevolvidoAoCriador > 0) {
      const gastoCriadorId = gastoIdDoParticipante(despesa, meuUid);
      if (gastoCriadorId) {
        tx.update(db.doc(`users/${meuUid}/gastos/${gastoCriadorId}`), {
          valor: cotaCriadorFinal.valorCentavos / 100,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
    }

    registrarEvento(tx, `users/${meuUid}`, {
      acao: "compartilhamento_encerrado",
      entidade: "divisaoDespesa",
      entidadeId: cotaCriador?.gastoId || eventoId,
      participantes: outrasCotas.map((c) => ({ uid: c.participanteId, nome: c.nomeExibicao })),
      origem: { agente: "usuario", canal: "encerramento" },
      usuarioId: meuUid,
    });

    return { ok: true, status: "encerrada", valorDevolvidoAoCriadorCentavos: valorDevolvidoAoCriador };
  });
});

// Etapa 3.8 (2026-08-17, seções 11.1/11.3) — adiciona um participante a uma
// divisão já ativa. O valor SEMPRE sai da própria cota do criador (nunca da
// de quem já aceitou — decisão registrada na seção 11.1: reduzir a própria
// cota é sempre uma escolha unilateral permitida; reduzir a de outro
// participante que já aceitou exigiria o fluxo de proposta+concordância,
// `proporAlteracaoCota`, não este). Aceita conexão com conta (ganha convite
// normal, mesmo formato de `criarDivisaoDespesa`) ou Membro sem conta (entra
// direto `aceito`, sem convite — seção 7).
exports.adicionarParticipante = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { eventoId, uidParticipante, membroId, valorCentavos } = request.data || {};

  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Divisão inválida.");
  }
  const ehMembro = typeof membroId === "string" && membroId.trim();
  const ehUsuario = typeof uidParticipante === "string" && uidParticipante.trim();
  if (!ehMembro && !ehUsuario) {
    throw new HttpsError("invalid-argument", "Informe um participante.");
  }
  if (!Number.isInteger(valorCentavos) || valorCentavos <= 0) {
    throw new HttpsError("invalid-argument", "Valor inválido.");
  }

  const despesaRef = db.doc(`users/${meuUid}/despesasCompartilhadas/${eventoId}`);

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    if (despesa.criadoPor !== meuUid) {
      throw new HttpsError(
        "failed-precondition",
        "Só quem criou a divisão pode adicionar participantes."
      );
    }
    if (despesa.status === "encerrada") {
      throw new HttpsError(
        "failed-precondition",
        "Não é possível adicionar participante numa divisão encerrada."
      );
    }

    const idNovo = ehMembro ? membroId : uidParticipante;
    if (despesa.cotas.some((c) => c.participanteId === idNovo)) {
      throw new HttpsError("invalid-argument", "Este participante já faz parte da divisão.");
    }

    const cotaCriador = despesa.cotas.find((c) => c.participanteId === meuUid);
    const novoValorCriador = cotaCriador.valorCentavos - valorCentavos;
    if (novoValorCriador < 0) {
      throw new HttpsError(
        "invalid-argument",
        "Você não tem cota suficiente disponível para adicionar esse valor."
      );
    }

    let novaCota;
    let nomeNovo = "";
    if (ehMembro) {
      const membroSnap = await tx.get(db.doc(`users/${meuUid}/membros/${membroId}`));
      if (!membroSnap.exists) {
        throw new HttpsError("not-found", "Membro não encontrado.");
      }
      nomeNovo = membroSnap.data().nome || "";
      novaCota = {
        participanteTipo: "membroSemConta",
        participanteId: membroId,
        nomeExibicao: nomeNovo,
        valorCentavos,
        status: "aceito",
        gastoId: null,
      };
    } else {
      const conexaoSnap = await tx.get(
        db
          .collection(`users/${meuUid}/conexoes`)
          .where("usuarioConectadoId", "==", uidParticipante)
          .where("status", "==", "aceita")
      );
      if (conexaoSnap.empty) {
        throw new HttpsError(
          "failed-precondition",
          "Só é possível adicionar uma conexão já aceita."
        );
      }
      const perfilSnap = await tx.get(db.doc(`users/${uidParticipante}`));
      if (!perfilSnap.exists) {
        throw new HttpsError("not-found", "Participante não encontrado.");
      }
      const perfil = perfilSnap.data() || {};
      nomeNovo = perfil.apelido || perfil.nome || "";
      novaCota = {
        participanteTipo: "usuario",
        participanteId: uidParticipante,
        nomeExibicao: nomeNovo,
        valorCentavos,
        status: "pendente",
        gastoId: null,
      };
    }

    const cotasFinal = despesa.cotas.map((c) =>
      c.participanteId === meuUid ? { ...c, valorCentavos: novoValorCriador } : c
    );
    cotasFinal.push(novaCota);

    tx.update(despesaRef, { cotas: cotasFinal, atualizadoEm: FieldValue.serverTimestamp() });

    const gastoCriadorId = gastoIdDoParticipante(despesa, meuUid);
    if (gastoCriadorId) {
      tx.update(db.doc(`users/${meuUid}/gastos/${gastoCriadorId}`), {
        valor: novoValorCriador / 100,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    if (!ehMembro) {
      const conviteRef = db.doc(`users/${uidParticipante}/convitesDeDivisao/${eventoId}`);
      tx.set(conviteRef, {
        eventoId,
        deUsuarioId: meuUid,
        deNome: cotaCriador.nomeExibicao,
        descricao: despesa.descricao,
        minhaCotaCentavos: valorCentavos,
        status: "pendente",
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });

      registrarEvento(tx, `users/${uidParticipante}`, {
        acao: "convite_recebido",
        entidade: "divisaoDespesa",
        entidadeId: eventoId,
        participantes: [{ uid: meuUid, nome: cotaCriador.nomeExibicao }],
        origem: { agente: "usuario", canal: "participante_adicionado" },
        usuarioId: meuUid,
      });
    }

    registrarEvento(tx, `users/${meuUid}`, {
      acao: "participante_adicionado",
      entidade: "divisaoDespesa",
      entidadeId: gastoCriadorId || eventoId,
      participantes: [{ uid: idNovo, nome: nomeNovo }],
      origem: { agente: "usuario", canal: "participante_adicionado" },
      usuarioId: meuUid,
    });

    return { ok: true, minhaCotaCentavos: novoValorCriador };
  });
});

// Etapa 3.9 (2026-08-17, seções 11.1/11.3) — alteração pós-aceite: o criador
// PROPÕE um novo valor para quem já aceitou; nada muda de fato até a pessoa
// concordar (`responderPropostaAlteracao` abaixo). Nunca uma alteração
// financeira silenciosa (decisão do usuário, seção 11.1). Cada cota `aceito`
// só pode ter uma proposta pendente por vez (`propostaPendenteId`).
exports.proporAlteracaoCota = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { eventoId, participanteId, novoValorCentavos, destino } = request.data || {};

  if (typeof eventoId !== "string" || !eventoId.trim()) {
    throw new HttpsError("invalid-argument", "Divisão inválida.");
  }
  if (typeof participanteId !== "string" || !participanteId.trim()) {
    throw new HttpsError("invalid-argument", "Participante inválido.");
  }
  if (!Number.isInteger(novoValorCentavos) || novoValorCentavos < 0) {
    throw new HttpsError("invalid-argument", "Valor inválido.");
  }
  // `destino` só é usado se a alteração LIBERAR valor (novo < atual) — se
  // vier, já fica decidido desde a proposta; se não vier, o valor liberado
  // fica "sem destino" quando a proposta for aceita (mesma mecânica do
  // cancelamento, seção 11.3).
  if (destino !== undefined && destino !== null) {
    validarDestino(destino);
  }

  const despesaRef = db.doc(`users/${meuUid}/despesasCompartilhadas/${eventoId}`);

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    if (despesa.criadoPor !== meuUid) {
      throw new HttpsError("failed-precondition", "Só quem criou a divisão pode propor alterações.");
    }
    if (despesa.status === "encerrada") {
      throw new HttpsError("failed-precondition", "Não é possível propor alteração numa divisão encerrada.");
    }

    const cotaAlvo = despesa.cotas.find(
      (c) => c.participanteId === participanteId && c.participanteTipo === "usuario"
    );
    if (!cotaAlvo) {
      throw new HttpsError("not-found", "Participante não encontrado nesta divisão.");
    }
    if (cotaAlvo.status !== "aceito") {
      throw new HttpsError(
        "failed-precondition",
        "Só é possível propor alteração para quem já aceitou a divisão."
      );
    }
    if (cotaAlvo.propostaPendenteId) {
      throw new HttpsError(
        "failed-precondition",
        "Já existe uma proposta pendente para este participante."
      );
    }

    const delta = cotaAlvo.valorCentavos - novoValorCentavos; // >0 libera valor; <0 precisa vir do criador
    if (delta === 0) {
      throw new HttpsError("invalid-argument", "O novo valor precisa ser diferente do atual.");
    }

    const cotaCriador = despesa.cotas.find((c) => c.participanteId === meuUid);
    if (delta < 0 && cotaCriador.valorCentavos + delta < 0) {
      throw new HttpsError(
        "invalid-argument",
        "Você não tem cota suficiente disponível para propor esse aumento."
      );
    }

    const propostaRef = db.collection(`users/${participanteId}/propostasDeAlteracao`).doc();
    tx.set(propostaRef, {
      eventoId,
      deUsuarioId: meuUid,
      deNome: cotaCriador?.nomeExibicao || "",
      descricao: despesa.descricao,
      valorAtualCentavos: cotaAlvo.valorCentavos,
      valorNovoCentavos: novoValorCentavos,
      destino: destino || null,
      status: "pendente",
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    tx.update(despesaRef, {
      cotas: despesa.cotas.map((c) =>
        c.participanteId === participanteId ? { ...c, propostaPendenteId: propostaRef.id } : c
      ),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    registrarEvento(tx, `users/${meuUid}`, {
      acao: "alteracao_proposta",
      entidade: "divisaoDespesa",
      entidadeId: gastoIdDoParticipante(despesa, meuUid) || eventoId,
      participantes: [{ uid: participanteId, nome: cotaAlvo.nomeExibicao }],
      origem: { agente: "usuario", canal: "proposta" },
      usuarioId: meuUid,
    });
    registrarEvento(tx, `users/${participanteId}`, {
      acao: "alteracao_proposta",
      entidade: "divisaoDespesa",
      entidadeId: cotaAlvo.gastoId || eventoId,
      participantes: [{ uid: meuUid, nome: cotaCriador?.nomeExibicao || "" }],
      origem: { agente: "usuario", canal: "proposta" },
      usuarioId: meuUid,
    });

    return { ok: true, propostaId: propostaRef.id };
  });
});

// Responde a uma proposta de alteração pós-aceite — só quem recebeu a
// proposta pode chamar (é o dono do documento em `propostasDeAlteracao`,
// mesmo padrão de convite). Recusar não muda valor nenhum. Aceitar aplica o
// novo valor e, se algo foi liberado (novo < atual), segue o `destino`
// decidido na proposta (ou acumula em `valorSemDestinoCentavos` se não
// houver — seção 11.3).
exports.responderPropostaAlteracao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { propostaId, aceitar } = request.data || {};

  if (typeof propostaId !== "string" || !propostaId.trim()) {
    throw new HttpsError("invalid-argument", "Proposta inválida.");
  }

  const propostaRef = db.doc(`users/${meuUid}/propostasDeAlteracao/${propostaId}`);
  const propostaSnap = await propostaRef.get();
  if (!propostaSnap.exists) {
    throw new HttpsError("not-found", "Proposta não encontrada.");
  }
  const proposta = propostaSnap.data();
  if (proposta.status !== "pendente") {
    throw new HttpsError("failed-precondition", "Esta proposta já foi respondida.");
  }

  const criadorUid = proposta.deUsuarioId;
  const despesaRef = db.doc(`users/${criadorUid}/despesasCompartilhadas/${proposta.eventoId}`);

  return db.runTransaction(async (tx) => {
    const despesaSnap = await tx.get(despesaRef);
    if (!despesaSnap.exists) {
      throw new HttpsError("not-found", "Despesa compartilhada não encontrada.");
    }
    const despesa = despesaSnap.data();
    const cotaAlvo = despesa.cotas.find((c) => c.participanteId === meuUid);
    const cotaCriador = despesa.cotas.find((c) => c.participanteId === criadorUid);
    const novoStatusProposta = aceitar ? "aceita" : "recusada";

    tx.update(propostaRef, { status: novoStatusProposta, atualizadoEm: FieldValue.serverTimestamp() });

    if (!aceitar) {
      tx.update(despesaRef, {
        cotas: despesa.cotas.map((c) =>
          c.participanteId === meuUid ? { ...c, propostaPendenteId: null } : c
        ),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      registrarEvento(tx, `users/${meuUid}`, {
        acao: "alteracao_recusada",
        entidade: "divisaoDespesa",
        entidadeId: cotaAlvo?.gastoId || proposta.eventoId,
        participantes: [{ uid: criadorUid, nome: proposta.deNome }],
        origem: { agente: "usuario", canal: "resposta_proposta" },
        usuarioId: meuUid,
      });
      registrarEvento(tx, `users/${criadorUid}`, {
        acao: "alteracao_recusada",
        entidade: "divisaoDespesa",
        entidadeId: gastoIdDoParticipante(despesa, criadorUid) || proposta.eventoId,
        participantes: [{ uid: meuUid, nome: cotaAlvo?.nomeExibicao || "" }],
        origem: { agente: "usuario", canal: "resposta_proposta" },
        usuarioId: meuUid,
      });
      return { ok: true, status: "recusada" };
    }

    const delta = proposta.valorAtualCentavos - proposta.valorNovoCentavos; // >0 libera; <0 vem do criador

    // Propor R$ 0 é o caminho de "excluir participante com conta" (decisão
    // 2026-08-17: sempre com consentimento, nunca removido direto pelo
    // criador). Aceitar isso marca a cota como `removido` (em vez de manter
    // `aceito` com R$0,00 pra sempre) — sem isso a lista de participantes
    // ficava com uma cota "zumbi": aparecia como aceita, mas sem valor
    // nenhum, sem forma de reativar nem de esconder.
    let cotasAtualizadas = despesa.cotas.map((c) =>
      c.participanteId === meuUid
        ? {
            ...c,
            valorCentavos: proposta.valorNovoCentavos,
            propostaPendenteId: null,
            ...(proposta.valorNovoCentavos === 0 ? { status: "removido" } : {}),
          }
        : c
    );
    let novoValorSemDestino = despesa.valorSemDestinoCentavos || 0;
    let afetados = [];

    if (delta > 0) {
      if (proposta.destino) {
        const resultado = aplicarDestino(cotasAtualizadas, proposta.destino, delta, criadorUid);
        cotasAtualizadas = resultado.cotas;
        afetados = resultado.afetados;
      } else {
        novoValorSemDestino += delta;
      }
    } else if (delta < 0) {
      const acrescimo = -delta;
      const novoValorCriador = cotaCriador.valorCentavos - acrescimo;
      cotasAtualizadas = cotasAtualizadas.map((c) =>
        c.participanteId === criadorUid ? { ...c, valorCentavos: novoValorCriador } : c
      );
      afetados.push({ participanteId: criadorUid, novoValorCentavos: novoValorCriador });
    }

    tx.update(despesaRef, {
      cotas: cotasAtualizadas,
      valorSemDestinoCentavos: novoValorSemDestino,
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    // O próprio gasto de quem aceitou a proposta sempre reflete o valor novo.
    if (cotaAlvo?.gastoId) {
      tx.update(db.doc(`users/${meuUid}/gastos/${cotaAlvo.gastoId}`), {
        valor: proposta.valorNovoCentavos / 100,
        atualizadoEm: FieldValue.serverTimestamp(),
      });
    }

    for (const a of afetados) {
      if (a.participanteId === criadorUid) {
        const gastoCriadorId = gastoIdDoParticipante(despesa, criadorUid);
        if (gastoCriadorId) {
          tx.update(db.doc(`users/${criadorUid}/gastos/${gastoCriadorId}`), {
            valor: a.novoValorCentavos / 100,
            atualizadoEm: FieldValue.serverTimestamp(),
          });
        }
      } else {
        tx.update(db.doc(`users/${a.participanteId}/convitesDeDivisao/${proposta.eventoId}`), {
          minhaCotaCentavos: a.novoValorCentavos,
          atualizadoEm: FieldValue.serverTimestamp(),
        });
      }
    }

    registrarEvento(tx, `users/${meuUid}`, {
      acao: "alteracao_aceita",
      entidade: "divisaoDespesa",
      entidadeId: cotaAlvo?.gastoId || proposta.eventoId,
      participantes: [{ uid: criadorUid, nome: proposta.deNome }],
      origem: { agente: "usuario", canal: "resposta_proposta" },
      usuarioId: meuUid,
    });
    registrarEvento(tx, `users/${criadorUid}`, {
      acao: "alteracao_aceita",
      entidade: "divisaoDespesa",
      entidadeId: gastoIdDoParticipante(despesa, criadorUid) || proposta.eventoId,
      participantes: [{ uid: meuUid, nome: cotaAlvo?.nomeExibicao || "" }],
      origem: { agente: "usuario", canal: "resposta_proposta" },
      usuarioId: meuUid,
    });

    return { ok: true, status: "aceita" };
  });
});
