import React from 'react';
import PlaceholderMenuScreen from '../components/PlaceholderMenuScreen';

export default function AparenciaScreen() {
  return (
    <PlaceholderMenuScreen
      icone="palette-outline"
      descricao="Personalização visual do aplicativo."
      itensFuturos={['Tema claro', 'Tema escuro', 'Automático', 'Personalizações']}
    />
  );
}
