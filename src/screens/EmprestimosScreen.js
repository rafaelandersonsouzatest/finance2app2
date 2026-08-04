import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useEmprestimos } from '../hooks/useEmprestimos';
import { useAdiantamento } from '../hooks/useAdiantamento';
import ListItemEmprestimo from '../components/ListItemEmprestimo';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import AlertaModal from '../components/AlertaModal';
import ModalEditorParcelas from '../components/ModalEditorParcelas';
import { useExclusaoParcelada } from '../hooks/useExclusaoParcelada';

// 🧩 Função auxiliar para extrair data de forma segura
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

  // 🔹 Hook principal de empréstimos
  const {
    emprestimos,
    updateEmprestimo,
    excluirParcela,
    excluirGrupoInteiro,
    excluirParcelaComValoresPersonalizados,
    buscarParcelasDaCompra,
    anteciparParcelasEmprestimo, // ✅ pegamos a função daqui
  } = useEmprestimos(selectedMonth, selectedYear);

  const {
    confirmarExclusao,
    alertaExclusao,
    fecharAlertaExclusao,
    editorExclusao,
    fecharEditorExclusao,
    confirmarEditorExclusao,
  } = useExclusaoParcelada();

  // 🔹 Hook de adiantamento (agora recebe a função externa)
  const {
    modalAdiantamentoVisivel,
    parcelasParaAdiantar,
    iniciarAdiantamento,
    confirmarAdiantamento,
    fecharModalAdiantamento,
    alerta,
    setAlerta,
  } = useAdiantamento('emprestimos', anteciparParcelasEmprestimo);

  const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);

  // 🔹 Ordenar por data de vencimento e nome
  const sortedEmprestimos = useMemo(() => {
    return [...emprestimos].sort((a, b) => {
      const dateA = extractDate(a);
      const dateB = extractDate(b);
      const diff = dateA - dateB;
      if (diff !== 0) return diff;
      return (a.descricao || '').localeCompare(b.descricao || '');
    });
  }, [emprestimos]);

  // 🔹 Alternar status pago/pendente
  const handleToggleStatus = async (id) => {
    const item = emprestimos.find((e) => e.id === id);
    if (item) await updateEmprestimo(id, { ...item, pago: !item.pago });
  };

  // 🔹 Excluir parcela ou empréstimo — mecanismo único, ver
  // useExclusaoParcelada.js (ARQUITETURA.md seção 17).
  const handleExcluir = (item) => {
    confirmarExclusao({
      item,
      tipoLabel: 'Empréstimo',
      suportaGrupo: true,
      buscarParcelasDoGrupo: buscarParcelasDaCompra,
      excluirParcela,
      excluirGrupoInteiro,
      excluirComValoresPersonalizados: excluirParcelaComValoresPersonalizados,
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {sortedEmprestimos.map((item) => (
        <ListItemEmprestimo
          key={item.id}
          item={item}
          onPressItem={() => onPressItem?.(item)}
          onToggleStatus={() => handleToggleStatus(item.id)}
          onAdiantarParcelas={iniciarAdiantamento}
          onDelete={() =>
            isEmbedded ? onDeleteItem?.(item) : handleExcluir(item)
          }
          onHistoryPress={() => {
            setItemSelecionado(item);
            setHistoricoModalVisivel(true);
          }}
        />
      ))}

        <>
          {/* Histórico de parcelas */}
            <ModalHistoricoParcelas
              visible={historicoModalVisivel}
              onClose={() => setHistoricoModalVisivel(false)}
              item={{
                idCompra: itemSelecionado?.idCompra ?? itemSelecionado?.id,
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
          </>
    </View>
  );
}
