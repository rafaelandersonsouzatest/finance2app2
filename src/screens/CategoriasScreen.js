// src/screens/CategoriasScreen.js
// Tela cheia de Categorias — primeira funcionalidade do módulo Planejamento
// Financeiro (ver PlanejamentoFinanceiroScreen.js e SPRINT4_DISCOVERY.md).
// Só embrulha CategoriasManager num container de tela — o CRUD em si é
// compartilhado com o atalho "Gerenciar categorias" (GerenciarCategoriasModal).
import React from 'react';
import { View } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import CategoriasManager from '../components/planejamento/CategoriasManager';

export default function CategoriasScreen() {
  return (
    <View style={globalStyles.container}>
      <CategoriasManager />
    </View>
  );
}
