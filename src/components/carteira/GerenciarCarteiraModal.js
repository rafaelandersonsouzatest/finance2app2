// src/components/carteira/GerenciarCarteiraModal.js
// Bottom sheet fino em volta de CartoesManager — acessado a partir do
// atalho "Gerenciar cartões" dentro de CartaoSelect, para não tirar o
// usuário do formulário que ele estava preenchendo (mesmo padrão de
// GerenciarCategoriasModal, aberto a partir de CategoriaSelect). O mesmo
// CRUD também aparece como tela cheia em GerenciarCartoesScreen.js —
// nenhuma lógica é duplicada entre os dois, ambos só embrulham CartoesManager.
import { View, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import CartoesManager from './CartoesManager';

export default function GerenciarCarteiraModal({ visivel, onFechar }) {
  return (
    <Modal
      isVisible={visivel}
      onBackdropPress={onFechar}
      onBackButtonPress={onFechar}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[globalStyles.modalContainer, { height: '85%', paddingBottom: 0 }]}>
        <View style={globalStyles.modalHeader}>
          <Text style={globalStyles.modalTitle}>Gerenciar Cartões</Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialCommunityIcons name="close-circle" size={28} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <CartoesManager />
      </View>
    </Modal>
  );
}
