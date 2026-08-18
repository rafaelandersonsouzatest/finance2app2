// src/components/ModalCompartilharDespesa.js
// Compartilhar um gasto já existente com conexões aceitas (Etapa 4.6, ver
// COLABORACAO_ARQUITETURA_V1.md seção 4). Escopo desta etapa: só o valor de
// cada participante — a descrição e o valor total vêm sempre do próprio
// gasto (nunca digitados de novo aqui; o servidor também ignora qualquer
// valor total enviado quando `origemLancamentoId` está presente, ver
// functions/divisaoDespesa.js).
import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { vibrarLeve } from '../utils/haptics';
import SeletorConexoes from './SeletorConexoes';
import CampoMonetario from './CampoMonetario';

export default function ModalCompartilharDespesa({
  visible,
  onClose,
  gasto,
  conexoesAceitas,
  membrosSelecionaveis = [],
  compartilhando,
  errorCompartilhar,
  onConfirmar,
}) {
  const [selecionados, setSelecionados] = useState(new Set());
  const [valoresPorUid, setValoresPorUid] = useState({});
  // Membro sem conta (seção 7) — espaço de seleção/valor separado do de
  // conexões, já que `membroId` e `uid` nunca se misturam.
  const [membrosSelecionados, setMembrosSelecionados] = useState(new Set());
  const [valoresPorMembroId, setValoresPorMembroId] = useState({});

  // Reseta a seleção sempre que o modal é reaberto para um gasto diferente —
  // sem isso, valores digitados para um gasto vazariam para o próximo.
  useEffect(() => {
    if (visible) {
      setSelecionados(new Set());
      setValoresPorUid({});
      setMembrosSelecionados(new Set());
      setValoresPorMembroId({});
    }
  }, [visible, gasto?.id]);

  if (!visible || !gasto) return null;

  const valorTotalCentavos = Math.round((Number(gasto.valor) || 0) * 100);

  const toggleParticipante = (uid) => {
    vibrarLeve();
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(uid)) {
        novo.delete(uid);
      } else {
        novo.add(uid);
      }
      return novo;
    });
  };

  const toggleMembro = (membroId) => {
    vibrarLeve();
    setMembrosSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(membroId)) {
        novo.delete(membroId);
      } else {
        novo.add(membroId);
      }
      return novo;
    });
  };

  const somaOutrosCentavos =
    Array.from(selecionados).reduce(
      (soma, uid) => soma + Math.round((Number(valoresPorUid[uid]) || 0) * 100),
      0
    ) +
    Array.from(membrosSelecionados).reduce(
      (soma, id) => soma + Math.round((Number(valoresPorMembroId[id]) || 0) * 100),
      0
    );
  const minhaCotaCentavos = valorTotalCentavos - somaOutrosCentavos;

  const todosComValor =
    (selecionados.size > 0 || membrosSelecionados.size > 0) &&
    Array.from(selecionados).every((uid) => Math.round((Number(valoresPorUid[uid]) || 0) * 100) > 0) &&
    Array.from(membrosSelecionados).every(
      (id) => Math.round((Number(valoresPorMembroId[id]) || 0) * 100) > 0
    );
  const podeConfirmar = todosComValor && minhaCotaCentavos >= 0 && !compartilhando;

  const handleConfirmar = async () => {
    if (!podeConfirmar) return;
    const cotas = [
      ...Array.from(selecionados).map((uid) => ({
        uidParticipante: uid,
        valorCentavos: Math.round((Number(valoresPorUid[uid]) || 0) * 100),
      })),
      ...Array.from(membrosSelecionados).map((membroId) => ({
        membroId,
        valorCentavos: Math.round((Number(valoresPorMembroId[membroId]) || 0) * 100),
      })),
    ];
    try {
      await onConfirmar(cotas);
    } catch (err) {
      // erro já fica em errorCompartilhar, exibido abaixo
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>Compartilhar despesa</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>
            {gasto.descricao || 'Gasto'}
          </Text>
          <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 16 }}>
            R$ {(valorTotalCentavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <SeletorConexoes
              conexoes={conexoesAceitas}
              selecionados={selecionados}
              onToggle={toggleParticipante}
              textoVazio="Você ainda não tem nenhuma conexão aceita. Conecte-se com alguém primeiro em Conexões."
              renderExtra={(c) => (
                <CampoMonetario
                  label="Cota desta pessoa"
                  valor={valoresPorUid[c.usuarioConectadoId] || 0}
                  onChange={(valor) =>
                    setValoresPorUid((atual) => ({ ...atual, [c.usuarioConectadoId]: valor }))
                  }
                  style={{ marginTop: 8 }}
                />
              )}
              membros={membrosSelecionaveis}
              membrosSelecionados={membrosSelecionados}
              onToggleMembro={toggleMembro}
              renderExtraMembro={(m) => (
                <CampoMonetario
                  label="Cota desta pessoa"
                  valor={valoresPorMembroId[m.id] || 0}
                  onChange={(valor) => setValoresPorMembroId((atual) => ({ ...atual, [m.id]: valor }))}
                  style={{ marginTop: 8 }}
                />
              )}
            />
          </ScrollView>

          <View style={{ marginTop: 8, marginBottom: 8 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Sua cota: R$ {(Math.max(minhaCotaCentavos, 0) / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </Text>
            {minhaCotaCentavos < 0 && (
              <Text style={{ color: colors.error, fontSize: 13, marginTop: 4 }}>
                A soma das cotas não pode passar do valor total.
              </Text>
            )}
          </View>

          {!!errorCompartilhar && (
            <Text style={{ color: colors.error, marginBottom: 8 }}>{errorCompartilhar}</Text>
          )}

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.primary,
              paddingVertical: 12,
              borderRadius: 8,
              opacity: podeConfirmar ? 1 : 0.5,
            }}
            onPress={handleConfirmar}
            disabled={!podeConfirmar}
          >
            {compartilhando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Compartilhar</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
