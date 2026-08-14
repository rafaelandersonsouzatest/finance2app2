// functions/conexoes.test.js
// Testes de integração de solicitarConexao contra o Firestore Emulator real
// (não mockado) — precisa do emulador rodando em 127.0.0.1:8080 antes de
// `npm test`. Ver ARQUITETURA.md seção 16.1/7.3 para como subir o emulador.
// 🔹 Chamamos `solicitarConexao.run({ data, auth })` diretamente — a própria
// firebase-functions expõe isso pra facilitar teste de Functions v2, sem
// precisar do `firebase-functions-test` (cuja cadeia de dependências puxa o
// SDK v1 legado, que por sua vez puxa um pacote ESM-only (`jose`) que o Jest
// não consegue transformar vindo de node_modules — ver descoberta 2026-08-13
// em ARQUITETURA.md).
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.GCLOUD_PROJECT = "demo-financeiro-local";

const { initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp({ projectId: "demo-financeiro-local" });

const {
  solicitarConexao,
  responderConexao,
  cancelarConexao,
  bloquearConexao,
  desbloquearConexao,
} = require("./conexoes");
const db = getFirestore();

function novoUid(prefixo) {
  return `${prefixo}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

async function criarUsuario(nomeExibicao) {
  const uid = novoUid("uid");
  await db.doc(`users/${uid}`).set({ apelido: nomeExibicao, avatarUrl: null });
  return uid;
}

async function chamar(uidChamador, data) {
  return solicitarConexao.run({ data, auth: { uid: uidChamador } });
}

async function chamarResponder(uidChamador, data) {
  return responderConexao.run({ data, auth: { uid: uidChamador } });
}

async function chamarCancelar(uidChamador, data) {
  return cancelarConexao.run({ data, auth: { uid: uidChamador } });
}

async function chamarBloquear(uidChamador, data) {
  return bloquearConexao.run({ data, auth: { uid: uidChamador } });
}

async function chamarDesbloquear(uidChamador, data) {
  return desbloquearConexao.run({ data, auth: { uid: uidChamador } });
}

test("cria uma solicitação nova entre dois usuários válidos", async () => {
  const uidA = await criarUsuario("Usuário A");
  const uidB = await criarUsuario("Usuário B");

  const resposta = await chamar(uidA, { uidDestino: uidB });

  expect(resposta.ok).toBe(true);
  expect(resposta.status).toBe("pendente");

  const docA = await db.doc(`users/${uidA}/conexoes/${resposta.conexaoId}`).get();
  const docB = await db.doc(`users/${uidB}/conexoes/${resposta.conexaoId}`).get();
  expect(docA.data().papel).toBe("solicitante");
  expect(docA.data().nomeExibicao).toBe("Usuário B");
  expect(docB.data().papel).toBe("destinatario");
  expect(docB.data().nomeExibicao).toBe("Usuário A");
  expect(docA.data().status).toBe("pendente");
  expect(docB.data().status).toBe("pendente");
});

test("rejeita uidDestino inexistente", async () => {
  const uidA = await criarUsuario("Usuário A");
  await expect(chamar(uidA, { uidDestino: "uid-que-nao-existe" })).rejects.toThrow();
});

test("rejeita conexão consigo mesmo", async () => {
  const uidA = await criarUsuario("Usuário A");
  await expect(chamar(uidA, { uidDestino: uidA })).rejects.toThrow();
});

test("idempotência: segunda chamada com pendente já existente não cria um segundo doc", async () => {
  const uidA = await criarUsuario("Usuário A");
  const uidB = await criarUsuario("Usuário B");

  const primeira = await chamar(uidA, { uidDestino: uidB });
  const segunda = await chamar(uidA, { uidDestino: uidB });

  expect(segunda.conexaoId).toBe(primeira.conexaoId);
  expect(segunda.status).toBe("pendente");

  const todasDeA = await db
    .collection(`users/${uidA}/conexoes`)
    .where("usuarioConectadoId", "==", uidB)
    .get();
  expect(todasDeA.size).toBe(1);
});

test("cooldown: bloqueia reenvio antes de 7 dias quando o próprio chamador foi recusado", async () => {
  const uidA = await criarUsuario("Usuário A");
  const uidB = await criarUsuario("Usuário B");
  const conexaoId = db.collection(`users/${uidA}/conexoes`).doc().id;

  const agora = Timestamp.now();
  await db.doc(`users/${uidA}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidB,
    papel: "solicitante",
    status: "recusada",
    criadoEm: agora,
    atualizadoEm: agora, // recusado agora mesmo
  });
  await db.doc(`users/${uidB}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidA,
    papel: "destinatario",
    status: "recusada",
    criadoEm: agora,
    atualizadoEm: agora,
  });

  await expect(chamar(uidA, { uidDestino: uidB })).rejects.toThrow();
});

test("cooldown: permite reenvio depois de 7 dias", async () => {
  const uidA = await criarUsuario("Usuário A");
  const uidB = await criarUsuario("Usuário B");
  const conexaoId = db.collection(`users/${uidA}/conexoes`).doc().id;

  const oitoDiasAtras = Timestamp.fromMillis(Date.now() - 8 * 24 * 60 * 60 * 1000);
  await db.doc(`users/${uidA}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidB,
    papel: "solicitante",
    status: "recusada",
    criadoEm: oitoDiasAtras,
    atualizadoEm: oitoDiasAtras,
  });
  await db.doc(`users/${uidB}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidA,
    papel: "destinatario",
    status: "recusada",
    criadoEm: oitoDiasAtras,
    atualizadoEm: oitoDiasAtras,
  });

  const resposta = await chamar(uidA, { uidDestino: uidB });
  expect(resposta.ok).toBe(true);
  expect(resposta.status).toBe("pendente");
  // Gera um conexaoId novo, não reaproveita o antigo recusado.
  expect(resposta.conexaoId).not.toBe(conexaoId);
});

test("recusa 'no sentido contrário' (papel destinatario) não gera cooldown", async () => {
  const uidA = await criarUsuario("Usuário A");
  const uidB = await criarUsuario("Usuário B");
  const conexaoId = db.collection(`users/${uidB}/conexoes`).doc().id;
  const agora = Timestamp.now();

  // B recusou um pedido antigo de A — do lado de B, papel é 'destinatario'.
  await db.doc(`users/${uidB}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidA,
    papel: "destinatario",
    status: "recusada",
    criadoEm: agora,
    atualizadoEm: agora,
  });
  await db.doc(`users/${uidA}/conexoes/${conexaoId}`).set({
    usuarioConectadoId: uidB,
    papel: "solicitante",
    status: "recusada",
    criadoEm: agora,
    atualizadoEm: agora,
  });

  // Agora B tenta iniciar uma conexão com A — não deve ter cooldown.
  const resposta = await chamar(uidB, { uidDestino: uidA });
  expect(resposta.ok).toBe(true);
  expect(resposta.status).toBe("pendente");
});

test("limite de 20 pendentes enviadas bloqueia a 21ª solicitação", async () => {
  const uidA = await criarUsuario("Usuário A");

  for (let i = 0; i < 20; i++) {
    const destino = await criarUsuario(`Destino ${i}`);
    // eslint-disable-next-line no-await-in-loop
    await chamar(uidA, { uidDestino: destino });
  }

  const destino21 = await criarUsuario("Destino 21");
  await expect(chamar(uidA, { uidDestino: destino21 })).rejects.toThrow();
}, 30000);

test("rejeita solicitação se o destinatário bloqueou o chamador", async () => {
  const uidA = await criarUsuario("Usuário A");
  const uidB = await criarUsuario("Usuário B");

  await db.doc(`users/${uidB}/bloqueios/${uidA}`).set({ criadoEm: Timestamp.now() });

  await expect(chamar(uidA, { uidDestino: uidB })).rejects.toThrow();
});

test("rejeita solicitação se o chamador bloqueou o destinatário", async () => {
  const uidA = await criarUsuario("Usuário A");
  const uidB = await criarUsuario("Usuário B");

  await db.doc(`users/${uidA}/bloqueios/${uidB}`).set({ criadoEm: Timestamp.now() });

  await expect(chamar(uidA, { uidDestino: uidB })).rejects.toThrow();
});

describe("responderConexao", () => {
  test("aceitar marca 'aceita' nos dois lados", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });

    const resposta = await chamarResponder(uidB, { conexaoId, aceitar: true });
    expect(resposta.ok).toBe(true);
    expect(resposta.status).toBe("aceita");

    const docA = await db.doc(`users/${uidA}/conexoes/${conexaoId}`).get();
    const docB = await db.doc(`users/${uidB}/conexoes/${conexaoId}`).get();
    expect(docA.data().status).toBe("aceita");
    expect(docB.data().status).toBe("aceita");
  });

  test("recusar marca 'recusada' nos dois lados, sem bloquear por padrão", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });

    const resposta = await chamarResponder(uidB, { conexaoId, aceitar: false });
    expect(resposta.status).toBe("recusada");

    const docA = await db.doc(`users/${uidA}/conexoes/${conexaoId}`).get();
    const docB = await db.doc(`users/${uidB}/conexoes/${conexaoId}`).get();
    expect(docA.data().status).toBe("recusada");
    expect(docB.data().status).toBe("recusada");

    const bloqueio = await db.doc(`users/${uidB}/bloqueios/${uidA}`).get();
    expect(bloqueio.exists).toBe(false);
  });

  test("recusar com bloquear:true também cria o registro de bloqueio", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });

    await chamarResponder(uidB, { conexaoId, aceitar: false, bloquear: true });

    const bloqueio = await db.doc(`users/${uidB}/bloqueios/${uidA}`).get();
    expect(bloqueio.exists).toBe(true);
  });

  test("só o destinatário pode responder — o próprio solicitante não pode", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });

    await expect(chamarResponder(uidA, { conexaoId, aceitar: true })).rejects.toThrow();
  });

  test("rejeita responder uma solicitação já respondida", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });

    await chamarResponder(uidB, { conexaoId, aceitar: true });
    await expect(chamarResponder(uidB, { conexaoId, aceitar: false })).rejects.toThrow();
  });

  test("rejeita conexaoId inexistente", async () => {
    const uidB = await criarUsuario("Usuário B");
    await expect(
      chamarResponder(uidB, { conexaoId: "nao-existe", aceitar: true })
    ).rejects.toThrow();
  });

  test("expiração: não deixa aceitar um pedido pendente com mais de 15 dias", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const conexaoId = db.collection(`users/${uidA}/conexoes`).doc().id;
    const dezesseisDiasAtras = Timestamp.fromMillis(Date.now() - 16 * 24 * 60 * 60 * 1000);

    await db.doc(`users/${uidA}/conexoes/${conexaoId}`).set({
      usuarioConectadoId: uidB,
      nomeExibicao: "Usuário B",
      avatarSnapshot: null,
      papel: "solicitante",
      status: "pendente",
      criadoEm: dezesseisDiasAtras,
      atualizadoEm: dezesseisDiasAtras,
    });
    await db.doc(`users/${uidB}/conexoes/${conexaoId}`).set({
      usuarioConectadoId: uidA,
      nomeExibicao: "Usuário A",
      avatarSnapshot: null,
      papel: "destinatario",
      status: "pendente",
      criadoEm: dezesseisDiasAtras,
      atualizadoEm: dezesseisDiasAtras,
    });

    await expect(chamarResponder(uidB, { conexaoId, aceitar: true })).rejects.toThrow();

    const docA = await db.doc(`users/${uidA}/conexoes/${conexaoId}`).get();
    const docB = await db.doc(`users/${uidB}/conexoes/${conexaoId}`).get();
    expect(docA.data().status).toBe("expirada");
    expect(docB.data().status).toBe("expirada");
  });
});

describe("cancelarConexao", () => {
  test("quem enviou pode cancelar uma solicitação pendente", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });

    const resposta = await chamarCancelar(uidA, { conexaoId });
    expect(resposta.ok).toBe(true);
    expect(resposta.status).toBe("cancelada");

    const docA = await db.doc(`users/${uidA}/conexoes/${conexaoId}`).get();
    const docB = await db.doc(`users/${uidB}/conexoes/${conexaoId}`).get();
    expect(docA.data().status).toBe("cancelada");
    expect(docB.data().status).toBe("cancelada");
  });

  test("o destinatário não pode cancelar (só quem enviou)", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });

    await expect(chamarCancelar(uidB, { conexaoId })).rejects.toThrow();
  });

  test("não permite cancelar uma solicitação já aceita", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });
    await chamarResponder(uidB, { conexaoId, aceitar: true });

    await expect(chamarCancelar(uidA, { conexaoId })).rejects.toThrow();
  });

  test("depois de cancelada, dá para enviar uma nova solicitação sem cooldown", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId: primeiro } = await chamar(uidA, { uidDestino: uidB });
    await chamarCancelar(uidA, { conexaoId: primeiro });

    const resposta = await chamar(uidA, { uidDestino: uidB });
    expect(resposta.ok).toBe(true);
    expect(resposta.status).toBe("pendente");
    expect(resposta.conexaoId).not.toBe(primeiro);
  });

  test("rejeita conexaoId inexistente", async () => {
    const uidA = await criarUsuario("Usuário A");
    await expect(
      chamarCancelar(uidA, { conexaoId: "nao-existe" })
    ).rejects.toThrow();
  });
});

describe("bloquearConexao", () => {
  test("bloquear um contato já conectado marca 'bloqueada' nos dois lados e cria o registro de bloqueio", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });
    await chamarResponder(uidB, { conexaoId, aceitar: true });

    const resposta = await chamarBloquear(uidA, { uidBloqueado: uidB });
    expect(resposta.ok).toBe(true);

    const docA = await db.doc(`users/${uidA}/conexoes/${conexaoId}`).get();
    const docB = await db.doc(`users/${uidB}/conexoes/${conexaoId}`).get();
    expect(docA.data().status).toBe("bloqueada");
    expect(docB.data().status).toBe("bloqueada");

    const bloqueio = await db.doc(`users/${uidA}/bloqueios/${uidB}`).get();
    expect(bloqueio.exists).toBe(true);
    expect(bloqueio.data().nomeExibicao).toBe("Usuário B");
  });

  test("bloquear alguém sem conexão prévia funciona (cria só o registro de bloqueio)", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");

    const resposta = await chamarBloquear(uidA, { uidBloqueado: uidB });
    expect(resposta.ok).toBe(true);

    const bloqueio = await db.doc(`users/${uidA}/bloqueios/${uidB}`).get();
    expect(bloqueio.exists).toBe(true);
    expect(bloqueio.data().nomeExibicao).toBe("Usuário B");
  });

  test("rejeita bloquear a si mesmo", async () => {
    const uidA = await criarUsuario("Usuário A");
    await expect(chamarBloquear(uidA, { uidBloqueado: uidA })).rejects.toThrow();
  });

  test("rejeita uidBloqueado inexistente", async () => {
    const uidA = await criarUsuario("Usuário A");
    await expect(
      chamarBloquear(uidA, { uidBloqueado: "nao-existe" })
    ).rejects.toThrow();
  });

  test("depois de bloqueado, solicitarConexao é rejeitada nos dois sentidos", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    await chamarBloquear(uidA, { uidBloqueado: uidB });

    await expect(chamar(uidA, { uidDestino: uidB })).rejects.toThrow();
    await expect(chamar(uidB, { uidDestino: uidA })).rejects.toThrow();
  });
});

describe("desbloquearConexao", () => {
  test("restaura a conexão para 'aceita' automaticamente, se ela estava bloqueada", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });
    await chamarResponder(uidB, { conexaoId, aceitar: true });
    await chamarBloquear(uidA, { uidBloqueado: uidB });

    const resposta = await chamarDesbloquear(uidA, { uidBloqueado: uidB });
    expect(resposta.ok).toBe(true);
    expect(resposta.conexaoRestaurada).toBe(true);

    const docA = await db.doc(`users/${uidA}/conexoes/${conexaoId}`).get();
    const docB = await db.doc(`users/${uidB}/conexoes/${conexaoId}`).get();
    expect(docA.data().status).toBe("aceita");
    expect(docB.data().status).toBe("aceita");

    const bloqueio = await db.doc(`users/${uidA}/bloqueios/${uidB}`).get();
    expect(bloqueio.exists).toBe(false);
  });

  test("sem conexão prévia, só remove o bloqueio (nada para restaurar)", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    await chamarBloquear(uidA, { uidBloqueado: uidB });

    const resposta = await chamarDesbloquear(uidA, { uidBloqueado: uidB });
    expect(resposta.ok).toBe(true);
    expect(resposta.conexaoRestaurada).toBe(false);

    const bloqueio = await db.doc(`users/${uidA}/bloqueios/${uidB}`).get();
    expect(bloqueio.exists).toBe(false);
  });

  test("depois de desbloquear e restaurar, solicitarConexao volta a funcionar normalmente", async () => {
    const uidA = await criarUsuario("Usuário A");
    const uidB = await criarUsuario("Usuário B");
    const { conexaoId } = await chamar(uidA, { uidDestino: uidB });
    await chamarResponder(uidB, { conexaoId, aceitar: true });
    await chamarBloquear(uidA, { uidBloqueado: uidB });
    await chamarDesbloquear(uidA, { uidBloqueado: uidB });

    const resposta = await chamar(uidA, { uidDestino: uidB });
    expect(resposta.status).toBe("aceita");
    expect(resposta.conexaoId).toBe(conexaoId);
  });
});
