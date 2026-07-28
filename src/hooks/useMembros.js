import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';

// =========================================================
// 🔹 HOOK: MEMBROS — fonte única (MembroSelect.js e a tela de
// administração usam este hook; nenhum dos dois acessa o Firestore
// diretamente).
// =========================================================
export const useMembros = () => {
  const { user } = useAuth();
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      setMembros([]);
      setLoading(false);
      return;
    }

    const ref = collection(db, `${getBasePath(user)}/membros`);
    const q = query(ref, orderBy('criadoEm', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const lista = snapshot.docs.map((d) => ({
          id: d.id,
          nome: d.data().nome || 'Sem nome',
          ativo: d.data().ativo !== false,
          // 🔹 Reservado para seleção/geração de avatar por membro — recurso
          // futuro (ver PROJECT_STATUS.md), campo já existe para não exigir
          // migração de dados quando for implementado.
          avatar: d.data().avatar || null,
        }));
        setMembros(lista);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar membros:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const adicionarMembro = async (nome) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    const nomeTrim = (nome || '').trim();
    if (!nomeTrim) throw new Error('Digite um nome antes de adicionar.');

    const duplicado = membros.some(
      (m) => m.nome.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (duplicado) throw new Error('Já existe um membro com esse nome.');

    try {
      const basePath = getBasePath(user);
      await addDoc(collection(db, `${basePath}/membros`), {
        nome: nomeTrim,
        ativo: true,
        avatar: null,
        criadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao adicionar membro:', err);
      setError(err.message);
      throw err;
    }
  };

  const atualizarMembro = async (id, dados) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      await updateDoc(doc(db, `${basePath}/membros`, id), {
        ...dados,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao atualizar membro:', err);
      setError(err.message);
      throw err;
    }
  };

  const excluirMembro = async (id) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      await deleteDoc(doc(db, `${basePath}/membros`, id));
    } catch (err) {
      console.error('Erro ao excluir membro:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    membros,
    loading,
    error,
    adicionarMembro,
    atualizarMembro,
    excluirMembro,
  };
};
