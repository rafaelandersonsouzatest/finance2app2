// src/hooks/useCategorias.js
// Fonte única de categorias e subcategorias — nenhum outro lugar do app deve
// acessar a coleção `categorias` do Firestore ou o AsyncStorage antigo
// diretamente (mesmo princípio de useMembros.js). Ver SPRINT4_DISCOVERY.md
// para o raciocínio de arquitetura completo antes de alterar este arquivo.
import { useState, useEffect, useRef } from 'react';
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
  writeBatch,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';
import { CATEGORIAS_PADRAO_SEED } from '../utils/categoriasPadrao';

// Coleções de lançamento onde uma categoria pode estar em uso — checadas
// antes de permitir exclusão definitiva (ver seção 10 do discovery).
const COLECOES_COM_CATEGORIA = ['gastos', 'entradas', 'cartoes', 'emprestimos'];

// Semeia o catálogo padrão com IDs determinísticos — seguro para rodar mais
// de uma vez (ex.: dois aparelhos abrindo o app logo após o cadastro): um
// `batch.set` repetido com o mesmo ID só sobrescreve com os mesmos dados, não
// duplica.
async function semearCategoriasPadrao(basePath) {
  const batch = writeBatch(db);
  const ref = collection(db, `${basePath}/categorias`);

  CATEGORIAS_PADRAO_SEED.forEach((categoria) => {
    const { subcategorias, id, ...dados } = categoria;
    batch.set(doc(ref, id), {
      ...dados,
      parentId: null,
      tipoOrigem: 'padrao',
      ativa: true,
      criadoEm: serverTimestamp(),
      atualizadoEm: null,
    });

    (subcategorias || []).forEach((sub, indice) => {
      batch.set(doc(ref, sub.id), {
        nome: sub.nome,
        parentId: id,
        tipoOrigem: 'padrao',
        tipoTransacao: dados.tipoTransacao,
        icone: dados.icone,
        cor: dados.cor,
        ordem: indice,
        ativa: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: null,
      });
    });
  });

  await batch.commit();
}

export const useCategorias = () => {
  const { user } = useAuth();
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const jaTentouSemear = useRef(false);

  useEffect(() => {
    if (!user?.uid) {
      setCategorias([]);
      setLoading(false);
      return;
    }

    const basePath = getBasePath(user);
    const ref = collection(db, `${basePath}/categorias`);
    const q = query(ref, orderBy('ordem', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty && !jaTentouSemear.current) {
          jaTentouSemear.current = true;
          try {
            await semearCategoriasPadrao(basePath);
          } catch (err) {
            console.error('Erro ao semear categorias padrão:', err);
          }
          return; // o próprio semear dispara um novo snapshot com os dados
        }

        const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setCategorias(lista);
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar categorias:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const validarNomeDuplicado = (nome, parentId, ignorarId = null) => {
    const nomeTrim = nome.toLowerCase();
    return categorias.some(
      (c) =>
        c.id !== ignorarId &&
        (c.parentId || null) === (parentId || null) &&
        c.nome.toLowerCase() === nomeTrim
    );
  };

  const adicionarCategoria = async (dados) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    const nomeTrim = (dados.nome || '').trim();
    if (!nomeTrim) throw new Error('Digite um nome antes de adicionar.');

    if (validarNomeDuplicado(nomeTrim, dados.parentId)) {
      throw new Error(
        dados.parentId
          ? 'Já existe uma subcategoria com esse nome nesta categoria.'
          : 'Já existe uma categoria com esse nome.'
      );
    }

    try {
      const basePath = getBasePath(user);
      await addDoc(collection(db, `${basePath}/categorias`), {
        nome: nomeTrim,
        parentId: dados.parentId || null,
        tipoOrigem: 'personalizada',
        tipoTransacao: dados.tipoTransacao || 'despesa',
        icone: dados.icone || 'shape-outline',
        cor: dados.cor || '#888888',
        ordem: dados.ordem ?? categorias.length,
        ativa: true,
        criadoEm: serverTimestamp(),
        atualizadoEm: null,
      });
    } catch (err) {
      console.error('Erro ao adicionar categoria:', err);
      setError(err.message);
      throw err;
    }
  };

  const atualizarCategoria = async (id, dados) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');

    if (dados.nome) {
      const atual = categorias.find((c) => c.id === id);
      const parentId = dados.parentId !== undefined ? dados.parentId : atual?.parentId;
      if (validarNomeDuplicado(dados.nome.trim(), parentId, id)) {
        throw new Error(
          parentId
            ? 'Já existe uma subcategoria com esse nome nesta categoria.'
            : 'Já existe uma categoria com esse nome.'
        );
      }
    }

    try {
      const basePath = getBasePath(user);
      await updateDoc(doc(db, `${basePath}/categorias`, id), {
        ...dados,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao atualizar categoria:', err);
      setError(err.message);
      throw err;
    }
  };

  // Arquivar (`ativa: false`) é sempre seguro e reversível — some do
  // seletor para novos lançamentos, mas não afeta nada que já existe.
  const arquivarCategoria = (id) => atualizarCategoria(id, { ativa: false });
  const reativarCategoria = (id) => atualizarCategoria(id, { ativa: true });

  // Exclusão de verdade só é permitida sem nenhum vínculo (ver seção 10 do
  // discovery) — evita categoriaId órfão apontando para um documento que não
  // existe mais.
  const excluirCategoria = async (id) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');

    const temSubcategoria = categorias.some((c) => c.parentId === id);
    if (temSubcategoria) {
      throw new Error(
        'Esta categoria tem subcategorias — exclua ou mova as subcategorias antes, ou arquive esta categoria em vez de excluir.'
      );
    }

    try {
      const basePath = getBasePath(user);

      for (const colecao of COLECOES_COM_CATEGORIA) {
        const q = query(
          collection(db, `${basePath}/${colecao}`),
          where('categoriaId', '==', id),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          throw new Error(
            'Esta categoria já foi usada em algum lançamento — arquive em vez de excluir, para não perder o histórico.'
          );
        }
      }

      await deleteDoc(doc(db, `${basePath}/categorias`, id));
    } catch (err) {
      console.error('Erro ao excluir categoria:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    categorias,
    loading,
    error,
    adicionarCategoria,
    atualizarCategoria,
    arquivarCategoria,
    reativarCategoria,
    excluirCategoria,
  };
};
