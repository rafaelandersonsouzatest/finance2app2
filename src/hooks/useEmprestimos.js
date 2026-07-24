import { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, where,} from "firebase/firestore";
import { db } from "../config/firebase";
import { normalizarParaISO } from "../utils/formatarData";
import { useAuth } from "../auth/useAuth";
import { getBasePath } from "../utils/firestorePaths";
import { colors } from "../styles/colors";
import { parseBRL } from "../utils/formatarValor";

// =========================================================
// 🔹 HOOK: useEmprestimos — multiusuário + preparado p/ modo família
// =========================================================
export const useEmprestimos = (mes, ano) => {
  const { user } = useAuth();
  const [emprestimos, setEmprestimos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // =========================================================
  // 🔹 Listener em tempo real
  // =========================================================
  useEffect(() => {
    if (!user?.uid || !mes || !ano) return;
    setLoading(true);

    const q = query(
      collection(db, `${getBasePath(user)}/emprestimos`),
      where("mes", "==", mes),
      where("ano", "==", ano)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          valor: parseBRL(d.data().valor),
        }));

        // Ordenar por data de vencimento
        dados.sort(
          (a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)
        );

        setEmprestimos(dados);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar empréstimos:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, mes, ano]);

  // =========================================================
  // 🔹 Adicionar empréstimo (gera parcelas automaticamente)
  // =========================================================
  const addEmprestimo = async (emprestimo) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);
      const {
        descricao,
        valorTotal,
        totalParcelas,
        dataInicio,
        pessoa,
        categoria,
      } = emprestimo;

      const valorContratado = parseBRL(valorTotal);
      const valorParcela = valorContratado / totalParcelas;
      const dataBaseISO = normalizarParaISO(dataInicio);
      if (!dataBaseISO) throw new Error("Data de início inválida.");

      const dataBase = new Date(dataBaseISO + "T00:00:00");
      const idCompra = `${pessoa}-${descricao.replace(/\s+/g, "-")}-${Date.now()}`;

      const parcelas = Array.from({ length: totalParcelas }, (_, i) => {
        const dataParcela = new Date(dataBase);
        dataParcela.setMonth(dataBase.getMonth() + i);
        return {
          descricao,
          pessoa,
          categoria,
          valor: parseFloat(valorParcela.toFixed(2)),
          // 🔹 Valor contratado original — nunca é reescrito depois da criação.
          valorContratado,
          // 🔹 Soma dos descontos de antecipação do empréstimo (ver anteciparParcelasEmprestimo).
          economiaTotal: 0,
          parcelaAtual: i + 1,
          totalParcelas,
          dataVencimento: dataParcela.toISOString().split("T")[0],
          pago: false,
          mes: dataParcela.getMonth() + 1,
          ano: dataParcela.getFullYear(),
          criadoEm: serverTimestamp(),
          idCompra,
          compartilhado: false, // 👈 novo campo padrão
        };
      });

      const batch = writeBatch(db);
      parcelas.forEach((p) => {
        const docRef = doc(collection(db, `${basePath}/emprestimos`));
        batch.set(docRef, p);
      });
      await batch.commit();
    } catch (err) {
      console.error("Erro ao adicionar empréstimo:", err);
      setError(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Recalcula a economia total (soma de descontos) de um empréstimo,
  // sem nunca tocar em valorContratado — só chamada quando um desconto
  // realmente muda (antecipação ou reversão de antecipação).
  // =========================================================
  const recalcularEconomiaTotal = async (basePath, idCompra) => {
    const qParcelas = query(
      collection(db, `${basePath}/emprestimos`),
      where("idCompra", "==", idCompra)
    );
    const snapshot = await getDocs(qParcelas);
    const economiaTotal = snapshot.docs.reduce(
      (soma, d) => soma + parseBRL(d.data().descontoAplicado),
      0
    );

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(doc(db, `${basePath}/emprestimos`, docSnap.id), {
        economiaTotal,
      });
    });
    await batch.commit();
  };

  // =========================================================
  // 🔹 Atualizar empréstimo (inclui reversão de antecipação)
  // =========================================================
  const updateEmprestimo = async (id, dados) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);
      const ref = doc(db, `${basePath}/emprestimos`, id);
      const docSnap = await getDoc(ref);
      const atual = docSnap.data();

      if (!atual) throw new Error("Empréstimo não encontrado.");

      // 🔹 Caso o usuário desmarque uma parcela antecipada
      if (atual?.adiantada && dados.pago === false) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            global.alertaGlobal?.({
              titulo: "Reverter antecipação?",
              mensagem:
                "Esta parcela foi antecipada. Deseja desfazer a antecipação e restaurar os dados originais?",
              icone: "history",
              corIcone: colors.warning,
              botoes: [
                { texto: "Cancelar", onPress: () => reject("Reversão cancelada.") },
                {
                  texto: "Sim, reverter",
                  style: "destructive",
                  onPress: async () => {
                    const revertido = {
                      pago: false,
                      adiantada: false,
                      descontoAplicado: 0,
                      valor: atual.valorOriginal || atual.valor,
                      dataPagamento: null,
                      mes: atual.mesOriginal || atual.mes,
                      ano: atual.anoOriginal || atual.ano,
                      atualizadoEm: serverTimestamp(),
                    };
                    await updateDoc(ref, revertido);
                    if (atual.idCompra) {
                      await recalcularEconomiaTotal(basePath, atual.idCompra);
                    }
                    resolve(true);
                  },
                },
              ],
            });
          }, 100);
        });
      }

      // 🔹 Ajusta data de pagamento se marcado como pago
      const dadosAtualizados = { ...dados };
      if (dadosAtualizados.pago && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split("T")[0];
      } else if (!dadosAtualizados.pago) {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(ref, {
        ...dadosAtualizados,
        valor: parseBRL(dadosAtualizados.valor),
        atualizadoEm: serverTimestamp(),
      });
      // 🔹 valorContratado e economiaTotal não são tocados aqui — só mudam
      // na criação (valorContratado) ou numa antecipação/reversão real
      // (economiaTotal, via recalcularEconomiaTotal).
    } catch (err) {
      console.error("Erro ao atualizar empréstimo:", err);
      setError(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Excluir parcelas ou todo o empréstimo
  // =========================================================
  const deleteEmprestimo = async (id, idCompra, excluirTudo = false) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);

      if (excluirTudo && idCompra) {
        // Exclui todas as parcelas com o mesmo idCompra
        const q = query(
          collection(db, `${basePath}/emprestimos`),
          where("idCompra", "==", idCompra)
        );
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) =>
          batch.delete(doc(db, `${basePath}/emprestimos`, d.id))
        );
        await batch.commit();
      } else {
        // Exclui apenas a parcela individual
        await deleteDoc(doc(db, `${basePath}/emprestimos`, id));
      }
    } catch (err) {
      console.error("Erro ao excluir empréstimo:", err);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Antecipar parcelas de empréstimos
  // =========================================================
  const anteciparParcelasEmprestimo = async (
    idsSelecionados,
    dataPagamento,
    valorComDesconto
  ) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);
      const batch = writeBatch(db);

      // Constrói a data local (sem fuso)
      const [anoPag, mesPag, diaPag] = dataPagamento.split("-").map(Number);
      const data = new Date(anoPag, mesPag - 1, diaPag);
      const mesPagamento = data.getMonth() + 1;
      const anoPagamento = data.getFullYear();

      const idsCompraAfetados = new Set();

      for (const id of idsSelecionados) {
        const ref = doc(db, `${basePath}/emprestimos`, id);
        const docSnap = await getDoc(ref);
        const atual = docSnap.data();
        if (!atual) continue;

        const mesOriginal = atual.mes;
        const anoOriginal = atual.ano;
        const valorOriginal = parseBRL(atual.valor);
        const valorFinal = valorComDesconto ? parseBRL(valorComDesconto) : valorOriginal;
        const descontoAplicado = valorOriginal - valorFinal;

        const novosDados = {
          ...atual,
          pago: true,
          adiantada: true,
          valor: valorFinal,
          valorOriginal,
          descontoAplicado,
          dataPagamento,
          mesOriginal,
          anoOriginal,
          mes: mesPagamento,
          ano: anoPagamento,
          atualizadoEm: serverTimestamp(),
        };

        batch.update(ref, novosDados);
        if (atual.idCompra) idsCompraAfetados.add(atual.idCompra);
      }

      await batch.commit();

      // 🔹 economiaTotal é recalculada só para o(s) empréstimo(s) que
      // realmente tiveram parcela antecipada agora — valorContratado nunca
      // é tocado.
      for (const idCompra of idsCompraAfetados) {
        await recalcularEconomiaTotal(basePath, idCompra);
      }

      // Atualiza o estado local
      setEmprestimos((prev) =>
        prev.map((p) =>
          idsSelecionados.includes(p.id)
            ? { ...p, pago: true, adiantada: true }
            : p
        )
      );
    } catch (err) {
      console.error("Erro ao antecipar parcelas de empréstimo:", err);
      setError(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Retorno do hook
  // =========================================================
  return {
    emprestimos,
    loading,
    error,
    addEmprestimo,
    updateEmprestimo,
    deleteEmprestimo,
    anteciparParcelasEmprestimo,
  };
};
