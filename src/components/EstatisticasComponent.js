import { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext'; // 👈 IMPORTANTE

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const EstatisticasComponent = ({ estatisticas = {} }) => {
  const [expandido, setExpandido] = useState(false);
  const animacao = useRef(new Animated.Value(0)).current;

  const toggleExpandir = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Animated.timing(animacao, {
      toValue: expandido ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    setExpandido(!expandido);
  };

  const rotacaoSeta = animacao.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  // 👇 Usa o hook global de visibilidade
  const { visible, formatValue } = useVisibility();

  // Helpers
  const parseNumero = (v) => {
    if (v == null || v === '') return 0;
    if (typeof v === 'number') return v;
    const s = v.replace(/[^\d.,-]/g, '');
    if (s.includes(',') && s.includes('.')) return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
    if (s.includes(',')) return parseFloat(s.replace(',', '.')) || 0;
    return parseFloat(s) || 0;
  };

  const parseData = (v) => {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    const d = new Date(v);
    if (!isNaN(d)) return d;
    const parts = v.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (parts) {
      const [_, dd, mm, yy] = parts;
      const year = yy.length === 2 ? `20${yy}` : yy;
      return new Date(year, mm - 1, dd);
    }
    return null;
  };

  const formatBRL = (n) =>
    Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (d) => (d ? parseData(d)?.toLocaleDateString('pt-BR') : '--/--');
  const isPago = (i) =>
    i?.pago === true ||
    i?.paid === true ||
    (typeof i?.status === 'string' &&
      /pago|quitado|concluido|concluído/i.test(i.status));

  // Cálculo principal
  const {
    lista = [],
    valorPago: fallbackPago = 0,
    valorEmAberto: fallbackAberto = 0,
    total: fallbackTotal = 0,
    pagos: fallbackPagos = 0,
    emAberto: fallbackEmAberto = 0,
    totalItens: fallbackItens = 0,
  } = estatisticas;

  const calc = useMemo(() => {
    if (!lista?.length) {
      const total = parseNumero(fallbackTotal) || parseNumero(fallbackPago) + parseNumero(fallbackAberto);
      return {
        total,
        valorPago: parseNumero(fallbackPago),
        valorEmAberto: parseNumero(fallbackAberto),
        pagos: fallbackPagos,
        aguardando: fallbackEmAberto,
        totalItens: fallbackItens,
        proximoVencimento: null,
        ultimoPagamento: null,
      };
    }

    let valorPago = 0,
      valorEmAberto = 0,
      pagos = 0,
      aguardando = 0;
    const datasPagas = [],
      datasAguardando = [];

    lista.forEach((i) => {
      const val = parseNumero(i.valor ?? i.amount ?? i.value ?? 0);
      const pago = isPago(i);
      const data = parseData(i.dataPagamento || i.dataVencimento || i.vencimento || i.data);
      if (pago) {
        pagos++;
        valorPago += val;
        if (data) datasPagas.push(data);
      } else {
        aguardando++;
        valorEmAberto += val;
        if (data) datasAguardando.push(data);
      }
    });

    const total = valorPago + valorEmAberto;
    const hoje = new Date();
    const proximoVencimento = datasAguardando.filter((d) => d >= hoje)[0] || null;
    const ultimoPagamento = datasPagas.length
      ? new Date(Math.max(...datasPagas.map((d) => d.getTime())))
      : null;

    return {
      total,
      valorPago,
      valorEmAberto,
      pagos,
      aguardando,
      totalItens: pagos + aguardando,
      proximoVencimento,
      ultimoPagamento,
    };
  }, [lista]);

  const percPago = calc.total ? (calc.valorPago / calc.total) * 100 : 0;
  const todosPagos = calc.aguardando === 0 && calc.totalItens > 0;

  // Dados principais e extras
  const blocosPrincipais = [
    {
      label: 'Total',
      valor: formatValue(calc.total), // 👈 aplica visibilidade
      sub: `${calc.totalItens} itens`,
      icone: 'credit-card-outline',
      cor: colors.chartBlue,
    },
    {
      label: 'Aguardando',
      valor: formatValue(calc.valorEmAberto), // 👈 aplica visibilidade
      sub: `${calc.aguardando} itens`,
      icone: 'clock-outline',
      cor: colors.pending,
    },
    {
      label: 'Pagos',
      valor: formatValue(calc.valorPago), // 👈 aplica visibilidade
      sub: `${calc.pagos} itens`,
      icone: 'check-circle-outline',
      cor: colors.balance,
    },
  ];

  const blocosExtras = [
    {
      label: 'Pago (%)',
      valor: `${Math.round(percPago)}%`,
      icone: 'chart-pie',
      cor: colors.balance,
    },
    {
      label: 'Último pagamento',
      valor: formatDate(calc.ultimoPagamento),
      icone: 'calendar-check-outline',
      cor: colors.iconPurple,
    },
    {
      label: todosPagos ? 'Tudo pago ✅' : 'Próx. vencimento',
      valor: todosPagos ? '' : formatDate(calc.proximoVencimento),
      icone: todosPagos ? 'check-decagram' : 'calendar-month-outline',
      cor: todosPagos ? colors.balance : colors.chartBlue,
    },
  ];

  return (
    <View style={[globalStyles.cardElegant, { paddingVertical: 10 }]}>
      {/* LINHA PRINCIPAL */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 6 }}>
        {blocosPrincipais.map((item, index) => (
          <View key={index} style={{ alignItems: 'center', flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: `${item.cor}25`,
                marginBottom: 4,
              }}
            >
              <MaterialCommunityIcons name={item.icone} size={22} color={item.cor} />
            </View>
            <Text style={{ fontSize: 15, fontWeight: 'bold', color: item.cor }}>
              {item.valor}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.sub}</Text>
            <Text style={{ fontSize: 11, color: colors.textTertiary }}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* EXPANDIDO */}
      {expandido && (
        <View
          style={{
            borderTopWidth: 0.5,
            borderTopColor: colors.borderLight,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingTop: 6,
            marginTop: 6,
          }}
        >
          {blocosExtras.map((item, index) => (
            <View key={index} style={{ alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: `${item.cor}25`,
                  marginBottom: 4,
                }}
              >
                <MaterialCommunityIcons name={item.icone} size={20} color={item.cor} />
              </View>

              {todosPagos && item.label.includes('Tudo pago') ? (
                <View
                  style={{
                    alignItems: 'center',
                    justifyContent: 'center',
                    flex: 1,
                    transform: [{ rotate: '-5deg' }],
                    backgroundColor: colors.balance + '15',
                    borderWidth: 1.5,
                    borderColor: colors.balance,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                  }}
                >
                  <Text
                    style={{
                      color: colors.balance,
                      fontWeight: '800',
                      fontSize: 13,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    TUDO PAGO ✅
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: item.cor }}>
                    {item.valor}
                  </Text>
                  {item.label !== '' && (
                    <Text style={{ fontSize: 11, color: colors.textTertiary }}>
                      {item.label}
                    </Text>
                  )}
                </>
              )}
            </View>
          ))}
        </View>
      )}

      {/* BOTÃO EXPANDIR */}
      <TouchableOpacity
        onPress={toggleExpandir}
        style={{ alignItems: 'center', marginTop: 4 }}
        activeOpacity={0.7}
      >
        <Animated.View style={{ transform: [{ rotate: rotacaoSeta }] }}>
          <MaterialCommunityIcons name="chevron-down" size={20} color={colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

export default EstatisticasComponent;
