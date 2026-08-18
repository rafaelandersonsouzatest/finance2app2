// src/screens/CentralAvisosScreen.js
// Central de Avisos in-app (ver SPRINT3_DISCOVERY.md, seção 5): três blocos
// fixos, sem nenhuma configuração de usuário nesta primeira versão. Mesma
// fonte de dados da Agenda Financeira (useProximosEventos).
import React from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useProximosEventos } from '../hooks/useEventosFinanceiros';
import ItemEventoFinanceiro from '../components/agenda/ItemEventoFinanceiro';
import ItemConviteDivisao from '../components/ItemConviteDivisao';
import ItemPropostaAlteracao from '../components/ItemPropostaAlteracao';
import ItemValorSemDestino from '../components/ItemValorSemDestino';
import AlertaModal from '../components/AlertaModal';
import ModalEditorParcelas from '../components/ModalEditorParcelas';
import { useDivisaoDespesaContext } from '../contexts/DivisaoDespesaContext';

const JANELA_DIAS = 7;

// `renderItem` (opcional) — permite reaproveitar o mesmo bloco "título + lista
// + texto vazio" para um tipo de item diferente de evento financeiro (ver
// seção "Convites de divisão de despesa" abaixo, Etapa 4.4). Sem essa prop,
// o comportamento é idêntico ao de antes (ItemEventoFinanceiro).
function Secao({ titulo, eventos, textoVazio, onToggleStatus, onEditar, onExcluir, renderItem }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.tituloSecao}>{titulo}</Text>
      {eventos.length === 0 ? (
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{textoVazio}</Text>
      ) : renderItem ? (
        eventos.map(renderItem)
      ) : (
        eventos.map((evento) => (
          <ItemEventoFinanceiro
            key={evento.id}
            evento={evento}
            onToggleStatus={onToggleStatus}
            onEditar={onEditar}
            onExcluir={onExcluir}
          />
        ))
      )}
    </View>
  );
}

export default function CentralAvisosScreen() {
  const {
    vencidos,
    venceHoje,
    proximosDias,
    loading,
    toggleStatus,
    editar,
    confirmarExcluir,
    alertaExclusao,
    fecharAlertaExclusao,
    editorExclusao,
    fecharEditorExclusao,
    confirmarEditorExclusao,
  } = useProximosEventos(JANELA_DIAS);

  const {
    convitesPendentes,
    respondendoEventoId,
    aceitarConvite,
    recusarConvite,
    propostasPendentes,
    respondendoPropostaId,
    responderProposta,
    despesasComValorSemDestino,
    resolvendoValorSemDestino,
    resolverValorSemDestino,
    conexoesAceitas,
    membrosSelecionaveis,
  } = useDivisaoDespesaContext();

  if (loading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const acoes = { onToggleStatus: toggleStatus, onEditar: editar, onExcluir: confirmarExcluir };

  return (
    <ScrollView style={globalStyles.container} contentContainerStyle={{ padding: 16 }}>
      {/* Convites de divisão de despesa — mesma fonte usada pelo badge do
          sino (DivisaoDespesaContext), nunca uma segunda busca (ver
          COLABORACAO_ARQUITETURA_V1.md). Só aparece quando há pendência: se
          a Colaboração ainda não estiver disponível, convitesPendentes já
          chega vazio (ver DivisaoDespesaContext.js). */}
      {convitesPendentes.length > 0 && (
        <Secao
          titulo="Convites de divisão de despesa"
          eventos={convitesPendentes}
          textoVazio=""
          renderItem={(convite) => (
            <ItemConviteDivisao
              key={convite.id}
              convite={convite}
              respondendo={respondendoEventoId === convite.eventoId}
              onAceitar={aceitarConvite}
              onRecusar={recusarConvite}
              conexoesAceitas={conexoesAceitas}
            />
          )}
        />
      )}

      {/* Propostas de alteração pós-aceite (Etapa 3.9, seção 11.1/11.3) —
          mesma fonte do badge do sino, nunca uma segunda busca. */}
      {propostasPendentes.length > 0 && (
        <Secao
          titulo="Propostas de alteração"
          eventos={propostasPendentes}
          textoVazio=""
          renderItem={(proposta) => (
            <ItemPropostaAlteracao
              key={proposta.id}
              proposta={proposta}
              respondendo={respondendoPropostaId === proposta.id}
              onAceitar={(id) => responderProposta(id, true)}
              onRecusar={(id) => responderProposta(id, false)}
              conexoesAceitas={conexoesAceitas}
            />
          )}
        />
      )}

      {/* Valor "sem destino" de um cancelamento anterior, ainda não decidido
          (seção 11.3) — pedido do usuário: um lembrete aqui além do banner
          dentro de ModalGerenciarDivisao, com todas as opções de destino
          (não só devolver pro criador). */}
      {despesasComValorSemDestino.length > 0 && (
        <Secao
          titulo="Valores sem destino"
          eventos={despesasComValorSemDestino}
          textoVazio=""
          renderItem={(despesa) => (
            <ItemValorSemDestino
              key={despesa.id}
              despesa={despesa}
              resolvendo={resolvendoValorSemDestino}
              onResolver={resolverValorSemDestino}
              conexoesAceitas={conexoesAceitas}
              membrosSelecionaveis={membrosSelecionaveis}
            />
          )}
        />
      )}

      <Secao titulo="Vencidos" eventos={vencidos} textoVazio="Nenhuma pendência vencida." {...acoes} />
      <Secao titulo="Vencem hoje" eventos={venceHoje} textoVazio="Nada vencendo hoje." {...acoes} />
      <Secao
        titulo={`Próximos ${JANELA_DIAS} dias`}
        eventos={proximosDias}
        textoVazio="Nada previsto para os próximos dias."
        {...acoes}
      />

      <AlertaModal visible={alertaExclusao.visivel} onClose={fecharAlertaExclusao} {...alertaExclusao} />
      <ModalEditorParcelas
        visivel={editorExclusao.visivel}
        aoFechar={fecharEditorExclusao}
        aoConfirmar={confirmarEditorExclusao}
        descricao={editorExclusao.descricao}
        totalParcelas={editorExclusao.valoresIniciais.length}
        valoresIniciais={editorExclusao.valoresIniciais}
        bloqueadas={editorExclusao.bloqueadas}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tituloSecao: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
});
