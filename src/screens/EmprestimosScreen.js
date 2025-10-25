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
