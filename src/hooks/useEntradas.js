import { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { datasPadraoPorDescricao } from '../utils/datasPadrao';
import { gerarDataComDia } from '../utils/gerarDataComDia';
import { colors } from '../styles/colors';
import { normalizarParaISO } from '../utils/formatarData';
import { useAuth } from "../auth/useAuth";
import { getBasePath } from "../utils/firestorePaths";
import { removerIndefinidos } from "../utils/firestoreSanitize";
import { registrarEvento } from "../utils/registrarEvento";
import { detectarAlteracoes } from "../utils/linhaDoTempoConfig";
import { parseBRL } from "../utils/formatarValor";
import { calcularModelosPendentes } from "../utils/modelosPendentes";
import {
  temBaseNova,
  somarBase,
  calcularValorPercentual,
  arredondarCentavos,
} from "../utils/basePercentual";


// =========================================================
// 🔹 HOOK: ENTRADAS (multiusuário + fixos dinâmicos + preparado p/ modo família)
// =========================================================
export const useEntradas = (mes, ano) => {
  const { user } = useAuth();
  const [entradas, setEntradas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // =========================================================
  // 🔹 Listener em tempo real das entradas do usuário
  // =========================================================
  useEffect(() => {
    if (!user?.uid || !mes || !ano) return;
    setCarregando(true);

    const ref = collection(db, `${getBasePath(user)}/entradas`);
    const q = query(ref, where("mes", "==", mes), where("ano", "==", ano));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            valor: parseBRL(data.valor),
            pago: data.pago === true,
            // 🔹 `data.membro`/`data.categoria` podem ser `null` (nenhum
            // Membro/categoria escolhido) — em JS, `typeof null === 'object'`
            // também é `true`; sem o `data.membro &&` aqui, `null?.nome` vira
            // `undefined`, valor que o Firestore rejeita em qualquer escrita
            // futura desse item (mesmo bug já corrigido em useCartoes.js —
            // ver ARQUITETURA.md seção 15.11).
            membro:
              data.membro && typeof data.membro === "object"
                ? data.membro?.nome
                : data.membro,
            categoria:
              data.categoria && typeof data.categoria === "object"
                ? data.categoria?.nome
                : data.categoria,
          };
        });

        // 🔸 Ordenar por data
        dados.sort(
          (a, b) =>
            new Date(a.data || "2100-12-31") - new Date(b.data || "2100-12-31")
        );

        setEntradas(dados);
        setCarregando(false);
      },
      (err) => {
        console.error("Erro ao buscar entradas:", err);
        setErro(err.message);
        setCarregando(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, mes, ano]);

  // =========================================================
  // 🔹 Recalcular automaticamente gastos dinâmicos
  // =========================================================
  // 🔹 `entradas.length === 0` continua bloqueando: no primeiro render a lista
  // ainda está vazia (snapshot não chegou) e recalcular aqui zeraria os gastos.
  useEffect(() => {
    if (!user?.uid || !mes || !ano || entradas.length === 0) return;

    const basePath = getBasePath(user);
    const qGastos = query(
      collection(db, `${basePath}/gastos`),
      where("mes", "==", mes),
      where("ano", "==", ano),
      where("fixacao", "==", "dinamico")
    );

    const unsubscribe = onSnapshot(qGastos, async (snapshot) => {
      const gastosPercentuais = snapshot.docs.filter(
        (d) => d.data().modoCalculo === "porcentagem"
      );
      if (gastosPercentuais.length === 0) return;

      // Modelos de gasto: só para gasto gerado ainda com a base antiga
      // (ver resolução da base abaixo).
      const precisaModelosGasto = gastosPercentuais.some((d) => !temBaseNova(d.data()));
      const modelosGasto = new Map(
        precisaModelosGasto
          ? (await getDocs(collection(db, `${basePath}/modelosDeGasto`))).docs.map(
              (d) => [d.id, d.data()]
            )
          : []
      );
      // Modelos de entrada: para reconhecer entradas antigas (sem modeloId)
      // pela descrição, na base nova.
      const modelosEntrada = (
        await getDocs(collection(db, `${basePath}/modelosDeEntrada`))
      ).docs.map((d) => ({ id: d.id, ...d.data() }));

      const batch = writeBatch(db);
      let temAlteracao = false;

      gastosPercentuais.forEach((docSnap) => {
        const gasto = docSnap.data();
        const idsLegados = Array.isArray(gasto.entradasSelecionadas)
          ? gasto.entradasSelecionadas
          : [];
        const entradasLegadas = entradas.filter((e) => idsLegados.includes(e.id));

        // 🔹 Qual base usar:
        // 1. a do próprio gasto (gerado já com a base nova);
        // 2. base antiga, se os ids ainda apontam para entradas deste mês
        //    (gastos de meses passados continuam exatamente como eram);
        // 3. base antiga "quebrada" (ids de outro mês — o gasto que saía
        //    zerado): usa a base nova do modelo de origem, se já convertido,
        //    e grava no gasto para não precisar resolver de novo.
        const modeloOrigem = modelosGasto.get(gasto.modeloId);
        let total;
        let baseDoModelo = null;
        if (temBaseNova(gasto)) {
          total = somarBase(gasto, entradas, modelosEntrada);
        } else if (entradasLegadas.length > 0) {
          total = entradasLegadas.reduce((soma, e) => soma + parseBRL(e.valor), 0);
        } else if (temBaseNova(modeloOrigem)) {
          baseDoModelo = {
            baseModelosEntrada: modeloOrigem.baseModelosEntrada,
            baseIncluiAvulsas: modeloOrigem.baseIncluiAvulsas === true,
          };
          total = somarBase(baseDoModelo, entradas, modelosEntrada);
        } else {
          return;
        }

        const novoValor = calcularValorPercentual(total, gasto.valorPercentual);
        if (novoValor !== arredondarCentavos(parseBRL(gasto.valor)) || baseDoModelo) {
          batch.update(doc(db, `${basePath}/gastos`, docSnap.id), {
            valor: novoValor,
            ...baseDoModelo,
            atualizadoEm: serverTimestamp(),
          });
          temAlteracao = true;
        }
      });

      if (temAlteracao) await batch.commit();
    });

    return () => unsubscribe();
  }, [entradas, user?.uid, mes, ano]);

  // =========================================================
  // 🔹 Criar nova entrada
  // =========================================================
  const adicionarEntrada = async (entrada) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");

    try {
      const basePath = getBasePath(user);
      const diaPadrao = datasPadraoPorDescricao[entrada.descricao] || 1;
      const dataFinal = entrada.data
        ? normalizarParaISO(entrada.data)
        : normalizarParaISO(
            gerarDataComDia(diaPadrao, entrada.mes || mes, entrada.ano || ano)
          );

      const docRef = await addDoc(
        collection(db, `${basePath}/entradas`),
        removerIndefinidos({
          ...entrada,
          pago: entrada.pago === true,
          data: dataFinal,
          valor: parseBRL(entrada.valor),
          compartilhado: false, // 👈 novo campo padrão
          criadoEm: serverTimestamp(),
        })
      );

      await registrarEvento(basePath, {
        acao: "criado",
        entidade: "entrada",
        entidadeId: docRef.id,
        origem: { agente: "usuario", canal: "criacao" },
        usuarioId: user.uid,
      });

      return { ...entrada, id: docRef.id };
    } catch (err) {
      setErro(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Atualizar entrada existente
  // =========================================================
  const atualizarEntrada = async (id, entrada) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");

    try {
      const basePath = getBasePath(user);
      const ref = doc(db, `${basePath}/entradas`, id);
      const docSnap = await getDoc(ref);
      const atual = docSnap.data();

      // 🔹 Calculado antes de qualquer mutação — ver ARQUITETURA.md seção 18.
      const alteracoesCampos = detectarAlteracoes("entrada", atual, entrada);

      const dadosAtualizados = { ...entrada };

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split("T")[0];
      } else if (
        dadosAtualizados.pago === false &&
        dadosAtualizados.dataPagamento
      ) {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(
        ref,
        removerIndefinidos({
          ...dadosAtualizados,
          valor: parseBRL(dadosAtualizados.valor),
          atualizadoEm: serverTimestamp(),
        })
      );

      const marcouComoPago = dadosAtualizados.pago === true && atual?.pago !== true;
      const desmarcouComoPago = dadosAtualizados.pago === false && atual?.pago === true;
      if (marcouComoPago) {
        await registrarEvento(basePath, {
          acao: "pago",
          entidade: "entrada",
          entidadeId: id,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      } else if (desmarcouComoPago) {
        await registrarEvento(basePath, {
          acao: "reaberto",
          entidade: "entrada",
          entidadeId: id,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      } else if (Object.keys(alteracoesCampos).length > 0) {
        await registrarEvento(basePath, {
          acao: "editado",
          entidade: "entrada",
          entidadeId: id,
          alteracoes: alteracoesCampos,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      }
    } catch (err) {
      setErro(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Excluir entrada
  // =========================================================
  const excluirEntrada = async (id) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);
      await deleteDoc(doc(db, `${basePath}/entradas`, id));
      await registrarEvento(basePath, {
        acao: "excluido",
        entidade: "entrada",
        entidadeId: id,
        origem: { agente: "usuario", canal: "exclusao" },
        usuarioId: user.uid,
      });
    } catch (err) {
      setErro(err.message);
      throw err;
    }
  };

// =========================================================
// 🔹 Gerar entradas fixas do mês com base em modelos
// =========================================================
// 🔹 Mesma estrutura de useGastos.js: lê direto do Firestore e recalcula os
// pendentes de novo antes de gravar, para nunca duplicar.
const carregarPendentes = async (basePath) => {
  const refEntradas = collection(db, `${basePath}/entradas`);
  const qEntradas = query(refEntradas, where("mes", "==", mes), where("ano", "==", ano));
  const snapshotEntradasExistentes = await getDocs(qEntradas);
  const entradasDoMes = snapshotEntradasExistentes.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  const refModelos = collection(db, `${basePath}/modelosDeEntrada`);
  const snapshotModelos = await getDocs(refModelos);
  const modelos = snapshotModelos.docs.map((d) => ({ id: d.id, ...d.data() }));

  return {
    entradasDoMes,
    modelos,
    pendentes: calcularModelosPendentes(modelos, entradasDoMes),
  };
};

// 🔹 Para a tela de confirmação. `status`: SEM_MODELOS | NADA_PENDENTE | OK | ERRO.
const listarModelosPendentes = async () => {
  if (!user?.uid) return { status: "ERRO", pendentes: [] };
  try {
    const { modelos, pendentes } = await carregarPendentes(getBasePath(user));
    if (modelos.length === 0) return { status: "SEM_MODELOS", pendentes: [] };
    if (pendentes.length === 0) return { status: "NADA_PENDENTE", pendentes: [] };
    return { status: "OK", pendentes };
  } catch (err) {
    console.error("Erro ao listar modelos pendentes:", err);
    setErro(err.message);
    return { status: "ERRO", pendentes: [] };
  }
};

// 🔹 Gera só os modelos escolhidos (`modeloIds`) que continuam pendentes.
const gerarFixosDoMes = async (modeloIds = []) => {
  if (!user?.uid) return { status: "ERRO" };

  try {
    const basePath = getBasePath(user);
    const refEntradas = collection(db, `${basePath}/entradas`);

    const { entradasDoMes, pendentes } = await carregarPendentes(basePath);
    const selecionados = pendentes.filter((m) => modeloIds.includes(m.id));
    if (selecionados.length === 0) return { status: "NADA_PENDENTE" };

    const novosDocs = [];

    for (const modelo of selecionados) {
      let valorFinal = parseBRL(modelo.valor);

      // cálculo de porcentagem se houver
      if (
        modelo.modoCalculo === "porcentagem" &&
        Array.isArray(modelo.entradasSelecionadas) &&
        modelo.entradasSelecionadas.length > 0
      ) {
        const entradasSelecionadas = entradasDoMes.filter((e) =>
          modelo.entradasSelecionadas.includes(e.id)
        );

        const totalEntradas = entradasSelecionadas.reduce(
          (soma, e) => soma + parseBRL(e.valor),
          0
        );
        valorFinal = totalEntradas * (parseFloat(modelo.valor) / 100);
      }

      novosDocs.push({
        descricao: modelo.descricao,
        // 🔹 `|| null`: modelos antigos podem não ter esse campo — sem o
        // fallback, `categoria: undefined` quebraria o batch.set (mesmo bug
        // corrigido em useCartoes.js, ver ARQUITETURA.md seção 15.11).
        categoria: modelo.categoria || null,
        // 🔹 Propaga a referência estável do modelo (ver SPRINT4_DISCOVERY.md)
        categoriaId: modelo.categoriaId || null,
        categoriaNome: modelo.categoriaNome || null,
        membro: modelo.membro || null,
        // 🔹 Propaga a referência estável de Membro do modelo (Sprint 5,
        // mesmo padrão de categoriaId acima — ver SPRINT5_DISCOVERY.md 4.3.3)
        membroId: modelo.membroId || null,
        membroNome: modelo.membroNome || null,
        valor: parseFloat(valorFinal.toFixed(2)),
        data: gerarDataComDia(modelo.diaVencimento, mes, ano),
        mes,
        ano,
        pago: false,
        origemModelo: true,
        // 🔹 De qual modelo veio (ver utils/modelosPendentes.js)
        modeloId: modelo.id,
        criadoEm: serverTimestamp(),
      });
    }

    const batch = writeBatch(db);

    // 🟢 adiciona como novas ENTRADAS, não GASTOS
    novosDocs.forEach((e) => batch.set(doc(refEntradas), removerIndefinidos(e)));

    await batch.commit();

    return { status: "SUCESSO", quantidade: novosDocs.length };
  } catch (err) {
    console.error("Erro ao gerar fixos:", err);
    setErro(err.message);
    return { status: "ERRO" };
  }
};

  // =========================================================
  // 🔹 Retorno do hook
  // =========================================================
  return {
    entradas,
    carregando,
    erro,
    adicionarEntrada,
    atualizarEntrada,
    excluirEntrada,
    gerarFixosDoMes,
    listarModelosPendentes,
  };
};
