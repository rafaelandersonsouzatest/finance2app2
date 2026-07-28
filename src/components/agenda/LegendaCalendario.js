// src/components/agenda/LegendaCalendario.js
// Legenda das marcações do Calendário (ver CalendarioFinanceiro.js) — pedida
// pelo usuário após o teste da Sprint 3: as marcações existiam, mas seu
// significado não ficava óbvio para quem usa pela primeira vez.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles/colors';

// Sem gradiente de intensidade (removido a pedido do usuário) — um único
// tom para qualquer dia com movimentação, mesma cor usada em
// CalendarioFinanceiro.js (COR_DIA_COM_EVENTO).
const ITENS = [
  { tipo: 'quadrado', cor: `${colors.primary}18`, label: 'Dia com movimentação' },
  { tipo: 'ponto', cor: colors.error, label: 'Conta vencida' },
  { tipo: 'borda', cor: colors.primary, label: 'Dia selecionado' },
];

export default function LegendaCalendario() {
  return (
    <View style={styles.container}>
      {ITENS.map((item) => (
        <View key={item.label} style={styles.item}>
          {item.tipo === 'ponto' ? (
            <View style={[styles.ponto, { backgroundColor: item.cor }]} />
          ) : item.tipo === 'borda' ? (
            <View style={[styles.quadrado, { borderWidth: 2, borderColor: item.cor }]} />
          ) : (
            <View style={[styles.quadrado, { backgroundColor: item.cor }]} />
          )}
          <Text style={styles.label}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 4,
    gap: 12,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  quadrado: {
    width: 14,
    height: 14,
    borderRadius: 4,
    marginRight: 6,
  },
  ponto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    marginLeft: 3,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
