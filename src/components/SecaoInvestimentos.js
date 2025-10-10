// components/SecaoInvestimentos.js
import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { useVisibility } from '../contexts/VisibilityContext'; // 👈 novo

const SecaoInvestimentos = ({ investments = [] }) => {
  const { formatValue } = useVisibility(); // 👈 usar o contexto

  const getProgressPercentage = (invested, target) => {
    const numInvested = Number(invested) || 0;
    const numTarget = Number(target) || 0;
    if (numTarget === 0) return 0;
    return Math.min((numInvested / numTarget) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage < 33) return colors.expense;
    if (percentage < 66) return colors.pending;
    return colors.balance;
  };

  if (!investments || investments.length === 0) {
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
        {investments.map((investment, index) => {
          const progress = getProgressPercentage(investment.valorAtual, investment.meta);
          const progressColor = getProgressColor(progress);

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
