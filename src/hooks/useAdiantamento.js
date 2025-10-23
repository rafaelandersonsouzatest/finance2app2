import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCartoesEmprestados, useLoans } from './useFirestore';
import { useDateFilter } from '../contexts/DateFilterContext';

export const useAdiantamento = (collectionName) => {
  const [modalVisivel, setModalVisivel] = useState(false);
  const [parcelasFuturas, setParcelasFuturas] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Estado do alerta modal padronizado
  const [alerta, setAlerta] = useState({
    visivel: false,
    titulo: '',
    mensagem: '',
    icone: '',
    corIcone: '',
    botoes: [],
  });

  // 🔹 Mês/ano atuais
  const { selectedMonth, selectedYear } = useDateFilter();

  // 🔹 Hooks de Firestore
  const { anteciparParcelas } = useCartoesEmprestados(selectedMonth, selectedYear);
  const { anteciparParcelasEmprestimo } = useLoans(selectedMonth, selectedYear);

  // ===============================================
  // 🔹 Buscar parcelas futuras para antecipação
  // ===============================================
  const iniciarAdiantamento = async (item) => {
    if (!item || !item.idCompra) {
      setAlerta({
        visivel: true,
        titulo: 'Erro',
        mensagem: 'Este item não pode ser antecipado pois não possui um ID de compra agrupador.',
        icone: 'alert-circle-outline',
        corIcone: '#E53935',
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
      return;
    }

    setLoading(true);
    try {
      const q = query(collection(db, collectionName), where('idCompra', '==', item.idCompra));
      const snapshot = await getDocs(q);
      const todasAsParcelas = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const futuras = todasAsParcelas
        .filter((p) => !p.pago)
        .sort((a, b) => a.parcelaAtual - b.parcelaAtual);

      setParcelasFuturas(futuras);
      setModalVisivel(true);
    } catch (error) {
      console.error('Erro ao buscar parcelas para antecipação:', error);
      setAlerta({
        visivel: true,
        titulo: 'Erro ao buscar parcelas',
        mensagem: 'Não foi possível carregar as parcelas futuras. Tente novamente.',
        icone: 'alert-circle-outline',
        corIcone: '#E53935',
        botoes: [{ texto: 'OK', onPress: () => setAlerta({ visivel: false }) }],
      });
    } finally {
      setLoading(false);
    }
  };

  // ===============================================
  // 🔹 Confirmar antecipação (cartões ou empréstimos)
  // ===============================================
  const confirmarAdiantamento = async (idsSelecionados, dataPagamento, valorComDesconto) => {
    if (!idsSelecionados.length) return;
    setLoading(true);

    try {
    if (collectionName === 'cartoesEmprestados') {
      await anteciparParcelas(idsSelecionados, dataPagamento, valorComDesconto);
      setAlerta({
        visivel: true,
        titulo: 'Parcelas Antecipadas',
        mensagem: 'Parcelas de cartão antecipadas com sucesso!',
        icone: 'check-circle-outline',
        corIcone: '#4CAF50',
        botoes: [{
          texto: 'OK',
          onPress: () => {
            setAlerta({ visivel: false });
            setModalVisivel(false); // 👈 fecha o modal junto
          },
        }],
      });
    } else if (collectionName === 'emprestimos') {
      await anteciparParcelasEmprestimo(idsSelecionados, dataPagamento, valorComDesconto);
      setAlerta({
        visivel: true,
        titulo: 'Parcelas Antecipadas',
        mensagem: 'Parcelas de empréstimo antecipadas com sucesso!',
        icone: 'check-circle-outline',
        corIcone: '#4CAF50',
        botoes: [{
          texto: 'OK',
          onPress: () => {
            setAlerta({ visivel: false });
            setModalVisivel(false); // 👈 fecha o modal junto
          },
        }],
      });
    }
    } finally {
      setLoading(false);
      setModalVisivel(false);
    }
  };

  const fecharModal = () => {
    setModalVisivel(false);
    setParcelasFuturas([]);
  };

  // ===============================================
  // 🔹 Retorno unificado
  // ===============================================
  return {
    modalAdiantamentoVisivel: modalVisivel,
    parcelasParaAdiantar: parcelasFuturas,
    loadingAdiantamento: loading,
    iniciarAdiantamento,
    confirmarAdiantamento,
    fecharModalAdiantamento: fecharModal,
    alerta,
    setAlerta,
  };
};
