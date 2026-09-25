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
import { calcularModelosPendentes } from "../utils/modelosPendentes";
import { temBaseNova, somarBase, calcularValorPercentual } from "../utils/basePercentual";
import { migrarBasesPercentuaisLegadas } from "../utils/migrarBasePercentual";

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
  // 🔹 Busca direto no Firestore (não usa o `gastos` do listener) para não
  // depender de o snapshot já ter chegado — mesma leitura usada na geração,
  // que roda de novo antes de gravar para nunca duplicar (toque duplo, outro
  // dispositivo gerando ao mesmo tempo).
  const carregarPendentes = async (basePath) => {
    const qGastos = query(
      collection(db, `${basePath}/gastos`),
      where("mes", "==", mes),
      where("ano", "==", ano)
    );
    const snapshotGastos = await getDocs(qGastos);
    const gastosDoMes = snapshotGastos.docs.map((d) => d.data());

    // Busca modelos de gasto ativos
    const qModelos = query(
      collection(db, `${basePath}/modelosDeGasto`),
      where("ativo", "==", true)
    );
    const modelosSnapshot = await getDocs(qModelos);
    const modelos = modelosSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    return {
      modelos,
      pendentes: calcularModelosPendentes(modelos, gastosDoMes),
    };
  };

  // 🔹 Para a tela de confirmação: quais modelos ainda não viraram gasto
  // neste mês. `status`: SEM_MODELOS | NADA_PENDENTE | OK | ERRO.
  const listarModelosPendentes = async () => {
    if (!user?.uid) return { status: "ERRO", pendentes: [] };
    try {
      const { modelos, pendentes } = await carregarPendentes(getBasePath(user));
      if (modelos.length === 0) return { status: "SEM_MODELOS", pendentes: [] };
      if (pendentes.length === 0) return { status: "NADA_PENDENTE", pendentes: [] };
      return { status: "OK", pendentes };
    } catch (err) {
      console.error("Erro ao listar modelos pendentes:", err);
      setError(err.message);
      return { status: "ERRO", pendentes: [] };
    }
  };

  // 🔹 Gera só os modelos escolhidos (`modeloIds`) que continuam pendentes.
  const gerarFixosDoMes = async (modeloIds = []) => {
    if (!user?.uid) return { status: "ERRO" };
    try {
      const basePath = getBasePath(user);

      // 🔹 Antes de ler os modelos: converte modelos em porcentagem ainda na
      // base antiga — sem isso, o gasto sairia zerado (ver utils/basePercentual.js).
      // Falha aqui não impede a geração: o modelo cai no cálculo antigo.
      try {
        await migrarBasesPercentuaisLegadas(basePath);
      } catch (errMigracao) {
        console.error("Erro ao converter base percentual:", errMigracao);
      }

      const { pendentes } = await carregarPendentes(basePath);
      const selecionados = pendentes.filter((m) => modeloIds.includes(m.id));
      if (selecionados.length === 0) return { status: "NADA_PENDENTE" };

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

      // Modelos de entrada: só para reconhecer entradas antigas (sem
      // modeloId) pela descrição, na base nova.
      const precisaModelosEntrada = selecionados.some(
        (m) => m.modoCalculo === "porcentagem" && temBaseNova(m)
      );
      const modelosEntrada = precisaModelosEntrada
        ? (await getDocs(collection(db, `${basePath}/modelosDeEntrada`))).docs.map(
            (d) => ({ id: d.id, ...d.data() })
          )
        : [];

      const novosGastos = [];

      for (const modelo of selecionados) {
        let valorFinal = parseBRL(modelo.valor);
        const baseNova = modelo.modoCalculo === "porcentagem" && temBaseNova(modelo);

        // 🧮 Modo "porcentagem" — base nova: modelos de entrada + avulsas
        if (baseNova) {
          valorFinal = calcularValorPercentual(
            somarBase(modelo, entradas, modelosEntrada),
            modelo.valor
          );
        } else if (
          // 🧮 Base antiga (modelo que não pôde ser convertido): ids de entradas
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
        } else if (modelo.modoCalculo === "porcentagem") {
          // Porcentagem sem nenhuma base: antes caía no `parseBRL(modelo.valor)`
          // lá de cima e gerava "10%" como R$ 10,00.
          valorFinal = 0;
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
          // 🔹 Base nova copiada para o gasto: é o que o recálculo dinâmico
          // (useEntradas.js) usa quando as entradas do mês mudam.
          ...(baseNova && {
            baseModelosEntrada: modelo.baseModelosEntrada,
            baseIncluiAvulsas: modelo.baseIncluiAvulsas === true,
          }),
          fixacao: modelo.fixacao || "dinamico",
          dataVencimento: gerarDataComDia(modelo.diaVencimento, mes, ano),
          mes,
          ano,
          pago: false,
          origemModelo: true,
          // 🔹 De qual modelo veio — é o que permite o "Gerar do Mês"
          // incremental saber o que já foi lançado (ver utils/modelosPendentes.js).
          modeloId: modelo.id,
          criadoEm: serverTimestamp(),
        });
      }

      // 💾 Grava em lote
      const batch = writeBatch(db);
      novosGastos.forEach((g) =>
        batch.set(doc(collection(db, `${basePath}/gastos`)), removerIndefinidos(g))
      );
      await batch.commit();

      return { status: "SUCESSO", quantidade: novosGastos.length };
    } catch (err) {
      console.error("Erro ao gerar gastos fixos:", err);
      setError(err.message);
      return { status: "ERRO" };
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
    listarModelosPendentes,
  };
};
