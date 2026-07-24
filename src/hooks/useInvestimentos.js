import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';

// ================================
// 🔹 Funções utilitárias
// ================================

// Converte string "10,50" ou "10.50" em número seguro
const parseNumber = (raw) => {
  if (raw === undefined || raw === null) return 0;
  const s = String(raw).trim().replace(/\s/g, '').replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
};

// 🔹 Regra de negócio: o saldo de um investimento nunca pode ficar negativo.
// calcSaldoReal calcula o valor sem esconder nada — é essa versão que as
// operações abaixo usam para DECIDIR se podem prosseguir. calcValorAtual
// (com Math.max) é só a rede de segurança visual para exibir dados antigos
// que porventura já estejam inconsistentes; não é mais a fonte da regra.
const calcSaldoReal = (valorInicial, movimentacoes = []) => {
  const base = parseNumber(valorInicial);
  return movimentacoes.reduce((acc, mov) => {
    const v = parseNumber(mov.valor ?? 0);
    return acc + (mov.tipo === 'Aporte' ? v : -v);
  }, base);
};

// Recalcula o valor atual de um investimento (para exibição)
const calcValorAtual = (valorInicial, movimentacoes = []) =>
  Math.max(0, calcSaldoReal(valorInicial, movimentacoes));

// ================================
// 🔹 HOOK PRINCIPAL
// ================================
export const useInvestimentos = () => {
  const [investimentos, setInvestimentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  // ================================
  // 🔹 Carregar investimentos (tempo real)
  // ================================
  useEffect(() => {
    if (!user) {
      setInvestimentos([]);
      setLoading(false);
      return;
    }

    const basePath = getBasePath(user);
    const ref = collection(db, `${basePath}/investimentos`);
    const q = query(ref, orderBy('criadoEm', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const docData = d.data();
          const valorInicial = parseNumber(docData.valorInicial ?? 0);
          const movimentacoes = Array.isArray(docData.movimentacoes)
            ? docData.movimentacoes
            : [];
          const valorAtual = calcValorAtual(valorInicial, movimentacoes);

          return {
            id: d.id,
            ...docData,
            valorInicial,
            valorAtual,
            meta: parseNumber(docData.meta ?? 0),
            movimentacoes,
          };
        });
        setInvestimentos(data);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no snapshot de investimentos:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ================================
  // ➕ Criar investimento
  // ================================
  const addInvestment = async (investment) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const valorInicial = parseNumber(
        investment.valorInicial ?? investment.valorAtual ?? 0
      );
      const novo = {
        nome: investment.nome || 'Sem nome',
        instituicao: investment.instituicao || 'Não Informado',
        valorInicial,
        valorAtual: valorInicial,
        meta: parseNumber(investment.meta ?? 0),
        movimentacoes: [],
        criadoEm: serverTimestamp(),
      };
      await addDoc(collection(db, `${basePath}/investimentos`), novo);
    } catch (err) {
      console.error('Erro ao adicionar investimento:', err);
      setError(err.message);
      throw err;
    }
  };

  // ================================
  // ✏️ Atualizar investimento
  // ================================
  const updateInvestment = async (id, dadosAtualizados) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const investmentRef = doc(db, `${basePath}/investimentos`, id);
      const snap = await getDoc(investmentRef);
      if (!snap.exists()) throw new Error('Investimento não encontrado.');

      const atual = snap.data();
      const movs = atual.movimentacoes || [];
      const novoValorInicial = parseNumber(
        dadosAtualizados.valorInicial ?? atual.valorInicial ?? 0
      );

      const saldoReal = calcSaldoReal(novoValorInicial, movs);
      if (saldoReal < 0) {
        throw new Error(
          'Esse valor inicial deixaria o saldo do investimento negativo, considerando as movimentações já registradas.'
        );
      }
      const novoValorAtual = saldoReal;

      await updateDoc(investmentRef, {
        nome: dadosAtualizados.nome || atual.nome || 'Sem nome',
        instituicao:
          dadosAtualizados.instituicao ||
          atual.instituicao ||
          'Não Informado',
        valorInicial: novoValorInicial,
        valorAtual: novoValorAtual,
        meta: parseNumber(dadosAtualizados.meta ?? atual.meta ?? 0),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao atualizar investimento:', err);
      setError(err.message);
      throw err;
    }
  };

  // ================================
  // ❌ Deletar investimento
  // ================================
  const deleteInvestment = async (id) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      await deleteDoc(doc(db, `${basePath}/investimentos`, id));
    } catch (err) {
      console.error('Erro ao deletar investimento:', err);
      setError(err.message);
      throw err;
    }
  };

  // ================================
  // ➕ Adicionar movimentação
  // ================================
  const addTransaction = async (investmentId, transaction) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const investmentRef = doc(db, `${basePath}/investimentos`, investmentId);
      const docSnap = await getDoc(investmentRef);
      if (!docSnap.exists()) throw new Error('Investimento não encontrado.');
      const data = docSnap.data();
      const movs = data.movimentacoes || [];

      const novaMov = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tipo: transaction.tipo || 'Aporte',
        descricao: transaction.descricao || '',
        valor: parseNumber(transaction.valor ?? 0),
        data: transaction.data || new Date().toISOString(),
      };

      const novasMovs = [...movs, novaMov];
      const saldoReal = calcSaldoReal(data.valorInicial, novasMovs);
      if (saldoReal < 0) {
        throw new Error('Saldo insuficiente para essa retirada.');
      }

      await updateDoc(investmentRef, {
        movimentacoes: novasMovs,
        valorAtual: saldoReal,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao adicionar movimentação:', err);
      setError(err.message);
      throw err;
    }
  };

  // ================================
  // ✏️ Editar movimentação
  // ================================
  const updateTransaction = async (
    investmentId,
    transactionId,
    updatedTransaction
  ) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const investmentRef = doc(db, `${basePath}/investimentos`, investmentId);
      const docSnap = await getDoc(investmentRef);
      if (!docSnap.exists()) throw new Error('Investimento não encontrado.');
      const data = docSnap.data();
      const movs = data.movimentacoes || [];

      const novasMovs = movs.map((mov) =>
        mov.id === transactionId
          ? {
              ...mov,
              ...updatedTransaction,
              valor: parseNumber(updatedTransaction.valor ?? mov.valor ?? 0),
            }
          : mov
      );

      const saldoReal = calcSaldoReal(data.valorInicial, novasMovs);
      if (saldoReal < 0) {
        throw new Error(
          'Essa alteração deixaria o saldo do investimento negativo.'
        );
      }

      await updateDoc(investmentRef, {
        movimentacoes: novasMovs,
        valorAtual: saldoReal,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao editar movimentação:', err);
      setError(err.message);
      throw err;
    }
  };

  // ================================
  // ❌ Deletar movimentação
  // ================================
  const deleteTransaction = async (investmentId, transactionId) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const investmentRef = doc(db, `${basePath}/investimentos`, investmentId);
      const docSnap = await getDoc(investmentRef);
      if (!docSnap.exists()) throw new Error('Investimento não encontrado.');
      const data = docSnap.data();
      const movs = data.movimentacoes || [];

      const novasMovs = movs.filter((mov) => mov.id !== transactionId);

      const saldoReal = calcSaldoReal(data.valorInicial, novasMovs);
      if (saldoReal < 0) {
        throw new Error(
          'Não é possível excluir: essa movimentação deixaria o saldo do investimento negativo (provavelmente há uma retirada registrada que depende dela).'
        );
      }

      await updateDoc(investmentRef, {
        movimentacoes: novasMovs,
        valorAtual: saldoReal,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao deletar movimentação:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    investimentos,
    loading,
    error,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
};
