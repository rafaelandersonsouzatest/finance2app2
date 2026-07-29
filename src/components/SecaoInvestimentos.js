import { View, Text } from 'react-native';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { useVisibility } from '../contexts/VisibilityContext'; // 👈 novo
import { calcularProgressoMeta, corProgressoMeta } from '../utils/metas';

const SecaoInvestimentos = ({ investimentos = [] }) => {
  const { formatValue } = useVisibility(); // 👈 usar o contexto

  if (!investimentos || investimentos.length === 0) {
    return (
      <View style={[globalStyles.card, globalStyles.mb16]}>
        <Text style={globalStyles.subtitle}>Investimentos</Text>
        <Text style={globalStyles.noDataText}>Nenhum investimento cadastrado.</Text>
      </View>
    );
  }

  return (
    <View style={[globalStyles.card, globalStyles.mb4]}>
      <Text style={globalStyles.subtitle}>Investimentos</Text>

      <View style={globalStyles.gap16}>
        {investimentos.map((investment, index) => {
          const progress = calcularProgressoMeta(investment.valorAtual, investment.meta);
          const progressColor = corProgressoMeta(progress);

          return (
            <View key={`${investment.id || 'inv'}-${index}`} style={globalStyles.investmentItem}>
              {investment.nome && (
                <Text style={globalStyles.investmentName}>
                  {investment.nome}
                </Text>
              )}

              <View style={[globalStyles.rowBetween, globalStyles.alignCenter]}>
                <Text style={[globalStyles.textSecondary, { color: colors.textPrimary }]}>
                  {formatValue(investment.valorAtual)} {/* 👈 usando visibilidade */}
                </Text>
                {(Number(investment.meta) || 0) > 0 && (
                  <Text style={globalStyles.textSecondary}>
                    Meta: {formatValue(investment.meta)} {/* 👈 usando visibilidade */}
                  </Text>
                )}
              </View>

              {(Number(investment.meta) || 0) > 0 && (
                <View style={globalStyles.progressBackground}>
                  <View
                    style={[
                      globalStyles.progressFill,
                      { width: `${progress}%`, backgroundColor: progressColor },
                    ]}
                  />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SecaoInvestimentos;
