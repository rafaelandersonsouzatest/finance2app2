import { useState, useMemo } from 'react';
import TelaPadrao from '../components/TelaPadrao';
import DetalhesInvestimentoModal from '../components/DetalhesInvestimentoModal';
import { useInvestments } from '../hooks/useFirestore';

export default function InvestimentosScreen() {
  const {
    investments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addTransaction,
    updateTransaction,
    deleteTransaction, 
  } = useInvestments();

  // 1. MUDANÇA: O estado agora guarda apenas o ID do investimento, não o objeto todo.
  const [selectedInvestmentId, setSelectedInvestmentId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // 2. LÓGICA NOVA: Encontra o objeto de investimento completo e ATUALIZADO.
  // Este 'useMemo' garante que 'investimentoSelecionado' sempre tenha os dados mais recentes
  // da lista 'investments', que é atualizada em tempo real pelo Firebase.
  const investimentoSelecionado = useMemo(() => {
    if (!selectedInvestmentId) return null;
    return investments.find(inv => inv.id === selectedInvestmentId);
  }, [selectedInvestmentId, investments]); // Re-executa se o ID ou a lista mudar

  const totalInvestido = useMemo(() => {
    return investments.reduce((sum, item) => {
      const valor = Number(item?.valorAtual);
      return sum + (isNaN(valor) ? 0 : valor);
    }, 0);
  }, [investments]);

const handleAdicionar = async (novo) => {
  const investimento = {
    nome: novo.nome || 'Sem nome',
    instituicao: novo.instituicao || 'Não Informado',
    // 👉 agora gravamos apenas valorInicial
    valorInicial: Number(String(novo.valorInicial || '0').replace(',', '.')) || 0,
    meta: Number(String(novo.meta || '0').replace(',', '.')) || 0,
  };
  await addInvestment(investimento);
};

  const handleExcluir = async (id) => {
    if (!id) return;
    await deleteInvestment(id);
  };

const getIconePorCategoria = (categoria) => {
  const icones = {
    Nubank: 'bank',
    Inter: 'wallet',
    'XP Investimentos': 'chart-line',
  };
  return icones[categoria] || 'trending-up';
};

  return (
    <>
      <TelaPadrao
        titulo="Investimentos"
        tipo="investimento"
        dados={investments}
        total={totalInvestido}
        onAdd={handleAdicionar}
        onEdit={() => {}}
        onDelete={(item) => handleExcluir(item.id)}
        onToggleStatus={() => {}}
        getIconePorCategoria={getIconePorCategoria}
        // 3. MUDANÇA: Ao clicar, agora salvamos apenas o ID.
        onPressItem={(item) => setSelectedInvestmentId(item.id)}
        hideDateFilter={true}
        refreshing={refreshing}
        setRefreshing={setRefreshing}
      />

<DetalhesInvestimentoModal
  visible={!!investimentoSelecionado}
  investment={investimentoSelecionado}
  onClose={() => setSelectedInvestmentId(null)}
  onUpdateInvestment={updateInvestment}
  onDeleteInvestment={deleteInvestment}
  addTransaction={addTransaction}
  updateTransaction={updateTransaction}
  deleteTransaction={deleteTransaction}
/>
    </>
  );
}
