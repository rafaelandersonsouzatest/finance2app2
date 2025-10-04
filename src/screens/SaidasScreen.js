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
// ✨ Faltava importar os modais de detalhes e edição
import ModalDetalhes from '../components/ModalDetalhes';
import ModalEdicao from '../components/ModalEdicao';

// --- Componente para as Abas (sem alterações) ---
const TabSwitcher = ({ abaAtiva, setAbaAtiva }) => (
  // 👇 Usando o novo nome de estilo para o container
  <View style={globalStyles.topTabContainer}> 
    <TouchableOpacity
      // 👇 Usando os novos nomes de estilo para o botão
      style={[globalStyles.topTabButton, abaAtiva === 'gastos' && globalStyles.topTabButtonActive]}
      onPress={() => setAbaAtiva('gastos')}
    >
      <Text
        // 👇 Usando os novos nomes de estilo para o texto
        style={[
          globalStyles.topTabButtonText,
          abaAtiva === 'gastos' && globalStyles.topTabButtonTextActive,
        ]}
      >
        Gastos Fixos
      </Text>
    </TouchableOpacity>
    <TouchableOpacity
      // 👇 Usando os novos nomes de estilo para o botão
      style={[globalStyles.topTabButton, abaAtiva === 'emprestimos' && globalStyles.topTabButtonActive]}
      onPress={() => setAbaAtiva('emprestimos')}
    >
      <Text
        // 👇 Usando os novos nomes de estilo para o texto
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
// --- Componente para o Conteúdo da Aba (sem alterações) ---
const ConteudoAba = ({ titulo, dados, total, renderItem, tipo }) => {
  const { formatValue } = useVisibility();
  return (
    <View>
      <Text style={globalStyles.sectionTitleModern}>{titulo}</Text>

      {/* 🔽 card mais compacto apenas nesta tela */}
      <View style={[globalStyles.card, { padding: 10, borderRadius: 12 }]}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View>
            <Text style={[globalStyles.cardTitle, { fontSize: 14 }]}>Sub-Total</Text>
            <Text
              style={[
                globalStyles.totalAmount,
                { color: colors.expense, fontSize: 18 }, // menor que o padrão
              ]}
            >
              {formatValue(total)}
            </Text>
          </View>

          {/* Ícone menor */}
          {/* <MaterialCommunityIcons name="cash-minus" size={22} color={colors.expense} /> */}
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
    const { fixedExpenses, loading: loadingGastos, addFixedExpense, updateFixedExpense, deleteFixedExpense, gerarFixosDoMes } = useFixedExpenses(selectedMonth, selectedYear);
    const { loans, loading: loadingEmprestimos, addLoan, updateLoan, deleteLoan } = useLoans(selectedMonth, selectedYear);

    // --- ESTADOS DE MODAIS ---
    const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
    const [modalModelosVisivel, setModalModelosVisivel] = useState(false);
    const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', botoes: [] });
    // ✨ Adicionar estados para os modais de detalhes e edição
    const [itemSelecionado, setItemSelecionado] = useState(null);
    const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
    const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);

    const loading = loadingGastos || loadingEmprestimos;

    // --- CÁLCULOS ---
    const totalGastosPagos = useMemo(() => fixedExpenses.filter(g => g.pago).reduce((s, i) => s + i.valor, 0), [fixedExpenses]);
    const totalEmprestimosPagos = useMemo(() => loans.filter(l => l.pago).reduce((s, i) => s + i.valor, 0), [loans]);
    const totalSaidasGeral = totalGastosPagos + totalEmprestimosPagos;

    const dadosAtuais = abaAtiva === 'gastos' ? fixedExpenses : loans;

    // --- ✨ HANDLERS COMPLETOS ---
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
        setAlerta({
            visivel: true,
            titulo: `Excluir ${tipo}`,
            mensagem: `Tem certeza que deseja excluir "${item.descricao}"?`,
            botoes: [
                { texto: 'Cancelar', onPress: () => setAlerta({ visivel: false }), style: 'primary' },
                {
                    texto: 'Excluir',
                    onPress: async () => {
                        if (abaAtiva === 'gastos') await deleteFixedExpense(item.id);
                        else await deleteLoan(item.id);
                        setAlerta({ visivel: false });
                        setModalDetalhesVisivel(false); // Fecha o modal de detalhes também
                        setItemSelecionado(null);
                    },
                    style: 'destructive',
                },
            ],
        });
    };

    const handleToggleStatus = async (id) => {
        if (abaAtiva === 'gastos') {
            const item = fixedExpenses.find(i => i.id === id);
            if (item) await updateFixedExpense(id, { ...item, pago: !item.pago });
        } else {
            const item = loans.find(i => i.id === id);
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

    const handleGerarFixos = async () => { /* ... sua lógica de gerar fixos ... */ };

    const fabActions = useMemo(() => {
        const acoes = [
            { icon: 'plus', label: `Adicionar ${abaAtiva === 'gastos' ? 'Gasto' : 'Empréstimo'}`, onPress: () => setModalCriacaoVisivel(true), name: 'bt_add' },
        ];
        if (abaAtiva === 'gastos') {
            acoes.push(
                { icon: 'autorenew', label: 'Gerar Gastos do Mês', onPress: handleGerarFixos, name: 'bt_gerar' },
                { icon: 'cog-outline', label: 'Configurar Modelos', onPress: () => setModalModelosVisivel(true), name: 'bt_config' }
            );
        }
        return acoes;
    }, [abaAtiva]);

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
      ) : (
        abaAtiva === 'gastos' ? (
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
                onAdiantarParcelas={() => {}}
              />
            )}
          />
        )
      )}
    </TelaPadrao>


            {/* Modais */}
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
            {/* ✨ Modais de Detalhes e Edição */}
            <ModalDetalhes
                visible={modalDetalhesVisivel}
                onClose={() => setModalDetalhesVisivel(false)}
                onEditPress={handleAbrirEdicao}
                item={itemSelecionado}
                tipo={abaAtiva === 'gastos' ? 'gasto' : 'emprestimo'}
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
        </View>
    );
}
