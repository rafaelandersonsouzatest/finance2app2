// src/components/GastoCartaoCard.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { vibrarLeve, vibrarSucesso } from '../utils/haptics';

const GastoCartaoCard = ({
  transacao,
  corCartao = colors.byInstitution.Default,
  onToggleStatus,
  onAdiantar,
  onPressItem,
}) => {
  const parcelas = transacao.totalParcelas || 1;
  const progressoParcelas = parcelas ? ((transacao.parcelaAtual || 0) / parcelas) * 100 : 0;

  const valorParcela = Number(transacao.valor || 0);
  const valorTotalCompra = Number(transacao.valorTotal || valorParcela * parcelas);

  const dataCompraFormatada = transacao.dataCompra
    ? new Date(transacao.dataCompra + 'T00:00:00').toLocaleDateString('pt-BR')
    : '';

  const isParcelaUnica = parcelas === 1;
  const dataVencimentoFormatada = transacao.dataVencimento
    ? new Date(transacao.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')
    : '';

  const nomeCartao = typeof transacao.cartao === 'string'
    ? transacao.cartao
    : transacao.cartao?.nome || '';

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={() => onPressItem?.(transacao)}>
      <View style={[styles.card, { borderLeftColor: corCartao }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cartaoInfo}>
            <MaterialCommunityIcons name="credit-card-outline" size={16} color={corCartao} />
            <Text style={[styles.cartaoNome, { color: corCartao }]}>{nomeCartao}</Text>
          </View>
        </View>

        <Text style={styles.descricao} numberOfLines={2}>{transacao.descricao}</Text>

        <View style={styles.pessoaValorContainer}>
          <View style={styles.pessoaContainer}>
            <MaterialCommunityIcons name="face-man" size={16} color={colors.textTertiary} />
              <Text style={styles.pessoaNome}>
                {transacao.pessoa && typeof transacao.pessoa === 'object'
                  ? transacao.pessoa?.nome
                  : transacao.pessoa}
              </Text>
          </View>

          <View style={styles.valorContainer}>
            <Text style={styles.valorTotal}>R$ {valorParcela.toFixed(2)}</Text>
            {!isParcelaUnica && <Text style={styles.valorLabel}>de R$ {valorTotalCompra.toFixed(2)}</Text>}
          </View>
        </View>

        {!isParcelaUnica && (
          <View style={styles.parcelasContainer}>
            <View style={styles.parcelasInfo}>
              <Text style={styles.parcelasTexto}>Parcela {transacao.parcelaAtual} de {transacao.totalParcelas}</Text>
              <Text style={styles.parcelasProgresso}>{progressoParcelas.toFixed(0)}% concluído</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={[styles.progressFill, { width: `${progressoParcelas}%`, backgroundColor: corCartao }]} />
            </View>
          </View>
        )}

        <View style={styles.valorParcelaContainer}>
          <View style={styles.valorParcelaInfo}>
            <MaterialCommunityIcons name="calendar-outline" size={16} color={colors.primary} />
            <Text style={styles.valorParcelaLabel}>Vencimento desta parcela:</Text>
          </View>
          <Text style={styles.valorParcelaValor}>{dataVencimentoFormatada}</Text>
        </View>

        <View style={styles.footerContainer}>
          <View style={styles.dataCompraContainer}>
            <MaterialCommunityIcons name="shopping-outline" size={14} color={colors.textTertiary} />
            <Text style={styles.dataCompraTexto}>Compra em {dataCompraFormatada}</Text>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {!isParcelaUnica && !transacao.pago && onAdiantar && (
              <TouchableOpacity
                style={[globalStyles.iconButton, globalStyles.iconButtonWarning, { marginRight: 8 }]}
                onPress={(e) => { e.stopPropagation(); vibrarLeve(); onAdiantar?.(transacao); }} // <-- passamos a transacao inteira
              >
                <MaterialCommunityIcons name="rocket-launch-outline" size={16} color={colors.pending} />
              </TouchableOpacity>
            )}

            {transacao.adiantada ? (
              <View style={[styles.statusButton, { backgroundColor: colors.decorativePurple + '20' }]}>
                <MaterialCommunityIcons name="rocket-launch-outline" size={18} color={colors.decorativePurple} />
                <Text style={[styles.statusButtonText, { color: colors.decorativePurple }]}>Antecipada</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: transacao.pago ? colors.income + '20' : colors.pending + '20' }]}
                onPress={(e) => { e.stopPropagation(); vibrarSucesso(); onToggleStatus?.(transacao.id, transacao.pago); }}
              >
                <MaterialCommunityIcons name={transacao.pago ? 'check-circle' : 'calendar-clock-outline'} size={16} color={transacao.pago ? colors.income : colors.pending} />
                <Text style={[styles.statusButtonText, { color: transacao.pago ? colors.income : colors.pending }]}>{transacao.pago ? 'Pago' : 'Aguardando'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default GastoCartaoCard;

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    borderLeftWidth: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cartaoInfo: { flexDirection: 'row', alignItems: 'center' },
  cartaoNome: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  descricao: { color: colors.textPrimary, fontSize: 16, fontWeight: '500', marginBottom: 12, lineHeight: 22 },
  pessoaValorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  pessoaContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  pessoaNome: { color: colors.textTertiary, fontSize: 14, marginLeft: 6 },
  valorContainer: { alignItems: 'flex-end' },
  valorTotal: { color: colors.textPrimary, fontSize: 16, fontWeight: 'bold' },
  valorLabel: { color: colors.textTertiary, fontSize: 12 },
  parcelasContainer: { marginBottom: 12 },
  parcelasInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  parcelasTexto: { color: colors.textPrimary, fontSize: 14, fontWeight: '600' },
  parcelasProgresso: { color: colors.textTertiary, fontSize: 12 },
  progressContainer: { height: 6, backgroundColor: colors.borderLight, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 3 },
  valorParcelaContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.primary + '0F', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12 },
  valorParcelaInfo: { flexDirection: 'row', alignItems: 'center' },
  valorParcelaLabel: { color: colors.primary, fontSize: 14, fontWeight: '500', marginLeft: 6 },
  valorParcelaValor: { color: colors.primary, fontSize: 16, fontWeight: 'bold' },
  footerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: 12, marginTop: 4 },
  dataCompraContainer: { flexDirection: 'row', alignItems: 'center' },
  dataCompraTexto: { color: colors.textTertiary, fontSize: 12, marginLeft: 6 },
  statusButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  statusButtonText: { marginLeft: 6, fontSize: 12, fontWeight: '600' },
});
