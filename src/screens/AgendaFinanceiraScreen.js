// src/screens/AgendaFinanceiraScreen.js
// "Agenda Financeira" — não um calendário, mas o lugar que deve se tornar o
// principal ponto em que o usuário entende seu futuro financeiro (ver
// SPRINT3_DISCOVERY.md, seção 4). Duas visões sobre os mesmos dados
// (useEventosFinanceiros): Calendário e Linha do Tempo. Abas locais por
// estado, mesmo padrão já usado em SaidasScreen.js — sem depender de
// @react-navigation/material-top-tabs.
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import CalendarioFinanceiro from '../components/agenda/CalendarioFinanceiro';
import LinhaDoTempoFinanceira from '../components/agenda/LinhaDoTempoFinanceira';

const ABAS = [
  { key: 'calendario', label: 'Calendário' },
  { key: 'linhaDoTempo', label: 'Linha do Tempo' },
];

export default function AgendaFinanceiraScreen() {
  const [abaAtiva, setAbaAtiva] = useState('calendario');

  return (
    <View style={globalStyles.container}>
      <View style={[globalStyles.topTabContainer, { marginTop: 12, paddingHorizontal: 8 }]}>
        {ABAS.map((aba) => (
          <TouchableOpacity
            key={aba.key}
            style={[
              globalStyles.topTabButton,
              abaAtiva === aba.key && globalStyles.topTabButtonActive,
            ]}
            onPress={() => setAbaAtiva(aba.key)}
          >
            <Text
              style={[
                globalStyles.topTabButtonText,
                abaAtiva === aba.key && globalStyles.topTabButtonTextActive,
              ]}
            >
              {aba.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {abaAtiva === 'calendario' ? <CalendarioFinanceiro /> : <LinhaDoTempoFinanceira />}
      </ScrollView>
    </View>
  );
}
