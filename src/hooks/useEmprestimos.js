import { useState, useEffect } from "react";
import { doc, getDoc, getDocs, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, where,} from "firebase/firestore";
import { db } from "../config/firebase";
import { normalizarParaISO } from "../utils/formatarData";
import { useAuth } from "../auth/useAuth";
import { getBasePath } from "../utils/firestorePaths";
import { colors } from "../styles/colors";
import { parseBRL } from "../utils/formatarValor";
import { removerIndefinidos } from "../utils/firestoreSanitize";
import { extrairCamposDaCompra, propagarCamposDaCompra } from "../utils/propagacaoCompra";
import { reestruturarParcelamento } from "../utils/reestruturarParcelamento";
import { dividirValorIgualmente } from "../utils/parcelamento";
import { registrarEvento } from "../utils/registrarEvento";
import { detectarAlteracoes } from "../utils/linhaDoTempoConfig";

// 🔹 Campos que descrevem o EMPRÉSTIMO inteiro (iguais em todas as parcelas
// do mesmo idCompra) — mesmo mecanismo de useCartoes.js, ver ARQUITETURA.md
// seção 16.12. `valor`, `pago`, `dataPagamento`, `dataVencimento`, `mes`/`ano`
// continuam de fora: são da parcela, não do empréstimo.
const CAMPOS_DA_COMPRA_EMPRESTIMO = ["descricao", "credor", "categoria", "categoriaId", "categoriaNome"];

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
        // 🔹 Renomeado de `pessoa` para `credor` (Sprint 5): esse campo
        // sempre representou "de quem/onde veio o empréstimo" (banco,
        // loja, pessoa física), um conceito diferente do "Comprador"
        // (Membro da família) do cartão, que também se chamava `pessoa`
        // por coincidência — ver SPRINT5_DISCOVERY.md seção 4.3.1.
        credor,
        categoria,
        categoriaId,
        categoriaNome,
      } = emprestimo;

      const valorContratado = parseBRL(valorTotal);
      const valorParcela = valorContratado / totalParcelas;
      const dataBaseISO = normalizarParaISO(dataInicio);
      if (!dataBaseISO) throw new Error("Data de início inválida.");

      const dataBase = new Date(dataBaseISO + "T00:00:00");
      const idCompra = `${credor}-${descricao.replace(/\s+/g, "-")}-${Date.now()}`;

      const parcelas = Array.from({ length: totalParcelas }, (_, i) => {
        const dataParcela = new Date(dataBase);
        dataParcela.setMonth(dataBase.getMonth() + i);
        return {
          descricao,
          credor,
          // 🔹 `|| null`: sem o fallback, um empréstimo criado sem categoria
          // selecionada geraria `categoria: undefined`, que o Firestore
          // rejeita em qualquer escrita (mesma classe de bug corrigida em
          // useCartoes.js/useEntradas.js — ver ARQUITETURA.md seção 15.11).
          categoria: categoria || null,
          // 🔹 Corrigido nesta sprint: addEmprestimo mantinha `categoria`
          // (string) mas descartava categoriaId/categoriaNome (achado durante
          // a auditoria pós-incremento 4, ver SPRINT4_DISCOVERY.md).
          categoriaId: categoriaId || null,
          categoriaNome: categoriaNome || null,
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
        batch.set(docRef, removerIndefinidos(p));
      });
      await batch.commit();

      // 🔹 Um evento só para o empréstimo inteiro, mesmo com N parcelas
      // geradas no mesmo batch — ver ARQUITETURA.md seção 18.
      await registrarEvento(basePath, {
        acao: "criado",
        entidade: "emprestimo",
        entidadeId: idCompra,
        idCompra,
        origem: { agente: "usuario", canal: "criacao" },
        usuarioId: user.uid,
      });
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
  const updateEmprestimo = async (id, dadosRecebidos) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);
      const ref = doc(db, `${basePath}/emprestimos`, id);
      const docSnap = await getDoc(ref);
      const atual = docSnap.data();

      if (!atual) throw new Error("Empréstimo não encontrado.");

      // 🔹 Calculado antes de qualquer mutação de `dadosAtualizados` (a
      // propagação de campos do empréstimo, logo abaixo, remove esses campos
      // do objeto) — ver ARQUITETURA.md seção 18.
      const alteracoesCampos = detectarAlteracoes("emprestimo", atual, dadosRecebidos);

      // 🔹 `valorContratado`/`economiaTotal` nunca podem vir do chamador.
      // `dadosRecebidos` (= `v` em ModalEdicao.js) vem de `{...item}`, que
      // carrega o valor desses campos de quando o modal abriu — se
      // sobrevivessem aqui, uma edição comum (ex.: só a descrição) os
      // reescreveria de volta para esse valor antigo, desfazendo um
      // recálculo de `economiaTotal` que tenha rodado nesse intervalo (mesma
      // causa raiz do bug de `valorTotal` já corrigido em useCartoes.js —
      // ver ARQUITETURA.md seção 15.12). Só `recalcularEconomiaTotal` pode
      // definir esses campos.
      const {
        valorContratado: _valorContratadoIgnorado,
        economiaTotal: _economiaTotalIgnorado,
        ...dados
      } = dadosRecebidos;

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
                    await updateDoc(ref, removerIndefinidos(revertido));
                    if (atual.idCompra) {
                      await recalcularEconomiaTotal(basePath, atual.idCompra);
                    }
                    await registrarEvento(basePath, {
                      acao: "revertido",
                      entidade: "emprestimo",
                      entidadeId: id,
                      idCompra: atual.idCompra || null,
                      origem: { agente: "usuario", canal: "edicao" },
                      usuarioId: user.uid,
                    });
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

      const pertenceAUmGrupo = !!atual?.idCompra && (atual?.totalParcelas || 1) > 1;
      // 🔹 Regra de negócio: o valor de uma parcela já paga ou antecipada é
      // imutável — mesma trava já existente em useCartoes.js (ver
      // ARQUITETURA.md seção 15.9). useEmprestimos.js não tinha essa defesa
      // até agora (achado relatado pelo usuário, ver ARQUITETURA.md seção
      // 16.12) — corrigido aqui para as duas entidades ficarem consistentes.
      const parcelaBloqueada = atual?.pago === true || atual?.adiantada === true;
      if (parcelaBloqueada) {
        dadosAtualizados.valor = atual.valor;
      }

      // 🔹 Campos do empréstimo inteiro (descrição, credor, categoria) nunca
      // ficam só nesta parcela — propagados para todas as parcelas do mesmo
      // idCompra num único batch, mesmo mecanismo usado por useCartoes.js
      // (ver ARQUITETURA.md seção 16.12).
      if (pertenceAUmGrupo) {
        const camposDaCompra = extrairCamposDaCompra(dadosAtualizados, CAMPOS_DA_COMPRA_EMPRESTIMO);
        if (Object.keys(camposDaCompra).length > 0) {
          await propagarCamposDaCompra(`${basePath}/emprestimos`, atual.idCompra, camposDaCompra);
        }
      }

      await updateDoc(
        ref,
        removerIndefinidos({
          ...dadosAtualizados,
          valor: parseBRL(dadosAtualizados.valor),
          atualizadoEm: serverTimestamp(),
        })
      );
      // 🔹 valorContratado e economiaTotal não são tocados aqui — só mudam
      // na criação (valorContratado) ou numa antecipação/reversão real
      // (economiaTotal, via recalcularEconomiaTotal).

      // 🔹 "Pago"/"Reaberto" têm ação própria (mais reconhecível pro usuário
      // do que um "editado" genérico) — só quando de fato transiciona de um
      // estado pro outro. Fora isso, um evento "editado" cobre qualquer
      // campo relevante que mudou nesta mesma chamada.
      const marcouComoPago = dadosAtualizados.pago === true && atual?.pago !== true;
      const desmarcouComoPago = dadosAtualizados.pago === false && atual?.pago === true;
      if (marcouComoPago) {
        await registrarEvento(basePath, {
          acao: "pago",
          entidade: "emprestimo",
          entidadeId: id,
          idCompra: atual?.idCompra || null,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      } else if (desmarcouComoPago) {
        await registrarEvento(basePath, {
          acao: "reaberto",
          entidade: "emprestimo",
          entidadeId: id,
          idCompra: atual?.idCompra || null,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      } else if (Object.keys(alteracoesCampos).length > 0) {
        await registrarEvento(basePath, {
          acao: "editado",
          entidade: "emprestimo",
          entidadeId: id,
          idCompra: atual?.idCompra || null,
          alteracoes: alteracoesCampos,
          origem: { agente: "usuario", canal: "edicao" },
          usuarioId: user.uid,
        });
      }
    } catch (err) {
      console.error("Erro ao atualizar empréstimo:", err);
      setError(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Busca todas as parcelas de um empréstimo (mesmo `idCompra`),
  // ordenadas — mesmo papel de buscarParcelasDaCompra em useCartoes.js.
  // =========================================================
  const buscarParcelasDaCompra = async (idCompra) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    const basePath = getBasePath(user);
    const qParcelas = query(
      collection(db, `${basePath}/emprestimos`),
      where("idCompra", "==", idCompra)
    );
    const snapshot = await getDocs(qParcelas);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.parcelaAtual || 0) - (b.parcelaAtual || 0));
  };

  // =========================================================
  // 🔹 Excluir uma única parcela — ver ARQUITETURA.md seção 17. Sem grupo,
  // exclusão simples. Com grupo, `modo` decide o destino do valor da
  // parcela excluída: 'reduzir' (some, nenhuma outra parcela muda) ou
  // 'igual' (somado em partes iguais só entre as parcelas do grupo ainda
  // não pagas/antecipadas — nunca redivide o valor contratado original,
  // só o valor desta parcela). Mesmo mecanismo de useCartoes.js.
  // =========================================================
  const excluirParcela = async (id, { idCompra, modo } = {}) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);

      if (!idCompra) {
        await deleteDoc(doc(db, `${basePath}/emprestimos`, id));
        await registrarEvento(basePath, {
          acao: "excluido",
          entidade: "emprestimo",
          entidadeId: id,
          idCompra: null,
          origem: { agente: "usuario", canal: "exclusao" },
          usuarioId: user.uid,
        });
        return;
      }

      let novosValores = {};
      if (modo === "igual") {
        const docSnap = await getDoc(doc(db, `${basePath}/emprestimos`, id));
        const atual = docSnap.data();
        const qParcelas = query(
          collection(db, `${basePath}/emprestimos`),
          where("idCompra", "==", idCompra)
        );
        const snapshot = await getDocs(qParcelas);
        const elegiveis = snapshot.docs.filter(
          (d) => d.id !== id && d.data().pago !== true && d.data().adiantada !== true
        );
        if (elegiveis.length > 0) {
          const incrementos = dividirValorIgualmente(parseBRL(atual?.valor), elegiveis.length);
          elegiveis.forEach((docSnap2, i) => {
            novosValores[docSnap2.id] = parseFloat(
              (parseBRL(docSnap2.data().valor) + incrementos[i]).toFixed(2)
            );
          });
        }
      }

      await reestruturarParcelamento(`${basePath}/emprestimos`, idCompra, {
        idsParaRemover: [id],
        novosValores,
      });

      await registrarEvento(basePath, {
        acao: modo === "igual" ? "redistribuido" : "excluido",
        entidade: "emprestimo",
        entidadeId: id,
        idCompra,
        origem: { agente: "usuario", canal: "exclusao" },
        usuarioId: user.uid,
      });
    } catch (err) {
      console.error("Erro ao excluir parcela de empréstimo:", err);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Exclusão com valores definidos manualmente no editor de parcelas —
  // só grava quando o usuário confirma o editor (ver useExclusaoParcelada.js).
  // =========================================================
  const excluirParcelaComValoresPersonalizados = async (id, idCompra, novosValoresPorId) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);
      await reestruturarParcelamento(`${basePath}/emprestimos`, idCompra, {
        idsParaRemover: [id],
        novosValores: novosValoresPorId,
      });

      await registrarEvento(basePath, {
        acao: "redistribuido",
        entidade: "emprestimo",
        entidadeId: id,
        idCompra,
        origem: { agente: "usuario", canal: "exclusao" },
        usuarioId: user.uid,
      });
    } catch (err) {
      console.error("Erro ao excluir parcela de empréstimo com valores personalizados:", err);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Exclui todas as parcelas do empréstimo.
  // =========================================================
  const excluirGrupoInteiro = async (idCompra) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      const basePath = getBasePath(user);
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

      await registrarEvento(basePath, {
        acao: "excluido",
        entidade: "emprestimo",
        entidadeId: idCompra,
        idCompra,
        origem: { agente: "usuario", canal: "exclusao" },
        usuarioId: user.uid,
      });
    } catch (err) {
      console.error("Erro ao excluir empréstimo inteiro:", err);
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
      // é tocado. Um evento por empréstimo afetado, não por parcela
      // antecipada (podem ser várias parcelas do mesmo empréstimo numa
      // única ação de antecipar).
      for (const idCompra of idsCompraAfetados) {
        await recalcularEconomiaTotal(basePath, idCompra);
        await registrarEvento(basePath, {
          acao: "antecipado",
          entidade: "emprestimo",
          entidadeId: idCompra,
          idCompra,
          origem: { agente: "usuario", canal: "antecipacao" },
          usuarioId: user.uid,
        });
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
    excluirParcela,
    excluirParcelaComValoresPersonalizados,
    excluirGrupoInteiro,
    buscarParcelasDaCompra,
    anteciparParcelasEmprestimo,
  };
};
