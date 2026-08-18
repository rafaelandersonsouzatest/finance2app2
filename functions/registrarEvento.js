// functions/registrarEvento.js
// Espelho de src/utils/registrarEvento.js (client) — mesmíssimo contrato de
// dados (ver COLABORACAO_ARQUITETURA_V1.md seção 2.1 e ARQUITETURA.md seção
// 18). Existe só porque Cloud Functions usam o Admin SDK, que não é o mesmo
// pacote que o utilitário original importa (`firebase/firestore`, client) —
// não é um segundo sistema de histórico, é a mesma modelagem escrita do
// lado servidor.
//
// Recebe o `batch` de quem chama, para o evento entrar no mesmo commit
// atômico da operação principal — nunca um evento de histórico "sobra"
// sozinho sem a operação de negócio correspondente, nem o contrário.
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const db = getFirestore();

function registrarEvento(
  batch,
  basePath,
  { acao, entidade, entidadeId, idCompra = null, alteracoes = null, participantes = null, origem, usuarioId }
) {
  const ref = db.collection(`${basePath}/linhaDoTempo`).doc();
  const dados = {
    versao: 1,
    acao,
    entidade,
    entidadeId,
    idCompra,
    alteracoes,
    participantes,
    origem,
    usuarioId,
    criadoEm: FieldValue.serverTimestamp(),
  };

  Object.keys(dados).forEach((chave) => {
    if (dados[chave] === undefined) delete dados[chave];
  });

  batch.set(ref, dados);
}

module.exports = { registrarEvento };
