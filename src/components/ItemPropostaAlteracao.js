// src/components/ItemPropostaAlteracao.js
// Card de uma proposta de alteração pós-aceite recebida (Etapa 3.9, seção
// 11.1/11.3, 2026-08-17) — usado pela Central de Avisos. Mesmo padrão de
// ItemConviteDivisao.js: Aceitar/Recusar direto no card, sem modal. Dados
// vêm todos de fora (proposta + ações), nenhum listener próprio (ver
// ARQUITETURA.md seção 19).
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import { vibrarLeve } from '../utils/haptics';
import AvatarRenderer from './AvatarRenderer';

// `conexoesAceitas` (opcional) — quem propôs é sempre uma conexão já aceita
// de quem recebeu a proposta (2026-08-17, feedback do usuário: mostrar o
// avatar sempre que a pessoa é "chamada" na tela).
export default function ItemPropostaAlteracao({ proposta, respondendo, onAceitar, onRecusar, conexoesAceitas = [] }) {
  const { formatValue } = useVisibility();
  const avatar = conexoesAceitas.find((c) => c.usuarioConectadoId === proposta.deUsuarioId)?.avatarSnapshot;

  const handleAceitar = () => {
    vibrarLeve();
    onAceitar(proposta.id);
  };

  const handleRecusar = () => {
    vibrarLeve();
    onRecusar(proposta.id);
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
        <AvatarRenderer avatar={avatar} nome={proposta.deNome} variante="mini" />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
            {proposta.descricao || 'Despesa compartilhada'}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            {proposta.deNome || 'Alguém'} propôs mudar sua cota de{' '}
            {formatValue((proposta.valorAtualCentavos || 0) / 100)} para{' '}
            {formatValue((proposta.valorNovoCentavos || 0) / 100)}
          </Text>
        </View>
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
