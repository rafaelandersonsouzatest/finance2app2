// src/components/ModalProporAlteracao.js
// Propor um novo valor para quem já aceitou a divisão (Etapa 3.9, seção
// 11.1/11.3, 2026-08-17) — nada muda até a pessoa concordar. Se o novo valor
// for MENOR (libera parte da cota dela), pergunta o destino desse valor
// (mesmo ModalDecidirDestino do cancelamento) antes de enviar a proposta; se
// for MAIOR, o acréscimo sai da própria cota do criador, sem precisar de
// destino nenhum.
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import CampoMonetario from './CampoMonetario';
import ModalDecidirDestino from './ModalDecidirDestino';

export default function ModalProporAlteracao({
  visible,
  onClose,
  participante,
  modoRemover = false,
  minhaCotaDisponivelCentavos,
  outrosParticipantesPendentes = [],
  conexoesAceitas = [],
  membrosSelecionaveis = [],
  propondo,
  errorPropor,
  onConfirmar,
}) {
  const { formatValue } = useVisibility();
  const [novoValor, setNovoValor] = useState(0);
  const [destinoAberto, setDestinoAberto] = useState(false);

  useEffect(() => {
    if (visible && participante) {
      setNovoValor(modoRemover ? 0 : (participante.valorCentavos || 0) / 100);
    }
  }, [visible, participante?.participanteId, modoRemover]);

  if (!visible || !participante) return null;

  const novoValorCentavos = modoRemover ? 0 : Math.round((Number(novoValor) || 0) * 100);
  const delta = participante.valorCentavos - novoValorCentavos; // >0 libera; <0 vem do criador
  const acrescimoExcedeCota = delta < 0 && -delta > minhaCotaDisponivelCentavos;
  const podeConfirmar = novoValorCentavos >= 0 && delta !== 0 && !acrescimoExcedeCota && !propondo;

  const enviarProposta = async (destino) => {
    try {
      await onConfirmar(novoValorCentavos, destino);
    } catch (err) {
      // erro já fica em errorPropor, exibido abaixo
    }
  };

  const handlePropor = () => {
    if (!podeConfirmar) return;
    if (delta > 0) {
      // Libera valor — pergunta o destino antes de enviar (pode "decidir
      // depois", ver ModalDecidirDestino).
      setDestinoAberto(true);
      return;
    }
    // Aumento — sempre sai da cota do criador, sem destino nenhum.
    enviarProposta(null);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContainer}>
            <View style={globalStyles.modalHeader}>
              <Text style={globalStyles.modalTitle}>
                {modoRemover ? 'Remover participante' : 'Propor alteração'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>
              {participante.nomeExibicao}
            </Text>
            <Text style={{ color: colors.textPrimary, marginBottom: 16 }}>
              Cota atual: {formatValue((participante.valorCentavos || 0) / 100)}
            </Text>

            {modoRemover ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                Isso envia um pedido pra {participante.nomeExibicao} sair da divisão, liberando a
                cota de {formatValue((participante.valorCentavos || 0) / 100)} — ele(a) precisa
                concordar antes de valer (mesmo fluxo de qualquer alteração de cota).
              </Text>
            ) : (
              <>
                <CampoMonetario label="Nova cota" valor={novoValor} onChange={setNovoValor} />

                {delta < 0 && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                    O acréscimo de {formatValue(-delta / 100)} sai da sua própria cota.
                  </Text>
                )}
                {delta === 0 && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
                    Escolha um valor diferente do atual.
                  </Text>
                )}
              </>
            )}
            {acrescimoExcedeCota && (
              <Text style={{ color: colors.error, fontSize: 13, marginTop: 4 }}>
                Você não tem essa cota disponível.
              </Text>
            )}

            {!!errorPropor && <Text style={{ color: colors.error, marginTop: 8 }}>{errorPropor}</Text>}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: modoRemover ? colors.error : colors.primary,
                paddingVertical: 12,
                borderRadius: 8,
                marginTop: 16,
                opacity: podeConfirmar ? 1 : 0.5,
              }}
              onPress={handlePropor}
              disabled={!podeConfirmar}
            >
              {propondo ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
                  {modoRemover ? 'Enviar pedido de remoção' : 'Propor'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ModalDecidirDestino
        visible={destinoAberto}
        onClose={() => setDestinoAberto(false)}
        valorCentavos={delta > 0 ? delta : 0}
        nomeOrigem={participante.nomeExibicao}
        outrosParticipantesPendentes={outrosParticipantesPendentes}
        conexoesAceitas={conexoesAceitas}
        membrosSelecionaveis={membrosSelecionaveis}
        permiteDecidirDepois
        onEscolher={(destino) => {
          setDestinoAberto(false);
          enviarProposta(destino);
        }}
      />
    </>
  );
}
