// Administração de cartões cadastrados — diferente de CartoesScreen.js, que
// trata lançamentos/faturas do mês. Hoje não existe nem o conceito de
// "cartão cadastrado" separado de lançamento (ver PROJECT_STATUS.md), então
// esta tela ainda é só estrutura.
import React from 'react';
import PlaceholderMenuScreen from '../components/PlaceholderMenuScreen';

export default function GerenciarCartoesScreen() {
  return (
    <PlaceholderMenuScreen
      icone="credit-card-outline"
      descricao="Administração dos cartões cadastrados."
      itensFuturos={[
        'Cartão padrão',
        'Ordenar cartões',
        'Arquivar cartões',
        'Configurações específicas',
      ]}
    />
  );
}
