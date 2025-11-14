import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { useVisibility } from '../contexts/VisibilityContext'; // 👈 novo

const SecaoGastos = ({ gastos = [] }) => {
  const { formatValue } = useVisibility(); // 👈 usar o contexto

  const getIconColor = (iconType) => {
    switch (iconType) {
      case 'heart': return colors.iconRed;
      case 'droplet': return colors.iconBlue;
      case 'home': return colors.iconBlue;
      case 'wifi': return colors.iconBlue;
      case 'zap': return colors.iconBlue;
      case 'shield': return colors.iconGreen;
      case 'credit-card': return colors.iconPurple;
      default: return colors.iconBlue;
    }
  };

  const getIconSymbol = (iconType) => {
    switch (iconType) {
      case 'heart': return '❤️';
      case 'droplet': return '💧';
      case 'home': return '🏠';
      case 'wifi': return '📶';
      case 'zap': return '⚡';
      case 'shield': return '🛡️';
      case 'credit-card': return '💳';
      default: return '💰';
    }
  };

  return (
    <View style={[globalStyles.card, globalStyles.mb4]}>
      <Text style={globalStyles.subtitle}>Gastos</Text>

      <View style={globalStyles.gap12}>
        {gastos.length > 0 ? (
          gastos.map((gasto, index) => (
            <View 
              key={`${gasto.name}-${index}`} 
              style={[
                globalStyles.investmentItem,
                globalStyles.rowBetween, 
                globalStyles.alignCenter,
                !gasto.pago && globalStyles.itemPendente
              ]}
            >
              {/* Ícone e informações do gasto */}
              <View style={[globalStyles.row, globalStyles.alignCenter, globalStyles.flex1]}>
                <View 
                  style={[
                    globalStyles.iconContainer,
                    { backgroundColor: getIconColor(gasto.icon) + '20' }
                  ]}
                >
                  <Text style={globalStyles.iconText}>{getIconSymbol(gasto.icon)}</Text>
                </View>

                <View style={[globalStyles.flex1, { marginLeft: 8 }]}>
                  <Text style={globalStyles.listItemTitle}>{gasto.name}</Text>
                  <Text style={[globalStyles.textSecondary, globalStyles.mt2]}>
                    {formatValue(gasto.amount)} {/* 👈 usando o contexto */}
                  </Text>
                </View>
              </View>

              {/* Status visual */}
              <View
                style={[
                  globalStyles.statusBadge,
                  gasto.pago ? globalStyles.statusBadgePaid : globalStyles.statusBadgePending,
                ]}
              >
                <Text style={globalStyles.statusText}>
                  {gasto.pago ? 'Pago' : 'Aguardando'}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={globalStyles.noDataText}>Nenhum gasto fixo para este mês.</Text>
        )}
      </View>
    </View>
  );
};

export default SecaoGastos;
