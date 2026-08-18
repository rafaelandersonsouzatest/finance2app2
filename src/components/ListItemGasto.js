import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';
import { vibrarLeve } from '../utils/haptics';

export default function ListItemGasto({
  item,
  onPressItem,
  onToggleStatus,
  mostrarIconeCompartilhado = false,
  valorSemDestinoPendente = false,
}) {
  const { formatValue } = useVisibility();

  const getIconePorCategoria = (categoria) => {
    const icones = {
      Moradia: 'home-variant-outline',
      Utilidades: 'lightbulb-on-outline',
      Saúde: 'heart-pulse',
      Transporte: 'car-outline',
      Educação: 'school-outline',
      Alimentação: 'silverware-fork-knife',
      Lazer: 'movie-open-outline',
      Conhecimento: 'book-open-page-variant-outline',
    };
    return icones[categoria] || 'cash';
  };

  // ✨ CORREÇÃO: Função segura para formatar a data
const formatarDataSegura = (dataString) => {

  if (!dataString || typeof dataString !== 'string' || dataString.trim() === '') {
    return 'N/D';
  }

  let dataObj;
  const dataLimpa = dataString.trim(); // Remove espaços em branco

  if (/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    dataObj = new Date(dataLimpa + 'T00:00:00');
  } else if (/^\d{2}-\d{2}-\d{4}$/.test(dataLimpa)) {
    const [dia, mes, ano] = dataLimpa.split('-');
    dataObj = new Date(`${ano}-${mes}-${dia}T00:00:00`);
  } else {
    // ✨ ARMADILHA DE DEBUG: Pega formatos inesperados
    console.error(`FORMATO DE DATA INVÁLIDO DETECTADO: '${dataLimpa}'`);
    return 'Formato Inválido';
  }

  if (dataObj && !isNaN(dataObj.getTime())) {
    return dataObj.toLocaleDateString('pt-BR');
  }

  // ✨ ARMADILHA DE DEBUG: Pega casos onde a data é criada mas é inválida
  console.error(`ERRO DE DATA INVÁLIDA APÓS PARSE: '${dataLimpa}'`);
  return 'Data Inválida';
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={globalStyles.listItemTitle}>
              {item.descricao || 'Sem título'}
            </Text>
            {/* Indicação visual de gasto compartilhado (seção 11.1) — aparece
                dos dois lados (quem criou a divisão e quem aceitou o
                convite). Some quando a divisão é encerrada (2026-08-17,
                feedback de teste manual) — decisão calculada por quem já
                busca `despesas` (GastosScreen.js/SaidasScreen.js), nunca
                aqui, que só apresenta (ver ARQUITETURA.md seção 19). Detalhe
                fica em ModalGerenciarDivisao. */}
            {mostrarIconeCompartilhado && (
              <MaterialCommunityIcons
                name="account-multiple-outline"
                size={14}
                color={colors.primary}
                style={{ marginLeft: 6 }}
              />
            )}
            {/* Alerta de valor "sem destino" ainda pendente de decisão nesta
                despesa (seção 11.3) — só o criador vê isso (só ele decide). */}
            {valorSemDestinoPendente && (
              <MaterialCommunityIcons
                name="alert-circle"
                size={14}
                color={colors.pending}
                style={{ marginLeft: 4 }}
              />
            )}
          </View>
          <Text style={globalStyles.listItemSubtitle}>
            {item.categoria} • Venc: {formatarDataSegura(item.dataVencimento)}
          </Text>
          <Text
            style={[
              globalStyles.listItemStatus,
              { color: item.pago ? colors.entrada : colors.pending },
            ]}
          >
            {item.pago ? '✓ Pago' : '⏳ Aguardando'}
          </Text>
        </View>
      </View>
      <View style={globalStyles.listItemActions}>
        <Text style={globalStyles.listItemAmount}>
          {formatValue(item.valor ?? 0)}
        </Text>
        <TouchableOpacity
          style={[
            globalStyles.statusButton,
            { backgroundColor: item.pago ? colors.entrada + '20' : colors.pending + '20' },
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
            color={item.pago ? colors.entrada : colors.pending}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
