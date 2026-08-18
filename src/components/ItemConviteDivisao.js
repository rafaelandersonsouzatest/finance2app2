// src/components/ItemConviteDivisao.js
// Card de um convite de divisão de despesa recebido, ainda pendente — usado
// pela Central de Avisos (Etapa 4.4/4.5, ver COLABORACAO_ARQUITETURA_V1.md
// seção 2). Mesmo padrão visual/estrutural de CardSolicitacaoRecebida
// (ConexoesScreen.js): Aceitar/Recusar direto no card, sem modal — decisão
// consistente com o pedido do usuário de não criar telas novas para este
// fluxo. Dados vêm todos de fora (convite + ações), nenhum listener próprio
// (ver ARQUITETURA.md seção 19, "um dono, vários apresentadores").
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import { vibrarLeve } from '../utils/haptics';
import AvatarRenderer from './AvatarRenderer';

// `conexoesAceitas` (opcional) — quem enviou o convite é sempre uma conexão
// já aceita de quem recebeu; usa o mesmo avatarSnapshot já usado em
// SeletorConexoes.js/ModalGerenciarDivisao.js (2026-08-17, feedback do
// usuário: mostrar o avatar sempre que a pessoa é "chamada" na tela).
export default function ItemConviteDivisao({ convite, respondendo, onAceitar, onRecusar, conexoesAceitas = [] }) {
  const { formatValue } = useVisibility();
  const avatar = conexoesAceitas.find((c) => c.usuarioConectadoId === convite.deUsuarioId)?.avatarSnapshot;

  const handleAceitar = () => {
    vibrarLeve();
    onAceitar(convite.eventoId);
  };

  const handleRecusar = () => {
    vibrarLeve();
    onRecusar(convite.eventoId);
  };

  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <AvatarRenderer avatar={avatar} nome={convite.deNome} variante="mini" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
            {convite.descricao || 'Despesa compartilhada'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            {convite.deNome || 'Alguém'} quer dividir com você
          </Text>
        </View>
        <Text style={{ color: colors.gasto, fontSize: 15, fontWeight: '600' }}>
          {formatValue((convite.minhaCotaCentavos || 0) / 100)}
        </Text>
      </View>

      <View style={{ minHeight: 36, justifyContent: 'center' }}>
        {respondendo ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginRight: 8 }}
              onPress={handleRecusar}
            >
              <Text style={{ color: colors.error, fontWeight: '600' }}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
              }}
              onPress={handleAceitar}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
