import { View, Text, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { montarDescricaoEvento, ICONE_POR_ACAO } from '../utils/linhaDoTempoRender';

// 🔹 Só "pago"/"reaberto" ganham cor própria — mesmas cores do resto do app
// para os mesmos status (`colors.balance` = pago/paga, `colors.pending` =
// pendente, ver `ParcelaItem`/`ModalDetalhes.js`). Qualquer outra ação
// (criado, editado, excluído, antecipado etc.) fica com `colors.primary`.
const COR_POR_ACAO = {
  pago: colors.balance,
  reaberto: colors.pending,
};

const formatarDataHora = (timestamp) => {
  if (!timestamp?.toDate) return '';
  const data = timestamp.toDate();
  return (
    data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' +
    data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
};

// =========================================================
// 🔹 Componente único de apresentação da Linha do Tempo (ver ARQUITETURA.md
// seção 18.3) — só recebe eventos já buscados e renderiza. Quem decide o
// filtro (por compra hoje, por conta inteira no futuro) é sempre quem
// chama, nunca este componente — reaproveitável tanto na aba dentro de
// ModalHistoricoParcelas.js quanto numa futura tela de atividade geral.
// =========================================================
export default function LinhaDoTempoEventos({ eventos = [], carregando = false }) {
  if (carregando) {
    return (
      <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 40 }} />
    );
  }

  if (eventos.length === 0) {
    return <Text style={globalStyles.noDataText}>Nenhum evento registrado ainda.</Text>;
  }

  return (
    <View>
      {eventos.map((evento) => (
        <View
          key={evento.id}
          style={{
            flexDirection: 'row',
            paddingVertical: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderLight,
          }}
        >
          <MaterialCommunityIcons
            name={ICONE_POR_ACAO[evento.acao] || 'circle-outline'}
            size={20}
            color={COR_POR_ACAO[evento.acao] || colors.primary}
            style={{ marginRight: 10, marginTop: 2 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 14 }}>
              {montarDescricaoEvento(evento)}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
              {formatarDataHora(evento.criadoEm)}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
