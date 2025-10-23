import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import { vibrarLeve } from '../utils/haptics';

export default function ListItemEmprestimo({ item, onPressItem, onToggleStatus, onAdiantarParcelas }) {
  const { formatValue } = useVisibility();

  const getIconePorCategoria = (categoria) => {
    const icones = { Financiamento: 'car', Pessoal: 'face-man', Eletrônicos: 'laptop' };
    return icones[categoria] || 'wallet';
  };

  // ✨ CORREÇÃO: A mesma função segura para formatar a data
  const formatarDataSegura = (dataString) => {
    if (dataString && typeof dataString === 'string') {
      try {
        return new Date(dataString + 'T00:00:00').toLocaleDateString('pt-BR');
      } catch (e) {
        return 'Data inválida';
      }
    }
    return 'N/D';
  };

  return (
    <TouchableOpacity
      style={globalStyles.listItem}
      onPress={() => {
        vibrarLeve();
        onPressItem(item);
      }}
    >
      <View style={globalStyles.listItemContent}>
        <MaterialCommunityIcons
          name={getIconePorCategoria(item.categoria)}
          size={24}
          color={colors.textPrimary}
          style={globalStyles.listItemIcon}
        />
        <View style={globalStyles.listItemInfo}>
          <Text style={globalStyles.listItemTitle}>
            {item.descricao || 'Sem título'}
          </Text>
          <Text style={globalStyles.listItemSubtitle}>
            {item.pessoa} • {item.parcelaAtual}/{item.totalParcelas} • Venc: {formatarDataSegura(item.dataVencimento)}
          </Text>
          <Text
            style={[
              globalStyles.listItemStatus,
              { color: item.adiantada ? colors.warning : item.pago ? colors.income : colors.pending },
            ]}
          >
            {item.adiantada ? '🚀 Antecipada' : item.pago ? '✓ Paga' : '⏳ Aguardando'}
          </Text>
        </View>
      </View>
      <View style={globalStyles.listItemActions}>
        <Text style={globalStyles.listItemAmount}>
          {formatValue(item.valor ?? 0)}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
          {typeof onAdiantarParcelas === 'function' && (
            <TouchableOpacity
              style={[globalStyles.iconButton, globalStyles.iconButtonWarning, { marginRight: 8 }]}
              onPress={(e) => {
                e.stopPropagation();
                vibrarLeve();
                onAdiantarParcelas(item);
              }}
            >
              <MaterialCommunityIcons name="rocket-launch-outline" size={18} color={colors.pending} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              globalStyles.statusButton,
              { backgroundColor: item.pago ? colors.income + '20' : colors.pending + '20' },
            ]}
            onPress={(e) => {
              e.stopPropagation();
              vibrarLeve();
              onToggleStatus(item.id);
            }}
          >
            <MaterialCommunityIcons
              name={item.pago ? 'check-circle' : 'calendar-clock-outline'}
              size={16}
              color={item.pago ? colors.income : colors.pending}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
