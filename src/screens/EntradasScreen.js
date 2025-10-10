import React, { useMemo, useState } from 'react';
import { View } from 'react-native'; // Alert não é mais necessário
import TelaPadrao from '../components/TelaPadrao';
import ModalCriacao from '../components/ModalCriacao';
import GerenciarModelosModal from '../components/GerenciarModelosModal';
import AlertaModal from '../components/AlertaModal';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useIncomes } from '../hooks/useFirestore';
import { colors } from '../styles/colors';
import { handleGerarFixosUtil } from '../utils/handleGerarFixos';

export default function EntradasScreen() {
  // O estado do alerta agora precisa da prop 'botoes' para o caso de exclusão
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', icone: '', corIcone: '', botoes: [] });

  const { selectedMonth, selectedYear } = useDateFilter();

  const {
    incomes,
    loading,
    addIncome,
    updateIncome,
    deleteIncome,
    gerarFixosDoMes,
  } = useIncomes(selectedMonth, selectedYear);

  // Modais
  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalModelosVisivel, setModalModelosVisivel] = useState(false);

  const entradasFiltradas = useMemo(() => incomes || [], [incomes]);

  const total = useMemo(() => {
    return entradasFiltradas
      .filter((e) => e.pago)
      .reduce((soma, item) => soma + (item.valor || 0), 0);
  }, [entradasFiltradas]);

  const jaGerou = useMemo(() => {
    return entradasFiltradas.some((e) => e?.origemModelo === true);
  }, [entradasFiltradas]);

  // Handlers
  const handleAdicionar = async (nova) => {
    await addIncome({
      ...nova,
      pago: false,
      mes: selectedMonth,
      ano: selectedYear,
      // A data já é tratada no hook, não precisa ser definida aqui
    });
    setModalCriacaoVisivel(false);
  };

  const handleEditar = async (editado) => {
    if (!editado?.id) return;
    await updateIncome(editado.id, editado);
  };

  // ✨ FUNÇÃO DE EXCLUIR ATUALIZADA PARA USAR O AlertaModal
  const handleExcluir = async (item) => {
    if (!item?.id) return;
    setAlerta({
      visivel: true,
      titulo: 'Excluir Entrada',
      mensagem: `Tem certeza que deseja excluir "${item.descricao}"?`,
      icone: 'trash-can-outline',
      corIcone: colors.error,
      botoes: [
        {
          texto: 'Cancelar',
          onPress: () => setAlerta({ visivel: false }),
          style: 'primary',
        },
        {
          texto: 'Excluir',
          onPress: async () => {
            await deleteIncome(item.id);
            setAlerta({ visivel: false });
          },
          style: 'destructive',
        },
      ],
    });
  };

  const handleToggleStatus = async (id) => {
    const item = incomes.find((e) => e.id === id);
    if (item) {
      await updateIncome(id, { ...item, pago: !item.pago });
    }
  };

  const handleGerarFixos = () =>
    handleGerarFixosUtil(gerarFixosDoMes, setAlerta, 'entrada');
  const getIconePorCategoria = (categoria) => {
    const icones = {
      Renda: 'briefcase-outline',
      Extra: 'credit-card',
      Investimentos: 'trending-up',
      Vendas: 'cart-outline',
    };
    return icones[categoria] || 'trending-up';
  };

  // Ações do FAB
  const actions = [
    {
      icon: 'plus',
      label: 'Adicionar Entrada',
      onPress: () => setModalCriacaoVisivel(true),
      name: 'bt_add',
    },
    {
      icon: 'autorenew',
      label: 'Gerar Entradas do Mês',
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
        titulo="Entradas"
        tipo="entrada"
        dados={entradasFiltradas}
        total={total}
        onAdd={handleAdicionar}
        onEdit={handleEditar}
        onDelete={handleExcluir} // Passa a nova função de exclusão
        onToggleStatus={handleToggleStatus}
        getIconePorCategoria={getIconePorCategoria}
        refreshing={loading}
        fabActions={fabActions}
      />

      <ModalCriacao
        visivel={modalCriacaoVisivel}
        aoFechar={() => setModalCriacaoVisivel(false)}
        aoSalvar={handleAdicionar}
        tipo="entrada"
        titulo="Nova Entrada"
        mesSelecionado={selectedMonth}
        anoSelecionado={selectedYear}
      />

      <GerenciarModelosModal
        visible={modalModelosVisivel}
        onClose={() => setModalModelosVisivel(false)}
        tipo="entrada"
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
