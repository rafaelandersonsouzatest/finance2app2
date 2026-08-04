import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { removerIndefinidos } from './firestoreSanitize';

// =========================================================
// 🔹 Único ponto de escrita da Linha do Tempo (ver ARQUITETURA.md seção 18)
// — coleção plana `users/{uid}/linhaDoTempo`, um documento por AÇÃO do
// usuário (nunca um por documento alterado internamente por propagação
// automática ou recálculo — ver propagacaoCompra.js/reestruturarParcelamento.js,
// que não geram evento por si só).
//
// `alteracoes` é um objeto por campo (não uma lista) por ser consultável no
// Firestore (`where('alteracoes.categoria', '!=', null)`); os valores
// gravados já são o dado legível no momento do evento (nome da categoria,
// não o id), nunca uma referência — mesmo princípio de convivência usado em
// todo o projeto (categoriaNome, membroNome, cartao).
// =========================================================
export const registrarEvento = async (
  basePath,
  { acao, entidade, entidadeId, idCompra = null, alteracoes = null, origem, usuarioId }
) => {
  await addDoc(
    collection(db, `${basePath}/linhaDoTempo`),
    removerIndefinidos({
      versao: 1,
      acao,
      entidade,
      entidadeId,
      idCompra,
      alteracoes,
      origem,
      usuarioId,
      criadoEm: serverTimestamp(),
    })
  );
};
