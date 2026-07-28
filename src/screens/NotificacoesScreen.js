import React from 'react';
import PlaceholderMenuScreen from '../components/PlaceholderMenuScreen';

export default function NotificacoesScreen() {
  return (
    <PlaceholderMenuScreen
      icone="bell-outline"
      descricao="Alertas e lembretes do aplicativo."
      itensFuturos={[
        'Contas vencendo',
        'Parcelas',
        'Investimentos',
        'Metas',
        'Lembretes',
      ]}
    />
  );
}
