// src/components/planejamento/GerenciarCategoriasModal.js
// Bottom sheet fino em volta de CategoriasManager — acessado a partir do
// atalho "Gerenciar categorias" dentro de CategoriaSelect, para não tirar o
// usuário do formulário que ele estava preenchendo (mesmo padrão de
// GerenciarMembrosModal, aberto a partir de MembroSelect). O mesmo CRUD
// também aparece como tela cheia em CategoriasScreen.js — nenhuma lógica é
// duplicada entre os dois, ambos só embrulham CategoriasManager.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import CategoriasManager from './CategoriasManager';

export default function GerenciarCategoriasModal({ visivel, onFechar }) {
  return (
    <Modal
      isVisible={visivel}
      onBackdropPress={onFechar}
      onBackButtonPress={onFechar}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[globalStyles.modalContainer, { height: '85%', paddingBottom: 0 }]}>
        <View style={globalStyles.modalHeader}>
          <Text style={globalStyles.modalTitle}>Gerenciar Categorias</Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialCommunityIcons name="close-circle" size={28} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
        <CategoriasManager />
      </View>
    </Modal>
  );
}
