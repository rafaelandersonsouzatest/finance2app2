import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';

// Componente para renderizar cada linha da lista de parcelas
const ParcelaItem = ({ item }) => {
  const isPago = item.pago;
  const isAdiantada = item.adiantada;
  let statusIcon = "calendar-clock-outline";
  let statusColor = colors.pending;
  let statusText = "Pendente";
  let dateText = `Vence em: ${new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}`;

  if (isAdiantada) {
    statusIcon = "rocket-launch-outline";
    statusColor = colors.chartPurple; // Usando uma cor roxa para adiantado
    statusText = "Adiantada";
    dateText = `Paga em: ${item.dataPagamento ? new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data não registrada'}`;
  } else if (isPago) {
    statusIcon = "check-circle-outline";
    statusColor = colors.balance;
    statusText = "Paga";
    dateText = `Paga em: ${item.dataPagamento ? new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Data não registrada'}`;
  }

  return (
    <View style={[styles.parcelaItemContainer, { borderLeftColor: statusColor }]}>
      <View style={styles.parcelaInfo}>
        <Text style={styles.parcelaNumero}>
          Parcela {item.parcelaAtual}/{item.totalParcelas}
        </Text>
        <Text style={styles.parcelaData}>{dateText}</Text>
      </View>
      <View style={styles.parcelaStatus}>
        <MaterialCommunityIcons name={statusIcon} size={20} color={statusColor} />
        <Text style={[styles.parcelaStatusText, { color: statusColor }]}>{statusText}</Text>
      </View>
    </View>
  );
};

// Componente principal do Modal
export default function ModalHistoricoParcelas({ visible, onClose, item }) {
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Só busca os dados se o modal estiver visível e tiver um item válido
    if (visible && item?.idCompra && item?.collectionName) {
      const fetchParcelas = async () => {
        setLoading(true);
        setError(null);
        setParcelas([]); // Limpa parcelas anteriores

        try {
          // Cria a query para buscar todos os documentos com o mesmo idCompra
          const q = query(
            collection(db, item.collectionName),
            where('idCompra', '==', item.idCompra),
            orderBy('parcelaAtual', 'asc') // Ordena pela parcela
          );

          const querySnapshot = await getDocs(q);
          const dados = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          setParcelas(dados);
        } catch (err) {
          console.error("Erro ao buscar histórico de parcelas:", err);
          setError("Não foi possível carregar o histórico. Tente novamente.");
        } finally {
          setLoading(false);
        }
      };

      fetchParcelas();
    }
  }, [visible, item]);

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />;
    }
    if (error) {
      return <Text style={globalStyles.noDataText}>{error}</Text>;
    }
    if (parcelas.length === 0) {
      return <Text style={globalStyles.noDataText}>Nenhuma parcela encontrada.</Text>;
    }
    return (
      <FlatList
        data={parcelas}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ParcelaItem item={item} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle} numberOfLines={2}>
              Histórico da Compra
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          {/* Subtítulo com a descrição da compra */}
          <Text style={[globalStyles.modalSubtitle, { marginTop: -10, marginBottom: 15 }]}>
            {item?.descricao || ''}
          </Text>
          
          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}

// Estilos específicos para este modal
const styles = StyleSheet.create({
  parcelaItemContainer: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  parcelaInfo: {
    flex: 1,
  },
  parcelaNumero: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  parcelaData: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  parcelaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  parcelaStatusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
});
