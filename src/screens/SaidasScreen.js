import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useCartoes } from '../hooks/useCartoes';
import { useEmprestimos } from '../hooks/useEmprestimos';
import { useGastos } from '../hooks/useGastos';
import { useEntradas } from '../hooks/useEntradas';
import { useVisibility } from '../contexts/VisibilityContext';
import TelaPadrao from '../components/TelaPadrao';
import ModalCriacao from '../components/ModalCriacao';
import GerenciarModelosModal from '../components/GerenciarModelosModal';
import AlertaModal from '../components/AlertaModal';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import ModalDetalhes from '../components/ModalDetalhes';
import ModalEdicao from '../components/ModalEdicao';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
import ModalEditorParcelas from '../components/ModalEditorParcelas';
import { handleGerarFixosUtil } from '../utils/handleGerarFixos';
import { useExclusaoParcelada } from '../hooks/useExclusaoParcelada';
import { useAdiantamento } from '../hooks/useAdiantamento';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import CartoesScreen from './CartoesScreen';
import EstatisticasComponent from '../components/EstatisticasComponent';
import ModernTabs from '../components/ModernTabs';
import GastosScreen from './GastosScreen';
import EmprestimosScreen from './EmprestimosScreen';
import { useDivisaoDespesaContext } from '../contexts/DivisaoDespesaContext';
import ModalCompartilharDespesa from '../components/ModalCompartilharDespesa';
import ModalGerenciarDivisao from '../components/ModalGerenciarDivisao';
import { deveMostrarIconeCompartilhado } from '../utils/compartilhamento';
import { colaboracaoDisponivel } from '../config/featureFlags';



// helper local: parse valor seguro (aceita number ou string com ,/.)
const parseValor = (v) => {
  if (v === undefined || v === null) return 0;
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  // string: remove 'R$', espaços e normaliza vírgula para ponto
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^\d-,.]/g, '').trim();
    if (cleaned === '') return 0;
    if (cleaned.indexOf(',') > -1 && cleaned.indexOf('.') > -1) {
      // assume ponto = milhar, vírgula = decimal
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (cleaned.indexOf(',') > -1) {
      return parseFloat(cleaned.replace(',', '.')) || 0;
    }
    return parseFloat(cleaned) || 0;
  }
  return 0;
};

// helper local: tenta extrair data a partir de vários campos comuns
const extractDateFromItem = (item) => {
  if (!item) return null;
  const cand = [
    item.dataVencimento,
    item.data_vencimento,
    item.vencimento,
    item.dataPagamento,
    item.data_pagamento,
    item.dataPago,
    item.data,
    item.date,
    item.createdAt,
  ];
  for (const c of cand) {
    if (!c && c !== 0) continue;
    // já é Date?
    if (c instanceof Date && !isNaN(c)) return c;
    // número (timestamp)
    if (typeof c === 'number') {
      const d = new Date(c);
      if (!isNaN(d)) return d;
    }
    if (typeof c === 'string') {
      const s = c.trim();
      // ISO-friendly
      const dIso = new Date(s);
      if (!isNaN(dIso)) return dIso;
      // dd/mm/yyyy ou dd-mm-yyyy
      const parts = s.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (parts) {
        let day = parseInt(parts[1], 10);
        let month = parseInt(parts[2], 10) - 1;
        let year = parseInt(parts[3], 10);
        if (year < 100) year += 2000;
        const d = new Date(year, month, day);
        if (!isNaN(d)) return d;
      }
    }
  }
  return null;
};

// calcula estatísticas a partir de uma lista (cada item deve ter .valor e .pago (boolean) ou .status)
// calcula estatísticas a partir de uma lista (cada item deve ter .valor e .pago (boolean) ou .status)
const getStatsFromList = (list = []) => {
  const hoje = new Date();
  const hojeInicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  let valorPago = 0;
  let valorEmAberto = 0;
  let pagos = 0;
  let aguardando = 0;
  const datasPagas = [];
  const datasAguardando = [];

  if (!Array.isArray(list) || list.length === 0) {
    return {
      lista: [],
      total: 0,
      totalItens: 0,
      valorPago: 0,
      valorEmAberto: 0,
      pagos: 0,
      aguardando: 0,
      percentualPago: 0,
      proximoVencimento: null,
      ultimoPagamento: null,
    };
  }

  list.forEach((it, idx) => {
    const valor = parseValor(it.valor ?? it.amount ?? it.value ?? 0);
    const pago =
      it.pago === true ||
      it.paid === true ||
      (typeof it.status === 'string' && /pago|paid|quitado|concluido|concluído/i.test(it.status));

    if (idx < 5) {
    }

    if (pago) {
      pagos += 1;
      valorPago += valor;
      const d = extractDateFromItem(it);
      if (d) datasPagas.push(d);
    } else {
      aguardando += 1;
      valorEmAberto += valor;
      const d = extractDateFromItem(it);
      if (d) datasAguardando.push(d);
    }
  });

  const total = valorPago + valorEmAberto;
  const totalItens = pagos + aguardando;
  const percentualPago = total ? (valorPago / total) * 100 : 0;

  const futuras = datasAguardando
    .map((d) => (d instanceof Date ? d : new Date(d)))
    .filter((d) => !isNaN(d) && d >= hojeInicio);
  const proximoVencimento = futuras.length ? new Date(Math.min(...futuras.map((d) => d.getTime()))) : null;

  const ultimoPagamento = datasPagas.length ? new Date(Math.max(...datasPagas.map((d) => d.getTime()))) : null;


  return {
    lista: list,
    total,
    totalItens,
    valorPago,
    valorEmAberto,
    pagos,
    aguardando,
    percentualPago,
    proximoVencimento,
    ultimoPagamento,
  };
};


// ===================================================
// 🔹 COMPONENTE DAS ABAS SUPERIORES
// ===================================================
const TabSwitcher = ({ abaAtiva, setAbaAtiva }) => (
  <View style={globalStyles.topTabContainer}>
    {[
      { key: 'gastos', label: 'Gastos' },
      { key: 'emprestimos', label: 'Empréstimos' },
      { key: 'cartoes', label: 'Cartões' },
    ].map((aba) => (
      <TouchableOpacity
        key={aba.key}
        style={[
          globalStyles.topTabButton,
          abaAtiva === aba.key && globalStyles.topTabButtonActive,
        ]}
        onPress={() => setAbaAtiva(aba.key)}
      >
        <Text
          style={[
            globalStyles.topTabButtonText,
            abaAtiva === aba.key && globalStyles.topTabButtonTextActive,
          ]}
        >
          {aba.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// ===================================================
// 🔹 CONTEÚDO DE CADA ABA
// ===================================================
const ConteudoAba = ({ titulo, dados, renderItem, tipo, estatisticas }) => {
  const { formatValue } = useVisibility();

  return (
    <View>
      <Text style={globalStyles.sectionTitleModern}>{titulo}</Text>

      <FlatList
        data={dados}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ListEmptyComponent={() => (
          <View style={globalStyles.emptyContainer}>
            <MaterialCommunityIcons name="receipt" size={48} color="#666" />
            <Text style={globalStyles.noDataText}>Nenhum registro para este mês.</Text>
            <Text style={globalStyles.emptySubtext}>
              Clique no '+' para adicionar seu primeiro {tipo}.
            </Text>
          </View>
        )}
      />
    </View>
  );
};

// ===================================================
// 🔹 TELA PRINCIPAL - SAÍDAS
// ===================================================
export default function SaidasScreen() {
  const [abaAtiva, setAbaAtiva] = useState('gastos');
  const { selectedMonth, selectedYear } = useDateFilter();

  // --- Hooks de dados ---
  const {
    gastos,
    loading: loadingGastos,
    addGasto,
    updateGasto,
    deleteGasto,
    gerarFixosDoMes,
  } = useGastos(selectedMonth, selectedYear);

  // 🔹 Só para alimentar o modo "porcentagem" de GerenciarModelosModal (base
  // de cálculo de um modelo de gasto) — SaidasScreen não usa entradas para
  // mais nada. Sem isso, o modal precisaria buscar por conta própria (ver
  // ARQUITETURA.md seção 19, princípio "um dono, vários apresentadores").
  const { entradas, carregando: loadingEntradas } = useEntradas(
    selectedMonth,
    selectedYear
  );

  const {
    emprestimos,
    loading: loadingEmprestimos,
    addEmprestimo,
    updateEmprestimo,
    excluirParcela: excluirParcelaEmprestimo,
    excluirGrupoInteiro: excluirGrupoInteiroEmprestimo,
    excluirParcelaComValoresPersonalizados: excluirParcelaComValoresPersonalizadosEmprestimo,
    buscarParcelasDaCompra: buscarParcelasDaCompraEmprestimo,
    anteciparParcelasEmprestimo,
  } = useEmprestimos(selectedMonth, selectedYear);

  const {
    confirmarExclusao,
    alertaExclusao,
    fecharAlertaExclusao,
    editorExclusao,
    fecharEditorExclusao,
    confirmarEditorExclusao,
  } = useExclusaoParcelada();

  const {
  modalAdiantamentoVisivel,
  parcelasParaAdiantar,
  iniciarAdiantamento,
  confirmarAdiantamento,
  fecharModalAdiantamento,
  alerta: alertaAdiantamento,
  setAlerta: setAlertaAdiantamento,
} = useAdiantamento(abaAtiva === 'cartoes' ? 'cartoes' : 'emprestimos', {
  anteciparParcelasCartao: anteciparParcelas,
  anteciparParcelasEmprestimo,
});


  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalModelosVisivel, setModalModelosVisivel] = useState(false);
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', botoes: [] });
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);
  const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
  const [itemHistorico, setItemHistorico] = useState(null);

  // --- Compartilhar despesa (Etapa 4.6, ver COLABORACAO_ARQUITETURA_V1.md
  // seção 4) — só se aplica à aba "gastos"; SaidasScreen já é quem busca os
  // próprios gastos, então é a dona natural desta ação também (ver
  // ARQUITETURA.md seção 19).
  const {
    conexoesAceitas,
    membrosSelecionaveis,
    compartilhando,
    errorCompartilhar,
    compartilharGastoExistente,
    despesas,
    cancelandoConviteId,
    errorCancelarConvite,
    cancelarConvite,
    resolvendoValorSemDestino,
    errorResolverValorSemDestino,
    resolverValorSemDestino,
    adicionandoParticipante,
    errorAdicionarParticipante,
    adicionarParticipante,
    propondo,
    errorPropor,
    proporAlteracaoCota,
    editandoCotaMembro,
    errorEditarCotaMembro,
    editarCotaMembro,
    removendoMembroId,
    errorRemoverMembro,
    removerParticipanteSemConta,
    encerrando,
    errorEncerrar,
    encerrarCompartilhamento,
  } = useDivisaoDespesaContext();
  const [modalCompartilharVisivel, setModalCompartilharVisivel] = useState(false);
  const [gastoParaCompartilhar, setGastoParaCompartilhar] = useState(null);
  const [modalGerenciarVisivel, setModalGerenciarVisivel] = useState(false);

  // Despesa compartilhada do item atualmente aberto no ModalDetalhes — dado
  // já vem do DivisaoDespesaContext (único listener), nunca uma busca própria
  // (ver ARQUITETURA.md seção 19).
  const despesaDoItemSelecionado =
    abaAtiva === 'gastos' && itemSelecionado?.compartilhamentoId
      ? despesas.find((d) => d.id === itemSelecionado.compartilhamentoId)
      : null;

  // Mapa despesaId → despesa, pra GastosScreen.js decidir o ícone/alerta de
  // cada linha sem precisar de um `.find()` por item (seção 11.1/11.3).
  const despesasPorId = useMemo(() => {
    const mapa = {};
    despesas.forEach((d) => {
      mapa[d.id] = d;
    });
    return mapa;
  }, [despesas]);

  const {
    cartoes,
    loading: loadingCartoes,
    addCartao,
    updateCartao,
    excluirParcela: excluirParcelaCartao,
    excluirGrupoInteiro: excluirGrupoInteiroCartao,
    excluirParcelaComValoresPersonalizados: excluirParcelaComValoresPersonalizadosCartao,
    buscarParcelasDaCompra: buscarParcelasDaCompraCartao,
    buscarParcelasDoCartao,
    toggleCartaoStatus,
    anteciparParcelas,
  } = useCartoes(selectedMonth, selectedYear);


  const loading = loadingGastos || loadingEmprestimos || loadingCartoes;

  // --- Totais gerais ---
  const totalGastosPagos = useMemo(
    () => gastos.filter((g) => g.pago).reduce((s, i) => s + (parseValor(i.valor) || 0), 0),
    [gastos]
  );
  const totalEmprestimosPagos = useMemo(
    () => emprestimos.filter((l) => l.pago).reduce((s, i) => s + (parseValor(i.valor) || 0), 0),
    [emprestimos]
  );
  const totalSaidasGeral = totalGastosPagos + totalEmprestimosPagos;

  // --- Estatísticas da aba ativa (agora com cálculos completos) ---
const estatisticas = useMemo(() => {
  if (abaAtiva === 'gastos') {
    const s = getStatsFromList(gastos);
    return {
      lista: s.lista,
      total: s.total,
      totalItens: s.totalItens,
      pagos: s.pagos,
      emAberto: s.aguardando,
      valorPago: s.valorPago,
      valorEmAberto: s.valorEmAberto,
      percentualPago: s.percentualPago,
      proximoVencimento: s.proximoVencimento,
      ultimoPagamento: s.ultimoPagamento,
    };
  }

  if (abaAtiva === 'emprestimos') {
    const s = getStatsFromList(emprestimos);
    return {
      lista: s.lista,
      total: s.total,
      totalItens: s.totalItens,
      pagos: s.pagos,
      emAberto: s.aguardando,
      valorPago: s.valorPago,
      valorEmAberto: s.valorEmAberto,
      percentualPago: s.percentualPago,
      proximoVencimento: s.proximoVencimento,
      ultimoPagamento: s.ultimoPagamento,
    };
  }

  if (abaAtiva === 'cartoes') {
    const s = getStatsFromList(cartoes); // 👈 usa os dados do hook
    return {
      lista: s.lista,
      total: s.total,
      totalItens: s.totalItens,
      pagos: s.pagos,
      emAberto: s.aguardando,
      valorPago: s.valorPago,
      valorEmAberto: s.valorEmAberto,
      percentualPago: s.percentualPago,
      proximoVencimento: s.proximoVencimento,
      ultimoPagamento: s.ultimoPagamento,
    };
  }

  return { lista: [], total: 0, totalItens: 0, pagos: 0, emAberto: 0, valorPago: 0, valorEmAberto: 0 };
}, [abaAtiva, gastos, emprestimos, cartoes]);

  // ===================================================
  // 🔹 Funções principais (mantive seu código)
  // ===================================================
const handleAdicionar = async (novoItem) => {
  if (abaAtiva === 'gastos') {
    await addGasto({ ...novoItem, mes: selectedMonth, ano: selectedYear });
  } else if (abaAtiva === 'emprestimos') {
    await addEmprestimo(novoItem);
  } else if (abaAtiva === 'cartoes') {
    if (novoItem.cartao) {
      await addCartao({ ...novoItem, mes: selectedMonth, ano: selectedYear });
    }
  }

  setModalCriacaoVisivel(false);
};

const handleEditar = async (itemEditado) => {
  if (abaAtiva === 'gastos') {
    await updateGasto(itemSelecionado.id, itemEditado);
  } else if (abaAtiva === 'emprestimos') {
    await updateEmprestimo(itemSelecionado.id, itemEditado);
  } else if (abaAtiva === 'cartoes') {
    await updateCartao(itemSelecionado.id, itemEditado);
  }

  setModalEdicaoVisivel(false);
  setItemSelecionado(null);
};

// 🔹 Excluir gasto/empréstimo/compra — mecanismo único, ver
// useExclusaoParcelada.js (ARQUITETURA.md seção 17). Fecha o modal de
// detalhes e limpa a seleção assim que a exclusão de fato é confirmada e
// executada — cancelar em qualquer etapa do fluxo não fecha nada.
// 🔹 Aceita um item explícito (usado pelo ícone de excluir direto na linha,
// via onDeleteItem — antes não fazia nada, ver ARQUITETURA.md seção 20) além
// do uso padrão via ModalEdicao, que continua sem passar argumento nenhum
// (força o fallback para itemSelecionado, nunca usa um rascunho não salvo).
// Exclusão de um gasto já compartilhado (seção 11.1, decisão 2026-08-14) —
// sempre passa por `encerrarCompartilhamento` antes de excluir o gasto de
// fato (cancela convites pendentes, avisa quem já aceitou; o gasto de quem
// aceitou nunca é tocado — seção 11). O texto do aviso varia conforme já
// haver ou não algum aceite, mas a operação por trás é sempre a mesma.
const handleExcluirGastoCompartilhado = (item, fecharSelecao) => {
  const despesa = despesas.find((d) => d.id === item.compartilhamentoId);

  const prosseguirExclusao = async () => {
    setAlerta({ visivel: false });
    try {
      if (despesa && despesa.status !== 'encerrada') {
        await encerrarCompartilhamento(item.compartilhamentoId);
      }
      await deleteGasto(item.id);
      fecharSelecao();
    } catch (err) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao excluir',
        mensagem: err.message || 'Não foi possível excluir esta despesa.',
        icone: 'wifi-off',
        corIcone: colors.error,
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
    }
  };

  const outrasCotas = (despesa?.cotas || []).filter((c) => c.participanteId !== despesa?.criadoPor);
  const algumAceitou = outrasCotas.some((c) => c.status === 'aceito');
  const algumPendente = outrasCotas.some((c) => c.status === 'pendente');
  const nomes = outrasCotas.map((c) => c.nomeExibicao).filter(Boolean).join(', ');

  // Já encerrada, ou não sobrou ninguém envolvido (todo mundo recusou/já foi
  // cancelado) — exclui direto, sem aviso extra sobre compartilhamento.
  if (!despesa || despesa.status === 'encerrada' || (!algumAceitou && !algumPendente)) {
    confirmarExclusao({
      item,
      tipoLabel: 'Gasto',
      excluirParcela: async (id) => {
        await deleteGasto(id);
        fecharSelecao();
      },
    });
    return;
  }

  setAlerta({
    visivel: true,
    titulo: algumAceitou ? 'Esta despesa já foi compartilhada' : 'Esta despesa está compartilhada',
    mensagem: algumAceitou
      ? `Você compartilhou esta despesa com ${nomes}. Ao excluir: a divisão será encerrada, ` +
        'convites pendentes serão cancelados, e quem já aceitou continua com o próprio ' +
        'lançamento (esta exclusão não afeta o gasto de quem já aceitou). Esta ação não ' +
        'poderá ser desfeita.'
      : `Você compartilhou esta despesa com ${nomes} e ainda não responderam. Ao excluir, os ` +
        'convites pendentes serão cancelados. Esta ação não poderá ser desfeita.',
    icone: 'account-multiple-remove-outline',
    corIcone: colors.error,
    botoes: [
      { texto: 'Voltar', onPress: () => setAlerta({ visivel: false }) },
      { texto: 'Excluir despesa', style: 'destructive', onPress: prosseguirExclusao },
    ],
  });
};

const handleExcluir = (itemParam) => {
  const item = itemParam || itemSelecionado;
  if (!item) return;

  const fecharSelecao = () => {
    setModalDetalhesVisivel(false);
    setItemSelecionado(null);
  };

  if (abaAtiva === 'gastos') {
    // Gasto compartilhado (seção 11.1) — exclusão sempre passa por
    // encerrarCompartilhamento antes; texto do aviso varia conforme já
    // houver ou não algum aceite (ver handleExcluirGastoCompartilhado).
    if (item.compartilhamentoId) {
      handleExcluirGastoCompartilhado(item, fecharSelecao);
      return;
    }
    confirmarExclusao({
      item,
      tipoLabel: 'Gasto',
      excluirParcela: async (id) => {
        await deleteGasto(id);
        fecharSelecao();
      },
    });
    return;
  }

  if (abaAtiva === 'emprestimos') {
    confirmarExclusao({
      item,
      tipoLabel: 'Empréstimo',
      suportaGrupo: true,
      buscarParcelasDoGrupo: buscarParcelasDaCompraEmprestimo,
      excluirParcela: async (id, opts) => {
        await excluirParcelaEmprestimo(id, opts);
        fecharSelecao();
      },
      excluirGrupoInteiro: async (idCompra) => {
        await excluirGrupoInteiroEmprestimo(idCompra);
        fecharSelecao();
      },
      excluirComValoresPersonalizados: async (id, idCompra, novosValoresPorId) => {
        await excluirParcelaComValoresPersonalizadosEmprestimo(id, idCompra, novosValoresPorId);
        fecharSelecao();
      },
    });
    return;
  }

  if (abaAtiva === 'cartoes') {
    confirmarExclusao({
      item,
      tipoLabel: 'Compra',
      suportaGrupo: true,
      buscarParcelasDoGrupo: buscarParcelasDaCompraCartao,
      excluirParcela: async (id, opts) => {
        await excluirParcelaCartao(id, opts);
        fecharSelecao();
      },
      excluirGrupoInteiro: async (idCompra) => {
        await excluirGrupoInteiroCartao(idCompra);
        fecharSelecao();
      },
      excluirComValoresPersonalizados: async (id, idCompra, novosValoresPorId) => {
        await excluirParcelaComValoresPersonalizadosCartao(id, idCompra, novosValoresPorId);
        fecharSelecao();
      },
    });
  }
};


  const handleToggleStatus = async (id) => {
  if (abaAtiva === 'gastos') {
    const item = gastos.find((i) => i.id === id);
    if (item) await updateGasto(id, { ...item, pago: !item.pago });
  } else if (abaAtiva === 'emprestimos') {
    const item = emprestimos.find((i) => i.id === id);
    if (item) await updateEmprestimo(id, { ...item, pago: !item.pago });
  } else if (abaAtiva === 'cartoes') {
    const item = cartoes.find((i) => i.id === id);
    if (item) await updateCartao(id, { ...item, pago: !item.pago });
  }
};


  const handleAbrirDetalhes = (item) => {
    setItemSelecionado(item);
    setModalDetalhesVisivel(true);
  };

  const handleAbrirEdicao = () => {
    setModalDetalhesVisivel(false);
    setModalEdicaoVisivel(true);
  };

  // 🔹 Extraído para ser reaproveitado tanto pelo botão "Histórico" do
  // ModalDetalhes quanto pelo ícone de histórico direto na linha de
  // EmprestimosScreen — antes, EmprestimosScreen tinha sua própria cópia
  // funcional deste modal (ver ARQUITETURA.md seção 19).
  const handleAbrirHistorico = (item) => {
    if (!item) return;
    setItemHistorico(item);
    setHistoricoModalVisivel(true);
  };

  const handleAbrirCompartilhar = (item) => {
    if (!item) return;
    setGastoParaCompartilhar(item);
    setModalDetalhesVisivel(false);
    setModalCompartilharVisivel(true);
  };

  const handleConfirmarCompartilhar = async (cotas) => {
    await compartilharGastoExistente({
      origemLancamentoId: gastoParaCompartilhar.id,
      descricao: gastoParaCompartilhar.descricao,
      cotas,
    });
    setModalCompartilharVisivel(false);
    setGastoParaCompartilhar(null);
  };

  // Abre o modal de gerenciamento da divisão (seção 11.2) — substitui a
  // antiga seção "Compartilhado com" que vivia dentro do ModalDetalhes.
  const handleAbrirGerenciarDivisao = () => {
    setModalDetalhesVisivel(false);
    setModalGerenciarVisivel(true);
  };

  // Cancelar um convite individual ainda pendente (seção 11.1/11.3) —
  // `destino` é opcional (escolhido em ModalDecidirDestino, dentro de
  // ModalGerenciarDivisao); sem ele, o valor fica "sem destino" até uma
  // decisão posterior.
  const handleCancelarConvite = async (uidParticipante, destino) => {
    if (!itemSelecionado?.compartilhamentoId) return;
    try {
      await cancelarConvite(itemSelecionado.compartilhamentoId, uidParticipante, destino);
    } catch (err) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao cancelar convite',
        mensagem: err.message || 'Não foi possível cancelar este convite.',
        icone: 'wifi-off',
        corIcone: colors.error,
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
    }
  };

  // Decide o destino de um valor que já ficou "sem destino" (seção 11.3) —
  // acessado pelo banner dentro de ModalGerenciarDivisao.
  const handleResolverValorSemDestino = async (destino) => {
    if (!itemSelecionado?.compartilhamentoId) return;
    try {
      await resolverValorSemDestino(itemSelecionado.compartilhamentoId, destino);
    } catch (err) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao decidir o destino',
        mensagem: err.message || 'Não foi possível decidir o destino deste valor.',
        icone: 'wifi-off',
        corIcone: colors.error,
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
    }
  };

  // Adicionar participante (Etapa 3.8, seção 11.1/11.3) — o próprio
  // ModalGerenciarDivisao já valida seleção/valor antes de chamar.
  const handleAdicionarParticipante = async ({ eventoId, uidParticipante, membroId, valorCentavos }) => {
    try {
      await adicionarParticipante({ eventoId, uidParticipante, membroId, valorCentavos });
    } catch (err) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao adicionar participante',
        mensagem: err.message || 'Não foi possível adicionar este participante.',
        icone: 'wifi-off',
        corIcone: colors.error,
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
      throw err;
    }
  };

  // Propor alteração pós-aceite (Etapa 3.9, seção 11.1/11.3) — nada muda até
  // a pessoa concordar.
  const handleProporAlteracao = async ({ eventoId, participanteId, novoValorCentavos, destino }) => {
    try {
      await proporAlteracaoCota({ eventoId, participanteId, novoValorCentavos, destino });
    } catch (err) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao propor alteração',
        mensagem: err.message || 'Não foi possível propor esta alteração.',
        icone: 'wifi-off',
        corIcone: colors.error,
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
      throw err;
    }
  };

  // Editar a cota de um Membro sem conta (seção 7/11.3) — direto, sem
  // consentimento; o ModalGerenciarDivisao já monta o array de cotas.
  const handleEditarCotaMembro = async ({ eventoId, cotas }) => {
    try {
      await editarCotaMembro({ eventoId, cotas });
    } catch (err) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao editar cota',
        mensagem: err.message || 'Não foi possível editar esta cota.',
        icone: 'wifi-off',
        corIcone: colors.error,
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
      throw err;
    }
  };

  // Remover um Membro sem conta da divisão (seção 7/11.3) — direto, sem
  // consentimento; `destino` é opcional (mesmo modelo do cancelamento).
  const handleRemoverParticipanteSemConta = async (participanteId, destino) => {
    if (!itemSelecionado?.compartilhamentoId) return;
    try {
      await removerParticipanteSemConta(itemSelecionado.compartilhamentoId, participanteId, destino);
    } catch (err) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao remover participante',
        mensagem: err.message || 'Não foi possível remover este participante.',
        icone: 'wifi-off',
        corIcone: colors.error,
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
    }
  };

  // Encerrar o compartilhamento sem excluir o próprio gasto (seção 11.1) —
  // ação independente da exclusão, acessível dentro do ModalGerenciarDivisao.
  const handleEncerrarCompartilhamento = () => {
    if (!itemSelecionado?.compartilhamentoId) return;
    const eventoId = itemSelecionado.compartilhamentoId;

    setAlerta({
      visivel: true,
      titulo: 'Encerrar compartilhamento',
      mensagem:
        'Isso cancela os convites ainda pendentes e avisa quem já aceitou — seu gasto ' +
        'continua normalmente, só deixa de ser compartilhado. Esta ação não poderá ser desfeita.',
      icone: 'account-multiple-remove-outline',
      corIcone: colors.error,
      botoes: [
        { texto: 'Voltar', onPress: () => setAlerta({ visivel: false }) },
        {
          texto: 'Encerrar',
          style: 'destructive',
          onPress: async () => {
            setAlerta({ visivel: false });
            try {
              await encerrarCompartilhamento(eventoId);
            } catch (err) {
              setAlerta({
                visivel: true,
                titulo: 'Erro ao encerrar',
                mensagem: err.message || 'Não foi possível encerrar o compartilhamento.',
                icone: 'wifi-off',
                corIcone: colors.error,
                botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
              });
            }
          },
        },
      ],
    });
  };

  const handleGerarFixos = () =>
    handleGerarFixosUtil(gerarFixosDoMes, setAlerta, 'gasto');

  // ===================================================
  // 🔹 Botões flutuantes (FAB)
  // ===================================================
  const fabActions = useMemo(() => {
    const acoes = [
      {
        icon: 'plus',
        label: `Adicionar ${
          abaAtiva === 'gastos'
            ? 'Gasto'
            : abaAtiva === 'emprestimos'
            ? 'Empréstimo'
            : 'Compra'
        }`,
        onPress: () => setModalCriacaoVisivel(true),
        name: 'bt_add',
      },
    ];

    if (abaAtiva === 'gastos') {
      acoes.push(
        {
          icon: 'autorenew',
          label: 'Gerar Gastos do Mês',
          onPress: handleGerarFixos,
          name: 'bt_gerar',
        },
        {
          icon: 'cog-outline',
          label: 'Configurar Modelos',
          onPress: () => setModalModelosVisivel(true),
          name: 'bt_config',
        }
      );
    }

    return acoes;
  }, [abaAtiva, gastos, emprestimos]);

  // ===================================================
  // 🔹 RENDERIZAÇÃO
  // ===================================================
  return (
    <View style={{ flex: 1 }}>
      <TelaPadrao
        titulo="Saídas"
        tipo="gasto"
        total={totalSaidasGeral}
        fabActions={fabActions}
        disableDefaultList
        loading={loading}
      >
    <ModernTabs
      tabs={[
        { key: 'gastos', label: 'Gastos', icon: 'home-outline' },
        { key: 'emprestimos', label: 'Empréstimos', icon: 'hand-coin-outline' },
        { key: 'cartoes', label: 'Cartões', icon: 'credit-card-outline' },
      ]}
      activeTab={abaAtiva}
      setActiveTab={setAbaAtiva}
    >
      {/* 🧾 Estatísticas logo abaixo das tabs */}
      <View slot="header" style={{ marginTop: 12, paddingHorizontal: 12 }}>
        <EstatisticasComponent estatisticas={estatisticas} />
      </View>

      {/* 🧭 Conteúdo das abas — componentes de apresentação pura, sem hook
          de dados próprio (ver ARQUITETURA.md seção 19): todos os dados e
          ações vêm daqui, a única fonte de verdade quando navegando por
          Saídas. */}
      <GastosScreen
        tabKey="gastos"
        gastos={gastos}
        despesasPorId={despesasPorId}
        onPressItem={handleAbrirDetalhes}
        onToggleStatus={handleToggleStatus}
        onDeleteItem={handleExcluir}
      />
      <EmprestimosScreen
        tabKey="emprestimos"
        emprestimos={emprestimos}
        onPressItem={handleAbrirDetalhes}
        onToggleStatus={handleToggleStatus}
        onAdiantarParcelas={iniciarAdiantamento}
        onHistoryPress={handleAbrirHistorico}
        onDeleteItem={handleExcluir}
      />
      <CartoesScreen
        tabKey="cartoes"
        cartoes={cartoes}
        onPressItem={handleAbrirDetalhes}
        onToggleStatus={toggleCartaoStatus}
        onAdiantarParcelas={iniciarAdiantamento}
        buscarParcelasDoCartao={buscarParcelasDoCartao}
        onDeleteItem={handleExcluir}
      />
    </ModernTabs>
      </TelaPadrao>
      {/* --- Modais --- */}
<ModalCriacao
  visivel={modalCriacaoVisivel}
  aoFechar={() => setModalCriacaoVisivel(false)}
  aoSalvar={handleAdicionar}
  tipo={
  abaAtiva === 'gastos'
    ? 'gasto'
    : abaAtiva === 'emprestimos'
    ? 'emprestimo'
    : 'cartao'
}

  titulo={
  abaAtiva === 'gastos'
    ? 'Novo Gasto'
    : abaAtiva === 'emprestimos'
    ? 'Novo Empréstimo'
    : 'Nova Compra'
}

/>

<ModalDetalhes
  visible={modalDetalhesVisivel}
  onClose={() => setModalDetalhesVisivel(false)}
  onEditPress={handleAbrirEdicao}
  item={itemSelecionado}
tipo={
  abaAtiva === 'gastos'
    ? 'gasto'
    : abaAtiva === 'emprestimos'
    ? 'emprestimo'
    : 'cartao'
}
  onHistoryPress={() => handleAbrirHistorico(itemSelecionado)}
  onSharePress={
    colaboracaoDisponivel && abaAtiva === 'gastos' ? handleAbrirCompartilhar : undefined
  }
  onGerenciarDivisao={handleAbrirGerenciarDivisao}
  mostrarIconeCompartilhado={deveMostrarIconeCompartilhado(itemSelecionado, despesaDoItemSelecionado)}
  statusDivisaoTexto={
    despesaDoItemSelecionado
      ? despesaDoItemSelecionado.status === 'encerrada'
        ? 'Encerrada'
        : 'Ativa'
      : undefined
  }
/>

<ModalEdicao
  visivel={modalEdicaoVisivel}
  aoFechar={() => setModalEdicaoVisivel(false)}
  aoSalvar={handleEditar}
  aoExcluir={() => handleExcluir()}
  item={itemSelecionado}
tipo={
  abaAtiva === 'gastos'
    ? 'gasto'
    : abaAtiva === 'emprestimos'
    ? 'emprestimo'
    : 'cartao'
}
  titulo={`Editar ${
    abaAtiva === 'gastos'
      ? 'Gasto'
      : abaAtiva === 'emprestimos'
      ? 'Empréstimo'
      : 'Compra'
  }`}
  buscarParcelasDaCompra={buscarParcelasDaCompraCartao}
/>

      <GerenciarModelosModal
        visible={modalModelosVisivel}
        onClose={() => setModalModelosVisivel(false)}
        tipo="gasto"
        entradas={entradas}
        loadingEntradas={loadingEntradas}
      />

      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ visivel: false })}
        {...alerta}
      />

      <AlertaModal visible={alertaExclusao.visivel} onClose={fecharAlertaExclusao} {...alertaExclusao} />
      <ModalEditorParcelas
        visivel={editorExclusao.visivel}
        aoFechar={fecharEditorExclusao}
        aoConfirmar={confirmarEditorExclusao}
        descricao={editorExclusao.descricao}
        totalParcelas={editorExclusao.valoresIniciais.length}
        valoresIniciais={editorExclusao.valoresIniciais}
        bloqueadas={editorExclusao.bloqueadas}
      />

      <ModalHistoricoParcelas
        visible={historicoModalVisivel}
        onClose={() => {
          setHistoricoModalVisivel(false);
          setItemHistorico(null);
        }}
        item={{
          idCompra: itemHistorico?.idCompra,
          entidadeId: itemHistorico?.id,
          entidade:
            abaAtiva === 'cartoes'
              ? 'cartao'
              : abaAtiva === 'emprestimos'
              ? 'emprestimo'
              : 'gasto',
          descricao: itemHistorico?.descricao,
          collectionName:
            abaAtiva === 'cartoes'
              ? 'cartoes'
              : abaAtiva === 'emprestimos'
              ? 'emprestimos'
              : 'gastos',
        }}
      />

      <ModalParcelasAdiantamento
        visivel={modalAdiantamentoVisivel}
        aoFechar={fecharModalAdiantamento}
        parcelasFuturas={parcelasParaAdiantar}
        aoConfirmar={confirmarAdiantamento}
      />

      <ModalCompartilharDespesa
        visible={modalCompartilharVisivel}
        onClose={() => {
          setModalCompartilharVisivel(false);
          setGastoParaCompartilhar(null);
        }}
        gasto={gastoParaCompartilhar}
        conexoesAceitas={conexoesAceitas}
        membrosSelecionaveis={membrosSelecionaveis}
        compartilhando={compartilhando}
        errorCompartilhar={errorCompartilhar}
        onConfirmar={handleConfirmarCompartilhar}
      />

      <ModalGerenciarDivisao
        visible={modalGerenciarVisivel}
        onClose={() => setModalGerenciarVisivel(false)}
        despesaCompartilhada={despesaDoItemSelecionado}
        conexoesAceitas={conexoesAceitas}
        membrosSelecionaveis={membrosSelecionaveis}
        cancelandoConviteId={cancelandoConviteId}
        errorCancelarConvite={errorCancelarConvite}
        onCancelarConvite={handleCancelarConvite}
        resolvendoValorSemDestino={resolvendoValorSemDestino}
        errorResolverValorSemDestino={errorResolverValorSemDestino}
        onResolverValorSemDestino={handleResolverValorSemDestino}
        adicionandoParticipante={adicionandoParticipante}
        errorAdicionarParticipante={errorAdicionarParticipante}
        onAdicionarParticipante={handleAdicionarParticipante}
        propondo={propondo}
        errorPropor={errorPropor}
        onProporAlteracao={handleProporAlteracao}
        editandoCotaMembro={editandoCotaMembro}
        errorEditarCotaMembro={errorEditarCotaMembro}
        onEditarCotaMembro={handleEditarCotaMembro}
        removendoMembroId={removendoMembroId}
        errorRemoverMembro={errorRemoverMembro}
        onRemoverParticipanteSemConta={handleRemoverParticipanteSemConta}
        encerrando={encerrando}
        errorEncerrar={errorEncerrar}
        onEncerrarCompartilhamento={handleEncerrarCompartilhamento}
      />

      {/* 🔹 Mensagem de sucesso/erro do useAdiantamento — antes vinha da
          instância própria de EmprestimosScreen/CartoesScreen; agora que
          existe uma única instância aqui, precisa do seu próprio AlertaModal
          pra não perder o feedback ao usuário (ver ARQUITETURA.md seção 19). */}
      <AlertaModal
        visible={alertaAdiantamento.visivel}
        onClose={() => setAlertaAdiantamento({ ...alertaAdiantamento, visivel: false })}
        {...alertaAdiantamento}
      />
    </View>
  );
}
