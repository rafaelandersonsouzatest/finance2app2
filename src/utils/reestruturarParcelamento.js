import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

// =========================================================
// 🔹 Único ponto que altera a ESTRUTURA de um parcelamento — quantas
// parcelas existem e a numeração delas. Usado por qualquer fluxo que remova
// parcela(s) e/ou redefina valores de um grupo (exclusão de uma parcela,
// exclusão com redistribuição, edição personalizada de parcelas) — ver
// ARQUITETURA.md seção 17.
//
// Nunca mexe no estado financeiro de uma parcela (pago, adiantada,
// dataPagamento, valorOriginal, descontoAplicado etc.): só grava
// `parcelaAtual`, `totalParcelas` e, quando informado, `valor` das parcelas
// que não estiverem bloqueadas (pagas/antecipadas nunca têm o valor
// sobrescrito por aqui, mesma regra de negócio de sempre).
// =========================================================
export const reestruturarParcelamento = async (
  colecaoPath,
  idCompra,
  { idsParaRemover = [], novosValores = {} } = {}
) => {
  const qParcelas = query(collection(db, colecaoPath), where('idCompra', '==', idCompra));
  const snapshot = await getDocs(qParcelas);

  const restantes = snapshot.docs
    .filter((docSnap) => !idsParaRemover.includes(docSnap.id))
    .sort((a, b) => (a.data().parcelaAtual || 0) - (b.data().parcelaAtual || 0));

  const totalRestante = restantes.length;
  const batch = writeBatch(db);

  idsParaRemover.forEach((id) => {
    batch.delete(doc(db, colecaoPath, id));
  });

  restantes.forEach((docSnap, indice) => {
    const parcela = docSnap.data();
    const bloqueada = parcela.pago === true || parcela.adiantada === true;
    const dados = {
      parcelaAtual: indice + 1,
      totalParcelas: totalRestante,
      atualizadoEm: serverTimestamp(),
    };
    if (!bloqueada && novosValores[docSnap.id] !== undefined) {
      dados.valor = novosValores[docSnap.id];
    }
    batch.update(doc(db, colecaoPath, docSnap.id), dados);
  });

  await batch.commit();

  return restantes.map((docSnap) => docSnap.id);
};
