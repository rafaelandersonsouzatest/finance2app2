import { View, Text } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext'; 

const MiniResumo = ({
  totalEntradaPrevisto,
  totalGastosPrevisto,
  finalBalancePrevisto,
  totalEntradaRealizado,
  totalGastosRealizado,
  finalBalanceRealizado,
}) => {
  const { formatValue } = useVisibility(); // <-- Usar função do contexto

  // A cor do balanço é baseada no valor REALIZADO
  const balanceColor = finalBalanceRealizado >= 0 ? colors.balance : colors.gasto;

  return (
    <View style={globalStyles.miniResumoContainer}>
      {/* Card de Entradas */}
      <View style={[globalStyles.miniCard, { borderLeftColor: colors.entrada }]}>
        <Text style={globalStyles.miniCardTitle}>Entradas</Text>
        {/* Valor Realizado */}
        <Text style={[globalStyles.miniCardValue, { color: colors.entrada }]}>
          {formatValue(totalEntradaRealizado)}
        </Text>
        {/* Valor Previsto */}
        <Text style={globalStyles.miniCardNote}>
          Previsto: {formatValue(totalEntradaPrevisto)}
        </Text>
      </View>

      {/* Card de Saídas */}
      <View style={[globalStyles.miniCard, { borderLeftColor: colors.gasto }]}>
        <Text style={globalStyles.miniCardTitle}>Saídas</Text>
        <Text style={[globalStyles.miniCardValue, { color: colors.gasto }]}>
          {formatValue(totalGastosRealizado)}
        </Text>
        <Text style={globalStyles.miniCardNote}>
          Previsto: {formatValue(totalGastosPrevisto)}
        </Text>
        {/* Nota extra */}
        <Text style={[globalStyles.miniCardNote, { fontSize: 9, marginTop: 2 }]}>
          (Gastos + Empréstimos)
        </Text>
      </View>

      {/* Card de Balanço */}
      <View style={[globalStyles.miniCard, { borderLeftColor: balanceColor }]}>
        <Text style={globalStyles.miniCardTitle}>Balanço Atual</Text>
        {/* Valor Realizado */}
        <Text style={[globalStyles.miniCardValue, { color: balanceColor }]}>
          {formatValue(finalBalanceRealizado)}
        </Text>
        {/* Valor Previsto */}
        <Text style={globalStyles.miniCardNote}>
          Previsto: {formatValue(finalBalancePrevisto)}
        </Text>
      </View>
    </View>
  );
};

export default MiniResumo;
