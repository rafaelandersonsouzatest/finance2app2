import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useCartoes } from '../hooks/useCartoes';
import { useEmprestimos } from '../hooks/useEmprestimos';
import { useGastos } from '../hooks/useGastos';
import { useVisibility } from '../contexts/VisibilityContext';
import TelaPadrao from '../components/TelaPadrao';
import ModalCriacao from '../components/ModalCriacao';
import GerenciarModelosModal from '../components/GerenciarModelosModal';
import AlertaModal from '../components/AlertaModal';
import { globalStyles } from '../styles/globalStyles';
import ModalDetalhes from '../components/ModalDetalhes';
import ModalEdicao from '../components/ModalEdicao';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
import { handleGerarFixosUtil } from '../utils/handleGerarFixos';
import { useAdiantamento } from '../hooks/useAdiantamento';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import CartoesScreen from './CartoesScreen';
import EstatisticasComponent from '../components/EstatisticasComponent';
import ModernTabs from '../components/ModernTabs';
import GastosScreen from './GastosScreen';
import EmprestimosScreen from './EmprestimosScreen';



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

  const {
    emprestimos,
    loading: loadingEmprestimos,
    addEmprestimo,
    updateEmprestimo,
    deleteEmprestimo,
  } = useEmprestimos(selectedMonth, selectedYear);

  const {
  modalAdiantamentoVisivel,
  parcelasParaAdiantar,
  iniciarAdiantamento,
  confirmarAdiantamento,
  fecharModalAdiantamento,
} = useAdiantamento(abaAtiva === 'cartoes' ? 'cartoes' : 'emprestimos');


  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalModelosVisivel, setModalModelosVisivel] = useState(false);
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', botoes: [] });
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);
  const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
  const [itemHistorico, setItemHistorico] = useState(null);

  const {
    cartoes,
    loading: loadingCartoes,
    addCartao,
    updateCartao,
    deleteCartao,
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

const handleExcluir = () => {
  const item = itemSelecionado;

  if (!item) return;

  // 🔹 Define o tipo correto para o alerta
  const tipo =
    abaAtiva === 'gastos'
      ? 'Gasto'
      : abaAtiva === 'emprestimos'
      ? 'Empréstimo'
      : 'Compra';

  // 🔹 GASTOS
  if (abaAtiva === 'gastos') {
    setAlerta({
      visivel: true,
      titulo: `Excluir ${tipo}`,
      mensagem: `Tem certeza que deseja excluir "${item.descricao}"?`,
      botoes: [
        { texto: 'Cancelar', onPress: () => setAlerta({ visivel: false }), style: 'primary' },
        {
          texto: 'Excluir',
          onPress: async () => {
            await deleteGasto(item.id);
            setAlerta({ visivel: false });
            setModalDetalhesVisivel(false);
            setItemSelecionado(null);
          },
          style: 'destructive',
        },
      ],
    });
    return;
  }

  // 🔹 EMPRÉSTIMOS
  if (abaAtiva === 'emprestimos') {
    setAlerta({
      visivel: true,
      titulo: `Excluir ${tipo}`,
      mensagem: `Você deseja excluir apenas esta parcela ou o empréstimo inteiro de "${item.descricao}"?`,
      botoes: [
        { texto: 'Cancelar', onPress: () => setAlerta({ visivel: false }), style: 'primary' },
        {
          texto: 'Somente esta parcela',
          onPress: async () => {
            await deleteEmprestimo(item.id);
            setAlerta({ visivel: false });
            setModalDetalhesVisivel(false);
            setItemSelecionado(null);
          },
          style: 'default',
        },
        {
          texto: 'Excluir empréstimo inteiro',
          onPress: async () => {
            await deleteEmprestimo(item.id, item.idCompra, true);
            setAlerta({ visivel: false });
            setModalDetalhesVisivel(false);
            setItemSelecionado(null);
          },
          style: 'destructive',
        },
      ],
    });
    return;
  }

  // 🔹 CARTÕES
  if (abaAtiva === 'cartoes') {
    setAlerta({
      visivel: true,
      titulo: `Excluir ${tipo}`,
      mensagem: `Deseja excluir a compra "${item.descricao}" deste cartão?`,
      botoes: [
        { texto: 'Cancelar', onPress: () => setAlerta({ visivel: false }), style: 'primary' },
        {
          texto: 'Excluir',
          onPress: async () => {
            await deleteCartao(item.id);
            setAlerta({ visivel: false });
            setModalDetalhesVisivel(false);
            setItemSelecionado(null);
          },
          style: 'destructive',
        },
      ],
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

      {/* 🧭 Conteúdo das abas */}
      <GastosScreen tabKey="gastos" isEmbedded onPressItem={handleAbrirDetalhes} />
      <EmprestimosScreen tabKey="emprestimos" isEmbedded onPressItem={handleAbrirDetalhes} />
      <CartoesScreen tabKey="cartoes" isEmbedded onPressItem={handleAbrirDetalhes} />
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
  onHistoryPress={() => {
    if (itemSelecionado) {
      setItemHistorico(itemSelecionado);
      setHistoricoModalVisivel(true);
    }
  }}
/>

<ModalEdicao
  visivel={modalEdicaoVisivel}
  aoFechar={() => setModalEdicaoVisivel(false)}
  aoSalvar={handleEditar}
  aoExcluir={handleExcluir}
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
/>

      <GerenciarModelosModal
        visible={modalModelosVisivel}
        onClose={() => setModalModelosVisivel(false)}
        tipo="gasto"
      />

      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ visivel: false })}
        {...alerta}
      />


      <ModalHistoricoParcelas
        visible={historicoModalVisivel}
        onClose={() => {
          setHistoricoModalVisivel(false);
          setItemHistorico(null);
        }}
        item={{
          idCompra: itemHistorico?.idCompra ?? itemHistorico?.id,
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
    </View>
  );
}
