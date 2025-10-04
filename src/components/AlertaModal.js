import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';

export default function AlertaModal({
  visible,
  onClose,
  titulo = 'Atenção',
  mensagem = 'Ocorreu um erro inesperado.',
  icone = 'alert-circle-outline',
  corIcone = colors.expense,
  // ✨ LÓGICA DE BOTÕES CORRIGIDA E RESTAURADA
  // A prop 'botoes' continua existindo para múltiplos botões
  botoes,
  // A prop 'textoBotao' volta a funcionar para o caso simples
  textoBotao = 'Entendi',
}) {
  if (!visible) {
    return null;
  }

  // Determina se deve usar a lógica de múltiplos botões ou o botão único padrão
  const temBotoesCustomizados = botoes && botoes.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons name={icone} size={48} color={corIcone} />
              </View>

              <Text style={styles.titulo}>{titulo}</Text>
              <Text style={styles.mensagem}>{mensagem}</Text>

              {/* Renderização condicional: ou múltiplos botões, ou o botão único */}
              {temBotoesCustomizados ? (
                <View style={styles.botoesContainer}>
                  {botoes.map((botao, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.botao,
                        botao.style === 'destructive' ? styles.botaoDestructive : styles.botaoPrimary,
                        botoes.length > 1 && { flex: 1 }
                      ]}
                      onPress={botao.onPress}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.textoBotao}>{botao.texto}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.botao, styles.botaoPrimary]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.textoBotao}>{textoBotao}</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Estilos com as classes para os botões
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  iconContainer: {
    marginBottom: 16,
  },
  titulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  mensagem: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  botoesContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  botao: {
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    width: '100%', // Garante que o botão único ocupe todo o espaço
  },
  botaoPrimary: {
    backgroundColor: colors.primary,
  },
  botaoDestructive: {
    backgroundColor: colors.error,
  },
  textoBotao: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
