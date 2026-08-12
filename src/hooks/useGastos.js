import { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, where,} from "firebase/firestore";
import { db } from "../config/firebase";
import { datasPadraoPorDescricao } from "../utils/datasPadrao";
import { gerarDataComDia } from "../utils/gerarDataComDia";
import { normalizarParaISO } from "../utils/formatarData";
import { useAuth } from "../auth/useAuth";
import { getBasePath } from "../utils/firestorePaths";
import { parseBRL } from "../utils/formatarValor";
import { removerIndefinidos } from "../utils/firestoreSanitize";
import { registrarEvento } from "../utils/registrarEvento";
import { detectarAlteracoes } from "../utils/linhaDoTempoConfig";

// =========================================================
// 🔹 HOOK: useGastos — preparado para multiusuário e modo família
// =========================================================
export const useGastos = (mes, ano) => {
  const { user } = useAuth();
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =========================================================
  // 🔹 Listener em tempo real
  // =========================================================
  useEffect(() => {
    if (!user?.uid || !mes || !ano) return;
    setLoading(true);

    const q = query(
      collection(db, `${getBasePath(user)}/gastos`),
      where("mes", "==", mes),
      where("ano", "==", ano)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          valor: parseBRL(d.data().valor),
        }));

        data.sort(
          (a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)
        );

        setGastos(data);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Erro ao carregar gastos fixos:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, mes, ano]);

  // =========================================================
  // ⚙️ Gerar gastos fixos via modelos
  // =========================================================
  const gerarFixosDoMes = async () => {
    if (!user?.uid) return;
    try {
      const basePath = getBasePath(user);

      // Verifica se já existem gastos gerados
      const qGastos = query(
        collection(db, `${basePath}/gastos`),
        where("mes", "==", mes),
        where("ano", "==", ano)
      );
      const snapshotGastos = await getDocs(qGastos);
      const jaGerou = snapshotGastos.docs.some(
        (doc) => doc.data().origemModelo === true
      );
      if (jaGerou) return "JA_GERADO";

      // Busca modelos de gasto ativos
      const qModelos = query(
        collection(db, `${basePath}/modelosDeGasto`),
        where("ativo", "==", true)
      );
      const modelosSnapshot = await getDocs(qModelos);
      if (modelosSnapshot.empty) return "SEM_MODELOS";

      // Carrega entradas do mês/ano
      const qEntradas = query(
        collection(db, `${basePath}/entradas`),
        where("mes", "==", mes),
        where("ano", "==", ano)
      );
      const entradasSnapshot = await getDocs(qEntradas);
      const entradas = entradasSnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        valor: parseBRL(d.data().valor),
      }));

      const novosGastos = [];

      for (const docSnap of modelosSnapshot.docs) {
        const modelo = docSnap.data();
        let valorFinal = parseBRL(modelo.valor);

        // 🧮 Se for modo "porcentagem", calcula com base nas entradas selecionadas
        if (
          modelo.modoCalculo === "porcentagem" &&
          Array.isArray(modelo.entradasSelecionadas) &&
          modelo.entradasSelecionadas.length > 0
        ) {
          const entradasSelecionadas = entradas.filter((e) =>
            modelo.entradasSelecionadas.includes(e.id)
          );

          const totalEntradas = entradasSelecionadas.reduce(
            (sum, e) => sum + parseBRL(e.valor),
            0
          );

          valorFinal = totalEntradas * (parseBRL(modelo.valor) / 100);
        }

        novosGastos.push({
          descricao: modelo.descricao,
          // 🔹 `|| null`: modelos antigos podem não ter esse campo — sem o
          // fallback, `categoria: undefined` quebraria o batch.set (mesma
          // classe de bug corrigida em useCartoes.js/useEntradas.js — ver
          // ARQUITETURA.md seção 15.11).
          categoria: modelo.categoria || null,
          // 🔹 Propaga a referência estável do modelo para o lançamento
          // gerado (ver SPRINT4_DISCOVERY.md) — sem isso, gastos fixos
          // gerados por modelo nunca teriam categoriaId.
          categoriaId: modelo.categoriaId || null,
          categoriaNome: modelo.categoriaNome || null,
          valor: parseFloat(valorFinal.toFixed(2)),
          valorPercentual:
            modelo.modoCalculo === "porcentagem"
              ? parseBRL(modelo.valor)
              : null,
          modoCalculo: modelo.modoCalculo || "valor",
          entradasSelecionadas: modelo.entradasSelecionadas || [],
          fixacao: modelo.fixacao || "dinamico",
          dataVencimento: gerarDataComDia(modelo.diaVencimento, mes, ano),
          mes,
          ano,
          pago: false,
          origemModelo: true,
          criadoEm: serverTimestamp(),
        });
      }

      // 💾 Grava em lote
      const batch = writeBatch(db);
      novosGastos.forEach((g) =>
        batch.set(doc(collection(db, `${basePath}/gastos`)), removerIndefinidos(g))
      );
      await batch.commit();

      return "SUCESSO";
    } catch (err) {
      console.error("Erro ao gerar gastos fixos:", err);
      setError(err.message);
      return "ERRO";
    }
  };

  // =========================================================
  // CRUD básico
  // =========================================================
  const addGasto = async (gasto) => {
    if (!user?.uid) return;
    try {
      const basePath = getBasePath(user);
      const diaPadrao = datasPadraoPorDescricao[gasto.descricao] || 1;
      const dataFinal =
        gasto.dataVencimento ||
        gerarDataComDia(diaPadrao, gasto.mes || mes, gasto.ano || ano);

      const docRef = await addDoc(
        collection(db, `${basePath}/gastos`),
        removerIndefinidos({
          ...gasto,
          dataVencimento: normalizarParaISO(dataFinal),
          valor: parseBRL(gasto.valor),
          compartilhado: false, // 👈 novo campo padrão
          criadoEm: serverTimestamp(),
        })
      );

      await registrarEvento(basePath, {
        acao: "criado",
        entidade: "gasto",
        entidadeId: docRef.id,
        origem: { agente: "usuario", canal: "criacao" },
        usuarioId: user.uid,
      });
    } catch (err) {
      console.error("Erro ao adicionar gasto:", err);
      setError(err.message);
      throw err;
    }
  };

  const updateGasto = async (id, gasto) => {
    if (!user?.uid) return;
    try {
      const basePath = getBasePath(user);
      const ref = doc(db, `${basePath}/gastos`, id);
      const docSnap = await getDoc(ref);
      const atual = docSnap.data();

      // 🔹 Calculado antes de qualquer mutação — ver ARQUITETURA.md seção 18.
      const alteracoesCampos = detectarAlteracoes("gasto", atual, gasto);

      const dadosAtualizados = { ...gasto };

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento)
        dadosAtualizados.dataPagamento =
          new Date().toISOString().split("T")[0];
      if (dadosAtualizados.pago === false)
        dadosAtualizados.dataPagamento = null;

      await updateDoc(
        ref,
        removerIndefinidos({
          ...dadosAtualizados,
          valor: parseBRL(dadosAtualizados.valor),
          atualizadoEm: serverTimestamp(),
        })
      );

      // 🔹 "Pago"/"Reaberto" têm ação própria; fora isso, "editado" cobre
      // qualquer campo relevante alterado na mesma chamada — mesmo critério
      // de useCartoes.js/useEmprestimos.js.
      const marcouComoPago = dadosAtualizados.pago === true && atual?.pago !== true;
      const desmarcouComoPago = dadosAtualizados.pago === false && atual?.pago === true;
      if (marcouComoPago) {
        await registrarEvento(basePath, {
          acao: "pago",
          entidade: "gasto",
          entidadeId: id,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      } else if (desmarcouComoPago) {
        await registrarEvento(basePath, {
          acao: "reaberto",
          entidade: "gasto",
          entidadeId: id,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      } else if (Object.keys(alteracoesCampos).length > 0) {
        await registrarEvento(basePath, {
          acao: "editado",
          entidade: "gasto",
          entidadeId: id,
          alteracoes: alteracoesCampos,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar gasto:", err);
      setError(err.message);
      throw err;
    }
  };

  const deleteGasto = async (id) => {
    if (!user?.uid) return;
    try {
      const basePath = getBasePath(user);
      await deleteDoc(doc(db, `${basePath}/gastos`, id));
      await registrarEvento(basePath, {
        acao: "excluido",
        entidade: "gasto",
        entidadeId: id,
        origem: { agente: "usuario", canal: "exclusao" },
        usuarioId: user.uid,
      });
    } catch (err) {
      console.error("Erro ao deletar gasto:", err);
      setError(err.message);
      throw err;
    }
  };

  return {
    gastos,
    loading,
    error,
    addGasto,
    updateGasto,
    deleteGasto,
    gerarFixosDoMes,
  };
};
