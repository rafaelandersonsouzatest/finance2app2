// functions/conexoes.js
// Colaboração entre Usuários — Cloud Functions do handshake de Conexão (ver
// COLABORACAO_ARQUITETURA_V1.md seção 1). Cada Function segue o mesmo
// formato: validar quem chama, validar o destinatário, escrever nas árvores
// dos dois lados atomicamente via Admin SDK.
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { diasDesde, EXPIRACAO_PENDENTE_DIAS } = require("./tempoUtil");

const db = getFirestore();

const COOLDOWN_RECUSA_DIAS = 7;
const LIMITE_PENDENTES_ENVIADAS = 20;

// Encontra, sem `orderBy` (evita índice composto — mesmo cuidado já registrado
// em ARQUITETURA.md para queries do app), o registro de conexão mais recente
// que o próprio usuário tem para um determinado destino.
async function buscarConexaoExistente(uidDono, uidDestino) {
  const snap = await db
    .collection(`users/${uidDono}/conexoes`)
    .where("usuarioConectadoId", "==", uidDestino)
    .get();

  let maisRecente = null;
  snap.forEach((doc) => {
    const dados = doc.data();
    if (!maisRecente || diasDesde(dados.atualizadoEm) < diasDesde(maisRecente.dados.atualizadoEm)) {
      maisRecente = { id: doc.id, dados };
    }
  });
  return maisRecente;
}

exports.solicitarConexao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const uidDestino = request.data?.uidDestino;

  if (typeof uidDestino !== "string" || !uidDestino.trim()) {
    throw new HttpsError("invalid-argument", "Código de conexão inválido.");
  }
  if (uidDestino === meuUid) {
    throw new HttpsError("invalid-argument", "Você não pode se conectar consigo mesmo.");
  }

  const [meuPerfilSnap, destinoPerfilSnap] = await Promise.all([
    db.doc(`users/${meuUid}`).get(),
    db.doc(`users/${uidDestino}`).get(),
  ]);
  if (!destinoPerfilSnap.exists) {
    throw new HttpsError("not-found", "Usuário não encontrado.");
  }

  // Bloqueios — checa os dois sentidos antes de qualquer outra coisa.
  const [euBloqueiSnap, meBloquearamSnap] = await Promise.all([
    db.doc(`users/${meuUid}/bloqueios/${uidDestino}`).get(),
    db.doc(`users/${uidDestino}/bloqueios/${meuUid}`).get(),
  ]);
  if (euBloqueiSnap.exists) {
    throw new HttpsError(
      "failed-precondition",
      "Você bloqueou este usuário — desbloqueie antes de se conectar."
    );
  }
  if (meBloquearamSnap.exists) {
    // Mensagem propositalmente genérica — bloqueio é silencioso (decisão
    // registrada em COLABORACAO_ARQUITETURA_V1.md, 2026-08-13).
    throw new HttpsError("failed-precondition", "Não foi possível enviar a solicitação.");
  }

  const existente = await buscarConexaoExistente(meuUid, uidDestino);

  if (existente) {
    const { id: conexaoIdExistente, dados } = existente;
    const pendenteExpirouAgora =
      dados.status === "pendente" && diasDesde(dados.criadoEm) > EXPIRACAO_PENDENTE_DIAS;

    if (dados.status === "aceita") {
      return { ok: true, status: "aceita", conexaoId: conexaoIdExistente };
    }
    if (dados.status === "pendente" && !pendenteExpirouAgora) {
      return { ok: true, status: "pendente", conexaoId: conexaoIdExistente };
    }
    if (dados.status === "recusada" && dados.papel === "solicitante") {
      const dias = diasDesde(dados.atualizadoEm);
      if (dias < COOLDOWN_RECUSA_DIAS) {
        throw new HttpsError(
          "failed-precondition",
          `Aguarde ${Math.ceil(COOLDOWN_RECUSA_DIAS - dias)} dia(s) antes de tentar se conectar ` +
            "com este usuário novamente."
        );
      }
    }

    if (pendenteExpirouAgora) {
      // Expiração "preguiçosa" (decisão 2026-08-13): só grava de verdade
      // quando alguém de fato mexe nesse registro de novo.
      const batchLimpeza = db.batch();
      batchLimpeza.update(db.doc(`users/${meuUid}/conexoes/${conexaoIdExistente}`), {
        status: "expirada",
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      batchLimpeza.update(db.doc(`users/${uidDestino}/conexoes/${conexaoIdExistente}`), {
        status: "expirada",
        atualizadoEm: FieldValue.serverTimestamp(),
      });
      await batchLimpeza.commit();
    }
    // Nos demais casos (recusada como destinatário, expirada, cancelada,
    // bloqueada) — segue para criar uma solicitação nova, sem cooldown.
  }

  // Limite de pendentes enviadas — desconta as que já expiraram (mesmo
  // critério acima) para não punir o usuário por convites nunca respondidos.
  const pendentesSnap = await db
    .collection(`users/${meuUid}/conexoes`)
    .where("papel", "==", "solicitante")
    .where("status", "==", "pendente")
    .get();
  const pendentesAtivas = pendentesSnap.docs.filter(
    (doc) => diasDesde(doc.data().criadoEm) <= EXPIRACAO_PENDENTE_DIAS
  );
  if (pendentesAtivas.length >= LIMITE_PENDENTES_ENVIADAS) {
    throw new HttpsError(
      "resource-exhausted",
      `Você já tem ${LIMITE_PENDENTES_ENVIADAS} solicitações pendentes enviadas — aguarde ` +
        "alguma resposta antes de enviar mais."
    );
  }

  const meuPerfil = meuPerfilSnap.data() || {};
  const destinoPerfil = destinoPerfilSnap.data() || {};
  const conexaoRef = db.collection(`users/${meuUid}/conexoes`).doc();
  const conexaoId = conexaoRef.id;

  const batch = db.batch();
  batch.set(conexaoRef, {
    usuarioConectadoId: uidDestino,
    nomeExibicao: destinoPerfil.apelido || destinoPerfil.nome || "",
    avatarSnapshot: destinoPerfil.avatarUrl || null,
    papel: "solicitante",
    status: "pendente",
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  batch.set(db.doc(`users/${uidDestino}/conexoes/${conexaoId}`), {
    usuarioConectadoId: meuUid,
    nomeExibicao: meuPerfil.apelido || meuPerfil.nome || "",
    avatarSnapshot: meuPerfil.avatarUrl || null,
    papel: "destinatario",
    status: "pendente",
    criadoEm: FieldValue.serverTimestamp(),
    atualizadoEm: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return { ok: true, status: "pendente", conexaoId };
});

exports.responderConexao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { conexaoId, aceitar, bloquear } = request.data || {};

  if (typeof conexaoId !== "string" || !conexaoId.trim()) {
    throw new HttpsError("invalid-argument", "Solicitação inválida.");
  }
  if (typeof aceitar !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "Informe se a solicitação foi aceita ou recusada."
    );
  }

  const meuDocRef = db.doc(`users/${meuUid}/conexoes/${conexaoId}`);
  const meuDocSnap = await meuDocRef.get();
  if (!meuDocSnap.exists) {
    throw new HttpsError("not-found", "Solicitação não encontrada.");
  }

  const dados = meuDocSnap.data();
  if (dados.papel !== "destinatario") {
    throw new HttpsError(
      "failed-precondition",
      "Só quem recebeu a solicitação pode respondê-la."
    );
  }
  if (dados.status !== "pendente") {
    throw new HttpsError("failed-precondition", "Esta solicitação já foi respondida.");
  }

  const uidSolicitante = dados.usuarioConectadoId;
  const outroDocRef = db.doc(`users/${uidSolicitante}/conexoes/${conexaoId}`);

  if (diasDesde(dados.criadoEm) > EXPIRACAO_PENDENTE_DIAS) {
    // Expiração "preguiçosa" (mesmo critério de solicitarConexao) — marca
    // nos dois lados e informa, em vez de aceitar/recusar algo já expirado.
    const batchExpira = db.batch();
    batchExpira.update(meuDocRef, {
      status: "expirada",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    batchExpira.update(outroDocRef, {
      status: "expirada",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    await batchExpira.commit();
    throw new HttpsError("failed-precondition", "Esta solicitação expirou.");
  }

  const novoStatus = aceitar ? "aceita" : "recusada";

  const batch = db.batch();
  batch.update(meuDocRef, { status: novoStatus, atualizadoEm: FieldValue.serverTimestamp() });
  batch.update(outroDocRef, { status: novoStatus, atualizadoEm: FieldValue.serverTimestamp() });

  // "Recusar e bloquear" (ver COLABORACAO_ARQUITETURA_V1.md seção 1) — só
  // bloqueia no sentido de quem está recusando; nunca se `aceitar` for true.
  if (!aceitar && bloquear === true) {
    batch.set(db.doc(`users/${meuUid}/bloqueios/${uidSolicitante}`), {
      nomeExibicao: dados.nomeExibicao || "",
      avatarSnapshot: dados.avatarSnapshot || null,
      criadoEm: FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();

  return { ok: true, status: novoStatus };
});

exports.cancelarConexao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const { conexaoId } = request.data || {};

  if (typeof conexaoId !== "string" || !conexaoId.trim()) {
    throw new HttpsError("invalid-argument", "Solicitação inválida.");
  }

  const meuDocRef = db.doc(`users/${meuUid}/conexoes/${conexaoId}`);
  const meuDocSnap = await meuDocRef.get();
  if (!meuDocSnap.exists) {
    throw new HttpsError("not-found", "Solicitação não encontrada.");
  }

  const dados = meuDocSnap.data();
  if (dados.papel !== "solicitante") {
    throw new HttpsError(
      "failed-precondition",
      "Só quem enviou a solicitação pode cancelá-la."
    );
  }
  if (dados.status !== "pendente") {
    throw new HttpsError("failed-precondition", "Esta solicitação já foi respondida.");
  }

  const uidDestino = dados.usuarioConectadoId;
  const outroDocRef = db.doc(`users/${uidDestino}/conexoes/${conexaoId}`);

  if (diasDesde(dados.criadoEm) > EXPIRACAO_PENDENTE_DIAS) {
    // Mesmo critério de expiração "preguiçosa" das outras Functions — não
    // faz sentido "cancelar" algo que já expirou, só formaliza o estado.
    const batchExpira = db.batch();
    batchExpira.update(meuDocRef, {
      status: "expirada",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    batchExpira.update(outroDocRef, {
      status: "expirada",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    await batchExpira.commit();
    throw new HttpsError("failed-precondition", "Esta solicitação já havia expirado.");
  }

  const batch = db.batch();
  batch.update(meuDocRef, { status: "cancelada", atualizadoEm: FieldValue.serverTimestamp() });
  batch.update(outroDocRef, { status: "cancelada", atualizadoEm: FieldValue.serverTimestamp() });
  await batch.commit();

  return { ok: true, status: "cancelada" };
});

// Bloquear a partir de um contato já conectado (o outro caminho, "recusar e
// bloquear", é feito dentro do próprio responderConexao). Decisão registrada
// em COLABORACAO_ARQUITETURA_V1.md, 2026-08-13: bloquear encerra qualquer
// conexão existente entre os dois automaticamente (nunca deixa uma
// `aceita`/`pendente` sobrevivendo a um bloqueio); é silencioso (a pessoa
// bloqueada não recebe nenhum aviso específico); desbloquear não passa por
// aqui — é só apagar o próprio doc em `bloqueios` (self-scoped, já coberto
// por firestore.rules, sem necessidade de Function).
exports.bloquearConexao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const uidBloqueado = request.data?.uidBloqueado;

  if (typeof uidBloqueado !== "string" || !uidBloqueado.trim()) {
    throw new HttpsError("invalid-argument", "Usuário inválido.");
  }
  if (uidBloqueado === meuUid) {
    throw new HttpsError("invalid-argument", "Você não pode bloquear a si mesmo.");
  }

  const existente = await buscarConexaoExistente(meuUid, uidBloqueado);

  let nomeExibicao = existente?.dados.nomeExibicao || "";
  let avatarSnapshot = existente?.dados.avatarSnapshot || null;

  if (!existente) {
    const perfilSnap = await db.doc(`users/${uidBloqueado}`).get();
    if (!perfilSnap.exists) {
      throw new HttpsError("not-found", "Usuário não encontrado.");
    }
    const perfil = perfilSnap.data() || {};
    nomeExibicao = perfil.apelido || perfil.nome || "";
    avatarSnapshot = perfil.avatarUrl || null;
  }

  const batch = db.batch();

  if (existente) {
    batch.update(db.doc(`users/${meuUid}/conexoes/${existente.id}`), {
      status: "bloqueada",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    batch.update(db.doc(`users/${uidBloqueado}/conexoes/${existente.id}`), {
      status: "bloqueada",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
  }

  batch.set(db.doc(`users/${meuUid}/bloqueios/${uidBloqueado}`), {
    nomeExibicao,
    avatarSnapshot,
    criadoEm: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { ok: true };
});

// Desbloquear restaura automaticamente a conexão para `aceita`, se ela
// estava `bloqueada` — decisão registrada em COLABORACAO_ARQUITETURA_V1.md,
// 2026-08-13: não pede confirmação de novo porque os dois já haviam
// consentido em se conectar antes do bloqueio (não é uma conexão nova).
// Precisa de Function (não só apagar o próprio `bloqueios`) porque restaurar
// o outro lado da conexão é uma escrita cruzada entre contas.
exports.desbloquearConexao = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const meuUid = request.auth.uid;
  const uidBloqueado = request.data?.uidBloqueado;

  if (typeof uidBloqueado !== "string" || !uidBloqueado.trim()) {
    throw new HttpsError("invalid-argument", "Usuário inválido.");
  }

  const existente = await buscarConexaoExistente(meuUid, uidBloqueado);

  const batch = db.batch();
  batch.delete(db.doc(`users/${meuUid}/bloqueios/${uidBloqueado}`));

  let conexaoRestaurada = false;
  if (existente && existente.dados.status === "bloqueada") {
    batch.update(db.doc(`users/${meuUid}/conexoes/${existente.id}`), {
      status: "aceita",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    batch.update(db.doc(`users/${uidBloqueado}/conexoes/${existente.id}`), {
      status: "aceita",
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    conexaoRestaurada = true;
  }

  await batch.commit();

  return { ok: true, conexaoRestaurada };
});
