const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Functions da Colaboração entre Usuários (Etapa 2) — arquivo próprio porque
// crescem junto (solicitarConexao, responderConexao, cancelarConexao,
// bloquearConexao), para não deixar tudo misturado num único index.js.
Object.assign(exports, require("./conexoes"));

// Functions da divisão de despesa (Etapa 3, ver COLABORACAO_ARQUITETURA_V1.md
// seção 2) — mesmo princípio de arquivo próprio por crescerem juntas.
Object.assign(exports, require("./divisaoDespesa"));

// Function mínima de diagnóstico da Etapa 1 — só valida que a infraestrutura
// (Auth + Function + Firestore) funciona de ponta a ponta. Nenhuma regra de
// negócio de Colaboração entre Usuários vive aqui.
exports.pingDiagnostico = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "É necessário estar autenticado.");
  }

  const uid = request.auth.uid;
  const ref = db.doc(`users/${uid}/_diagnostico/ping`);

  await ref.set({
    ok: true,
    uid,
    recebidoEm: new Date().toISOString(),
  });

  return { ok: true, uid };
});
