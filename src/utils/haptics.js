import * as Haptics from 'expo-haptics';

// Vibração para ações de sucesso (marcar como pago, salvar)
export const vibrarSucesso = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch (e) {
    console.log("Haptics não disponível neste dispositivo.");
  }
};

// Vibração para ações de alerta ou erro (excluir)
export const vibrarAlerta = () => {
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (e) {
    console.log("Haptics não disponível neste dispositivo.");
  }
};

// Vibração leve para toques gerais (abrir um modal, clicar num botão)
export const vibrarLeve = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch (e) {
    console.log("Haptics não disponível neste dispositivo.");
  }
};

// Vibração de impacto médio
export const vibrarMedio = () => {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  } catch (e) {
    console.log("Haptics não disponível neste dispositivo.");
  }
};
