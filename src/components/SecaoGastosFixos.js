import React from 'react';
import { View, Text } from 'react-native';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { useVisibility } from '../contexts/VisibilityContext'; // 👈 novo

const SecaoGastosFixos = ({ expenses = [] }) => {
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
    <View style={globalStyles.card}>
      <Text style={globalStyles.subtitle}>Gastos Fixos</Text>

      <View style={globalStyles.gap12}>
        {expenses.length > 0 ? (
          expenses.map((expense, index) => (
            <View 
              key={`${expense.name}-${index}`} 
              style={[
                globalStyles.investmentItem,
                globalStyles.rowBetween, 
                globalStyles.alignCenter,
                !expense.pago && globalStyles.itemPendente
              ]}
            >
              {/* Ícone e informações do gasto */}
              <View style={[globalStyles.row, globalStyles.alignCenter, globalStyles.flex1]}>
                <View 
                  style={[
                    globalStyles.iconContainer,
                    { backgroundColor: getIconColor(expense.icon) + '20' }
                  ]}
                >
                  <Text style={globalStyles.iconText}>{getIconSymbol(expense.icon)}</Text>
                </View>

                <View style={[globalStyles.flex1, { marginLeft: 8 }]}>
                  <Text style={globalStyles.listItemTitle}>{expense.name}</Text>
                  <Text style={[globalStyles.textSecondary, globalStyles.mt2]}>
                    {formatValue(expense.amount)} {/* 👈 usando o contexto */}
                  </Text>
                </View>
              </View>

              {/* Status visual */}
              <View
                style={[
                  globalStyles.statusBadge,
                  expense.pago ? globalStyles.statusBadgePaid : globalStyles.statusBadgePending,
                ]}
              >
                <Text style={globalStyles.statusText}>
                  {expense.pago ? 'Pago' : 'Aguardando'}
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

export default SecaoGastosFixos;
