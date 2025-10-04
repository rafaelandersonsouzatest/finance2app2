import { useMemo, useState } from 'react';
import { View, Alert } from 'react-native';
import TelaPadrao from '../components/TelaPadrao';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useLoans } from '../hooks/useFirestore';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import { useAdiantamento } from '../hooks/useAdiantamento';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';

export default function EmprestimosScreen() {
  const { selectedMonth, selectedYear } = useDateFilter();
  const { loans, loading, addLoan, updateLoan, deleteLoan } = useLoans(selectedMonth, selectedYear);
  const { modalAdiantamentoVisivel, parcelasParaAdiantar, iniciarAdiantamento, confirmarAdiantamento, fecharModalAdiantamento } = useAdiantamento('emprestimos');

  // ✨ 3. ADICIONAR ESTADOS PARA O MODAL E PARA O ITEM SELECIONADO ✨
  const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);

  const emprestimosFiltrados = useMemo(() => loans || [], [loans]);
  const total = useMemo(() => {
    return emprestimosFiltrados.filter((e) => e.pago).reduce((soma, item) => soma + (item.valor || 0), 0);
  }, [emprestimosFiltrados]);

  const handleAdicionar = async (novo) => await addLoan(novo);
  const handleEditar = async (editado) => editado?.id && (await updateLoan(editado.id, editado));
  const handleExcluir = async (item) => item?.id && (await deleteLoan(item.id));

  const handleToggleStatus = async (id) => {
    const item = loans.find((e) => e.id === id);
    if (item) await updateLoan(id, { ...item, pago: !item.pago });
  };

  const handleAbrirAdiantar = (item) => {
    const itemOriginal = loans.find(loan => loan.id === item.id);
    if (itemOriginal) {
      iniciarAdiantamento(itemOriginal);
    } else {
      Alert.alert("Erro", "Não foi possível encontrar os dados originais da parcela.");
    }
  };

  const getIconePorCategoria = (categoria) => {
    const icones = { Financiamento: 'car', Pessoal: 'face-man', Eletrônicos: 'laptop' };
    return icones[categoria] || 'wallet';
  };

  return (
    <View style={{ flex: 1 }}>
      <TelaPadrao
        titulo="Empréstimos"
        tipo="emprestimo"
        dados={emprestimosFiltrados} // Passa os dados normalmente
        total={total}
        onAdd={handleAdicionar}
        onEdit={handleEditar}
        onDelete={handleExcluir}
        onToggleStatus={handleToggleStatus}
        getIconePorCategoria={getIconePorCategoria}
        onAdiantarParcelas={handleAbrirAdiantar}
        // ✨ 4. USAR 'onPressItem' PARA CAPTURAR O ITEM CLICADO ✨
        onPressItem={(item) => setItemSelecionado(item)}
        // ✨ 5. PASSAR A FUNÇÃO PARA ABRIR O HISTÓRICO ✨
        onHistoryPress={() => setHistoricoModalVisivel(true)}
        refreshing={loading}
      />

      {/* ✨ 6. RENDERIZAR O MODAL DE HISTÓRICO USANDO O ESTADO LOCAL ✨ */}
      <ModalHistoricoParcelas
        visible={historicoModalVisivel}
        onClose={() => {
          setHistoricoModalVisivel(false);
          setItemSelecionado(null); // Limpa o item ao fechar
        }}
        item={{ 
          idCompra: itemSelecionado?.idCompra, 
          descricao: itemSelecionado?.descricao,
          collectionName: 'emprestimos' 
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
