// src/components/ModalAdicionarParticipante.js
// Adiciona um novo participante a uma divisão já ativa (Etapa 3.8, seção
// 11.1/11.3, 2026-08-17) — reaproveita SeletorConexoes (conexões + Membros
// sem conta), mas só permite escolher UMA pessoa por vez (o valor sempre sai
// da própria cota do criador, então cada adição é uma decisão isolada).
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import SeletorConexoes from './SeletorConexoes';
import CampoMonetario from './CampoMonetario';
import AreaFormulario from './AreaFormulario';

export default function ModalAdicionarParticipante({
  visible,
  onClose,
  conexoesAceitas,
  membrosSelecionaveis = [],
  minhaCotaDisponivelCentavos,
  adicionando,
  errorAdicionar,
  onConfirmar,
}) {
  const { formatValue } = useVisibility();
  const [uidSelecionado, setUidSelecionado] = useState(null);
  const [membroSelecionado, setMembroSelecionado] = useState(null);
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (visible) {
      setUidSelecionado(null);
      setMembroSelecionado(null);
      setValor(0);
    }
  }, [visible]);

  if (!visible) return null;

  const valorCentavos = Math.round((Number(valor) || 0) * 100);
  const podeConfirmar =
    (uidSelecionado || membroSelecionado) &&
    valorCentavos > 0 &&
    valorCentavos <= minhaCotaDisponivelCentavos &&
    !adicionando;

  const handleConfirmar = async () => {
    if (!podeConfirmar) return;
    try {
      await onConfirmar(
        uidSelecionado
          ? { uidParticipante: uidSelecionado, valorCentavos }
          : { membroId: membroSelecionado, valorCentavos }
      );
    } catch (err) {
      // erro já fica em errorAdicionar, exibido abaixo
    }
  };

  return (
    <Modal statusBarTranslucent navigationBarTranslucent visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>Adicionar participante</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>
          <AreaFormulario>

            <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>
              Disponível na sua cota: {formatValue((minhaCotaDisponivelCentavos || 0) / 100)}
            </Text>

            <SeletorConexoes
              conexoes={conexoesAceitas}
              selecionados={uidSelecionado ? new Set([uidSelecionado]) : new Set()}
              onToggle={(uid) => {
                setMembroSelecionado(null);
                setUidSelecionado((atual) => (atual === uid ? null : uid));
              }}
              textoVazio="Você ainda não tem nenhuma conexão aceita."
              membros={membrosSelecionaveis}
              membrosSelecionados={membroSelecionado ? new Set([membroSelecionado]) : new Set()}
              onToggleMembro={(id) => {
                setUidSelecionado(null);
                setMembroSelecionado((atual) => (atual === id ? null : id));
              }}
            />

            {(uidSelecionado || membroSelecionado) && (
              <CampoMonetario
                label="Cota desta pessoa"
                valor={valor}
                onChange={setValor}
                style={{ marginTop: 8 }}
              />
            )}

            {valorCentavos > minhaCotaDisponivelCentavos && (
              <Text style={{ color: colors.error, fontSize: 13, marginTop: 8 }}>
                Você não tem essa cota disponível.
              </Text>
            )}

            {!!errorAdicionar && (
              <Text style={{ color: colors.error, marginTop: 8 }}>{errorAdicionar}</Text>
            )}

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: colors.primary,
                paddingVertical: 12,
                borderRadius: 8,
                marginTop: 16,
                opacity: podeConfirmar ? 1 : 0.5,
              }}
              onPress={handleConfirmar}
              disabled={!podeConfirmar}
            >
              {adicionando ? (
                <ActivityIndicator color={colors.textOnColor} />
              ) : (
                <Text style={{ color: colors.textOnColor, fontSize: 16, fontWeight: '600' }}>Adicionar</Text>
              )}
            </TouchableOpacity>
          </AreaFormulario>
        </View>
      </View>
    </Modal>
  );
}
