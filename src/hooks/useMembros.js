import { useState, useEffect } from 'react';
import {
  collection,
  doc,
  setDoc,
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
import { isMembroProprietario } from '../utils/membros';
import { gerarAvatarPadrao } from '../utils/avatar';

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
          // 🔹 Avatar vetorial (DiceBear) — ver SPRINT5_DISCOVERY.md e
          // utils/avatar.js. Gerado automaticamente na criação do membro.
          avatar: d.data().avatar || null,
          // 🔹 Identidade (Sprint 5, ver SPRINT5_DISCOVERY.md seção 12):
          // `ehProprietario` marca o membro-espelho do dono da conta (não
          // pode ser excluído); `uid`, quando preenchido, vincula este
          // membro a uma conta real (o próprio dono, ou futuramente outro
          // usuário no Modo Família).
          ehProprietario: d.data().ehProprietario || false,
          uid: d.data().uid || null,
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
      const ref = doc(collection(db, `${basePath}/membros`));
      await setDoc(ref, {
        nome: nomeTrim,
        ativo: true,
        avatar: gerarAvatarPadrao(ref.id),
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

    // 🔹 O membro-espelho do dono da conta não pode ser excluído aqui —
    // excluir a conta em si é um fluxo diferente (ver ContaScreen.js).
    const membro = membros.find((m) => m.id === id);
    if (isMembroProprietario(membro)) {
      throw new Error('Não é possível excluir o proprietário da conta.');
    }

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
