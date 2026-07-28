// src/components/agenda/CalendarioFinanceiro.js
// Primeira visão da Agenda Financeira (ver SPRINT3_DISCOVERY.md, seção 4.1):
// grade mensal com marcação por dia (dia com movimentação = mesmo destaque
// para todos, sem gradiente de intensidade — simplificado a pedido do
// usuário após o teste da Sprint 3; ponto vermelho = há algo vencido naquele
// dia) e lista de eventos do dia selecionado abaixo. Navegação de mês é
// local a este componente — independente do filtro global de mês/ano do
// resto do app, já que aqui o usuário está explorando o calendário, não
// filtrando uma tela.
import React, { useState, useMemo } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { useEventosFinanceiros } from '../../hooks/useEventosFinanceiros';
import { normalizarParaISO } from '../../utils/formatarData';
import ItemEventoFinanceiro from './ItemEventoFinanceiro';
import LegendaCalendario from './LegendaCalendario';

const hojeISO = normalizarParaISO(new Date());

export default function CalendarioFinanceiro() {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [ano, setAno] = useState(hoje.getFullYear());
  const [diaSelecionado, setDiaSelecionado] = useState(hojeISO);

  const { eventosPorDia, loading, toggleStatus, editar, excluir } = useEventosFinanceiros(mes, ano);

  // Mesma cor/opacidade para qualquer dia com movimentação — sem gradiente de
  // intensidade (removido a pedido do usuário: a variação de tons não ficava
  // clara para quem usa pela primeira vez, e não valia a pena manter uma
  // informação que exigiria legenda própria para ser entendida).
  const COR_DIA_COM_EVENTO = `${colors.primary}18`;

  const markedDates = useMemo(() => {
    const marcado = {};

    Object.entries(eventosPorDia).forEach(([data, { eventos }]) => {
      const temVencido = eventos.some((e) => !e.pago && e.data < hojeISO);

      marcado[data] = {
        customStyles: {
          container: { backgroundColor: COR_DIA_COM_EVENTO, borderRadius: 6 },
          text: { color: colors.textPrimary },
        },
        marked: temVencido,
        dotColor: colors.error,
      };
    });

    marcado[diaSelecionado] = {
      ...(marcado[diaSelecionado] || {}),
      customStyles: {
        container: {
          ...(marcado[diaSelecionado]?.customStyles?.container || {}),
          borderWidth: 2,
          borderColor: colors.primary,
          borderRadius: 6,
        },
        text: { color: colors.textPrimary },
      },
    };

    return marcado;
  }, [eventosPorDia, diaSelecionado]);

  const eventosDoDia = eventosPorDia[diaSelecionado]?.eventos || [];

  return (
    <View>
      <Calendar
        current={`${ano}-${String(mes).padStart(2, '0')}-01`}
        onMonthChange={(m) => {
          setMes(m.month);
          setAno(m.year);
        }}
        onDayPress={(dia) => setDiaSelecionado(dia.dateString)}
        markingType="custom"
        markedDates={markedDates}
        firstDay={0}
        theme={{
          backgroundColor: colors.background,
          calendarBackground: colors.background,
          dayTextColor: colors.textPrimary,
          monthTextColor: colors.textPrimary,
          textSectionTitleColor: colors.textSecondary,
          textDisabledColor: colors.textTertiary,
          arrowColor: colors.primary,
          todayTextColor: colors.primary,
        }}
      />

      <LegendaCalendario />

      <View style={styles.separador} />

      {loading ? (
        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <Text style={styles.tituloDia}>
            {new Date(`${diaSelecionado}T00:00:00`).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
            })}
          </Text>

          {eventosDoDia.length === 0 ? (
            <View style={globalStyles.emptyContainer}>
              <Text style={globalStyles.noDataText}>Nenhum evento neste dia.</Text>
            </View>
          ) : (
            eventosDoDia.map((evento) => (
              <ItemEventoFinanceiro
                key={evento.id}
                evento={evento}
                onToggleStatus={toggleStatus}
                onEditar={editar}
                onExcluir={excluir}
              />
            ))
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tituloDia: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  separador: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginTop: 16,
    marginBottom: 16,
  },
});
