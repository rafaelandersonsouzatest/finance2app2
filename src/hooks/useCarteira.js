// src/hooks/useCarteira.js
// Fonte única de cartões cadastrados pelo usuário — mesmo princípio de
// useMembros.js/useCategorias.js: nenhum outro lugar do app deve acessar a
// coleção `carteira` do Firestore diretamente. "Cartão cadastrado" é uma
// entidade própria (nome, banco, cor, vencimento, fechamento), diferente de
// `users/{uid}/cartoes` (lançamentos/parcelas de compra no cartão, que
// continua exatamente como está — ver ARQUITETURA.md).
import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';

export const useCarteira = () => {
  const { user } = useAuth();
  const [cartoesCadastrados, setCartoesCadastrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setCartoesCadastrados([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, `${getBasePath(user)}/carteira`);
    const q = query(ref, orderBy('criadoEm', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCartoesCadastrados(lista);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar cartões cadastrados:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const validarNomeDuplicado = (nome, ignorarId = null) => {
    const nomeTrim = nome.trim().toLowerCase();
    return cartoesCadastrados.some(
      (c) => c.id !== ignorarId && c.nome.toLowerCase() === nomeTrim
    );
  };

  const adicionarCartao = async (dados) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    const nomeTrim = (dados.nome || '').trim();
    if (!nomeTrim) throw new Error('Digite um nome para o cartão.');

    if (validarNomeDuplicado(nomeTrim)) {
      throw new Error('Já existe um cartão com esse nome.');
    }

    try {
      const basePath = getBasePath(user);
      await addDoc(collection(db, `${basePath}/carteira`), {
        nome: nomeTrim,
        banco: (dados.banco || '').trim() || null,
        ultimos4Digitos: (dados.ultimos4Digitos || '').trim() || null,
        cor: dados.cor || '#4FC3F7',
        diaVencimento: Number(dados.diaVencimento) || 1,
        diaFechamento: Number(dados.diaFechamento) || 1,
        ativo: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: null,
      });
    } catch (err) {
      console.error('Erro ao adicionar cartão:', err);
      setError(err.message);
      throw err;
    }
  };

  const atualizarCartao = async (id, dados) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');

    if (dados.nome && validarNomeDuplicado(dados.nome.trim(), id)) {
      throw new Error('Já existe um cartão com esse nome.');
    }

    try {
      const basePath = getBasePath(user);
      await updateDoc(doc(db, `${basePath}/carteira`, id), {
        ...dados,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao atualizar cartão:', err);
      setError(err.message);
      throw err;
    }
  };

  // 🔹 Arquivar (`ativo: false`) é sempre seguro e reversível — mesmo padrão
  // de arquivarCategoria/reativarCategoria — some do CartaoSelect para novos
  // lançamentos, sem afetar nada que já existe.
  const arquivarCartao = (id) => atualizarCartao(id, { ativo: false });
  const reativarCartao = (id) => atualizarCartao(id, { ativo: true });

  // 🔹 Exclusão de verdade só é permitida sem nenhum vínculo — mesma regra
  // de excluirCategoria, para nunca deixar um `cartaoId` órfão apontando
  // para um documento que não existe mais.
  const excluirCartao = async (id) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');

    try {
      const basePath = getBasePath(user);

      const q = query(
        collection(db, `${basePath}/cartoes`),
        where('cartaoId', '==', id),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        throw new Error(
          'Este cartão já foi usado em algum lançamento — arquive em vez de excluir, para não perder o histórico.'
        );
      }

      await deleteDoc(doc(db, `${basePath}/carteira`, id));
    } catch (err) {
      console.error('Erro ao excluir cartão:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    cartoesCadastrados,
    loading,
    error,
    adicionarCartao,
    atualizarCartao,
    arquivarCartao,
    reativarCartao,
    excluirCartao,
  };
};
