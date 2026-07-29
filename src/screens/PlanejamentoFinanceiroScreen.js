// src/screens/PlanejamentoFinanceiroScreen.js
// Hub do módulo Planejamento Financeiro — Categorias é a primeira
// funcionalidade real; Metas Financeiras, Orçamentos e Relatórios entram
// aqui depois, sem precisar reorganizar o Menu do Usuário de novo (mesmo
// princípio do padrão de tela-placeholder da Sprint 2). Ver
// SPRINT4_DISCOVERY.md, seção 13.
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';

const EM_BREVE = ['Metas Financeiras', 'Orçamentos e Limites', 'Relatórios'];

export default function PlanejamentoFinanceiroScreen() {
  const navigation = useNavigation();

  return (
    <View style={[globalStyles.container, { padding: 16 }]}>
      <TouchableOpacity
        style={globalStyles.listItem}
        onPress={() => navigation.navigate('Categorias')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="shape-outline"
            size={22}
            color={colors.textPrimary}
            style={{ marginRight: 12 }}
          />
          <Text style={globalStyles.listItemTitle}>Categorias</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <Text style={[globalStyles.label, { textAlign: 'center', marginTop: 24, marginBottom: 12 }]}>
        Em breve
      </Text>
      {EM_BREVE.map((item) => (
        <View key={item} style={[globalStyles.listItem, { justifyContent: 'flex-start' }]}>
          <MaterialCommunityIcons
            name="clock-outline"
            size={18}
            color={colors.textSecondary}
            style={{ marginRight: 10 }}
          />
          <Text style={globalStyles.listItemTitle}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
