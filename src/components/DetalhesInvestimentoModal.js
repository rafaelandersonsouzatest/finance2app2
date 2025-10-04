import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import MovimentacaoInvestModal from './MovimentacaoInvestModal';
import AlertaModal from './AlertaModal';
import { vibrarMedio } from '../utils/haptics';
import ModalEdicao from './ModalEdicao';

const ProgressBar = ({ progress, color }) => (
  <View style={globalStyles.progressBarBackground}>
    <View
      style={[
        globalStyles.progressBarFill,
        { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color },
      ]}
    />
  </View>
);

export default function DetalhesInvestimentoModal({
  visible,
  onClose,
  investment,
  onUpdateInvestment,
  onDeleteInvestment,
  addTransaction,        // ✅ recebidas como props
  updateTransaction,     // ✅
  deleteTransaction,     // ✅
}) {
  const [modalMovVisible, setModalMovVisible] = useState(false);
  const [movimentoEmEdicao, setMovimentoEmEdicao] = useState(null);
  const [modalEdicaoVisible, setModalEdicaoVisible] = useState(false);

  const [alerta, setAlerta] = useState({
    visible: false,
    titulo: '',
    mensagem: '',
    icone: 'alert-circle-outline',
    corIcone: colors.expense,
    botoes: [],
  });

  if (!investment) return null;

  const {
    id,
    nome = 'Sem nome',
    valorAtual = 0,
    meta = 0,
    instituicao = 'Sem instituição',
    movimentacoes = [],
  } = investment;

  const valorAtualSeguro = Number(valorAtual ?? 0);
  const metaSegura = Number(meta ?? 0);
  const progresso =
    metaSegura > 0 ? Math.min(valorAtualSeguro / metaSegura, 1) : 0;

  const handleSalvarMovimentacao = async (novaMovimentacao) => {
    if (movimentoEmEdicao) {
      // editar movimentação existente
      await updateTransaction(id, movimentoEmEdicao.id, {
        ...movimentoEmEdicao,
        ...novaMovimentacao,
        valor: Number(novaMovimentacao.valor ?? 0),
      });
      setMovimentoEmEdicao(null);
    } else {
      // adicionar movimentação nova
      await addTransaction(id, {
        ...novaMovimentacao,
        valor: Number(novaMovimentacao.valor ?? 0),
      });
    }
    setModalMovVisible(false);
  };

  const handleLongPress = (mov) => {
    vibrarMedio();
    setAlerta({
      visible: true,
      titulo: 'Opções de Movimentação',
      mensagem: `${mov.descricao || 'Sem descrição'} - R$ ${(Number(
        mov.valor ?? 0
      )).toFixed(2)}`,
      botoes: [
        {
          texto: 'Editar',
          onPress: () => {
            setMovimentoEmEdicao(mov);
            setModalMovVisible(true);
            setAlerta((a) => ({ ...a, visible: false }));
          },
        },
        {
          texto: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(id, mov.id);
            setAlerta((a) => ({ ...a, visible: false }));
          },
        },
        {
          texto: 'Cancelar',
          onPress: () => setAlerta((a) => ({ ...a, visible: false })),
        },
      ],
    });
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContainer}>
            {/* Header */}
            <View style={globalStyles.modalHeader}>
              <Text style={globalStyles.modalTitle}>{nome}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {/* ✏️ Botão para abrir ModalEdicao do investimento */}
                <TouchableOpacity
                  onPress={() => setModalEdicaoVisible(true)}
                  style={{ marginRight: 15 }}
                >
                  <MaterialCommunityIcons
                    name="pencil-circle-outline"
                    size={32}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={32}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={globalStyles.modalSubtitle}>{instituicao}</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text style={globalStyles.modalSectionTitle}>Valor Atual</Text>
              <Text style={globalStyles.modalValorAtual}>
                R${' '}
                {valorAtualSeguro.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}
              </Text>

              {metaSegura > 0 && (
                <>
                  <ProgressBar progress={progresso} color={colors.primary} />
                  <View style={globalStyles.modalProgressLabels}>
                    <Text style={globalStyles.modalMetaText}>
                      Meta: R${' '}
                      {metaSegura.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </Text>
                    <Text style={globalStyles.modalMetaText}>
                      {(progresso * 100).toFixed(1)}%
                    </Text>
                  </View>
                </>
              )}

              <Text style={globalStyles.modalSectionTitle}>
                Histórico de Movimentações
              </Text>
              {movimentacoes.length > 0 ? (
                <FlatList
                  data={[...movimentacoes].reverse()}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity onLongPress={() => handleLongPress(item)}>
                      <View style={globalStyles.listItem}>
                        <MaterialCommunityIcons
                          name={
                            item.tipo === 'Aporte'
                              ? 'arrow-up-circle'
                              : 'arrow-down-circle'
                          }
                          size={28}
                          color={
                            item.tipo === 'Aporte'
                              ? colors.iconGreen
                              : colors.iconRed
                          }
                          style={globalStyles.listItemIcon}
                        />
                        <View style={globalStyles.listItemInfo}>
                          <Text style={globalStyles.listItemTitle}>
                            {item.descricao || 'Sem descrição'}
                          </Text>
                          <Text style={globalStyles.listItemSubtitle}>
                            {item.data
                              ? new Date(item.data).toLocaleDateString(
                                  'pt-BR',
                                  { timeZone: 'UTC' }
                                )
                              : ''}
                          </Text>
                        </View>
                        <Text
                          style={[
                            globalStyles.cardAmount,
                            {
                              color:
                                item.tipo === 'Aporte'
                                  ? colors.income
                                  : colors.expense,
                            },
                          ]}
                        >
                          {item.tipo === 'Aporte' ? '+' : '-'} R${' '}
                          {Number(item.valor ?? 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                  scrollEnabled={false}
                />
              ) : (
                <Text style={globalStyles.noDataText}>
                  Nenhuma movimentação registrada.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={globalStyles.modalBotaoAdd}
              onPress={() => {
                setMovimentoEmEdicao(null);
                setModalMovVisible(true);
              }}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#fff" />
              <Text style={globalStyles.modalBotaoAddTexto}>
                {' '}
                Adicionar Movimentação
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para adicionar/editar movimentação */}
      <MovimentacaoInvestModal
        visible={modalMovVisible}
        onClose={() => {
          setMovimentoEmEdicao(null);
          setModalMovVisible(false);
        }}
        onSave={handleSalvarMovimentacao}
        initialData={movimentoEmEdicao}
        saldoAtual={valorAtualSeguro}
      />

      <AlertaModal
        visible={alerta.visible}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        botoes={alerta.botoes}
        onClose={() => setAlerta((a) => ({ ...a, visible: false }))}
      />

<ModalEdicao
  visivel={modalEdicaoVisible}
  aoFechar={() => setModalEdicaoVisible(false)}
  aoSalvar={async (dados) => {
    // ✅ Corrigido: passa apenas id e dados, conforme assinatura do hook
    await onUpdateInvestment(id, dados);
    setModalEdicaoVisible(false);
  }}
  aoExcluir={async () => {
    await onDeleteInvestment(id);
    setModalEdicaoVisible(false);
    onClose();
  }}
  item={investment}
  tipo="investimento"
  titulo="Editar Investimento"
/>
    </>
  );
}
