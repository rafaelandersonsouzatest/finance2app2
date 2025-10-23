// import React, { useMemo, useState } from 'react';
// import { View } from 'react-native'; // Alert não é mais necessário
// import TelaPadrao from '../components/TelaPadrao';
// import ModalCriacao from '../components/ModalCriacao'; 
// import GerenciarModelosModal from '../components/GerenciarModelosModal';
// import { useDateFilter } from '../contexts/DateFilterContext';
// import { useFixedExpenses } from '../hooks/useFirestore';
// import AlertaModal from '../components/AlertaModal';
// import { colors } from '../styles/colors';
// import { handleGerarFixosUtil } from '../utils/handleGerarFixos';

// export default function GastosFixosScreen() {
//   // O estado do alerta agora precisa da prop 'botoes'
//   const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', icone: '', corIcone: '', botoes: [] });

//   // Estados e hooks existentes, sem alterações
//   const {
//     selectedMonth,
//     selectedYear,
//   } = useDateFilter();

//   const {
//     fixedExpenses,
//     loading,
//     addFixedExpense,
//     updateFixedExpense,
//     deleteFixedExpense,
//     gerarFixosDoMes,
//   } = useFixedExpenses(selectedMonth, selectedYear);

//   // Modais
//   const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
//   const [modalModelosVisivel, setModalModelosVisivel] = useState(false);

//   const gastosFiltrados = useMemo(() => fixedExpenses || [], [fixedExpenses]);

//   const total = useMemo(() => {
//     return gastosFiltrados
//       .filter((g) => g.pago)
//       .reduce((soma, item) => soma + (item.valor || 0), 0);
//   }, [gastosFiltrados]);

//   const jaGerou = useMemo(() => {
//     return gastosFiltrados.some((g) => g?.origemModelo === true);
//   }, [gastosFiltrados]);

//   // Handlers (funções de ação)
//   const handleAdicionar = async (novoGasto) => {
//     await addFixedExpense({
//       ...novoGasto,
//       mes: selectedMonth,
//       ano: selectedYear,
//     });
//     setModalCriacaoVisivel(false); 
//   };

//   const handleEditar = async (editado) => {
//     if (!editado?.id) return;
//     await updateFixedExpense(editado.id, editado);
//   };

//   // ✨ FUNÇÃO DE EXCLUIR ATUALIZADA PARA USAR O AlertaModal
//   const handleExcluir = async (item) => {
//     if (!item?.id) return;
//     setAlerta({
//       visivel: true,
//       titulo: 'Excluir Gasto',
//       mensagem: `Tem certeza que deseja excluir "${item.descricao}"?`,
//       icone: 'trash-can-outline',
//       corIcone: colors.error,
//       botoes: [
//         {
//           texto: 'Cancelar',
//           onPress: () => setAlerta({ visivel: false }), // Apenas fecha o alerta
//           style: 'primary',
//         },
//         {
//           texto: 'Excluir',
//           onPress: async () => {
//             await deleteFixedExpense(item.id);
//             setAlerta({ visivel: false }); // Fecha o alerta após a ação
//           },
//           style: 'destructive',
//         },
//       ],
//     });
//   };

//   const handleToggleStatus = async (id) => {
//     const item = fixedExpenses.find((e) => e.id === id);
//     if (item) {
//       await updateFixedExpense(id, { ...item, pago: !item.pago });
//     }
//   };

// const handleGerarFixos = () => handleGerarFixosUtil(gerarFixosDoMes, setAlerta, 'gasto');  
//   const getIconePorCategoria = (categoria) => {
//     const icones = {
//       Moradia: 'home-variant-outline',
//       Utilidades: 'lightbulb-on-outline',
//       Saúde: 'heart-pulse',
//       Transporte: 'car-outline',
//       Educação: 'school-outline',
//       Alimentação: 'silverware-fork-knife',
//       Lazer: 'movie-open-outline',
//       Conhecimento: 'book-open-page-variant-outline',
//     };
//     return icones[categoria] || 'cash';
//   };

//   // Ações do FabMenu
//   const actions = [
//     {
//       icon: 'plus',
//       label: 'Adicionar Gasto',
//       onPress: () => setModalCriacaoVisivel(true),
//       name: 'bt_add',
//     },
//     {
//       icon: 'autorenew',
//       label: 'Gerar Gastos do Mês',
//       onPress: handleGerarFixos,
//       name: 'bt_gerar',
//     },
//     {
//       icon: 'cog-outline',
//       label: 'Configurar Modelos',
//       onPress: () => setModalModelosVisivel(true),
//       name: 'bt_config',
//     },
//   ];

//   const fabActions = jaGerou ? actions.filter(a => a.name !== 'bt_gerar') : actions;

//   return (
//     <View style={{ flex: 1 }}>
//       <TelaPadrao
//         titulo="Gastos Fixos"
//         tipo="gasto"
//         dados={gastosFiltrados}
//         total={total}
//         onAdd={handleAdicionar} 
//         onEdit={handleEditar}
//         onDelete={handleExcluir}
//         onToggleStatus={handleToggleStatus}
//         getIconePorCategoria={getIconePorCategoria}
//         refreshing={loading}
//         fabActions={fabActions} 
//       />

//       <ModalCriacao
//         visivel={modalCriacaoVisivel}
//         aoFechar={() => setModalCriacaoVisivel(false)}
//         aoSalvar={handleAdicionar}
//         tipo="gasto"
//         titulo="Novo Gasto Fixo"
//         mesSelecionado={selectedMonth}
//         anoSelecionado={selectedYear}
//       />

//       <GerenciarModelosModal
//         visible={modalModelosVisivel}
//         onClose={() => setModalModelosVisivel(false)}
//         tipo="gasto"
//       />

//       <AlertaModal
//         visible={alerta.visivel}
//         onClose={() => setAlerta({ ...alerta, visivel: false })}
//         titulo={alerta.titulo}
//         mensagem={alerta.mensagem}
//         icone={alerta.icone}
//         corIcone={alerta.corIcone}
//         botoes={alerta.botoes}
//       />
//     </View>
//   );
// }













import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useFixedExpenses } from '../hooks/useFirestore';
import EstatisticasComponent from '../components/EstatisticasComponent';
import ListItemGasto from '../components/ListItemGasto';
import ModalCriacao from '../components/ModalCriacao';
import GerenciarModelosModal from '../components/GerenciarModelosModal';
import AlertaModal from '../components/AlertaModal';
import { handleGerarFixosUtil } from '../utils/handleGerarFixos';

export default function GastosFixosScreen({
  isEmbedded = false,
  onPressItem,       // novo
  onEditItem,        // opcional futuro
  onDeleteItem,      // opcional futuro
}) {
  const { selectedMonth, selectedYear } = useDateFilter();
  const {
    fixedExpenses,
    addFixedExpense,
    updateFixedExpense,
    deleteFixedExpense,
    gerarFixosDoMes,
  } = useFixedExpenses(selectedMonth, selectedYear);

  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalModelosVisivel, setModalModelosVisivel] = useState(false);
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', botoes: [] });

  const total = useMemo(
    () => fixedExpenses.filter((g) => g.pago).reduce((s, g) => s + (Number(g.valor) || 0), 0),
    [fixedExpenses]
  );

  const estatisticas = useMemo(
    () => ({
      total,
      pagos: fixedExpenses.filter((g) => g.pago).length,
      emAberto: fixedExpenses.filter((g) => !g.pago).length,
      totalItens: fixedExpenses.length,
    }),
    [fixedExpenses, total]
  );

  const handleAdicionar = async (novoGasto) => {
    await addFixedExpense({ ...novoGasto, mes: selectedMonth, ano: selectedYear });
    setModalCriacaoVisivel(false);
  };

  const handleExcluir = async (item) => {
    if (!item?.id) return;
    setAlerta({
      visivel: true,
      titulo: 'Excluir Gasto',
      mensagem: `Tem certeza que deseja excluir "${item.descricao}"?`,
      botoes: [
        { texto: 'Cancelar', onPress: () => setAlerta({ visivel: false }), style: 'primary' },
        {
          texto: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteFixedExpense(item.id);
            setAlerta({ visivel: false });
          },
        },
      ],
    });
  };

  const handleToggleStatus = async (id) => {
    const item = fixedExpenses.find((g) => g.id === id);
    if (item) await updateFixedExpense(id, { ...item, pago: !item.pago });
  };

  const handleGerarFixos = () =>
    handleGerarFixosUtil(gerarFixosDoMes, setAlerta, 'gasto');

  return (
    <View style={{ flex: 1 }}>

      {fixedExpenses.map((item) => (
        <ListItemGasto
          key={item.id}
          item={item}
          onPressItem={() => onPressItem?.(item)}  // 👈 segura e opcional
          onToggleStatus={() => handleToggleStatus(item.id)}
          onDelete={() =>
            isEmbedded ? onDeleteItem?.(item) : handleExcluir(item)
          }
        />
      ))}

      {/* Só exibe modais se NÃO estiver embutido */}
      {!isEmbedded && (
        <>
          <ModalCriacao
            visivel={modalCriacaoVisivel}
            aoFechar={() => setModalCriacaoVisivel(false)}
            aoSalvar={handleAdicionar}
            tipo="gasto"
            titulo="Novo Gasto Fixo"
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
        </>
      )}
    </View>
  );
}
