// src/components/BotaoStatusPagamento.js
// Botão de "marcar como pago/recebido" — única implementação usada em todo o
// app (TelaPadrao.js e os cards da Agenda Financeira/Central de Avisos, ver
// SPRINT3_DISCOVERY.md). Extraído do que já existia embutido em
// TelaPadrao.js para que qualquer melhoria futura beneficie as duas
// superfícies automaticamente, sem duplicar o botão.
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { vibrarLeve } from '../utils/haptics';

export default function BotaoStatusPagamento({ pago, onPress, style }) {
  return (
    <TouchableOpacity
      style={[
        globalStyles.statusButton,
        { backgroundColor: pago ? colors.entrada + '20' : colors.pending + '20' },
        style,
      ]}
      onPress={(e) => {
        e.stopPropagation?.();
        vibrarLeve();
        onPress?.();
      }}
    >
      <MaterialCommunityIcons
        name={pago ? 'check-circle' : 'calendar-clock-outline'}
        size={16}
        color={pago ? colors.entrada : colors.pending}
      />
    </TouchableOpacity>
  );
}
