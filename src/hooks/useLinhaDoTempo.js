import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';

// =========================================================
// 🔹 Leitura da Linha do Tempo (ver ARQUITETURA.md seção 18) — coleção
// única `linhaDoTempo`, compartilhada por todas as entidades. Sem
// `onSnapshot`: histórico é append-only e consultado sob demanda (abrir uma
// aba/modal), não precisa de tempo real como os hooks de dinheiro.
//
// 🔹 Ordenação feita no cliente, não via `orderBy` do Firestore — uma
// consulta com igualdade num campo (`idCompra`) e ordenação por outro
// (`criadoEm`) exige um índice composto configurado manualmente no console
// do Firebase, em cada um dos 4 projetos do app (meu-app/rafael/marina/
// christian). Mesmo critério já usado em `buscarParcelasDaCompra`
// (useCartoes.js/useEmprestimos.js): evita depender de infraestrutura
// criada fora do código, sem custo de desempenho real (poucos eventos por
// compra).
//
// `buscarEventosDaCompra` cobre a visão contextual de cartão/empréstimo (que
// sempre têm `idCompra`). `buscarEventosDoItem` cobre gasto/entrada/
// investimento avulsos (sem `idCompra`) — filtra por `entidadeId` em vez.
// =========================================================
export const useLinhaDoTempo = () => {
  const { user } = useAuth();

  const buscarEventosDaCompra = async (idCompra) => {
    if (!user || !idCompra) return [];
    const basePath = getBasePath(user);
    const q = query(collection(db, `${basePath}/linhaDoTempo`), where('idCompra', '==', idCompra));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0));
  };

  const buscarEventosDoItem = async (entidadeId) => {
    if (!user || !entidadeId) return [];
    const basePath = getBasePath(user);
    const q = query(collection(db, `${basePath}/linhaDoTempo`), where('entidadeId', '==', entidadeId));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.criadoEm?.toMillis?.() || 0) - (b.criadoEm?.toMillis?.() || 0));
  };

  return { buscarEventosDaCompra, buscarEventosDoItem };
};
