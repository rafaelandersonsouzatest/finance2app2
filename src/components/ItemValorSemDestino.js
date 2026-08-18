// src/components/ItemValorSemDestino.js
// Lembrete de uma decisão de valor ainda pendente (seção 11.3, 2026-08-17) —
// usado pela Central de Avisos. Reaproveita ModalDecidirDestino com todas as
// opções (devolver/redistribuir/atribuir a outra pessoa) — nunca um atalho
// que só devolve pro criador (feedback do usuário: quer poder mandar pra
// outra pessoa também, não só devolver). Sem "decidir depois" aqui — é
// exatamente o lembrete de que essa decisão já está em aberto.
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import { vibrarLeve } from '../utils/haptics';
import ModalDecidirDestino from './ModalDecidirDestino';

export default function ItemValorSemDestino({
  despesa,
  resolvendo,
  onResolver,
  conexoesAceitas = [],
  membrosSelecionaveis = [],
}) {
  const { formatValue } = useVisibility();
  const [modalAberto, setModalAberto] = useState(false);

  const outrosParticipantesPendentes = (despesa.cotas || []).filter(
    (c) => c.status === 'pendente' && c.participanteId !== despesa.criadoPor
  );
  const idsNaDivisao = new Set((despesa.cotas || []).map((c) => c.participanteId));
  const conexoesDisponiveis = conexoesAceitas.filter((c) => !idsNaDivisao.has(c.usuarioConectadoId));
  const membrosDisponiveis = membrosSelecionaveis.filter((m) => !idsNaDivisao.has(m.id));

  return (
    <>
      <View
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 10,
          padding: 14,
          marginBottom: 10,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={22}
            color={colors.pending}
            style={{ marginRight: 10 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600' }}>
              {despesa.descricao || 'Despesa compartilhada'}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
              {formatValue((despesa.valorSemDestinoCentavos || 0) / 100)} sem destino
            </Text>
          </View>
        </View>

        <View style={{ minHeight: 36, justifyContent: 'center' }}>
          {resolvendo ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                }}
                onPress={() => {
                  vibrarLeve();
                  setModalAberto(true);
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '600' }}>Decidir agora</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ModalDecidirDestino
        visible={modalAberto}
        onClose={() => setModalAberto(false)}
        valorCentavos={despesa.valorSemDestinoCentavos}
        outrosParticipantesPendentes={outrosParticipantesPendentes}
        permiteDecidirDepois={false}
        conexoesAceitas={conexoesDisponiveis}
        membrosSelecionaveis={membrosDisponiveis}
        onEscolher={(destino) => {
          setModalAberto(false);
          if (destino) onResolver(despesa.id, destino);
        }}
      />
    </>
  );
}
