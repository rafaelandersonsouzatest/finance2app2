// src/hooks/useAdiantamento.js
import { useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';
import { useCartoes } from './useCartoes';
import { useEmprestimos } from './useEmprestimos';

export const useAdiantamento = (collectionName, anteciparParcelasEmprestimoExternas) => {
  const [modalVisivel, setModalVisivel] = useState(false);
  const [parcelasFuturas, setParcelasFuturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { selectedMonth, selectedYear } = useDateFilter();

  const [alerta, setAlerta] = useState({
    visivel: false,
    titulo: '',
    mensagem: '',
    icone: '',
    corIcone: '',
    botoes: [],
  });

  // 🔹 Hooks separados, mas só usamos o que for necessário
  const { anteciparParcelas: anteciparParcelasCartao } = useCartoes(selectedMonth, selectedYear);
  const { anteciparParcelasEmprestimo } = useEmprestimos(selectedMonth, selectedYear);

  // 🔹 Buscar parcelas futuras para antecipação
  const iniciarAdiantamento = async (item) => {
    if (!item || !item.idCompra) {
      setAlerta({
        visivel: true,
        titulo: 'Erro',
        mensagem: 'Este item não pode ser antecipado, pois não possui um identificador de compra (idCompra).',
        icone: 'alert-circle-outline',
        corIcone: '#E53935',
        botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
      });
      return;
    }

    setLoading(true);
    try {
      const basePath = getBasePath(user);
      const q = query(
        collection(db, `${basePath}/${collectionName}`),
        where('idCompra', '==', item.idCompra)
      );

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
    } catch (err) {
      console.error('Erro ao buscar parcelas:', err);
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

  // 🔹 Confirmar antecipação (cartões ou empréstimos)
  const confirmarAdiantamento = async (idsSelecionados, dataPagamento, valorComDesconto) => {
    if (!idsSelecionados.length) return;
    setLoading(true);

    try {
      if (collectionName === 'cartoes') {
        await anteciparParcelasCartao(idsSelecionados, dataPagamento, valorComDesconto);
      } else if (collectionName === 'emprestimos') {
        const fn =
          typeof anteciparParcelasEmprestimoExternas === 'function'
            ? anteciparParcelasEmprestimoExternas
            : anteciparParcelasEmprestimo;
        await fn(idsSelecionados, dataPagamento, valorComDesconto);
      }

      setAlerta({
        visivel: true,
        titulo: 'Parcelas Antecipadas',
        mensagem: 'As parcelas selecionadas foram antecipadas com sucesso!',
        icone: 'check-circle-outline',
        corIcone: '#4CAF50',
        botoes: [
          {
            texto: 'OK',
            onPress: () => {
              setAlerta({ visivel: false });
              setModalVisivel(false);
            },
          },
        ],
      });
    } catch (err) {
      console.error('Erro ao antecipar parcelas:', err);
      setAlerta({
        visivel: true,
        titulo: 'Erro',
        mensagem: 'Não foi possível antecipar as parcelas. Tente novamente.',
        icone: 'alert-circle-outline',
        corIcone: '#E53935',
        botoes: [{ texto: 'OK', onPress: () => setAlerta({ visivel: false }) }],
      });
    } finally {
      setLoading(false);
    }
  };

  const fecharModal = () => {
    setModalVisivel(false);
    setParcelasFuturas([]);
  };

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
