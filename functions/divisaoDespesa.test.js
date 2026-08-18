// functions/divisaoDespesa.test.js
// Testes de integração de criarDivisaoDespesa contra o Firestore Emulator
// real — precisa do emulador rodando em 127.0.0.1:8080 antes de `npm test`.
// Mesmo padrão de conexoes.test.js (chama `.run({data, auth})` direto, sem
// firebase-functions-test — ver aquele arquivo para o porquê).
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-financeiro-local";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp({ projectId: "demo-financeiro-local" });

const {
  criarDivisaoDespesa,
  aceitarConviteDivisao,
  recusarConviteDivisao,
  cancelarConviteDivisao,
  atualizarDivisaoDespesa,
  encerrarCompartilhamento,
  resolverValorSemDestino,
  adicionarParticipante,
  proporAlteracaoCota,
  responderPropostaAlteracao,
  removerParticipanteSemConta,
} = require("./divisaoDespesa");
const db = getFirestore();

function novoUid(prefixo) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function criarUsuario(nomeExibicao) {
  const uid = novoUid("uid");
  await db.doc(`users/${uid}`).set({ apelido: nomeExibicao, avatarUrl: null });
  return uid;
}

// Cria uma conexão já 'aceita' direto no Firestore (sem passar pela
// Function de conexões — não é o que este arquivo testa).
async function conectar(uidA, uidB) {
  const conexaoId = db.collection(`users/${uidA}/conexoes`).doc().id;
  const agora = Timestamp.now();
  await db.doc(`users/${uidA}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidB,
    status: "aceita",
    papel: "solicitante",
    criadoEm: agora,
    atualizadoEm: agora,
  });
  await db.doc(`users/${uidB}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidA,
    status: "aceita",
    papel: "destinatario",
    criadoEm: agora,
    atualizadoEm: agora,
  });
}

async function chamar(uidChamador, data) {
  return criarDivisaoDespesa.run({ data, auth: { uid: uidChamador } });
}

async function chamarAceitar(uidChamador, data) {
  return aceitarConviteDivisao.run({ data, auth: { uid: uidChamador } });
}

async function chamarRecusar(uidChamador, data) {
  return recusarConviteDivisao.run({ data, auth: { uid: uidChamador } });
}

async function chamarCancelar(uidChamador, data) {
  return cancelarConviteDivisao.run({ data, auth: { uid: uidChamador } });
}

async function chamarAtualizar(uidChamador, data) {
  return atualizarDivisaoDespesa.run({ data, auth: { uid: uidChamador } });
}

async function chamarEncerrar(uidChamador, data) {
  return encerrarCompartilhamento.run({ data, auth: { uid: uidChamador } });
}

async function chamarResolver(uidChamador, data) {
  return resolverValorSemDestino.run({ data, auth: { uid: uidChamador } });
}

async function chamarAdicionar(uidChamador, data) {
  return adicionarParticipante.run({ data, auth: { uid: uidChamador } });
}

async function chamarPropor(uidChamador, data) {
  return proporAlteracaoCota.run({ data, auth: { uid: uidChamador } });
}

async function chamarResponderProposta(uidChamador, data) {
  return responderPropostaAlteracao.run({ data, auth: { uid: uidChamador } });
}

async function chamarRemoverMembro(uidChamador, data) {
  return removerParticipanteSemConta.run({ data, auth: { uid: uidChamador } });
}

// Cria um Membro sem conta (seção 7) direto no Firestore — não passa por
// useMembros.js (hook client-side), só o suficiente pra testar
// criarDivisaoDespesa/atualizarDivisaoDespesa/adicionarParticipante.
async function criarMembro(uidDono, nome) {
  const membroRef = db.collection(`users/${uidDono}/membros`).doc();
  await membroRef.set({ nome, ativo: true, avatar: null, ehProprietario: false });
  return membroRef.id;
}

// `gastoCriadorId` (campo solto) virou `cotas[].gastoId` (seção 11.1,
// 2026-08-14) — mesmo mecanismo pro criador e pra qualquer participante.
function gastoIdDaCota(despesa, participanteId) {
  return despesa.cotas.find((c) => c.participanteId === participanteId)?.gastoId;
}

async function eventosDe(uid, entidadeId) {
  const snap = await db
    .collection(`users/${uid}/linhaDoTempo`)
    .where("entidadeId", "==", entidadeId)
    .get();
  return snap.docs.map((d) => d.data());
}

test("cria divisão com cotas diferentes entre conexões aceitas", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  const uidC = await criarUsuario("Maria");
  await conectar(uidA, uidB);
  await conectar(uidA, uidC);

  const resposta = await chamar(uidA, {
    descricao: "Jantar",
    valorTotalCentavos: 30000,
    cotas: [
      { uidParticipante: uidB, valorCentavos: 10000 },
      { uidParticipante: uidC, valorCentavos: 15000 },
    ],
  });

  expect(resposta.ok).toBe(true);
  expect(resposta.minhaCotaCentavos).toBe(5000); // 30000 - 10000 - 15000

  const eventoSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
  const evento = eventoSnap.data();
  expect(evento.valorTotalCentavos).toBe(30000);
  expect(evento.cotas).toHaveLength(3);

  const cotaCriador = evento.cotas.find((c) => c.participanteId === uidA);
  expect(cotaCriador.valorCentavos).toBe(5000);
  expect(cotaCriador.status).toBe("aceito");

  const cotaB = evento.cotas.find((c) => c.participanteId === uidB);
  expect(cotaB.valorCentavos).toBe(10000);
  expect(cotaB.status).toBe("pendente");
});

test("cota do criador pode ser zero", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  const uidC = await criarUsuario("Maria");
  await conectar(uidA, uidB);
  await conectar(uidA, uidC);

  const resposta = await chamar(uidA, {
    descricao: "Presente em grupo",
    valorTotalCentavos: 30000,
    cotas: [
      { uidParticipante: uidB, valorCentavos: 10000 },
      { uidParticipante: uidC, valorCentavos: 20000 },
    ],
  });

  expect(resposta.ok).toBe(true);
  expect(resposta.minhaCotaCentavos).toBe(0);
});

test("rejeita se a soma das cotas dos outros passar do valor total", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  await expect(
    chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 15000 }],
    })
  ).rejects.toThrow();
});

test("rejeita participante que não é conexão aceita", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("Desconhecido");
  // sem conectar

  await expect(
    chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 5000 }],
    })
  ).rejects.toThrow();
});

test("rejeita divisão sem nenhum participante além do criador", async () => {
  const uidA = await criarUsuario("Criador");

  await expect(
    chamar(uidA, { descricao: "Jantar", valorTotalCentavos: 10000, cotas: [] })
  ).rejects.toThrow();
});

test("rejeita se a própria cota do criador vier no array", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  await expect(
    chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 5000 },
        { uidParticipante: uidA, valorCentavos: 5000 },
      ],
    })
  ).rejects.toThrow();
});

test("rejeita participante duplicado", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  await expect(
    chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 5000 },
        { uidParticipante: uidB, valorCentavos: 5000 },
      ],
    })
  ).rejects.toThrow();
});

test("rejeita valorTotalCentavos não inteiro ou zero/negativo", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  await expect(
    chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 100.5,
      cotas: [{ uidParticipante: uidB, valorCentavos: 50 }],
    })
  ).rejects.toThrow();

  await expect(
    chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 0,
      cotas: [{ uidParticipante: uidB, valorCentavos: 0 }],
    })
  ).rejects.toThrow();
});

test("rejeita origemLancamentoId de um gasto inexistente", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  await expect(
    chamar(uidA, {
      descricao: "Jantar",
      cotas: [{ uidParticipante: uidB, valorCentavos: 5000 }],
      origemLancamentoId: "algum-gasto-que-nao-existe",
    })
  ).rejects.toThrow();
});

describe("criarDivisaoDespesa com origemLancamentoId (Etapa 3.5)", () => {
  async function criarGastoExistente(uid, valor) {
    const gastoRef = db.collection(`users/${uid}/gastos`).doc();
    await gastoRef.set({
      descricao: "Compra do mercado",
      valor,
      categoriaId: null,
      dataVencimento: "2026-08-01",
      mes: 8,
      ano: 2026,
      pago: false,
      criadoEm: Timestamp.now(),
    });
    return gastoRef.id;
  }

  test("compartilha um gasto existente sem criar um segundo gasto para o criador", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const gastoId = await criarGastoExistente(uidA, 300); // R$300,00

    const resposta = await chamar(uidA, {
      descricao: "Jantar (compartilhado depois)",
      cotas: [{ uidParticipante: uidB, valorCentavos: 10000 }],
      origemLancamentoId: gastoId,
    });

    expect(resposta.ok).toBe(true);
    expect(resposta.gastoId).toBe(gastoId); // o MESMO gasto, não um novo
    expect(resposta.minhaCotaCentavos).toBe(20000); // 30000 - 10000

    const gastoSnap = await db.doc(`users/${uidA}/gastos/${gastoId}`).get();
    expect(gastoSnap.data().compartilhamentoId).toBe(resposta.eventoId);
    // O gasto passa a refletir a PRÓPRIA cota do criador (200 = 300 - 100),
    // não o valor total da compra — bug corrigido em 2026-08-14 (o valor
    // ficava intocado no total original, sem refletir a divisão).
    expect(gastoSnap.data().valor).toBe(200);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    expect(despesaSnap.data().origemLancamentoId).toBe(gastoId);
    expect(despesaSnap.data().valorTotalCentavos).toBe(30000); // derivado do gasto, não do cliente
  });

  test("não emite um segundo evento de 'gasto criado' para o gasto já existente", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const gastoId = await criarGastoExistente(uidA, 100);

    const resposta = await chamar(uidA, {
      descricao: "Compra compartilhada",
      cotas: [{ uidParticipante: uidB, valorCentavos: 5000 }],
      origemLancamentoId: gastoId,
    });

    // O gasto já existia (evento "criado" próprio, fora do escopo deste
    // teste) — o único evento novo sob o entidadeId do gasto é o
    // "compartilhado" (entidadeId = gastoId, não eventoId — ver bug
    // corrigido em 2026-08-14: o evento não aparecia na Linha do Tempo do
    // próprio gasto porque ficava gravado sob o id errado).
    const eventosDoGasto = await eventosDe(uidA, gastoId);
    expect(eventosDoGasto.filter((e) => e.acao === "criado")).toHaveLength(0);
    expect(eventosDoGasto.filter((e) => e.acao === "compartilhado")).toHaveLength(1);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    expect(gastoIdDaCota(despesaSnap.data(), uidA)).toBe(gastoId);
  });

  test("ignora valorTotalCentavos enviado pelo cliente quando origemLancamentoId é informado", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const gastoId = await criarGastoExistente(uidA, 50); // R$50,00 de verdade

    const resposta = await chamar(uidA, {
      descricao: "Tentando forjar o valor",
      valorTotalCentavos: 999999, // deveria ser ignorado
      cotas: [{ uidParticipante: uidB, valorCentavos: 2000 }],
      origemLancamentoId: gastoId,
    });

    expect(resposta.minhaCotaCentavos).toBe(3000); // 5000 - 2000, nunca baseado em 999999
  });

  test("rejeita compartilhar um gasto que já foi compartilhado antes", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const gastoId = await criarGastoExistente(uidA, 100);

    await chamar(uidA, {
      descricao: "Primeira vez",
      cotas: [{ uidParticipante: uidB, valorCentavos: 5000 }],
      origemLancamentoId: gastoId,
    });

    await expect(
      chamar(uidA, {
        descricao: "Segunda vez",
        cotas: [{ uidParticipante: uidC, valorCentavos: 5000 }],
        origemLancamentoId: gastoId,
      })
    ).rejects.toThrow();
  });
});

test("cria o gasto da cota do criador corretamente vinculado à divisão", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  const resposta = await chamar(uidA, {
    descricao: "Jantar",
    valorTotalCentavos: 10000,
    cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
  });

  const gastoSnap = await db.doc(`users/${uidA}/gastos/${resposta.gastoId}`).get();
  const gasto = gastoSnap.data();
  expect(gasto.descricao).toBe("Jantar");
  expect(gasto.valor).toBe(60); // 6000 centavos = R$60,00
  expect(gasto.compartilhamentoId).toBe(resposta.eventoId);
  expect(gasto.pago).toBe(false);
  expect(typeof gasto.mes).toBe("number");
  expect(typeof gasto.ano).toBe("number");
});

test("cria o convite-espelho com a cota certa para o participante", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  const resposta = await chamar(uidA, {
    descricao: "Jantar",
    valorTotalCentavos: 10000,
    cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
  });

  const conviteSnap = await db.doc(`users/${uidB}/convitesDeDivisao/${resposta.eventoId}`).get();
  expect(conviteSnap.exists).toBe(true);
  const convite = conviteSnap.data();
  expect(convite.minhaCotaCentavos).toBe(4000);
  expect(convite.status).toBe("pendente");
  expect(convite.deUsuarioId).toBe(uidA);
});

test("registra os eventos certos na Linha do Tempo dos dois lados", async () => {
  const uidA = await criarUsuario("Criador");
  const uidB = await criarUsuario("João");
  await conectar(uidA, uidB);

  const resposta = await chamar(uidA, {
    descricao: "Jantar",
    valorTotalCentavos: 10000,
    cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
  });

  // "criado" (do gasto) e "compartilhado" (da divisão) ficam os DOIS sob o
  // entidadeId do gasto do criador — só assim aparecem juntos na Linha do
  // Tempo daquele gasto (ver bug corrigido em 2026-08-14: "compartilhado"
  // ficava gravado sob o id da despesaCompartilhada, nunca encontrado pela
  // busca de useLinhaDoTempo.js, que filtra por entidadeId === item.id).
  const eventosGastoCriador = await eventosDe(uidA, resposta.gastoId);
  expect(eventosGastoCriador).toHaveLength(2);
  expect(
    eventosGastoCriador.some((e) => e.acao === "criado" && e.entidade === "gasto")
  ).toBe(true);
  const compartilhado = eventosGastoCriador.find((e) => e.acao === "compartilhado");
  expect(compartilhado).toBeTruthy();
  expect(compartilhado.entidade).toBe("divisaoDespesa");
  expect(compartilhado.usuarioId).toBe(uidA);
  expect(compartilhado.participantes).toEqual([{ uid: uidB, nome: "João" }]);

  const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
  expect(gastoIdDaCota(despesaSnap.data(), uidA)).toBe(resposta.gastoId);

  // O convidado ainda não tem gasto (só ganha um se aceitar) — o convite
  // recebido fica só sob o eventoId da despesaCompartilhada.
  const eventosConvidado = await eventosDe(uidB, resposta.eventoId);
  expect(eventosConvidado).toHaveLength(1);
  expect(eventosConvidado[0].acao).toBe("convite_recebido");
  expect(eventosConvidado[0].usuarioId).toBe(uidA);
  expect(eventosConvidado[0].participantes).toEqual([{ uid: uidA, nome: "Criador" }]);
});

describe("aceitarConviteDivisao / recusarConviteDivisao", () => {
  async function criarDivisaoEntreDuas(nomeA, nomeB, valorTotalCentavos, cotaB) {
    const uidA = await criarUsuario(nomeA);
    const uidB = await criarUsuario(nomeB);
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos,
      cotas: [{ uidParticipante: uidB, valorCentavos: cotaB }],
    });
    return { uidA, uidB, ...resposta };
  }

  test("aceitar cria o gasto do convidado e marca aceito nos dois lados", async () => {
    const { uidA, uidB, eventoId, gastoId: gastoIdCriador } = await criarDivisaoEntreDuas(
      "Criador",
      "João",
      10000,
      4000
    );

    const resposta = await chamarAceitar(uidB, { eventoId });
    expect(resposta.ok).toBe(true);
    expect(resposta.status).toBe("aceito");
    expect(resposta.gastoId).toBeTruthy();

    const gastoSnap = await db.doc(`users/${uidB}/gastos/${resposta.gastoId}`).get();
    const gasto = gastoSnap.data();
    expect(gasto.valor).toBe(40); // 4000 centavos
    expect(gasto.origemCompartilhamento).toEqual({ eventoId, deUsuarioId: uidA });

    const conviteSnap = await db.doc(`users/${uidB}/convitesDeDivisao/${eventoId}`).get();
    expect(conviteSnap.data().status).toBe("aceito");

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    const cotaB = despesaSnap.data().cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.status).toBe("aceito");
    // cotas[].gastoId (seção 11.1) — preenchido no aceite, mesmo mecanismo do criador.
    expect(cotaB.gastoId).toBe(resposta.gastoId);

    // Cada lado recebe o evento sob o entidadeId do PRÓPRIO gasto — o do
    // criador (já existia) e o do convidado (acabou de ser criado agora
    // mesmo) — ver bug corrigido em 2026-08-14.
    const eventosCriador = await eventosDe(uidA, gastoIdCriador);
    expect(eventosCriador.some((e) => e.acao === "convite_aceito" && e.usuarioId === uidB)).toBe(true);
    const eventosConvidado = await eventosDe(uidB, resposta.gastoId);
    expect(eventosConvidado.some((e) => e.acao === "convite_aceito" && e.usuarioId === uidB)).toBe(true);
  });

  test("recusar não cria gasto e marca recusado nos dois lados", async () => {
    const { uidA, uidB, eventoId, gastoId: gastoIdCriador } = await criarDivisaoEntreDuas(
      "Criador",
      "João",
      10000,
      4000
    );

    const resposta = await chamarRecusar(uidB, { eventoId });
    expect(resposta.status).toBe("recusado");
    expect(resposta.gastoId).toBeNull();

    const conviteSnap = await db.doc(`users/${uidB}/convitesDeDivisao/${eventoId}`).get();
    expect(conviteSnap.data().status).toBe("recusado");

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    const cotaB = despesaSnap.data().cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.status).toBe("recusado");

    // Criador tem gasto próprio (evento fica lá); convidado nunca chega a
    // ter gasto neste fluxo, então fica só sob o eventoId da despesa.
    const eventosCriador = await eventosDe(uidA, gastoIdCriador);
    expect(eventosCriador.some((e) => e.acao === "convite_recusado")).toBe(true);
    const eventosConvidado = await eventosDe(uidB, eventoId);
    expect(eventosConvidado.some((e) => e.acao === "convite_recusado")).toBe(true);
  });

  test("rejeita responder um convite inexistente", async () => {
    const uidB = await criarUsuario("João");
    await expect(chamarAceitar(uidB, { eventoId: "nao-existe" })).rejects.toThrow();
  });

  test("rejeita responder um convite já respondido", async () => {
    const { uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    await chamarAceitar(uidB, { eventoId });
    await expect(chamarRecusar(uidB, { eventoId })).rejects.toThrow();
  });

  test("expiração: convite pendente com mais de 15 dias não pode ser aceito e vira 'expirado' nos dois lados", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    const dezesseisDiasAtras = Timestamp.fromMillis(Date.now() - 16 * 24 * 60 * 60 * 1000);
    await db.doc(`users/${uidB}/convitesDeDivisao/${resposta.eventoId}`).update({
      criadoEm: dezesseisDiasAtras,
    });

    await expect(chamarAceitar(uidB, { eventoId: resposta.eventoId })).rejects.toThrow();

    const conviteSnap = await db.doc(`users/${uidB}/convitesDeDivisao/${resposta.eventoId}`).get();
    expect(conviteSnap.data().status).toBe("expirado");

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaB = despesaSnap.data().cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.status).toBe("expirado");
  });
});

describe("cancelarConviteDivisao", () => {
  async function criarDivisaoEntreDuas(nomeA, nomeB, valorTotalCentavos, cotaB) {
    const uidA = await criarUsuario(nomeA);
    const uidB = await criarUsuario(nomeB);
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos,
      cotas: [{ uidParticipante: uidB, valorCentavos: cotaB }],
    });
    return { uidA, uidB, ...resposta };
  }

  test("criador cancela um convite pendente com sucesso", async () => {
    const { uidA, uidB, eventoId, gastoId: gastoIdCriador } = await criarDivisaoEntreDuas(
      "Criador",
      "João",
      10000,
      4000
    );

    const resposta = await chamarCancelar(uidA, { eventoId, uidParticipante: uidB });
    expect(resposta.ok).toBe(true);
    expect(resposta.status).toBe("cancelado");

    const conviteSnap = await db.doc(`users/${uidB}/convitesDeDivisao/${eventoId}`).get();
    expect(conviteSnap.data().status).toBe("cancelado");

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    const cotaB = despesaSnap.data().cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.status).toBe("cancelado");

    // Seção 11.3 — sem `destino`, o valor NUNCA volta automaticamente pro
    // criador: fica acumulado em valorSemDestinoCentavos, cota do criador
    // intocada.
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(4000);
    const cotaA = despesaSnap.data().cotas.find((c) => c.participanteId === uidA);
    expect(cotaA.valorCentavos).toBe(6000); // intocada (10000 - 4000, valor original)
    const gastoCriadorSnap = await db.doc(`users/${uidA}/gastos/${gastoIdCriador}`).get();
    expect(gastoCriadorSnap.data().valor).toBe(60); // também intocado

    // Criador (sempre tem gasto próprio) recebe sob o entidadeId do gasto;
    // convidado nunca teve gasto (convite ainda pendente), fica sob eventoId.
    const eventosA = await eventosDe(uidA, gastoIdCriador);
    expect(eventosA.some((e) => e.acao === "convite_cancelado")).toBe(true);
    const eventosB = await eventosDe(uidB, eventoId);
    expect(eventosB.some((e) => e.acao === "convite_cancelado")).toBe(true);
  });

  test("rejeita cancelamento por quem não é o criador", async () => {
    const { uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    await expect(chamarCancelar(uidB, { eventoId, uidParticipante: uidB })).rejects.toThrow();
  });

  test("rejeita cancelar um convite já aceito", async () => {
    const { uidA, uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    await chamarAceitar(uidB, { eventoId });
    await expect(chamarCancelar(uidA, { eventoId, uidParticipante: uidB })).rejects.toThrow();
  });

  test("rejeita cancelar um convite inexistente", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await expect(
      chamarCancelar(uidA, { eventoId: "nao-existe", uidParticipante: uidB })
    ).rejects.toThrow();
  });
});

describe("atualizarDivisaoDespesa", () => {
  async function criarDivisaoEntreDuas(nomeA, nomeB, valorTotalCentavos, cotaB) {
    const uidA = await criarUsuario(nomeA);
    const uidB = await criarUsuario(nomeB);
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos,
      cotas: [{ uidParticipante: uidB, valorCentavos: cotaB }],
    });
    return { uidA, uidB, ...resposta };
  }

  test("edita descrição, valor total e cota do participante pendente", async () => {
    const { uidA, uidB, eventoId, gastoId: gastoIdCriador } = await criarDivisaoEntreDuas(
      "Criador",
      "João",
      10000,
      4000
    );

    const resposta = await chamarAtualizar(uidA, {
      eventoId,
      descricao: "Jantar atualizado",
      valorTotalCentavos: 20000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 8000 }],
    });
    expect(resposta.ok).toBe(true);
    expect(resposta.minhaCotaCentavos).toBe(12000); // 20000 - 8000

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    const despesa = despesaSnap.data();
    expect(despesa.descricao).toBe("Jantar atualizado");
    expect(despesa.valorTotalCentavos).toBe(20000);
    const cotaCriador = despesa.cotas.find((c) => c.participanteId === uidA);
    expect(cotaCriador.valorCentavos).toBe(12000);
    const cotaB = despesa.cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.valorCentavos).toBe(8000);

    const conviteSnap = await db.doc(`users/${uidB}/convitesDeDivisao/${eventoId}`).get();
    expect(conviteSnap.data().minhaCotaCentavos).toBe(8000);
    expect(conviteSnap.data().descricao).toBe("Jantar atualizado");

    // O gasto do criador precisa refletir a cota nova (12000 centavos =
    // R$120,00) e a descrição nova — bug corrigido em 2026-08-14 (editar a
    // divisão não mudava nada no gasto de verdade).
    const gastoCriadorSnap = await db.doc(`users/${uidA}/gastos/${gastoIdCriador}`).get();
    expect(gastoCriadorSnap.data().valor).toBe(120);
    expect(gastoCriadorSnap.data().descricao).toBe("Jantar atualizado");

    // Criador (sempre tem gasto próprio) recebe sob o entidadeId do gasto;
    // convidado ainda pendente (sem gasto) fica sob eventoId.
    const eventosA = await eventosDe(uidA, gastoIdCriador);
    expect(eventosA.some((e) => e.acao === "editado")).toBe(true);
    const eventosB = await eventosDe(uidB, eventoId);
    expect(eventosB.some((e) => e.acao === "editado")).toBe(true);
  });

  test("rejeita edição depois que o participante já aceitou", async () => {
    const { uidA, uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    await chamarAceitar(uidB, { eventoId });

    await expect(
      chamarAtualizar(uidA, { eventoId, descricao: "Outra coisa" })
    ).rejects.toThrow();
  });

  test("rejeita edição por quem não é o criador", async () => {
    const { uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    await expect(chamarAtualizar(uidB, { eventoId, descricao: "Outra coisa" })).rejects.toThrow();
  });

  test("rejeita tentar adicionar um novo participante via atualizarDivisaoDespesa", async () => {
    const { uidA, uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    const uidC = await criarUsuario("Maria");

    await expect(
      chamarAtualizar(uidA, {
        eventoId,
        cotas: [
          { uidParticipante: uidB, valorCentavos: 4000 },
          { uidParticipante: uidC, valorCentavos: 1000 },
        ],
      })
    ).rejects.toThrow();
  });

  test("rejeita se a nova soma deixar a cota do criador negativa", async () => {
    const { uidA, uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);

    await expect(
      chamarAtualizar(uidA, {
        eventoId,
        cotas: [{ uidParticipante: uidB, valorCentavos: 15000 }],
      })
    ).rejects.toThrow();
  });

  test("permite editar mesmo depois de uma recusa (só bloqueia depois de aceite)", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 30000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { uidParticipante: uidC, valorCentavos: 10000 },
      ],
    });
    await chamarRecusar(uidB, { eventoId: resposta.eventoId });

    const atualizacao = await chamarAtualizar(uidA, {
      eventoId: resposta.eventoId,
      cotas: [{ uidParticipante: uidC, valorCentavos: 15000 }],
    });
    expect(atualizacao.ok).toBe(true);
  });
});

describe("status 'ativa'/'encerrada' e encerrarCompartilhamento (Etapa 3.6, seção 11.1)", () => {
  async function criarDivisaoEntreDuas(nomeA, nomeB, valorTotalCentavos, cotaB) {
    const uidA = await criarUsuario(nomeA);
    const uidB = await criarUsuario(nomeB);
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos,
      cotas: [{ uidParticipante: uidB, valorCentavos: cotaB }],
    });
    return { uidA, uidB, ...resposta };
  }

  test("despesa nasce com status 'ativa'", async () => {
    const { uidA, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaSnap.data().status).toBe("ativa");
  });

  test("encerra uma divisão só com convites pendentes: cancela tudo e marca 'encerrada'", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 30000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { uidParticipante: uidC, valorCentavos: 10000 },
      ],
    });

    const encerramento = await chamarEncerrar(uidA, { eventoId: resposta.eventoId });
    expect(encerramento.ok).toBe(true);
    expect(encerramento.status).toBe("encerrada");
    // Seção 11.3 — encerrar é a exceção: devolve tudo automaticamente pro
    // criador (10000 de uidB + 10000 de uidC), sem "sem destino" nenhum.
    expect(encerramento.valorDevolvidoAoCriadorCentavos).toBe(20000);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const despesa = despesaSnap.data();
    expect(despesa.status).toBe("encerrada");
    expect(despesa.encerradaPor).toBe(uidA);
    expect(despesa.valorSemDestinoCentavos).toBe(0);
    expect(despesa.cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(30000); // 10000 (original) + 20000 devolvidos
    expect(despesa.cotas.find((c) => c.participanteId === uidB).status).toBe("cancelado");
    expect(despesa.cotas.find((c) => c.participanteId === uidC).status).toBe("cancelado");

    const gastoCriadorSnap = await db.doc(`users/${uidA}/gastos/${resposta.gastoId}`).get();
    expect(gastoCriadorSnap.data().valor).toBe(300); // 100 (original) + 200 devolvidos

    const conviteB = await db.doc(`users/${uidB}/convitesDeDivisao/${resposta.eventoId}`).get();
    expect(conviteB.data().status).toBe("cancelado");
    const eventosB = await eventosDe(uidB, resposta.eventoId);
    expect(eventosB.some((e) => e.acao === "convite_cancelado")).toBe(true);

    // Depois de encerrada, ninguém mais consegue aceitar.
    await expect(chamarAceitar(uidB, { eventoId: resposta.eventoId })).rejects.toThrow();
  });

  test("encerra uma divisão com participante já aceito: gasto dele permanece intocado", async () => {
    const { uidA, uidB, eventoId, gastoId: gastoIdCriador } = await criarDivisaoEntreDuas(
      "Criador",
      "João",
      10000,
      4000
    );
    const aceite = await chamarAceitar(uidB, { eventoId });

    const encerramento = await chamarEncerrar(uidA, { eventoId });
    expect(encerramento.ok).toBe(true);

    const gastoBSnap = await db.doc(`users/${uidB}/gastos/${aceite.gastoId}`).get();
    expect(gastoBSnap.exists).toBe(true);
    expect(gastoBSnap.data().valor).toBe(40); // intocado
    // Sinal pra UI dela parar de mostrar o ícone de "compartilhado ativo"
    // (2026-08-17) — nunca apaga/altera o resto do gasto.
    expect(gastoBSnap.data().origemCompartilhamento.encerrado).toBe(true);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    const cotaB = despesaSnap.data().cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.status).toBe("aceito"); // não vira "cancelado" — ele já aceitou

    // João é avisado sob o entidadeId do PRÓPRIO gasto (já existe, aceitou antes).
    const eventosB = await eventosDe(uidB, aceite.gastoId);
    expect(eventosB.some((e) => e.acao === "compartilhamento_encerrado")).toBe(true);
    const eventosA = await eventosDe(uidA, gastoIdCriador);
    expect(eventosA.some((e) => e.acao === "compartilhamento_encerrado")).toBe(true);
  });

  test("rejeita encerrar por quem não é o criador", async () => {
    const { uidB, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    await expect(chamarEncerrar(uidB, { eventoId })).rejects.toThrow();
  });

  test("rejeita encerrar uma divisão que já está encerrada", async () => {
    const { uidA, eventoId } = await criarDivisaoEntreDuas("Criador", "João", 10000, 4000);
    await chamarEncerrar(uidA, { eventoId });
    await expect(chamarEncerrar(uidA, { eventoId })).rejects.toThrow();
  });

  test("rejeita recusar/atualizar uma divisão encerrada", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 20000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 5000 }],
    });
    await chamarEncerrar(uidA, { eventoId: resposta.eventoId });

    await expect(chamarRecusar(uidB, { eventoId: resposta.eventoId })).rejects.toThrow();
    await expect(
      chamarAtualizar(uidA, { eventoId: resposta.eventoId, descricao: "Outra coisa" })
    ).rejects.toThrow();
  });

  test("rejeita encerrar uma divisão inexistente", async () => {
    const uidA = await criarUsuario("Criador");
    await expect(chamarEncerrar(uidA, { eventoId: "nao-existe" })).rejects.toThrow();
  });

  test("encerrar também resolve um valorSemDestinoCentavos que já existia de um cancelamento anterior", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 30000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { uidParticipante: uidC, valorCentavos: 10000 },
      ],
    });

    // Cancela B sem destino — vira "sem destino" (10000).
    await chamarCancelar(uidA, { eventoId: resposta.eventoId, uidParticipante: uidB });
    const despesaAntes = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    expect(despesaAntes.data().valorSemDestinoCentavos).toBe(10000);

    // Encerrar cancela o pendente restante (C, 10000) + resolve o que já
    // estava sem destino (10000 de B) — os 20000 todos voltam pro criador.
    const encerramento = await chamarEncerrar(uidA, { eventoId: resposta.eventoId });
    expect(encerramento.valorDevolvidoAoCriadorCentavos).toBe(20000);

    const despesaDepois = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    expect(despesaDepois.data().valorSemDestinoCentavos).toBe(0);
    expect(despesaDepois.data().cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(30000);
  });
});

describe("modelo de 'valor sem destino' — destino no cancelamento e resolverValorSemDestino (seção 11.3, 2026-08-17)", () => {
  async function criarDivisaoComTres(valorTotalCentavos, cotaB, cotaC) {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos,
      cotas: [
        { uidParticipante: uidB, valorCentavos: cotaB },
        { uidParticipante: uidC, valorCentavos: cotaC },
      ],
    });
    return { uidA, uidB, uidC, ...resposta };
  }

  test("cancelar com destino 'criador' resolve na hora, sem deixar sem destino", async () => {
    const { uidA, uidB, eventoId, gastoId } = await criarDivisaoComTres(30000, 10000, 10000);

    const resposta = await chamarCancelar(uidA, {
      eventoId,
      uidParticipante: uidB,
      destino: { tipo: "criador" },
    });
    expect(resposta.valorSemDestinoCentavos).toBe(0);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(0);
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(20000); // 10000 + 10000

    const gastoSnap = await db.doc(`users/${uidA}/gastos/${gastoId}`).get();
    expect(gastoSnap.data().valor).toBe(200);
  });

  test("cancelar com destino 'participante' soma na cota de outro pendente", async () => {
    const { uidA, uidB, uidC, eventoId } = await criarDivisaoComTres(30000, 10000, 10000);

    await chamarCancelar(uidA, {
      eventoId,
      uidParticipante: uidB,
      destino: { tipo: "participante", participanteId: uidC },
    });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    const cotaC = despesaSnap.data().cotas.find((c) => c.participanteId === uidC);
    expect(cotaC.valorCentavos).toBe(20000); // 10000 + 10000
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(0);

    const conviteC = await db.doc(`users/${uidC}/convitesDeDivisao/${eventoId}`).get();
    expect(conviteC.data().minhaCotaCentavos).toBe(20000);
  });

  test("rejeita atribuir a um participante que já aceitou ou não existe na divisão", async () => {
    const { uidA, uidB, uidC, eventoId } = await criarDivisaoComTres(30000, 10000, 10000);
    await chamarAceitar(uidC, { eventoId });

    await expect(
      chamarCancelar(uidA, {
        eventoId,
        uidParticipante: uidB,
        destino: { tipo: "participante", participanteId: uidC },
      })
    ).rejects.toThrow();

    const uidD = await criarUsuario("Alguém de fora");
    await expect(
      chamarCancelar(uidA, {
        eventoId,
        uidParticipante: uidB,
        destino: { tipo: "participante", participanteId: uidD },
      })
    ).rejects.toThrow();
  });

  test("cancelar com destino 'redistribuir' divide em partes iguais entre os pendentes restantes", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    const uidD = await criarUsuario("Pedro");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    await conectar(uidA, uidD);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 40000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { uidParticipante: uidC, valorCentavos: 10000 },
        { uidParticipante: uidD, valorCentavos: 10000 },
      ],
    });

    // Cancela B (10000) redistribuindo entre C e D (5000 cada).
    await chamarCancelar(uidA, {
      eventoId: resposta.eventoId,
      uidParticipante: uidB,
      destino: { tipo: "redistribuir" },
    });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotas = despesaSnap.data().cotas;
    expect(cotas.find((c) => c.participanteId === uidC).valorCentavos).toBe(15000);
    expect(cotas.find((c) => c.participanteId === uidD).valorCentavos).toBe(15000);
    expect(cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(10000); // criador intocado
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(0);
  });

  test("redistribuir com resto de arredondamento manda o resto pro criador", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    const uidD = await criarUsuario("Pedro");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    await conectar(uidA, uidD);
    // 101 centavos cancelados / 2 pendentes restantes = 50 cada + 1 de resto.
    const resposta = await chamar(uidA, {
      descricao: "Rateio",
      valorTotalCentavos: 10000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 101 },
        { uidParticipante: uidC, valorCentavos: 50 },
        { uidParticipante: uidD, valorCentavos: 50 },
      ],
    });
    const cotaCriadorAntes = 10000 - 101 - 50 - 50; // 9799

    await chamarCancelar(uidA, {
      eventoId: resposta.eventoId,
      uidParticipante: uidB,
      destino: { tipo: "redistribuir" },
    });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotas = despesaSnap.data().cotas;
    expect(cotas.find((c) => c.participanteId === uidC).valorCentavos).toBe(100); // 50 + 50
    expect(cotas.find((c) => c.participanteId === uidD).valorCentavos).toBe(100); // 50 + 50
    expect(cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(cotaCriadorAntes + 1); // resto
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(0);
  });

  test("rejeita redistribuir quando não há mais ninguém pendente", async () => {
    const { uidA, uidB, uidC, eventoId } = await criarDivisaoComTres(30000, 10000, 10000);
    await chamarAceitar(uidC, { eventoId }); // só resta B pendente

    await expect(
      chamarCancelar(uidA, {
        eventoId,
        uidParticipante: uidB,
        destino: { tipo: "redistribuir" },
      })
    ).rejects.toThrow();
  });

  test("resolverValorSemDestino aplica o destino a um valor decidido depois", async () => {
    const { uidA, uidB, eventoId, gastoId } = await criarDivisaoComTres(30000, 10000, 10000);

    await chamarCancelar(uidA, { eventoId, uidParticipante: uidB }); // sem destino
    const despesaAntes = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaAntes.data().valorSemDestinoCentavos).toBe(10000);

    const resolucao = await chamarResolver(uidA, { eventoId, destino: { tipo: "criador" } });
    expect(resolucao.ok).toBe(true);
    expect(resolucao.valorResolvidoCentavos).toBe(10000);

    const despesaDepois = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaDepois.data().valorSemDestinoCentavos).toBe(0);
    expect(despesaDepois.data().cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(20000);

    const gastoSnap = await db.doc(`users/${uidA}/gastos/${gastoId}`).get();
    expect(gastoSnap.data().valor).toBe(200);
  });

  test("rejeita resolverValorSemDestino quando não há valor sem destino", async () => {
    const { uidA, eventoId } = await criarDivisaoComTres(30000, 10000, 10000);
    await expect(chamarResolver(uidA, { eventoId, destino: { tipo: "criador" } })).rejects.toThrow();
  });

  test("rejeita resolverValorSemDestino por quem não é o criador", async () => {
    const { uidB, eventoId } = await criarDivisaoComTres(30000, 10000, 10000);
    await expect(chamarResolver(uidB, { eventoId, destino: { tipo: "criador" } })).rejects.toThrow();
  });

  test("atualizarDivisaoDespesa respeita o valor sem destino no cálculo da cota do criador", async () => {
    const { uidA, uidB, uidC, eventoId } = await criarDivisaoComTres(30000, 10000, 10000);

    await chamarCancelar(uidA, { eventoId, uidParticipante: uidB }); // 10000 fica sem destino

    // Editar a cota de C pra 15000, mantendo o total em 30000 — a cota do
    // criador precisa considerar que 10000 ainda estão "sem destino", não
    // disponíveis pra ele.
    const atualizacao = await chamarAtualizar(uidA, {
      eventoId,
      cotas: [{ uidParticipante: uidC, valorCentavos: 15000 }],
    });
    // 30000 - 15000 (C) - 10000 (sem destino) = 5000
    expect(atualizacao.minhaCotaCentavos).toBe(5000);
  });

  test("registra evento 'redistribuido' nos dois lados quando o destino é resolvido", async () => {
    const { uidA, uidB, uidC, eventoId, gastoId } = await criarDivisaoComTres(30000, 10000, 10000);

    await chamarCancelar(uidA, {
      eventoId,
      uidParticipante: uidB,
      destino: { tipo: "participante", participanteId: uidC },
    });

    const eventosA = await eventosDe(uidA, gastoId);
    expect(eventosA.some((e) => e.acao === "redistribuido")).toBe(true);
    const eventosC = await eventosDe(uidC, eventoId);
    expect(eventosC.some((e) => e.acao === "redistribuido")).toBe(true);
  });

  test("redistribuir proporcionalmente reparte de acordo com o que cada pendente já tinha", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    const uidD = await criarUsuario("Pedro");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    await conectar(uidA, uidD);
    // C tem o dobro da cota de D — na redistribuição proporcional, C deve
    // ganhar o dobro do que D ganha.
    const resposta = await chamar(uidA, {
      descricao: "Rateio",
      valorTotalCentavos: 40000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 9000 },
        { uidParticipante: uidC, valorCentavos: 20000 },
        { uidParticipante: uidD, valorCentavos: 10000 },
      ],
    });

    await chamarCancelar(uidA, {
      eventoId: resposta.eventoId,
      uidParticipante: uidB,
      destino: { tipo: "redistribuir", proporcional: true },
    });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotas = despesaSnap.data().cotas;
    // 9000 distribuídos proporcionalmente entre 20000 e 10000 (soma 30000):
    // C ganha floor(9000*20000/30000)=6000, D ganha floor(9000*10000/30000)=3000.
    expect(cotas.find((c) => c.participanteId === uidC).valorCentavos).toBe(26000);
    expect(cotas.find((c) => c.participanteId === uidD).valorCentavos).toBe(13000);
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(0);
  });
});

describe("Membro sem conta (seção 7, 2026-08-17)", () => {
  test("cria divisão com Membro sem conta: cota nasce direto 'aceito', sem convite", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const membroId = await criarMembro(uidA, "Cônjuge");

    const resposta = await chamar(uidA, {
      descricao: "Compras da casa",
      valorTotalCentavos: 30000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { membroId, valorCentavos: 5000 },
      ],
    });

    expect(resposta.ok).toBe(true);
    expect(resposta.minhaCotaCentavos).toBe(15000); // 30000 - 10000 - 5000

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaMembro = despesaSnap.data().cotas.find((c) => c.participanteId === membroId);
    expect(cotaMembro.participanteTipo).toBe("membroSemConta");
    expect(cotaMembro.status).toBe("aceito");
    expect(cotaMembro.gastoId).toBeNull();
    expect(cotaMembro.nomeExibicao).toBe("Cônjuge");

    // Nenhum convite é criado para o Membro (não tem conta pra receber nada).
    const conviteMembro = await db.doc(`users/${membroId}/convitesDeDivisao/${resposta.eventoId}`).get();
    expect(conviteMembro.exists).toBe(false);
  });

  test("atualizarDivisaoDespesa edita a cota do Membro livremente antes do primeiro aceite real", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const membroId = await criarMembro(uidA, "Cônjuge");

    const resposta = await chamar(uidA, {
      descricao: "Compras da casa",
      valorTotalCentavos: 30000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { membroId, valorCentavos: 5000 },
      ],
    });

    // Cota do Membro já está 'aceito', mas isso não deveria travar a edição
    // (não é consentimento de terceiro real).
    const atualizacao = await chamarAtualizar(uidA, {
      eventoId: resposta.eventoId,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { membroId, valorCentavos: 8000 },
      ],
    });
    expect(atualizacao.ok).toBe(true);
    expect(atualizacao.minhaCotaCentavos).toBe(12000); // 30000 - 10000 - 8000

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaMembro = despesaSnap.data().cotas.find((c) => c.participanteId === membroId);
    expect(cotaMembro.valorCentavos).toBe(8000);
  });

  // Decisão revista em 2026-08-17: a trava de "já aceitou" só protege
  // descrição/valor total (o que a pessoa de fato concordou) — editar só a
  // cota de um Membro sem conta nunca toca no valor de quem já aceitou (a
  // diferença fica sempre entre o criador e o Membro), então continua
  // permitido mesmo depois de um aceite real.
  test("permite editar a cota do Membro sem conta mesmo depois que um participante COM conta já aceitou", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const membroId = await criarMembro(uidA, "Cônjuge");

    const resposta = await chamar(uidA, {
      descricao: "Compras da casa",
      valorTotalCentavos: 30000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { membroId, valorCentavos: 5000 },
      ],
    });
    await chamarAceitar(uidB, { eventoId: resposta.eventoId });

    await chamarAtualizar(uidA, {
      eventoId: resposta.eventoId,
      cotas: [{ membroId, valorCentavos: 8000 }],
    });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaMembro = despesaSnap.data().cotas.find((c) => c.participanteId === membroId);
    expect(cotaMembro.valorCentavos).toBe(8000);
    // Cota de quem já aceitou fica intocada — a diferença veio da cota do
    // próprio criador, nunca da de quem já aceitou.
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidB).valorCentavos).toBe(10000);
  });

  test("rejeita editar descrição/valor total depois que um participante COM conta já aceitou, mesmo com Membro na divisão", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const membroId = await criarMembro(uidA, "Cônjuge");

    const resposta = await chamar(uidA, {
      descricao: "Compras da casa",
      valorTotalCentavos: 30000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 10000 },
        { membroId, valorCentavos: 5000 },
      ],
    });
    await chamarAceitar(uidB, { eventoId: resposta.eventoId });

    await expect(
      chamarAtualizar(uidA, { eventoId: resposta.eventoId, descricao: "Outro nome" })
    ).rejects.toThrow();
  });
});

describe("adicionarParticipante (Etapa 3.8, 2026-08-17)", () => {
  test("adiciona uma conexão com conta, reduzindo só a cota do criador", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    const adicao = await chamarAdicionar(uidA, {
      eventoId: resposta.eventoId,
      uidParticipante: uidC,
      valorCentavos: 3000,
    });
    expect(adicao.ok).toBe(true);
    expect(adicao.minhaCotaCentavos).toBe(3000); // 6000 - 3000

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaC = despesaSnap.data().cotas.find((c) => c.participanteId === uidC);
    expect(cotaC.status).toBe("pendente");
    expect(cotaC.valorCentavos).toBe(3000);

    const conviteC = await db.doc(`users/${uidC}/convitesDeDivisao/${resposta.eventoId}`).get();
    expect(conviteC.data().status).toBe("pendente");
    expect(conviteC.data().minhaCotaCentavos).toBe(3000);
  });

  test("adiciona um Membro sem conta direto como 'aceito', sem convite", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });
    const membroId = await criarMembro(uidA, "Cônjuge");

    const adicao = await chamarAdicionar(uidA, {
      eventoId: resposta.eventoId,
      membroId,
      valorCentavos: 2000,
    });
    expect(adicao.minhaCotaCentavos).toBe(4000); // 6000 - 2000

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaMembro = despesaSnap.data().cotas.find((c) => c.participanteId === membroId);
    expect(cotaMembro.status).toBe("aceito");
    expect(cotaMembro.participanteTipo).toBe("membroSemConta");
  });

  test("permite adicionar participante mesmo depois que outro já aceitou — só reduz a própria cota", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });
    await chamarAceitar(uidB, { eventoId: resposta.eventoId });

    const adicao = await chamarAdicionar(uidA, {
      eventoId: resposta.eventoId,
      uidParticipante: uidC,
      valorCentavos: 1000,
    });
    expect(adicao.ok).toBe(true);
  });

  test("rejeita adicionar com valor maior do que a cota disponível do criador", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 9000 }],
    });

    await expect(
      chamarAdicionar(uidA, { eventoId: resposta.eventoId, uidParticipante: uidC, valorCentavos: 2000 })
    ).rejects.toThrow();
  });

  test("rejeita adicionar quem já faz parte da divisão", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    await expect(
      chamarAdicionar(uidA, { eventoId: resposta.eventoId, uidParticipante: uidB, valorCentavos: 1000 })
    ).rejects.toThrow();
  });

  test("rejeita adicionar por quem não é o criador e numa divisão encerrada", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Jantar",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    await expect(
      chamarAdicionar(uidB, { eventoId: resposta.eventoId, uidParticipante: uidC, valorCentavos: 1000 })
    ).rejects.toThrow();

    await chamarEncerrar(uidA, { eventoId: resposta.eventoId });
    await expect(
      chamarAdicionar(uidA, { eventoId: resposta.eventoId, uidParticipante: uidC, valorCentavos: 1000 })
    ).rejects.toThrow();
  });
});

describe("alteração pós-aceite: proporAlteracaoCota / responderPropostaAlteracao (Etapa 3.9, 2026-08-17)", () => {
  async function criarEAceitar(valorTotalCentavos, cotaB) {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos,
      cotas: [{ uidParticipante: uidB, valorCentavos: cotaB }],
    });
    const aceite = await chamarAceitar(uidB, { eventoId: resposta.eventoId });
    return { uidA, uidB, ...resposta, gastoIdB: aceite.gastoId };
  }

  test("propor reduzir com destino 'criador': aceitar aplica o novo valor e devolve o resto pro criador", async () => {
    const { uidA, uidB, eventoId, gastoId, gastoIdB } = await criarEAceitar(10000, 4000);

    const proposta = await chamarPropor(uidA, {
      eventoId,
      participanteId: uidB,
      novoValorCentavos: 1000,
      destino: { tipo: "criador" },
    });
    expect(proposta.ok).toBe(true);

    const despesaAntes = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaAntes.data().cotas.find((c) => c.participanteId === uidB).propostaPendenteId).toBe(
      proposta.propostaId
    );
    // Nada muda de valor até a resposta.
    expect(despesaAntes.data().cotas.find((c) => c.participanteId === uidB).valorCentavos).toBe(4000);

    const resposta = await chamarResponderProposta(uidB, { propostaId: proposta.propostaId, aceitar: true });
    expect(resposta.status).toBe("aceita");

    const despesaDepois = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    const cotaB = despesaDepois.data().cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.valorCentavos).toBe(1000);
    expect(cotaB.propostaPendenteId).toBeNull();
    expect(despesaDepois.data().cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(9000); // 6000 + 3000
    expect(despesaDepois.data().valorSemDestinoCentavos).toBe(0);

    const gastoBSnap = await db.doc(`users/${uidB}/gastos/${gastoIdB}`).get();
    expect(gastoBSnap.data().valor).toBe(10);
    const gastoASnap = await db.doc(`users/${uidA}/gastos/${gastoId}`).get();
    expect(gastoASnap.data().valor).toBe(90);
  });

  test("propor reduzir sem destino: valor liberado fica sem destino até ser resolvido", async () => {
    const { uidA, uidB, eventoId } = await criarEAceitar(10000, 4000);

    const proposta = await chamarPropor(uidA, { eventoId, participanteId: uidB, novoValorCentavos: 1000 });
    await chamarResponderProposta(uidB, { propostaId: proposta.propostaId, aceitar: true });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(3000);
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(6000); // intocada
  });

  test("propor aumentar a cota: o acréscimo vem da cota do criador", async () => {
    const { uidA, uidB, eventoId, gastoId, gastoIdB } = await criarEAceitar(10000, 4000);

    const proposta = await chamarPropor(uidA, { eventoId, participanteId: uidB, novoValorCentavos: 5000 });
    await chamarResponderProposta(uidB, { propostaId: proposta.propostaId, aceitar: true });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidB).valorCentavos).toBe(5000);
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(5000); // 6000 - 1000

    const gastoBSnap = await db.doc(`users/${uidB}/gastos/${gastoIdB}`).get();
    expect(gastoBSnap.data().valor).toBe(50);
    const gastoASnap = await db.doc(`users/${uidA}/gastos/${gastoId}`).get();
    expect(gastoASnap.data().valor).toBe(50);
  });

  test("recusar a proposta não altera nenhum valor", async () => {
    const { uidA, uidB, eventoId } = await criarEAceitar(10000, 4000);

    const proposta = await chamarPropor(uidA, { eventoId, participanteId: uidB, novoValorCentavos: 1000 });
    const resposta = await chamarResponderProposta(uidB, { propostaId: proposta.propostaId, aceitar: false });
    expect(resposta.status).toBe("recusada");

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${eventoId}`).get();
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidB).valorCentavos).toBe(4000);
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidB).propostaPendenteId).toBeNull();
  });

  test("rejeita propor aumento maior do que a cota disponível do criador", async () => {
    const { uidA, uidB, eventoId } = await criarEAceitar(10000, 4000);
    // Criador só tem 6000 — propor levar João a 20000 exigiria 16000 extras.
    await expect(
      chamarPropor(uidA, { eventoId, participanteId: uidB, novoValorCentavos: 20000 })
    ).rejects.toThrow();
  });

  test("rejeita propor pra quem ainda não aceitou, e rejeita segunda proposta simultânea", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    await expect(
      chamarPropor(uidA, { eventoId: resposta.eventoId, participanteId: uidB, novoValorCentavos: 1000 })
    ).rejects.toThrow();

    await chamarAceitar(uidB, { eventoId: resposta.eventoId });
    await chamarPropor(uidA, { eventoId: resposta.eventoId, participanteId: uidB, novoValorCentavos: 1000 });
    await expect(
      chamarPropor(uidA, { eventoId: resposta.eventoId, participanteId: uidB, novoValorCentavos: 2000 })
    ).rejects.toThrow();
  });

  test("rejeita responder proposta por quem não é o destinatário", async () => {
    const { uidA, uidB, eventoId } = await criarEAceitar(10000, 4000);
    const proposta = await chamarPropor(uidA, { eventoId, participanteId: uidB, novoValorCentavos: 1000 });
    await expect(
      chamarResponderProposta(uidA, { propostaId: proposta.propostaId, aceitar: true })
    ).rejects.toThrow();
  });

  test("registra eventos 'alteracao_proposta'/'alteracao_aceita' nos dois lados", async () => {
    const { uidA, uidB, eventoId, gastoId, gastoIdB } = await criarEAceitar(10000, 4000);
    const proposta = await chamarPropor(uidA, {
      eventoId,
      participanteId: uidB,
      novoValorCentavos: 1000,
      destino: { tipo: "criador" },
    });

    const eventosPropostaA = await eventosDe(uidA, gastoId);
    expect(eventosPropostaA.some((e) => e.acao === "alteracao_proposta")).toBe(true);
    const eventosPropostaB = await eventosDe(uidB, gastoIdB);
    expect(eventosPropostaB.some((e) => e.acao === "alteracao_proposta")).toBe(true);

    await chamarResponderProposta(uidB, { propostaId: proposta.propostaId, aceitar: true });
    const eventosAceitaA = await eventosDe(uidA, gastoId);
    expect(eventosAceitaA.some((e) => e.acao === "alteracao_aceita")).toBe(true);
    const eventosAceitaB = await eventosDe(uidB, gastoIdB);
    expect(eventosAceitaB.some((e) => e.acao === "alteracao_aceita")).toBe(true);
  });
});

describe("destino 'novoParticipante' — destinar valor a alguém que ainda não fazia parte (seção 11.3, 2026-08-17)", () => {
  test("cancelar com destino 'novoParticipante' cria um convite novo com o valor liberado", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    const cancelamento = await chamarCancelar(uidA, {
      eventoId: resposta.eventoId,
      uidParticipante: uidB,
      destino: { tipo: "novoParticipante", uidParticipante: uidC },
    });
    expect(cancelamento.valorSemDestinoCentavos).toBe(0);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaC = despesaSnap.data().cotas.find((c) => c.participanteId === uidC);
    expect(cotaC.status).toBe("pendente");
    expect(cotaC.valorCentavos).toBe(4000);
    expect(despesaSnap.data().cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(6000); // intocada

    const conviteC = await db.doc(`users/${uidC}/convitesDeDivisao/${resposta.eventoId}`).get();
    expect(conviteC.data().status).toBe("pendente");
    expect(conviteC.data().minhaCotaCentavos).toBe(4000);
  });

  test("cancelar com destino 'novoParticipante' aceita Membro sem conta também", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const membroId = await criarMembro(uidA, "Cônjuge");
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    await chamarCancelar(uidA, {
      eventoId: resposta.eventoId,
      uidParticipante: uidB,
      destino: { tipo: "novoParticipante", membroId },
    });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaMembro = despesaSnap.data().cotas.find((c) => c.participanteId === membroId);
    expect(cotaMembro.participanteTipo).toBe("membroSemConta");
    expect(cotaMembro.status).toBe("aceito");
    expect(cotaMembro.valorCentavos).toBe(4000);
  });

  test("resolverValorSemDestino com destino 'novoParticipante' cria o convite pro valor acumulado", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });
    await chamarCancelar(uidA, { eventoId: resposta.eventoId, uidParticipante: uidB }); // sem destino

    const resolucao = await chamarResolver(uidA, {
      eventoId: resposta.eventoId,
      destino: { tipo: "novoParticipante", uidParticipante: uidC },
    });
    expect(resolucao.valorResolvidoCentavos).toBe(4000);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(0);
    const cotaC = despesaSnap.data().cotas.find((c) => c.participanteId === uidC);
    expect(cotaC.status).toBe("pendente");
    expect(cotaC.valorCentavos).toBe(4000);

    const conviteC = await db.doc(`users/${uidC}/convitesDeDivisao/${resposta.eventoId}`).get();
    expect(conviteC.exists).toBe(true);
  });

  test("rejeita 'novoParticipante' se a pessoa já faz parte da divisão", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [
        { uidParticipante: uidB, valorCentavos: 3000 },
        { uidParticipante: uidC, valorCentavos: 3000 },
      ],
    });

    await expect(
      chamarCancelar(uidA, {
        eventoId: resposta.eventoId,
        uidParticipante: uidB,
        destino: { tipo: "novoParticipante", uidParticipante: uidC },
      })
    ).rejects.toThrow();
  });

  test("rejeita 'novoParticipante' pra quem não é conexão aceita", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidD = await criarUsuario("Desconhecido");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    await expect(
      chamarCancelar(uidA, {
        eventoId: resposta.eventoId,
        uidParticipante: uidB,
        destino: { tipo: "novoParticipante", uidParticipante: uidD },
      })
    ).rejects.toThrow();
  });
});

describe("compartilhar de novo depois de encerrar (seção 11.1, 2026-08-17)", () => {
  test("permite compartilhar o mesmo gasto de novo depois que a divisão anterior foi encerrada", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);

    const gastoRef = db.collection(`users/${uidA}/gastos`).doc();
    await gastoRef.set({
      descricao: "Compra do mercado",
      valor: 100,
      categoriaId: null,
      dataVencimento: "2026-08-01",
      mes: 8,
      ano: 2026,
      pago: false,
      criadoEm: Timestamp.now(),
    });

    const primeira = await chamar(uidA, {
      descricao: "Compra do mercado",
      cotas: [{ uidParticipante: uidB, valorCentavos: 5000 }],
      origemLancamentoId: gastoRef.id,
    });
    await chamarEncerrar(uidA, { eventoId: primeira.eventoId });

    const segunda = await chamar(uidA, {
      descricao: "Compra do mercado (de novo)",
      cotas: [{ uidParticipante: uidC, valorCentavos: 2000 }],
      origemLancamentoId: gastoRef.id,
    });
    expect(segunda.ok).toBe(true);
    expect(segunda.gastoId).toBe(gastoRef.id);
    expect(segunda.eventoId).not.toBe(primeira.eventoId);

    const gastoSnap = await gastoRef.get();
    expect(gastoSnap.data().compartilhamentoId).toBe(segunda.eventoId); // aponta pra divisão nova

    const despesaAntigaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${primeira.eventoId}`).get();
    expect(despesaAntigaSnap.exists).toBe(true); // histórico preservado
    expect(despesaAntigaSnap.data().status).toBe("encerrada");
  });

  test("rejeita compartilhar de novo enquanto a divisão anterior ainda está ativa", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    const uidC = await criarUsuario("Maria");
    await conectar(uidA, uidB);
    await conectar(uidA, uidC);

    const gastoRef = db.collection(`users/${uidA}/gastos`).doc();
    await gastoRef.set({
      descricao: "Compra do mercado",
      valor: 100,
      categoriaId: null,
      dataVencimento: "2026-08-01",
      mes: 8,
      ano: 2026,
      pago: false,
      criadoEm: Timestamp.now(),
    });

    await chamar(uidA, {
      descricao: "Compra do mercado",
      cotas: [{ uidParticipante: uidB, valorCentavos: 5000 }],
      origemLancamentoId: gastoRef.id,
    });

    await expect(
      chamar(uidA, {
        descricao: "Compra do mercado (de novo)",
        cotas: [{ uidParticipante: uidC, valorCentavos: 2000 }],
        origemLancamentoId: gastoRef.id,
      })
    ).rejects.toThrow();
  });
});

describe("removerParticipanteSemConta — excluir um Membro sem conta da divisão (seção 7/11.3, 2026-08-17)", () => {
  test("remove o Membro e acumula o valor como sem destino, quando nenhum destino é informado", async () => {
    const uidA = await criarUsuario("Criador");
    const membroId = await criarMembro(uidA, "Cônjuge");
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ membroId, valorCentavos: 4000 }],
    });

    const remocao = await chamarRemoverMembro(uidA, { eventoId: resposta.eventoId, participanteId: membroId });
    expect(remocao.valorSemDestinoCentavos).toBe(4000);

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    expect(despesaSnap.data().cotas.some((c) => c.participanteId === membroId)).toBe(false);
  });

  test("remove o Membro e devolve o valor pro criador quando destino='criador'", async () => {
    const uidA = await criarUsuario("Criador");
    const membroId = await criarMembro(uidA, "Cônjuge");
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ membroId, valorCentavos: 4000 }],
    });

    await chamarRemoverMembro(uidA, {
      eventoId: resposta.eventoId,
      participanteId: membroId,
      destino: { tipo: "criador" },
    });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const data = despesaSnap.data();
    expect(data.valorSemDestinoCentavos).toBe(0);
    expect(data.cotas.find((c) => c.participanteId === uidA).valorCentavos).toBe(10000);
    expect(data.cotas.some((c) => c.participanteId === membroId)).toBe(false);
  });

  test("rejeita remover um participante com conta por esta Function (precisa de consentimento)", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });

    await expect(
      chamarRemoverMembro(uidA, { eventoId: resposta.eventoId, participanteId: uidB })
    ).rejects.toThrow();
  });

  test("rejeita remover quem não é dono da divisão", async () => {
    const uidA = await criarUsuario("Criador");
    const uidX = await criarUsuario("Intruso");
    const membroId = await criarMembro(uidA, "Cônjuge");
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ membroId, valorCentavos: 4000 }],
    });

    await expect(
      chamarRemoverMembro(uidX, { eventoId: resposta.eventoId, participanteId: membroId })
    ).rejects.toThrow();
  });
});

describe("excluir participante com conta é sempre via proposta (novoValorCentavos: 0, seção 11.3, 2026-08-17)", () => {
  test("aceitar uma proposta de R$0 marca a cota como 'removido', não 'aceito'", async () => {
    const uidA = await criarUsuario("Criador");
    const uidB = await criarUsuario("João");
    await conectar(uidA, uidB);
    const resposta = await chamar(uidA, {
      descricao: "Viagem",
      valorTotalCentavos: 10000,
      cotas: [{ uidParticipante: uidB, valorCentavos: 4000 }],
    });
    await chamarAceitar(uidB, { eventoId: resposta.eventoId });

    const proposta = await chamarPropor(uidA, {
      eventoId: resposta.eventoId,
      participanteId: uidB,
      novoValorCentavos: 0,
    });
    await chamarResponderProposta(uidB, { propostaId: proposta.propostaId, aceitar: true });

    const despesaSnap = await db.doc(`users/${uidA}/despesasCompartilhadas/${resposta.eventoId}`).get();
    const cotaB = despesaSnap.data().cotas.find((c) => c.participanteId === uidB);
    expect(cotaB.status).toBe("removido");
    expect(cotaB.valorCentavos).toBe(0);
    expect(despesaSnap.data().valorSemDestinoCentavos).toBe(4000); // sem destino informado na proposta
  });
});
