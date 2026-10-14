// src/components/FiltroComponent.js
import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Modal, 
  ScrollView, 
  StyleSheet 
} from 'react-native';
import { MaterialCommunityIcons  } from '@expo/vector-icons';
import { colors } from '../styles/colors';

const FiltroComponent = ({ 
  visible, 
  setVisible, 
  opcoes, 
  valorAtual, 
  onSelect, 
  titulo, 
  icone = 'filter-outline' 
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <MaterialCommunityIcons  name={icone} size={24} color={colors.primary} />
            <Text style={styles.modalTitulo}>{titulo}</Text>
          </View>
          
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            {opcoes.map((opcao, index) => (
              <TouchableOpacity
                key={`${opcao}-${index}`}
                style={[
                  styles.modalOpcao,
                  valorAtual === opcao && styles.modalOpcaoSelecionada
                ]}
                onPress={() => {
                  onSelect(opcao);
                  setVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOpcaoTexto,
                  valorAtual === opcao && styles.modalOpcaoTextoSelecionado
                ]}>
                  {opcao}
                </Text>
                {valorAtual === opcao && (
                  <MaterialCommunityIcons  name="check-circle-outline" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalBotaoCancelar}
              onPress={() => setVisible(false)}
            >
              <MaterialCommunityIcons  name="close-outline" size={20} color={colors.error} />
              <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 0,
    width: '85%',
    maxHeight: '75%',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  modalScrollView: {
    maxHeight: 350,
    paddingHorizontal: 20,
  },
  modalOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
    backgroundColor: 'transparent',
  },
  modalOpcaoSelecionada: {
    backgroundColor: colors.primary + '1A',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalOpcaoTexto: {
    fontSize: 16,
    color: colors.textPrimary,
    flex: 1,
  },
  modalOpcaoTextoSelecionado: {
    fontWeight: '600',
    color: colors.primary,
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  modalBotaoCancelar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: colors.error + '1A',
  },
  modalBotaoCancelarTexto: {
    fontSize: 16,
    color: colors.error,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FiltroComponent;

