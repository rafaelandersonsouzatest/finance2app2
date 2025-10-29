import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useLoans } from '../hooks/useFirestore';
import { useAdiantamento } from '../hooks/useAdiantamento';
import ListItemEmprestimo from '../components/ListItemEmprestimo';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import AlertaModal from '../components/AlertaModal';

// 🧩 Função auxiliar para extrair data
const extractDate = (item) => {
  const possible = [
    item.dataVencimento,
    item.vencimento,
    item.dataPagamento,
    item.data,
    item.createdAt,
  ];
  for (const d of possible) {
    if (!d) continue;
    if (d instanceof Date) return d;
    const parsed = new Date(d);
    if (!isNaN(parsed)) return parsed;
  }
  return new Date(8640000000000000);
};

export default function EmprestimosScreen({ isEmbedded = false, onPressItem, onDeleteItem }) {
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

  // 🔹 Ordenar por data de vencimento e nome
  const sortedLoans = useMemo(() => {
    return [...loans].sort((a, b) => {
      const dateA = extractDate(a);
      const dateB = extractDate(b);
      const diff = dateA - dateB;
      if (diff !== 0) return diff;
      return (a.descricao || '').localeCompare(b.descricao || '');
    });
  }, [loans]);

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
      {sortedLoans.map((item) => (
        <ListItemEmprestimo
          key={item.id}
          item={item}
          onPressItem={() => onPressItem?.(item)}
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
