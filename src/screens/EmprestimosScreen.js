// import { useMemo, useState } from 'react';
// import { View } from 'react-native';
// import TelaPadrao from '../components/TelaPadrao';
// import { useDateFilter } from '../contexts/DateFilterContext';
// import { useLoans } from '../hooks/useFirestore';
// import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
// import { useAdiantamento } from '../hooks/useAdiantamento';
// import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
// import AlertaModal from '../components/AlertaModal';

// export default function EmprestimosScreen() {
//   const { selectedMonth, selectedYear } = useDateFilter();
//   const { loans, loading, addLoan, updateLoan, deleteLoan } = useLoans(selectedMonth, selectedYear);
//   const {
//     modalAdiantamentoVisivel,
//     parcelasParaAdiantar,
//     iniciarAdiantamento,
//     confirmarAdiantamento,
//     fecharModalAdiantamento,
//     alerta,
//     setAlerta,
//   } = useAdiantamento('emprestimos');

//   const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
//   const [itemSelecionado, setItemSelecionado] = useState(null);

//   const emprestimosFiltrados = useMemo(() => loans || [], [loans]);
//   const total = useMemo(
//     () =>
//       emprestimosFiltrados
//         .filter((e) => e.pago)
//         .reduce((soma, item) => soma + (item.valor || 0), 0),
//     [emprestimosFiltrados]
//   );

//   const handleAdicionar = async (novo) => await addLoan(novo);
//   const handleEditar = async (editado) => editado?.id && (await updateLoan(editado.id, editado));
//   const handleExcluir = async (item) => item?.id && (await deleteLoan(item.id));

//   const handleToggleStatus = async (id) => {
//     const item = loans.find((e) => e.id === id);
//     if (item) await updateLoan(id, { ...item, pago: !item.pago });
//   };

//   const handleAbrirAdiantar = (item) => {
//     const itemOriginal = loans.find((loan) => loan.id === item.id);
//     if (itemOriginal) {
//       iniciarAdiantamento(itemOriginal);
//     } else {
//       setAlerta({
//         visivel: true,
//         titulo: 'Erro',
//         mensagem: 'Não foi possível encontrar os dados originais da parcela.',
//         icone: 'alert-circle-outline',
//         corIcone: '#E53935',
//         botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
//       });
//     }
//   };

//   const getIconePorCategoria = (categoria) => {
//     const icones = { Financiamento: 'car', Pessoal: 'face-man', Eletrônicos: 'laptop' };
//     return icones[categoria] || 'wallet';
//   };

//   return (
//     <View style={{ flex: 1 }}>
//       <TelaPadrao
//         titulo="Empréstimos"
//         tipo="emprestimo"
//         dados={emprestimosFiltrados}
//         total={total}
//         onAdd={handleAdicionar}
//         onEdit={handleEditar}
//         onDelete={handleExcluir}
//         onToggleStatus={handleToggleStatus}
//         getIconePorCategoria={getIconePorCategoria}
//         onAdiantarParcelas={handleAbrirAdiantar}
//         onPressItem={(item) => setItemSelecionado(item)}
//         onHistoryPress={(item) => {
//           setItemSelecionado(item);
//           setHistoricoModalVisivel(true);
//         }}
//       />

//       <ModalHistoricoParcelas
//         visible={historicoModalVisivel}
//         onClose={() => {
//           setHistoricoModalVisivel(false);
//           setItemSelecionado(null);
//         }}
//         item={{
//           idCompra: itemSelecionado?.idCompra,
//           descricao: itemSelecionado?.descricao,
//           collectionName: 'emprestimos',
//         }}
//       />

//       <ModalParcelasAdiantamento
//         visivel={modalAdiantamentoVisivel}
//         aoFechar={fecharModalAdiantamento}
//         parcelasFuturas={parcelasParaAdiantar}
//         aoConfirmar={confirmarAdiantamento}
//       />

//       {/* ✅ Alerta modal padronizado dentro da View */}
//       <AlertaModal
//         visible={alerta.visivel}
//         onClose={() => setAlerta({ ...alerta, visivel: false })}
//         {...alerta}
//       />
//     </View>
//   );
// }




















import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useLoans } from '../hooks/useFirestore';
import { useAdiantamento } from '../hooks/useAdiantamento';
import EstatisticasComponent from '../components/EstatisticasComponent';
import ListItemEmprestimo from '../components/ListItemEmprestimo';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import AlertaModal from '../components/AlertaModal';

export default function EmprestimosScreen({isEmbedded = false,  onPressItem, onDeleteItem,}) {
  const { selectedMonth, selectedYear } = useDateFilter();
  const { loans, updateLoan, deleteLoan } = useLoans(selectedMonth, selectedYear);

  const {
    modalAdiantamentoVisivel,
    parcelasParaAdiantar,
    iniciarAdiantamento,
    confirmarAdiantamento,
    fecharModalAdiantamento,
    alerta,
    setAlerta,
  } = useAdiantamento('emprestimos');

  const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);

  const total = useMemo(
    () => loans.filter((e) => e.pago).reduce((s, item) => s + (Number(item.valor) || 0), 0),
    [loans]
  );

  const estatisticas = useMemo(
    () => ({
      total,
      pagos: loans.filter((e) => e.pago).length,
      emAberto: loans.filter((e) => !e.pago).length,
      totalItens: loans.length,
    }),
    [loans, total]
  );

  const handleToggleStatus = async (id) => {
    const item = loans.find((e) => e.id === id);
    if (item) await updateLoan(id, { ...item, pago: !item.pago });
  };

  const handleExcluir = async (item) => {
    if (!item?.id) return;
    await deleteLoan(item.id);
  };

  return (
    <View style={{ flex: 1 }}>

      {loans.map((item) => (
        <ListItemEmprestimo
          key={item.id}
          item={item}
          onPressItem={() => onPressItem?.(item)}  // 👈 chama ModalDetalhes da SaidasScreen
          onToggleStatus={() => handleToggleStatus(item.id)}
          onAdiantarParcelas={() => iniciarAdiantamento(item)}
          onDelete={() =>
            isEmbedded ? onDeleteItem?.(item) : handleExcluir(item)
          }
          onHistoryPress={() => {
            setItemSelecionado(item);
            setHistoricoModalVisivel(true);
          }}
        />
      ))}

      {/* Só exibe modais locais se NÃO estiver embutido */}
      {!isEmbedded && (
        <>
          <ModalHistoricoParcelas
            visible={historicoModalVisivel}
            onClose={() => setHistoricoModalVisivel(false)}
            item={{
              idCompra: itemSelecionado?.idCompra,
              descricao: itemSelecionado?.descricao,
              collectionName: 'emprestimos',
            }}
          />

          <ModalParcelasAdiantamento
            visivel={modalAdiantamentoVisivel}
            aoFechar={fecharModalAdiantamento}
            parcelasFuturas={parcelasParaAdiantar}
            aoConfirmar={confirmarAdiantamento}
          />

          <AlertaModal
            visible={alerta.visivel}
            onClose={() => setAlerta({ ...alerta, visivel: false })}
            {...alerta}
          />
        </>
      )}
    </View>
  );
}
