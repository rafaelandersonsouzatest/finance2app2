import React from 'react';
import { View, Text, Image } from 'react-native';
import Constants from 'expo-constants';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';

export default function SobreScreen() {
  const nomeApp = Constants.expoConfig?.name || 'Financeiro';
  const versao = Constants.expoConfig?.version || '—';

  return (
    <View style={[globalStyles.container, { padding: 24, alignItems: 'center' }]}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: 72, height: 72, borderRadius: 16, marginTop: 24, marginBottom: 16 }}
      />
      <Text style={globalStyles.headerTitle}>{nomeApp}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
        Versão {versao}
      </Text>

      {/* 🔹 Futuro (ver PROJECT_STATUS.md): changelog, política de
          privacidade, termos de uso, contato. */}
    </View>
  );
}
