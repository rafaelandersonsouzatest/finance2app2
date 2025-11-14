import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';
import { colors } from '../styles/colors';
import { normalizarParaISO } from '../utils/formatarData';
import { vencimentoCartaoPorNome } from '../utils/datasPadrao';


// =======================================
// 🔹 HOOK: CARTÕES
// =======================================
export const useCartoes = (month, year) => {
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuth();

  // 🔹 Busca dados do mês/ano selecionado
  useEffect(() => {
    if (!month || !year || !user) {
      setCartoes([]);
      setLoading(false);
      return;
    }

    const basePath = getBasePath(user);
    const q = query(
      collection(db, `${basePath}/cartoes`),
      where('mes', '==', month),
      where('ano', '==', year)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            valor: parseFloat(data.valor) || 0,
            pago: data.pago === true,
            pessoa:
              typeof data.pessoa === 'object' ? data.pessoa?.nome : data.pessoa,
            membro:
              typeof data.membro === 'object' ? data.membro?.nome : data.membro,
            categoria:
              typeof data.categoria === 'object'
                ? data.categoria?.nome
                : data.categoria,
          };
        });

        // ✅ Ordenar por data de vencimento
        dados.sort(
          (a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)
        );
        setCartoes(dados);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no snapshot de cartões:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [month, year, user]);

  const getCorDoCartao = (nomeCartao) => {
    const nomeLimpo = typeof nomeCartao === 'string' ? nomeCartao.trim() : '';
    if (colors.byInstitution && colors.byInstitution[nomeLimpo]) {
      return colors.byInstitution[nomeLimpo];
    }
    return colors.byInstitution?.Default || '#888888';
  };

  // ➕ Adicionar nova compra parcelada
  const addCartao = async (cartao) => {
    if (!user) throw new Error('Usuário não autenticado.');

    try {
      const basePath = getBasePath(user);
      const {
        descricao,
        valorTotal,
        valorParcela,
        totalParcelas,
        dataCompra,
        pessoa,
        cartao: nomeCartao,
      } = cartao;

      const parcelas = parseInt(totalParcelas || 1, 10);
      const valorTotalNum = parseFloat(valorTotal) || 0;
      const valorParcelaNum =
        parseFloat(valorParcela) ||
        (parcelas > 0 ? valorTotalNum / parcelas : 0);

      const corDoCartao = getCorDoCartao(nomeCartao);
      const dataBaseISO = normalizarParaISO(dataCompra);
      const dataBase = new Date(dataBaseISO + 'T00:00:00');
      const idCompra = `${descricao.replace(/\s+/g, '-')}-${dataBaseISO}`;
      const diaVencimento =
        vencimentoCartaoPorNome[nomeCartao] ||
        vencimentoCartaoPorNome.Default;

      const dataFechamentoEstimada = new Date(
        dataBase.getFullYear(),
        dataBase.getMonth(),
        diaVencimento - 7
      );
      const mesOffset = dataBase > dataFechamentoEstimada ? 1 : 0;

      const loteParcelas = Array.from({ length: parcelas }, (_, i) => {
        const dataReferencia = new Date(dataBase);
        dataReferencia.setMonth(dataReferencia.getMonth() + mesOffset + i);
        dataReferencia.setDate(diaVencimento);
        const dataVencimentoFinal = dataReferencia;

        return {
          descricao,
          pessoa,
          cartao: nomeCartao,
          corCartao: corDoCartao,
          valor: parseFloat(valorParcelaNum.toFixed(2)),
          valorTotal: parseFloat(valorTotalNum.toFixed(2)),
          dataCompra: dataBaseISO,
          parcelaAtual: i + 1,
          totalParcelas: parcelas,
          dataVencimento: dataVencimentoFinal.toISOString().split('T')[0],
          pago: false,
          adiantada: false,
          mes: dataVencimentoFinal.getMonth() + 1,
          ano: dataVencimentoFinal.getFullYear(),
          idCompra,
          criadoEm: serverTimestamp(),
        };
      });

      const batch = writeBatch(db);
      loteParcelas.forEach((p) => {
        const docRef = doc(collection(db, `${basePath}/cartoes`));
        batch.set(docRef, p);
      });
      await batch.commit();
    } catch (err) {
      console.error('❌ Erro ao adicionar compra parcelada:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateCartao = async (id, cartao) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const dadosAtualizados = { ...cartao };
      const cartaoRef = doc(db, `${basePath}/cartoes`, id);
      const docSnap = await getDoc(cartaoRef);
      const atual = docSnap.data();

      // 🔹 Reverter antecipação
      if (atual?.adiantada && dadosAtualizados.pago === false) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            global.alertaGlobal?.({
              titulo: 'Reverter antecipação?',
              mensagem:
                'Esta parcela foi antecipada. Deseja desfazer a antecipação e restaurar os dados originais?',
              icone: 'history',
              corIcone: colors.warning,
              botoes: [
                { texto: 'Cancelar', onPress: () => reject('Reversão cancelada.') },
                {
                  texto: 'Sim, reverter',
                  style: 'destructive',
                  onPress: async () => {
                    const dadosRevertidos = {
                      pago: false,
                      adiantada: false,
                      descontoAplicado: 0,
                      valor: atual.valorOriginal || atual.valor,
                      dataPagamento: null,
                      mes: atual.mesOriginal || atual.mes,
                      ano: atual.anoOriginal || atual.ano,
                      atualizadoEm: serverTimestamp(),
                    };
                    await updateDoc(cartaoRef, dadosRevertidos);
                    resolve(true);
                  },
                },
              ],
            });
          }, 100);
        });
      }

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split('T')[0];
      } else if (dadosAtualizados.pago === false && dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(cartaoRef, {
        ...dadosAtualizados,
        valor: parseFloat(dadosAtualizados.valor),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao atualizar cartão:', err);
      setError(err.message);
      throw err;
    }
  };

  const deleteCartao = async (id) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      await deleteDoc(doc(db, `${basePath}/cartoes`, id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleCartaoStatus = async (cartaoId, statusAtual) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const cartaoRef = doc(db, `${basePath}/cartoes`, cartaoId);
      const novoStatus = !statusAtual;
      const dadosAtualizados = {
        pago: novoStatus,
        dataPagamento: novoStatus
          ? new Date().toISOString().split('T')[0]
          : null,
        atualizadoEm: serverTimestamp(),
      };

      await updateDoc(cartaoRef, dadosAtualizados);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // 🔹 Antecipar parcelas (com data e valor opcional)
  const anteciparParcelas = async (idsSelecionados, dataPagamento, valorComDesconto = null) => {
    if (!idsSelecionados?.length || !user) return;
    try {
      const basePath = getBasePath(user);
      const batch = writeBatch(db);
      const [ano, mes, dia] = dataPagamento.split('-').map(Number);
      const data = new Date(ano, mes - 1, dia);
      const mesPagamento = data.getMonth() + 1;
      const anoPagamento = data.getFullYear();

      const atualizados = [];

      for (const id of idsSelecionados) {
        const docRef = doc(db, `${basePath}/cartoes`, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) continue;

        const atual = docSnap.data();
        const valorOriginal = parseFloat(atual.valor) || 0;
        const valorFinal = valorComDesconto ? parseFloat(valorComDesconto) : valorOriginal;
        const descontoAplicado = valorOriginal - valorFinal;

        const novosDados = {
          pago: true,
          adiantada: true,
          dataPagamento,
          mes: mesPagamento,
          ano: anoPagamento,
          valor: valorFinal,
          descontoAplicado,
          atualizadoEm: serverTimestamp(),
        };

        batch.update(docRef, novosDados);
        atualizados.push({ id, ...atual, ...novosDados });
      }

      await batch.commit();
      setCartoes((prev) => {
        const outros = prev.filter((p) => !idsSelecionados.includes(p.id));
        return [...outros, ...atualizados];
      });
    } catch (err) {
      console.error('❌ Erro ao antecipar parcelas:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    cartoes,
    loading,
    error,
    addCartao,
    updateCartao,
    deleteCartao,
    toggleCartaoStatus,
    anteciparParcelas,
  };
};
