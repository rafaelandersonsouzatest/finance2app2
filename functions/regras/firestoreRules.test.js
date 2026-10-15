// Testes das regras de segurança do Firestore (firestore.rules, na raiz).
// Rodam contra o emulador local — nunca tocam no banco real:
//   cd functions && npm run test:regras
const fs = require("fs");
const path = require("path");
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} = require("@firebase/rules-unit-testing");
const {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  writeBatch,
} = require("firebase/firestore");

const CPF = "12345678909";
const OUTRO_CPF = "98765432100";

let ambiente;

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: "demo-regras",
    firestore: {
      rules: fs.readFileSync(path.join(__dirname, "..", "..", "firestore.rules"), "utf8"),
    },
  });
});

afterAll(async () => {
  await ambiente.cleanup();
});

beforeEach(async () => {
  await ambiente.clearFirestore();
});

const comoUsuario = (uid) => ambiente.authenticatedContext(uid).firestore();
const semLogin = () => ambiente.unauthenticatedContext().firestore();

// Cria dados sem passar pelas regras (estado inicial dos testes).
const prepararDados = (fn) =>
  ambiente.withSecurityRulesDisabled((contexto) => fn(contexto.firestore()));

describe("users/{uid} — dados de cada usuário", () => {
  it("o dono lê e grava o próprio perfil e as subcoleções", async () => {
    const db = comoUsuario("ana");
    await assertSucceeds(setDoc(doc(db, "users/ana"), { apelido: "Ana" }));
    await assertSucceeds(getDoc(doc(db, "users/ana")));
    await assertSucceeds(setDoc(doc(db, "users/ana/gastos/g1"), { valor: 10 }));
    await assertSucceeds(getDocs(collection(db, "users/ana/gastos")));
  });

  it("outro usuário não lê nem grava", async () => {
    await prepararDados((db) => setDoc(doc(db, "users/ana/gastos/g1"), { valor: 10 }));
    const bruno = comoUsuario("bruno");
    await assertFails(getDoc(doc(bruno, "users/ana")));
    await assertFails(getDoc(doc(bruno, "users/ana/gastos/g1")));
    await assertFails(getDocs(collection(bruno, "users/ana/gastos")));
    await assertFails(setDoc(doc(bruno, "users/ana/gastos/g2"), { valor: 99 }));
  });

  it("sem login não acessa nada", async () => {
    await prepararDados((db) => setDoc(doc(db, "users/ana"), { apelido: "Ana" }));
    await assertFails(getDoc(doc(semLogin(), "users/ana")));
    await assertFails(setDoc(doc(semLogin(), "users/ana"), { apelido: "X" }));
  });
});

describe("documentosCadastrados — reserva de CPF/CNPJ", () => {
  // Mesmo lote do cadastro em src/auth/useAuth.js (register).
  const cadastrar = (db, uid, cpfDoPerfil, cpfDaReserva) => {
    const lote = writeBatch(db);
    lote.set(doc(db, `users/${uid}`), { documento: cpfDoPerfil });
    lote.set(doc(db, `documentosCadastrados/${cpfDaReserva}`), { reservado: true });
    return lote.commit();
  };

  it("cadastro com o próprio CPF reserva o documento", async () => {
    await assertSucceeds(cadastrar(comoUsuario("ana"), "ana", CPF, CPF));
  });

  it("não reserva um CPF diferente do perfil (CPF de outra pessoa)", async () => {
    await assertFails(cadastrar(comoUsuario("ana"), "ana", CPF, OUTRO_CPF));
  });

  it("não reserva sem criar o perfil no mesmo lote", async () => {
    const db = comoUsuario("ana");
    await assertFails(setDoc(doc(db, `documentosCadastrados/${CPF}`), { reservado: true }));
  });

  it("depois de cadastrado, não reserva outro CPF trocando o do perfil", async () => {
    await prepararDados((db) => setDoc(doc(db, "users/ana"), { documento: CPF }));
    const db = comoUsuario("ana");
    const lote = writeBatch(db);
    lote.update(doc(db, "users/ana"), { documento: OUTRO_CPF });
    lote.set(doc(db, `documentosCadastrados/${OUTRO_CPF}`), { reservado: true });
    await assertFails(lote.commit());
  });

  it("não aceita campos extras na reserva", async () => {
    const db = comoUsuario("ana");
    const lote = writeBatch(db);
    lote.set(doc(db, "users/ana"), { documento: CPF });
    lote.set(doc(db, `documentosCadastrados/${CPF}`), { reservado: true, nome: "Ana" });
    await assertFails(lote.commit());
  });

  it("consulta de um CPF conhecido funciona sem login (é antes da conta existir)", async () => {
    await prepararDados((db) => setDoc(doc(db, `documentosCadastrados/${CPF}`), { reservado: true }));
    await assertSucceeds(getDoc(doc(semLogin(), `documentosCadastrados/${CPF}`)));
  });

  it("ninguém lista as reservas, altera ou apaga", async () => {
    await prepararDados((db) => setDoc(doc(db, `documentosCadastrados/${CPF}`), { reservado: true }));
    const db = comoUsuario("ana");
    await assertFails(getDocs(collection(db, "documentosCadastrados")));
    await assertFails(updateDoc(doc(db, `documentosCadastrados/${CPF}`), { reservado: false }));
    await assertFails(deleteDoc(doc(db, `documentosCadastrados/${CPF}`)));
  });
});

describe("codigosConexao — código de conexão (Colaboração)", () => {
  it("cria o próprio código, só com o uid", async () => {
    await assertSucceeds(setDoc(doc(comoUsuario("ana"), "codigosConexao/ABC123"), { uid: "ana" }));
  });

  it("não cria código em nome de outra pessoa nem com campos extras", async () => {
    await assertFails(setDoc(doc(comoUsuario("ana"), "codigosConexao/ABC123"), { uid: "bruno" }));
    await assertFails(
      setDoc(doc(comoUsuario("ana"), "codigosConexao/XYZ999"), { uid: "ana", extra: 1 })
    );
  });

  it("consulta exige login; listar nunca", async () => {
    await prepararDados((db) => setDoc(doc(db, "codigosConexao/ABC123"), { uid: "ana" }));
    await assertSucceeds(getDoc(doc(comoUsuario("bruno"), "codigosConexao/ABC123")));
    await assertFails(getDoc(doc(semLogin(), "codigosConexao/ABC123")));
    await assertFails(getDocs(collection(comoUsuario("bruno"), "codigosConexao")));
  });
});

describe("qualquer outro caminho", () => {
  it("é bloqueado (ex.: tenants/ do futuro Modo Família)", async () => {
    const db = comoUsuario("ana");
    await assertFails(setDoc(doc(db, "tenants/ana"), { nome: "Família" }));
    await assertFails(getDoc(doc(db, "tenants/ana")));
    await assertFails(setDoc(doc(db, "qualquerCoisa/x"), { a: 1 }));
  });
});
