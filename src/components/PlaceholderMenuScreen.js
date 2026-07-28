// src/components/PlaceholderMenuScreen.js
// Tela-placeholder compartilhada para categorias do Menu do Usuário que hoje
// só têm "estrutura" (Financeiro, Cartões, Aparência, Notificações — ver
// PROJECT_STATUS.md seção 8). Quando cada área virar funcionalidade de
// verdade, só o conteúdo interno muda — a rota e a entrada no menu continuam
// as mesmas, sem precisar reorganizar navegação.
import React from 'react';
import { View, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';

export default function PlaceholderMenuScreen({ icone, descricao, itensFuturos = [] }) {
  return (
    <View style={[globalStyles.container, { padding: 24, alignItems: 'center' }]}>
      <MaterialCommunityIcons
        name={icone}
        size={48}
        color={colors.textSecondary}
        style={{ marginTop: 24, marginBottom: 16 }}
      />

      {!!descricao && (
        <Text
          style={{
            color: colors.textSecondary,
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          {descricao}
        </Text>
      )}

      {itensFuturos.length > 0 && (
        <View style={{ width: '100%' }}>
          <Text
            style={[
              globalStyles.label,
              { textAlign: 'center', marginBottom: 12 },
            ]}
          >
            Em breve
          </Text>
          {itensFuturos.map((item) => (
            <View
              key={item}
              style={[
                globalStyles.listItem,
                { justifyContent: 'flex-start' },
              ]}
            >
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
      )}
    </View>
  );
}
