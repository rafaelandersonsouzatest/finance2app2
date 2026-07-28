import React from 'react';
import PlaceholderMenuScreen from '../components/PlaceholderMenuScreen';

export default function FinanceiroScreen() {
  return (
    <PlaceholderMenuScreen
      icone="cash-multiple"
      descricao="Preferências financeiras do aplicativo."
      itensFuturos={['Moeda', 'Backup', 'Importação', 'Exportação']}
    />
  );
}
