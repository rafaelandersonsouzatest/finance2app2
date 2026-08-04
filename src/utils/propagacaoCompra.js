import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { removerIndefinidos } from './firestoreSanitize';

// =========================================================
// 🔹 Mecanismo único de propagação de "campos da compra".
//
// Uma compra parcelada (cartão) ou um empréstimo geram várias parcelas
// (documentos irmãos com o mesmo `idCompra`). Alguns campos descrevem a
// COMPRA inteira e devem ser sempre iguais em todas as parcelas (ex.:
// descrição, categoria, cartão, comprador, data da compra) — editar um
// desses campos numa única parcela e as demais ficarem com o valor antigo é
// uma inconsistência, não uma escolha do usuário (achado relatado em
// 2026-08-06, ver ARQUITETURA.md seção 16.12). Outros campos são da
// PARCELA e devem continuar individuais (valor, pago, data de pagamento,
// vencimento, mês/ano).
//
// Cada hook (useCartoes.js, useEmprestimos.js) declara sua própria lista de
// "campos da compra" e usa as duas funções abaixo: `extrairCamposDaCompra`
// tira esses campos do objeto que seria gravado só na parcela atual,
// `propagarCamposDaCompra` grava o que sobrou em todas as parcelas do grupo,
// num único batch. Incluir um novo campo de compra no futuro é só adicionar
// o nome na lista do hook — nenhuma lógica nova precisa ser escrita.
// =========================================================

export const extrairCamposDaCompra = (dadosAtualizados, camposDaCompra) => {
  const extraidos = {};
  camposDaCompra.forEach((campo) => {
    if (dadosAtualizados[campo] !== undefined) {
      extraidos[campo] = dadosAtualizados[campo];
      delete dadosAtualizados[campo];
    }
  });
  return extraidos;
};

export const propagarCamposDaCompra = async (colecaoPath, idCompra, campos) => {
  const dados = removerIndefinidos({ ...campos, atualizadoEm: serverTimestamp() });
  // Só sobrou `atualizadoEm`: nenhum campo de compra mudou de fato, nada a propagar.
  if (Object.keys(dados).length <= 1) return;

  const qParcelas = query(collection(db, colecaoPath), where('idCompra', '==', idCompra));
  const snapshot = await getDocs(qParcelas);

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnap) => {
    batch.update(doc(db, colecaoPath, docSnap.id), dados);
  });
  await batch.commit();
};
