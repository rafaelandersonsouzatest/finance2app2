// src/hooks/useModelos.js
import { useState, useEffect } from 'react';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';

// 🔹 HOOK: MODELOS (Entradas e Gastos) — versão robusta (não requer ModoFamiliaContext)
export const useModelos = (tipo = 'gasto', modoFamiliaAtivo = false) => {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // mantém o mesmo destructuring que você já usa
  const { user, membroSelecionado } = useAuth();

  // Função que resolve o caminho base de forma segura
  const getCaminhoBase = () => {
    // se user não existir ou não tiver uid, retorna null (efeito vai esperar)
    if (!user || !user.uid) return null;

    // se modo família estiver ativo e houver um membro selecionado com uid, usa ele
    if (modoFamiliaAtivo && membroSelecionado && membroSelecionado.uid) {
      return `users/${membroSelecionado.uid}`;
    }

    // caso padrão: usuários individuais (getBasePath espera um objeto user válido)
    try {
      return getBasePath(user);
    } catch (err) {
      // getBasePath lança se user inválido — segura aqui
      console.warn('getBasePath falhou:', err);
      return `users/${user.uid}`;
    }
  };

  useEffect(() => {
    const basePath = getCaminhoBase();
    // quando não tiver caminho base (usuário ainda carregando), não faz nada
    if (!basePath) {
      setModelos([]);
      setLoading(true);
      return;
    }

    const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
    const ref = collection(db, `${basePath}/${collectionName}`);
    const q = query(ref);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          valor: parseFloat(String(docSnap.data().valor ?? 0).replace(',', '.')) || 0,
        }));

        data.sort(
          (a, b) =>
            (a.diaVencimento || a.diaDoMes || 99) - (b.diaVencimento || b.diaDoMes || 99)
        );

        setModelos(data);
        setLoading(false);
      },
      (err) => {
        console.error(`Erro ao carregar modelos (${tipo}):`, err);
        setError(err.message || String(err));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tipo, user?.uid, membroSelecionado?.uid, modoFamiliaAtivo]);

  // ➕ Adicionar modelo
  const addModelo = async (modelo) => {
    try {
      const basePath = getCaminhoBase();
      if (!basePath) throw new Error('Usuário não autenticado.');

      const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
      const valor = parseFloat(String(modelo.valor ?? 0).replace(',', '.')) || 0;

      await addDoc(collection(db, `${basePath}/${collectionName}`), {
        ...modelo,
        ativo: modelo.ativo ?? true,
        valor,
        criadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao adicionar modelo:', err);
      setError(err.message || String(err));
      throw err;
    }
  };

  // ✏️ Atualizar modelo
  const updateModelo = async (id, modelo) => {
    try {
      const basePath = getCaminhoBase();
      if (!basePath) throw new Error('Usuário não autenticado.');

      const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
      const valor = parseFloat(String(modelo.valor ?? 0).replace(',', '.')) || 0;

      await updateDoc(doc(db, `${basePath}/${collectionName}`, id), {
        ...modelo,
        valor,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao atualizar modelo:', err);
      setError(err.message || String(err));
      throw err;
    }
  };

  // ❌ Deletar modelo
  const deleteModelo = async (id) => {
    try {
      const basePath = getCaminhoBase();
      if (!basePath) throw new Error('Usuário não autenticado.');

      const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
      await deleteDoc(doc(db, `${basePath}/${collectionName}`, id));
    } catch (err) {
      console.error('Erro ao deletar modelo:', err);
      setError(err.message || String(err));
      throw err;
    }
  };

  return {
    modelos,
    loading,
    error,
    addModelo,
    updateModelo,
    deleteModelo,
  };
};
