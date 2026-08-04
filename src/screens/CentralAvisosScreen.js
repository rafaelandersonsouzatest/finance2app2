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
import AlertaModal from '../components/AlertaModal';
import ModalEditorParcelas from '../components/ModalEditorParcelas';

const JANELA_DIAS = 7;

function Secao({ titulo, eventos, textoVazio, onToggleStatus, onEditar, onExcluir }) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.tituloSecao}>{titulo}</Text>
      {eventos.length === 0 ? (
        <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{textoVazio}</Text>
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
