// src/components/agenda/LinhaDoTempoFinanceira.js
// Segunda visão da Agenda Financeira (ver SPRINT3_DISCOVERY.md, seção 4.2):
// lista cronológica dos próximos eventos, agrupados por rótulo relativo
// ("Hoje", "Amanhã", "Em X dias"). Olha só para frente — atrasados já têm um
// lugar próprio na Central de Avisos, para não duplicar o mesmo conteúdo em
// duas telas sem diferenciação.
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { useProximosEventos } from '../../hooks/useEventosFinanceiros';
import ItemEventoFinanceiro from './ItemEventoFinanceiro';

// 14 dias — dentro da janela que useProximosEventos sempre consegue cobrir
// com dados reais (mês atual + mês seguinte), mesmo quando "hoje" cai no
// último dia de um mês curto como fevereiro. Ver SPRINT3_DISCOVERY.md.
const JANELA_DIAS = 14;

function rotuloRelativo(dataISO) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  const diffDias = Math.round((data - hoje) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Amanhã';
  if (diffDias > 1) return `Em ${diffDias} dias`;
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

export default function LinhaDoTempoFinanceira() {
  const { venceHoje, proximosDias, loading, toggleStatus, editar, excluir } =
    useProximosEventos(JANELA_DIAS);
  const eventos = [...venceHoje, ...proximosDias];

  if (loading) {
    return (
      <View style={{ paddingVertical: 32, alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (eventos.length === 0) {
    return (
      <View style={globalStyles.emptyContainer}>
        <Text style={globalStyles.noDataText}>
          Nada previsto para os próximos {JANELA_DIAS} dias.
        </Text>
      </View>
    );
  }

  let dataAnterior = null;

  return (
    <View>
      {eventos.map((evento) => {
        const mostrarRotulo = evento.data !== dataAnterior;
        dataAnterior = evento.data;
        return (
          <View key={evento.id}>
            {mostrarRotulo && (
              <Text style={styles.rotuloSecao}>{rotuloRelativo(evento.data)}</Text>
            )}
            <ItemEventoFinanceiro
              evento={evento}
              onToggleStatus={toggleStatus}
              onEditar={editar}
              onExcluir={excluir}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  rotuloSecao: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
    marginBottom: 6,
  },
});
