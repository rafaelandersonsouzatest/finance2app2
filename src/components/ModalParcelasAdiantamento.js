import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

export default function ModalParcelasAdiantamento({ visivel, aoFechar, parcelasFuturas, aoConfirmar }) {
  const [selecionadas, setSelecionadas] = useState([]);

  useEffect(() => {
    if (visivel) setSelecionadas([]); // reseta seleção ao abrir
  }, [visivel]);

  const toggleSelecao = (id) => {
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const confirmar = () => {
    aoConfirmar(selecionadas);
    aoFechar();
  };

  return (
    <Modal visible={visivel} animationType="fade" transparent onRequestClose={aoFechar}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.titulo}>Selecionar Parcelas para Adiantar</Text>
          <FlatList
            data={parcelasFuturas}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.parcelaItem, selecionadas.includes(item.id) && styles.parcelaSelecionada]}
                onPress={() => toggleSelecao(item.id)}
              >
                <MaterialCommunityIcons
                  name={selecionadas.includes(item.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={selecionadas.includes(item.id) ? colors.primary : colors.textSecondary}
                />
                <Text style={styles.parcelaTexto}>
                  {item.parcelaAtual}/{item.totalParcelas} • Venc: {new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')} • R$ {item.valor.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
          />

          <View style={styles.botoes}>
            <TouchableOpacity style={styles.botaoCancelar} onPress={aoFechar}>
              <Text style={styles.botaoTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botaoConfirmar, { opacity: selecionadas.length > 0 ? 1 : 0.5 }]}
              disabled={selecionadas.length === 0}
              onPress={confirmar}
            >
              <Text style={[styles.botaoTexto, { color: '#fff' }]}>Adiantar ({selecionadas.length})</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  container: { width: '85%', backgroundColor: colors.cardBackground, borderRadius: 12, padding: 16, maxHeight: '80%' },
  titulo: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' },
  parcelaItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 6, backgroundColor: '#222' },
  parcelaSelecionada: { backgroundColor: colors.primary + '30' },
  parcelaTexto: { color: colors.textPrimary, marginLeft: 8 },
  botoes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  botaoCancelar: { flex: 1, marginRight: 8, backgroundColor: '#444', padding: 10, borderRadius: 8, alignItems: 'center' },
  botaoConfirmar: { flex: 1, marginLeft: 8, backgroundColor: colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' },
  botaoTexto: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary },
});
