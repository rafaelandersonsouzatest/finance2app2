// src/components/ModalDecidirDestino.js
// Escolha de destino para um valor que ficou (ou vai ficar) "sem destino"
// numa divisão de despesa — seção 11.3, 2026-08-17. Reaproveitado em dois
// contextos por ModalGerenciarDivisao.js: (1) no momento de cancelar um
// convite pendente (destino aplicado atomicamente na mesma chamada), e (2)
// para resolver um valor que já ficou sem destino de um cancelamento
// anterior. Puramente apresentacional — quem chama decide o que fazer com o
// `destino` escolhido (ou `null`, se "decidir depois").
// Estendido (2026-08-17) com a opção "novoParticipante": destinar o valor a
// alguém que ainda não fazia parte da divisão, sem precisar devolver para o
// criador primeiro. Reaproveita SeletorConexoes em modo de seleção única.
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import { vibrarLeve } from '../utils/haptics';
import SeletorConexoes from './SeletorConexoes';

const Opcao = ({ icon, label, onPress, disabled }) => (
  <TouchableOpacity
    onPress={() => {
      if (disabled) return;
      vibrarLeve();
      onPress();
    }}
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      opacity: disabled ? 0.4 : 1,
    }}
    disabled={disabled}
  >
    <MaterialCommunityIcons name={icon} size={22} color={colors.primary} style={{ marginRight: 12 }} />
    <Text style={{ color: colors.textPrimary, fontSize: 15, flex: 1 }}>{label}</Text>
  </TouchableOpacity>
);

export default function ModalDecidirDestino({
  visible,
  onClose,
  valorCentavos,
  nomeOrigem,
  outrosParticipantesPendentes = [],
  permiteDecidirDepois = true,
  conexoesAceitas = [],
  membrosSelecionaveis = [],
  onEscolher,
}) {
  const { formatValue } = useVisibility();
  const [escolhendoNovo, setEscolhendoNovo] = useState(false);
  const [uidNovo, setUidNovo] = useState(null);
  const [membroNovo, setMembroNovo] = useState(null);

  useEffect(() => {
    if (visible) {
      setEscolhendoNovo(false);
      setUidNovo(null);
      setMembroNovo(null);
    }
  }, [visible]);

  if (!visible) return null;

  const escolher = (destino) => {
    onEscolher(destino);
    onClose();
  };

  const podeConfirmarNovo = !!(uidNovo || membroNovo);
  const temNovaPessoaDisponivel = conexoesAceitas.length > 0 || membrosSelecionaveis.length > 0;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>
              {escolhendoNovo ? 'Destinar a quem?' : 'O que fazer com este valor?'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
            {formatValue((valorCentavos || 0) / 100)}
            {nomeOrigem ? ` — cota de ${nomeOrigem}` : ''}
          </Text>

          {escolhendoNovo ? (
            <>
              <ScrollView showsVerticalScrollIndicator={false}>
                <SeletorConexoes
                  conexoes={conexoesAceitas}
                  selecionados={uidNovo ? new Set([uidNovo]) : new Set()}
                  onToggle={(uid) => {
                    setMembroNovo(null);
                    setUidNovo((atual) => (atual === uid ? null : uid));
                  }}
                  textoVazio="Você ainda não tem nenhuma conexão aceita disponível."
                  membros={membrosSelecionaveis}
                  membrosSelecionados={membroNovo ? new Set([membroNovo]) : new Set()}
                  onToggleMembro={(id) => {
                    setUidNovo(null);
                    setMembroNovo((atual) => (atual === id ? null : id));
                  }}
                />
              </ScrollView>

              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: colors.primary,
                  paddingVertical: 12,
                  borderRadius: 8,
                  marginTop: 16,
                  opacity: podeConfirmarNovo ? 1 : 0.5,
                }}
                onPress={() =>
                  escolher(
                    uidNovo
                      ? { tipo: 'novoParticipante', uidParticipante: uidNovo }
                      : { tipo: 'novoParticipante', membroId: membroNovo }
                  )
                }
                disabled={!podeConfirmarNovo}
              >
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Confirmar</Text>
              </TouchableOpacity>

              <TouchableOpacity style={{ marginTop: 12 }} onPress={() => setEscolhendoNovo(false)}>
                <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Voltar</Text>
              </TouchableOpacity>
            </>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Opcao
                icon="account-arrow-left-outline"
                label="Devolver para minha cota"
                onPress={() => escolher({ tipo: 'criador' })}
              />
              <Opcao
                icon="account-multiple-outline"
                label="Redistribuir entre os participantes pendentes atuais"
                onPress={() => escolher({ tipo: 'redistribuir' })}
                disabled={outrosParticipantesPendentes.length === 0}
              />
              {outrosParticipantesPendentes.map((p) => (
                <Opcao
                  key={p.participanteId}
                  icon="account-arrow-right-outline"
                  label={`Atribuir a ${p.nomeExibicao || 'participante'}`}
                  onPress={() => escolher({ tipo: 'participante', participanteId: p.participanteId })}
                />
              ))}
              <Opcao
                icon="account-plus-outline"
                label="Destinar a uma pessoa nova"
                onPress={() => setEscolhendoNovo(true)}
                disabled={!temNovaPessoaDisponivel}
              />
              {permiteDecidirDepois && (
                <Opcao icon="clock-outline" label="Decidir depois" onPress={() => escolher(null)} />
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}
