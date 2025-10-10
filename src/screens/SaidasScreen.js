import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks e Componentes
import { useDateFilter } from '../contexts/DateFilterContext';
import { useFixedExpenses, useLoans } from '../hooks/useFirestore';
import { useVisibility } from '../contexts/VisibilityContext';
import TelaPadrao from '../components/TelaPadrao';
import ListItemGasto from '../components/ListItemGasto';
import ListItemEmprestimo from '../components/ListItemEmprestimo';
import ModalCriacao from '../components/ModalCriacao';
import GerenciarModelosModal from '../components/GerenciarModelosModal';
import AlertaModal from '../components/AlertaModal';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import ModalDetalhes from '../components/ModalDetalhes';
import ModalEdicao from '../components/ModalEdicao';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
import { handleGerarFixosUtil } from '../utils/handleGerarFixos';
import { useAdiantamento } from '../hooks/useAdiantamento';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';

// --- Componente para as Abas ---
const TabSwitcher = ({ abaAtiva, setAbaAtiva }) => (
  <View style={globalStyles.topTabContainer}>
    <TouchableOpacity
      style={[globalStyles.topTabButton, abaAtiva === 'gastos' && globalStyles.topTabButtonActive]}
      onPress={() => setAbaAtiva('gastos')}
    >
      <Text
        style={[
          globalStyles.topTabButtonText,
          abaAtiva === 'gastos' && globalStyles.topTabButtonTextActive,
        ]}
      >
        Gastos Fixos
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[globalStyles.topTabButton, abaAtiva === 'emprestimos' && globalStyles.topTabButtonActive]}
      onPress={() => setAbaAtiva('emprestimos')}
    >
      <Text
        style={[
          globalStyles.topTabButtonText,
          abaAtiva === 'emprestimos' && globalStyles.topTabButtonTextActive,
        ]}
      >
        Empréstimos
      </Text>
    </TouchableOpacity>
  </View>
);

// --- Componente para o Conteúdo da Aba ---
const ConteudoAba = ({ titulo, dados, total, renderItem, tipo }) => {
  const { formatValue } = useVisibility();

  return (
    <View>
      <Text style={globalStyles.sectionTitleModern}>{titulo}</Text>

      {/* Card de subtotal */}
      <View style={[globalStyles.card, { padding: 10, borderRadius: 12 }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={[globalStyles.cardTitle, { fontSize: 14 }]}>Subtotal</Text>
            <Text
              style={[
                globalStyles.totalAmount,
                { color: colors.expense, fontSize: 18 },
              ]}
            >
              {formatValue(total)}
            </Text>
          </View>
        </View>
      </View>

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

export default function SaidasScreen() {
  // --- ESTADOS ---
  const [abaAtiva, setAbaAtiva] = useState('gastos');
  const { selectedMonth, selectedYear } = useDateFilter();

  // --- HOOKS DE DADOS ---
  const {
    fixedExpenses,
    loading: loadingGastos,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    gerarFixosDoMes,
  } = useFixedExpenses(selectedMonth, selectedYear);

  const {
    loans,
    loading: loadingEmprestimos,
    addLoan,
    updateLoan,
    deleteLoan,
  } = useLoans(selectedMonth, selectedYear);

  // --- HOOK DE ADIANTAMENTO ---
  const {
    modalAdiantamentoVisivel,
    parcelasParaAdiantar,
    iniciarAdiantamento,
    confirmarAdiantamento,
    fecharModalAdiantamento,
  } = useAdiantamento('emprestimos');

  // --- ESTADOS DE MODAIS ---
  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalModelosVisivel, setModalModelosVisivel] = useState(false);
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', botoes: [] });
  const [itemSelecionado, setItemSelecionado] = useState(null);
  const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);

  const loading = loadingGastos || loadingEmprestimos;

  // --- CÁLCULOS ---
  const totalGastosPagos = useMemo(
    () => fixedExpenses.filter((g) => g.pago).reduce((s, i) => s + i.valor, 0),
    [fixedExpenses]
  );
  const totalEmprestimosPagos = useMemo(
    () => loans.filter((l) => l.pago).reduce((s, i) => s + i.valor, 0),
    [loans]
  );
  const totalSaidasGeral = totalGastosPagos + totalEmprestimosPagos;

  // --- HANDLERS ---
  const handleAdicionar = async (novoItem) => {
    if (abaAtiva === 'gastos') {
      await addFixedExpense({ ...novoItem, mes: selectedMonth, ano: selectedYear });
    } else {
      await addLoan(novoItem);
    }
    setModalCriacaoVisivel(false);
  };

  const handleEditar = async (itemEditado) => {
    if (abaAtiva === 'gastos') {
      await updateFixedExpense(itemSelecionado.id, itemEditado);
    } else {
      await updateLoan(itemSelecionado.id, itemEditado);
    }
    setModalEdicaoVisivel(false);
    setItemSelecionado(null);
  };

const handleExcluir = () => {
  const item = itemSelecionado;
  const tipo = abaAtiva === 'gastos' ? 'Gasto' : 'Empréstimo';

  // Se for gasto fixo, mantém comportamento simples
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
            await deleteFixedExpense(item.id);
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

  // Se for empréstimo, mostra opções extras
  setAlerta({
    visivel: true,
    titulo: `Excluir ${tipo}`,
    mensagem: `Você deseja excluir apenas esta parcela ou o empréstimo inteiro de "${item.descricao}"?`,
    botoes: [
      { texto: 'Cancelar', onPress: () => setAlerta({ visivel: false }), style: 'primary' },
      {
        texto: 'Somente esta parcela',
        onPress: async () => {
          await deleteLoan(item.id);
          setAlerta({ visivel: false });
          setModalDetalhesVisivel(false);
          setItemSelecionado(null);
        },
        style: 'default',
      },
      {
        texto: 'Excluir empréstimo inteiro',
        onPress: async () => {
          await deleteLoan(item.id, item.idCompra, true); // 👈 exclui todas as parcelas
          setAlerta({ visivel: false });
          setModalDetalhesVisivel(false);
          setItemSelecionado(null);
        },
        style: 'destructive',
      },
    ],
  });
};

  const handleToggleStatus = async (id) => {
    if (abaAtiva === 'gastos') {
      const item = fixedExpenses.find((i) => i.id === id);
      if (item) await updateFixedExpense(id, { ...item, pago: !item.pago });
    } else {
      const item = loans.find((i) => i.id === id);
      if (item) await updateLoan(id, { ...item, pago: !item.pago });
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

  const fabActions = useMemo(() => {
    const acoes = [
      {
        icon: 'plus',
        label: `Adicionar ${abaAtiva === 'gastos' ? 'Gasto' : 'Empréstimo'}`,
        onPress: () => setModalCriacaoVisivel(true),
        name: 'bt_add',
      },
    ];
    if (abaAtiva === 'gastos') {
      acoes.push(
        { icon: 'autorenew', label: 'Gerar Gastos do Mês', onPress: handleGerarFixos, name: 'bt_gerar' },
        { icon: 'cog-outline', label: 'Configurar Modelos', onPress: () => setModalModelosVisivel(true), name: 'bt_config' }
      );
    }
    return acoes;
  }, [abaAtiva]);

  // --- Histórico de parcelas ---
  const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
  const [itemHistorico, setItemHistorico] = useState(null);

  return (
    <View style={{ flex: 1 }}>
      <TelaPadrao
        titulo="Saídas"
        tipo="gasto"
        total={totalSaidasGeral}
        fabActions={fabActions}
        disableDefaultList
      >
        <TabSwitcher abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva} />

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
        ) : abaAtiva === 'gastos' ? (
          <ConteudoAba
            tipo="gasto"
            dados={fixedExpenses}
            total={totalGastosPagos}
            renderItem={({ item }) => (
              <ListItemGasto
                item={item}
                onToggleStatus={handleToggleStatus}
                onPressItem={handleAbrirDetalhes}
              />
            )}
          />
        ) : (
          <ConteudoAba
            tipo="empréstimo"
            dados={loans}
            total={totalEmprestimosPagos}
            renderItem={({ item }) => (
              <ListItemEmprestimo
                item={item}
                onToggleStatus={handleToggleStatus}
                onPressItem={handleAbrirDetalhes}
                onAdiantarParcelas={() => iniciarAdiantamento(item)}
              />
            )}
          />
        )}
      </TelaPadrao>

      {/* --- Modais --- */}
      <ModalCriacao
        visivel={modalCriacaoVisivel}
        aoFechar={() => setModalCriacaoVisivel(false)}
        aoSalvar={handleAdicionar}
        tipo={abaAtiva === 'gastos' ? 'gasto' : 'emprestimo'}
        titulo={abaAtiva === 'gastos' ? 'Novo Gasto' : 'Novo Empréstimo'}
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

      <ModalDetalhes
        visible={modalDetalhesVisivel}
        onClose={() => setModalDetalhesVisivel(false)}
        onEditPress={handleAbrirEdicao}
        item={itemSelecionado}
        tipo={abaAtiva === 'gastos' ? 'gasto' : 'emprestimo'}
        onHistoryPress={() => {
          if (itemSelecionado) {
            setItemHistorico(itemSelecionado);
            setHistoricoModalVisivel(true);
          }
        }}
      />

      <ModalHistoricoParcelas
        visible={historicoModalVisivel}
        onClose={() => {
          setHistoricoModalVisivel(false);
          setItemHistorico(null);
        }}
        item={{
          idCompra: itemHistorico?.idCompra,
          descricao: itemHistorico?.descricao,
          collectionName: 'emprestimos',
        }}
      />

      <ModalEdicao
        visivel={modalEdicaoVisivel}
        aoFechar={() => setModalEdicaoVisivel(false)}
        aoSalvar={handleEditar}
        aoExcluir={handleExcluir}
        item={itemSelecionado}
        tipo={abaAtiva === 'gastos' ? 'gasto' : 'emprestimo'}
        titulo={`Editar ${abaAtiva === 'gastos' ? 'Gasto' : 'Empréstimo'}`}
      />

      {/* --- Modal de Adiantamento --- */}
      <ModalParcelasAdiantamento
        visivel={modalAdiantamentoVisivel}
        aoFechar={fecharModalAdiantamento}
        parcelasFuturas={parcelasParaAdiantar}
        aoConfirmar={confirmarAdiantamento}
      />
    </View>
  );
}
