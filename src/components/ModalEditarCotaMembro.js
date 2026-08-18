// src/components/ModalEditarCotaMembro.js
// Editar a cota de um Membro sem conta (seção 7) numa divisão ativa —
// diferente de ModalProporAlteracao: sem consentimento (não há ninguém pra
// concordar) e sem "destino" pro valor liberado, porque o ajuste é sempre
// absorvido direto na cota do criador (atualizarDivisaoDespesa, seção 11.3).
// Quem chama já garante que só abre enquanto isso ainda for editável (mesma
// trava do backend: nenhum participante com conta pode ter aceitado ainda).
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import CampoMonetario from './CampoMonetario';

export default function ModalEditarCotaMembro({
  visible,
  onClose,
  participante,
  minhaCotaDisponivelCentavos,
  editando,
  errorEditar,
  onConfirmar,
}) {
  const { formatValue } = useVisibility();
  const [valor, setValor] = useState(0);

  useEffect(() => {
    if (visible && participante) {
      setValor((participante.valorCentavos || 0) / 100);
    }
  }, [visible, participante?.participanteId]);

  if (!visible || !participante) return null;

  const valorCentavos = Math.round((Number(valor) || 0) * 100);
  const delta = valorCentavos - (participante.valorCentavos || 0); // >0 tira da minha cota; <0 devolve
  const excedeMinhaCota = delta > 0 && delta > minhaCotaDisponivelCentavos;
  const podeConfirmar = valorCentavos > 0 && delta !== 0 && !excedeMinhaCota && !editando;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>Editar cota</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>{participante.nomeExibicao}</Text>
          <Text style={{ color: colors.textPrimary, marginBottom: 16 }}>
            Cota atual: {formatValue((participante.valorCentavos || 0) / 100)}
          </Text>

          <CampoMonetario label="Nova cota" valor={valor} onChange={setValor} />

          <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
            {delta > 0
              ? `${formatValue(delta / 100)} sai da sua própria cota.`
              : delta < 0
                ? `${formatValue(-delta / 100)} volta pra sua própria cota.`
                : 'Escolha um valor diferente do atual.'}
          </Text>
          {excedeMinhaCota && (
            <Text style={{ color: colors.error, fontSize: 13, marginTop: 4 }}>
              Você não tem essa cota disponível.
            </Text>
          )}

          {!!errorEditar && <Text style={{ color: colors.error, marginTop: 8 }}>{errorEditar}</Text>}

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
            onPress={() => podeConfirmar && onConfirmar(valorCentavos)}
            disabled={!podeConfirmar}
          >
            {editando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Salvar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
