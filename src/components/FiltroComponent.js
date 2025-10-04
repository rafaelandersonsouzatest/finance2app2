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
            <MaterialCommunityIcons  name={icone} size={24} color="#2196F3" />
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
                  <MaterialCommunityIcons  name="check-circle-outline" size={20} color="#2196F3" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.modalBotaoCancelar}
              onPress={() => setVisible(false)}
            >
              <MaterialCommunityIcons  name="close-outline" size={20} color="#FF5252" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 0,
    width: '85%',
    maxHeight: '75%',
    shadowColor: '#000',
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
    borderBottomColor: '#333333',
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  modalOpcaoTexto: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  modalOpcaoTextoSelecionado: {
    fontWeight: '600',
    color: '#2196F3',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  modalBotaoCancelar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
  },
  modalBotaoCancelarTexto: {
    fontSize: 16,
    color: '#FF5252',
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default FiltroComponent;

