import React, { useMemo, useState } from 'react';
import { View } from 'react-native'; // Alert não é mais necessário
import TelaPadrao from '../components/TelaPadrao';
import ModalCriacao from '../components/ModalCriacao'; 
import GerenciarModelosModal from '../components/GerenciarModelosModal';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useFixedExpenses } from '../hooks/useFirestore';
import AlertaModal from '../components/AlertaModal';
import { colors } from '../styles/colors';

export default function GastosFixosScreen() {
  // O estado do alerta agora precisa da prop 'botoes'
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', icone: '', corIcone: '', botoes: [] });

  // Estados e hooks existentes, sem alterações
  const {
    selectedMonth,
    selectedYear,
  } = useDateFilter();

  const {
    fixedExpenses,
    loading,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    gerarFixosDoMes,
  } = useFixedExpenses(selectedMonth, selectedYear);

  // Modais
  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalModelosVisivel, setModalModelosVisivel] = useState(false);

  const gastosFiltrados = useMemo(() => fixedExpenses || [], [fixedExpenses]);

  const total = useMemo(() => {
    return gastosFiltrados
      .filter((g) => g.pago)
      .reduce((soma, item) => soma + (item.valor || 0), 0);
  }, [gastosFiltrados]);

  const jaGerou = useMemo(() => {
    return gastosFiltrados.some((g) => g?.origemModelo === true);
  }, [gastosFiltrados]);

  // Handlers (funções de ação)
  const handleAdicionar = async (novoGasto) => {
    await addFixedExpense({
      ...novoGasto,
      mes: selectedMonth,
      ano: selectedYear,
    });
    setModalCriacaoVisivel(false); 
  };

  const handleEditar = async (editado) => {
    if (!editado?.id) return;
    await updateFixedExpense(editado.id, editado);
  };

  // ✨ FUNÇÃO DE EXCLUIR ATUALIZADA PARA USAR O AlertaModal
  const handleExcluir = async (item) => {
    if (!item?.id) return;
    setAlerta({
      visivel: true,
      titulo: 'Excluir Gasto',
      mensagem: `Tem certeza que deseja excluir "${item.descricao}"?`,
      icone: 'trash-can-outline',
      corIcone: colors.error,
      botoes: [
        {
          texto: 'Cancelar',
          onPress: () => setAlerta({ visivel: false }), // Apenas fecha o alerta
          style: 'primary',
        },
        {
          texto: 'Excluir',
          onPress: async () => {
            await deleteFixedExpense(item.id);
            setAlerta({ visivel: false }); // Fecha o alerta após a ação
          },
          style: 'destructive',
        },
      ],
    });
  };

  const handleToggleStatus = async (id) => {
    const item = fixedExpenses.find((e) => e.id === id);
    if (item) {
      await updateFixedExpense(id, { ...item, pago: !item.pago });
    }
  };

  const handleGerarFixos = async () => {
    const resultado = await gerarFixosDoMes();
    let alertaConfig = {};

    switch (resultado) {
      case 'SUCESSO':
        alertaConfig = {
          titulo: 'Sucesso!',
          mensagem: 'Os gastos fixos para este mês foram gerados.',
          icone: 'check-circle-outline',
          corIcone: colors.balance,
        };
        break;
      case 'JA_GERADO':
        alertaConfig = {
          titulo: 'Tudo Certo!',
          mensagem: 'Os gastos recorrentes para este mês já foram gerados anteriormente.',
          icone: 'information-outline',
          corIcone: colors.primary,
        };
        break;
      case 'SEM_MODELOS':
        alertaConfig = {
          titulo: 'Nenhum Modelo Encontrado',
          mensagem: 'Você ainda não cadastrou nenhum modelo de gasto recorrente. Vá em "Configurar Modelos" para começar.',
          icone: 'file-document-edit-outline',
          corIcone: colors.pending,
        };
        break;
      default:
        alertaConfig = {
          titulo: 'Erro',
          mensagem: 'Ocorreu um problema ao tentar gerar os gastos. Tente novamente.',
          icone: 'alert-circle-outline',
          corIcone: colors.expense,
        };
        break;
    }
    setAlerta({ visivel: true, ...alertaConfig });
  };
  
  const getIconePorCategoria = (categoria) => {
    const icones = {
      Moradia: 'home-variant-outline',
      Utilidades: 'lightbulb-on-outline',
      Saúde: 'heart-pulse',
      Transporte: 'car-outline',
      Educação: 'school-outline',
      Alimentação: 'silverware-fork-knife',
      Lazer: 'movie-open-outline',
      Conhecimento: 'book-open-page-variant-outline',
    };
    return icones[categoria] || 'cash';
  };

  // Ações do FabMenu
  const actions = [
    {
      icon: 'plus',
      label: 'Adicionar Gasto',
      onPress: () => setModalCriacaoVisivel(true),
      name: 'bt_add',
    },
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
    },
  ];

  const fabActions = jaGerou ? actions.filter(a => a.name !== 'bt_gerar') : actions;

  return (
    <View style={{ flex: 1 }}>
      <TelaPadrao
        titulo="Gastos Fixos"
        tipo="gasto"
        dados={gastosFiltrados}
        total={total}
        onAdd={handleAdicionar} 
        onEdit={handleEditar}
        onDelete={handleExcluir}
        onToggleStatus={handleToggleStatus}
        getIconePorCategoria={getIconePorCategoria}
        refreshing={loading}
        fabActions={fabActions} 
      />

      <ModalCriacao
        visivel={modalCriacaoVisivel}
        aoFechar={() => setModalCriacaoVisivel(false)}
        aoSalvar={handleAdicionar}
        tipo="gasto"
        titulo="Novo Gasto Fixo"
        mesSelecionado={selectedMonth}
        anoSelecionado={selectedYear}
      />

      <GerenciarModelosModal
        visible={modalModelosVisivel}
        onClose={() => setModalModelosVisivel(false)}
        tipo="gasto"
      />

      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ ...alerta, visivel: false })}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        icone={alerta.icone}
        corIcone={alerta.corIcone}
        botoes={alerta.botoes}
      />
    </View>
  );
}
