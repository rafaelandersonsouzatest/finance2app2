// src/components/ModalGerenciarDivisao.js
// Gerenciar uma divisão de despesa já existente — seção 11.2/11.3
// (2026-08-17). Substitui a seção "Compartilhado com"/"Encerrar
// compartilhamento" que antes vivia dentro de ModalDetalhes.js (mesmo padrão
// já usado no app pra separar "criar" de "gerenciar o que já existe":
// ModalCriacao/ModalEdicao, ModalHistoricoParcelas). Dados vêm por prop de
// quem já busca (SaidasScreen.js, via DivisaoDespesaContext) — nunca um
// listener próprio (ver ARQUITETURA.md seção 19).
import { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import ModalDecidirDestino from './ModalDecidirDestino';
import ModalAdicionarParticipante from './ModalAdicionarParticipante';
import ModalProporAlteracao from './ModalProporAlteracao';
import ModalEditarCotaMembro from './ModalEditarCotaMembro';
import AvatarRenderer from './AvatarRenderer';

// Mesmas cores já usadas em ConexoesScreen.js pra status positivo/pendente —
// nunca cinza pra tudo (ver ARQUITETURA.md seção 18).
const LEGENDA_STATUS_COTA = {
  pendente: { texto: 'Pendente', cor: colors.pending },
  aceito: { texto: 'Aceito', cor: colors.balance },
  recusado: { texto: 'Recusado', cor: colors.error },
  cancelado: { texto: 'Cancelado', cor: colors.textSecondary },
  expirado: { texto: 'Expirado', cor: colors.textSecondary },
  // Participante com conta cuja cota foi reduzida a R$0 numa proposta aceita
  // (seção 11.3, 2026-08-17) — "excluir" alguém que já aceitou sempre passa
  // por aqui, nunca por remoção direta (é o dinheiro dele).
  removido: { texto: 'Removido', cor: colors.textSecondary },
};

export default function ModalGerenciarDivisao({
  visible,
  onClose,
  despesaCompartilhada,
  conexoesAceitas = [],
  membrosSelecionaveis = [],
  cancelandoConviteId,
  errorCancelarConvite,
  onCancelarConvite,
  resolvendoValorSemDestino,
  errorResolverValorSemDestino,
  onResolverValorSemDestino,
  adicionandoParticipante,
  errorAdicionarParticipante,
  onAdicionarParticipante,
  propondo,
  errorPropor,
  onProporAlteracao,
  editandoCotaMembro,
  errorEditarCotaMembro,
  onEditarCotaMembro,
  removendoMembroId,
  errorRemoverMembro,
  onRemoverParticipanteSemConta,
  encerrando,
  errorEncerrar,
  onEncerrarCompartilhamento,
}) {
  const { formatValue } = useVisibility();
  const [destinoContexto, setDestinoContexto] = useState(null);
  const [modalAdicionarVisivel, setModalAdicionarVisivel] = useState(false);
  // `modo` distingue "editar" (propor um valor novo) de "remover" (propor
  // R$0 — decisão 2026-08-17: excluir alguém com conta sempre passa por
  // consentimento, nunca é direto). Mesmo modal (ModalProporAlteracao),
  // porque no fundo é a mesma proposta — só muda a apresentação.
  const [acaoProposta, setAcaoProposta] = useState(null);
  const [participanteParaEditarMembro, setParticipanteParaEditarMembro] = useState(null);

  if (!visible || !despesaCompartilhada) return null;

  const {
    id: eventoId,
    descricao,
    valorTotalCentavos,
    status,
    criadoPor,
    cotas = [],
    valorSemDestinoCentavos = 0,
  } = despesaCompartilhada;
  const encerrada = status === 'encerrada';
  const participantes = cotas.filter((c) => c.participanteId !== criadoPor);
  const cotaCriador = cotas.find((c) => c.participanteId === criadoPor);
  const minhaCotaDisponivelCentavos = cotaCriador?.valorCentavos || 0;
  // Só quem já é conexão/Membro mas ainda NÃO está na divisão pode ser
  // adicionado — evita a Function rejeitar por "já faz parte".
  const idsNaDivisao = new Set(cotas.map((c) => c.participanteId));
  const conexoesDisponiveis = conexoesAceitas.filter((c) => !idsNaDivisao.has(c.usuarioConectadoId));
  const membrosDisponiveis = membrosSelecionaveis.filter((m) => !idsNaDivisao.has(m.id));
  // Editar a cota de um Membro sem conta nunca toca no valor de quem já
  // aceitou (a diferença fica sempre entre o criador e o Membro) — por isso
  // continua disponível mesmo depois de um aceite real (decisão revista
  // 2026-08-17; a Function só trava essa edição se descrição/valor total
  // também mudarem, o que não é o caso aqui).
  const pendentesExceto = (idExcluido) =>
    cotas.filter(
      (c) => c.status === 'pendente' && c.participanteId !== idExcluido && c.participanteId !== criadoPor
    );

  const abrirDestinoParaCancelar = (cota) => {
    setDestinoContexto({
      modo: 'cancelar',
      participanteId: cota.participanteId,
      nomeOrigem: cota.nomeExibicao,
      valorCentavos: cota.valorCentavos,
      outros: pendentesExceto(cota.participanteId),
    });
  };

  const abrirDestinoParaExcluirMembro = (cota) => {
    setDestinoContexto({
      modo: 'excluirMembro',
      participanteId: cota.participanteId,
      nomeOrigem: cota.nomeExibicao,
      valorCentavos: cota.valorCentavos,
      outros: pendentesExceto(cota.participanteId),
    });
  };

  const abrirDestinoParaResolver = () => {
    setDestinoContexto({
      modo: 'resolver',
      valorCentavos: valorSemDestinoCentavos,
      outros: pendentesExceto(null),
    });
  };

  const handleEscolherDestino = (destino) => {
    if (!destinoContexto) return;
    if (destinoContexto.modo === 'cancelar') {
      onCancelarConvite(destinoContexto.participanteId, destino || undefined);
    } else if (destinoContexto.modo === 'excluirMembro') {
      onRemoverParticipanteSemConta(destinoContexto.participanteId, destino || undefined);
    } else if (destino) {
      onResolverValorSemDestino(destino);
    }
  };

  // Envia a "cota editável" inteira (seção 11.3/Etapa 3.4: atualizarDivisaoDespesa
  // exige o mesmo conjunto de participantes, só os valores podem mudar) — o
  // Membro sendo editado entra com o valor novo, os demais (outro Membro sem
  // conta, ou participante com conta ainda `pendente`) mantêm o valor atual.
  const handleConfirmarEditarMembro = async (novoValorCentavos) => {
    const editaveisAtuais = cotas.filter(
      (c) => c.participanteId !== criadoPor && (c.status === 'pendente' || c.participanteTipo === 'membroSemConta')
    );
    const cotasInput = editaveisAtuais.map((c) => ({
      ...(c.participanteTipo === 'membroSemConta'
        ? { membroId: c.participanteId }
        : { uidParticipante: c.participanteId }),
      valorCentavos:
        c.participanteId === participanteParaEditarMembro.participanteId ? novoValorCentavos : c.valorCentavos,
    }));
    await onEditarCotaMembro({ eventoId, cotas: cotasInput });
    setParticipanteParaEditarMembro(null);
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContainer}>
            <View style={globalStyles.modalHeader}>
              <Text style={globalStyles.modalTitle}>Gerenciar divisão</Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: colors.textSecondary, marginBottom: 4 }}>{descricao}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700', flex: 1 }}>
                {formatValue((valorTotalCentavos || 0) / 100)}
              </Text>
              <Text
                style={{
                  color: encerrada ? colors.textSecondary : colors.balance,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {encerrada ? 'Encerrada' : 'Ativa'}
              </Text>
            </View>

            {valorSemDestinoCentavos > 0 && (
              <TouchableOpacity
                onPress={abrirDestinoParaResolver}
                disabled={resolvendoValorSemDestino}
                style={{
                  backgroundColor: colors.badgePending,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color={colors.pending}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: colors.pending, flex: 1 }}>
                  {formatValue(valorSemDestinoCentavos / 100)} sem destino
                </Text>
                {resolvendoValorSemDestino ? (
                  <ActivityIndicator color={colors.pending} />
                ) : (
                  <Text style={{ color: colors.pending, fontWeight: '600' }}>Decidir agora</Text>
                )}
              </TouchableOpacity>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {participantes.map((p) => {
                const legenda = LEGENDA_STATUS_COTA[p.status] || LEGENDA_STATUS_COTA.pendente;
                const ehMembroSemConta = p.participanteTipo === 'membroSemConta';
                // Só participante COM conta, já `aceito`, sem proposta em
                // andamento, pode receber uma nova proposta — inclusive a de
                // "remover" (novoValorCentavos: 0, decisão 2026-08-17: excluir
                // quem já aceitou sempre passa por consentimento).
                const podePropor =
                  !encerrada &&
                  p.participanteTipo === 'usuario' &&
                  p.status === 'aceito' &&
                  !p.propostaPendenteId;
                // Membro sem conta: editar e excluir são sempre diretos (sem
                // consentimento) enquanto a divisão estiver ativa — nenhum
                // dos dois toca no valor de quem já aceitou.
                const podeEditarMembro = !encerrada && ehMembroSemConta;
                const podeExcluirMembro = !encerrada && ehMembroSemConta;
                const podeAbrirEdicao = podePropor || podeEditarMembro;
                const removendoEste = removendoMembroId === p.participanteId;

                const abrirEdicao = () => {
                  if (podePropor) setAcaoProposta({ participante: p, modo: 'editar' });
                  else if (podeEditarMembro) setParticipanteParaEditarMembro(p);
                };

                // Avatar de quem tem conta (conexão) vem do snapshot já salvo
                // em conexoesAceitas — mesmo dado usado em SeletorConexoes.js.
                // Membro sem conta também tem avatar próprio (seção 7). Sem
                // isso, a pessoa só aparecia pelo nome aqui, mesmo já tendo
                // avatar em qualquer outro lugar do app (2026-08-17, feedback
                // do usuário).
                const avatar = ehMembroSemConta
                  ? membrosSelecionaveis.find((m) => m.id === p.participanteId)?.avatar
                  : conexoesAceitas.find((c) => c.usuarioConectadoId === p.participanteId)?.avatarSnapshot;

                const linha = (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.borderLight,
                    }}
                  >
                    <AvatarRenderer avatar={avatar} nome={p.nomeExibicao} variante="mini" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>
                        {p.nomeExibicao}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                        {formatValue((p.valorCentavos || 0) / 100)}
                      </Text>
                      {/* Sem isso, um Membro sem conta já aceito é
                          indistinguível de um participante real que aceitou
                          (2026-08-17, feedback do usuário). */}
                      {ehMembroSemConta && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <MaterialCommunityIcons
                            name="account-off-outline"
                            size={12}
                            color={colors.textSecondary}
                            style={{ marginRight: 4 }}
                          />
                          <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Sem conta no app</Text>
                        </View>
                      )}
                    </View>
                    {/* Ícone de lápis ANTES do status (2026-08-17, feedback
                        de teste manual: a ordem trocada deixa mais claro que
                        dá pra editar aquela pessoa específica) — mesmo toque
                        de antes, só com um sinal visual claro. */}
                    {podeAbrirEdicao && (
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={18}
                        color={colors.primary}
                        style={{ marginRight: 6 }}
                      />
                    )}
                    {(podePropor || podeExcluirMembro) &&
                      (removendoEste ? (
                        <ActivityIndicator color={colors.error} size="small" style={{ marginRight: 6 }} />
                      ) : (
                        <TouchableOpacity
                          onPress={() =>
                            podePropor
                              ? setAcaoProposta({ participante: p, modo: 'remover' })
                              : abrirDestinoParaExcluirMembro(p)
                          }
                          style={{ marginRight: 6 }}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
                        </TouchableOpacity>
                      ))}
                    {p.propostaPendenteId ? (
                      <Text style={{ color: colors.pending, fontSize: 12, fontWeight: '600', marginRight: 10 }}>
                        Proposta enviada
                      </Text>
                    ) : (
                      <Text style={{ color: legenda.cor, fontSize: 12, fontWeight: '600', marginRight: 10 }}>
                        {legenda.texto}
                      </Text>
                    )}
                    {p.status === 'pendente' &&
                      !encerrada &&
                      (cancelandoConviteId === eventoId ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <TouchableOpacity onPress={() => abrirDestinoParaCancelar(p)}>
                          <MaterialCommunityIcons
                            name="close-circle-outline"
                            size={20}
                            color={colors.error}
                          />
                        </TouchableOpacity>
                      ))}
                  </View>
                );

                return podeAbrirEdicao ? (
                  <TouchableOpacity key={p.participanteId} onPress={abrirEdicao}>
                    {linha}
                  </TouchableOpacity>
                ) : (
                  <View key={p.participanteId}>{linha}</View>
                );
              })}
            </ScrollView>

            {!!errorRemoverMembro && (
              <Text style={{ color: colors.error, marginTop: 8 }}>{errorRemoverMembro}</Text>
            )}

            {!encerrada && (
              <TouchableOpacity
                onPress={() => setModalAdicionarVisivel(true)}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
              >
                <MaterialCommunityIcons name="account-plus-outline" size={18} color={colors.primary} />
                <Text style={{ color: colors.primary, fontSize: 13, fontWeight: '600', marginLeft: 6 }}>
                  Adicionar participante
                </Text>
              </TouchableOpacity>
            )}

            {!!errorCancelarConvite && (
              <Text style={{ color: colors.error, marginTop: 8 }}>{errorCancelarConvite}</Text>
            )}
            {!!errorResolverValorSemDestino && (
              <Text style={{ color: colors.error, marginTop: 8 }}>{errorResolverValorSemDestino}</Text>
            )}
            {!!errorEncerrar && <Text style={{ color: colors.error, marginTop: 8 }}>{errorEncerrar}</Text>}

            {!encerrada && (
              <TouchableOpacity
                onPress={onEncerrarCompartilhamento}
                style={{ marginTop: 16 }}
                disabled={encerrando}
              >
                {encerrando ? (
                  <ActivityIndicator color={colors.error} />
                ) : (
                  <Text
                    style={{ color: colors.error, fontSize: 13, fontWeight: '600', textAlign: 'center' }}
                  >
                    Encerrar compartilhamento
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <ModalDecidirDestino
        visible={!!destinoContexto}
        onClose={() => setDestinoContexto(null)}
        valorCentavos={destinoContexto?.valorCentavos}
        nomeOrigem={destinoContexto?.nomeOrigem}
        outrosParticipantesPendentes={destinoContexto?.outros || []}
        permiteDecidirDepois={destinoContexto?.modo === 'cancelar' || destinoContexto?.modo === 'excluirMembro'}
        conexoesAceitas={conexoesDisponiveis}
        membrosSelecionaveis={membrosDisponiveis}
        onEscolher={handleEscolherDestino}
      />

      <ModalAdicionarParticipante
        visible={modalAdicionarVisivel}
        onClose={() => setModalAdicionarVisivel(false)}
        conexoesAceitas={conexoesDisponiveis}
        membrosSelecionaveis={membrosDisponiveis}
        minhaCotaDisponivelCentavos={minhaCotaDisponivelCentavos}
        adicionando={adicionandoParticipante}
        errorAdicionar={errorAdicionarParticipante}
        onConfirmar={async (dados) => {
          await onAdicionarParticipante({ eventoId, ...dados });
          setModalAdicionarVisivel(false);
        }}
      />

      <ModalProporAlteracao
        visible={!!acaoProposta}
        onClose={() => setAcaoProposta(null)}
        participante={acaoProposta?.participante}
        modoRemover={acaoProposta?.modo === 'remover'}
        minhaCotaDisponivelCentavos={minhaCotaDisponivelCentavos}
        outrosParticipantesPendentes={pendentesExceto(acaoProposta?.participante?.participanteId)}
        conexoesAceitas={conexoesDisponiveis}
        membrosSelecionaveis={membrosDisponiveis}
        propondo={propondo}
        errorPropor={errorPropor}
        onConfirmar={async (novoValorCentavos, destino) => {
          await onProporAlteracao({
            eventoId,
            participanteId: acaoProposta.participante.participanteId,
            novoValorCentavos,
            destino,
          });
          setAcaoProposta(null);
        }}
      />

      <ModalEditarCotaMembro
        visible={!!participanteParaEditarMembro}
        onClose={() => setParticipanteParaEditarMembro(null)}
        participante={participanteParaEditarMembro}
        minhaCotaDisponivelCentavos={minhaCotaDisponivelCentavos}
        editando={editandoCotaMembro}
        errorEditar={errorEditarCotaMembro}
        onConfirmar={handleConfirmarEditarMembro}
      />
    </>
  );
}
