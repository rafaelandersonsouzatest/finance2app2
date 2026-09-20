import React from 'react';
import { View, Text, Image } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { CHANGELOG } from '../config/changelog';

export default function SobreScreen() {
  const nomeApp = Constants.expoConfig?.name || 'Financeiro';
  const versao = Constants.expoConfig?.version || '—';

  // Updates.createdAt só existe quando o app já baixou uma atualização OTA
  // (fica null no Expo Go e na primeira abertura de um APK recém-instalado,
  // que ainda está rodando o bundle embutido no build).
  const ultimaAtualizacao = Updates.createdAt
    ? Updates.createdAt.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const ultimaMudanca = CHANGELOG[0];

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
      <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 12 }}>
        {ultimaAtualizacao
          ? `Atualizado em ${ultimaAtualizacao}`
          : 'Rodando a versão original do instalador'}
      </Text>

      {ultimaMudanca && (
        <View style={{ marginTop: 24, alignSelf: 'stretch' }}>
          <Text style={[globalStyles.headerTitle, { fontSize: 16 }]}>O que mudou</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
            {ultimaMudanca.data} — {ultimaMudanca.texto}
          </Text>
        </View>
      )}

      {/* 🔹 Futuro (ver PROJECT_STATUS.md): changelog completo (lista, não só
          o último item), política de privacidade, termos de uso, contato. */}
    </View>
  );
}
