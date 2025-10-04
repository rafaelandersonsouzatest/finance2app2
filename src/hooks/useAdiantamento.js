import { useState } from 'react';
import { collection, getDocs, query, where, writeBatch, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Alert } from 'react-native';

export const useAdiantamento = (collectionName) => {
  const [modalVisivel, setModalVisivel] = useState(false);
  const [parcelasFuturas, setParcelasFuturas] = useState([]);
  const [loading, setLoading] = useState(false);

  const iniciarAdiantamento = async (item) => {
    if (!item || !item.idCompra) {
        Alert.alert("Erro", "Este item não pode ser adiantado pois não possui um ID de compra agrupador.");
        return;
    }
    setLoading(true);
    try {
      const q = query(
        collection(db, collectionName),
        where('idCompra', '==', item.idCompra)
      );
      const snapshot = await getDocs(q);
      const todasAsParcelas = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      
      const futuras = todasAsParcelas
        .filter((p) => !p.pago)
        .sort((a, b) => a.parcelaAtual - b.parcelaAtual);

      setParcelasFuturas(futuras);
      setModalVisivel(true);
    } catch (error) {
      console.error("Erro ao buscar parcelas para adiantamento:", error);
      Alert.alert("Erro", "Não foi possível buscar as parcelas futuras.");
    } finally {
      setLoading(false);
    }
  };

  const confirmarAdiantamento = async (idsSelecionados) => {
    if (idsSelecionados.length === 0) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      idsSelecionados.forEach((id) => {
        const docRef = doc(db, collectionName, id);
        batch.update(docRef, { 
            pago: true, 
            adiantada: true, 
            atualizadoEm: serverTimestamp() 
        });
      });
      await batch.commit();
      Alert.alert('Sucesso', 'Parcelas adiantadas com sucesso!');
    } catch (error) {
      console.error("Erro detalhado ao tentar adiantar parcelas:", error);
      Alert.alert('Erro', 'Falha ao tentar adiantar as parcelas. Verifique o console para mais detalhes.');
    } finally {
      setLoading(false);
      setModalVisivel(false);
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
  };
};
