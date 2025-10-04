import { View, Text } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { useVisibility } from '../contexts/VisibilityContext';

const SecaoCartoes = ({ cartoes = [] }) => {
  const { formatValue } = useVisibility();

  if (!cartoes || cartoes.length === 0) {
    return (
      <View style={[globalStyles.card, globalStyles.mb16]}>
        <Text style={globalStyles.subtitle}>Cartões Emprestados</Text>
        <Text style={globalStyles.noDataText}>Nenhum cartão emprestado neste mês.</Text>
      </View>
    );
  }

  return (
    <View style={[globalStyles.card, globalStyles.mb20]}>
      <Text style={globalStyles.subtitle}>Cartões Emprestados</Text>

      <View style={globalStyles.gap12}>
        {cartoes.map((item, index) => {
          const descricao = item.descricao || 'Compra sem descrição';
          const parcelaAtual = item.parcelaAtual || 1;
          const totalParcelas = item.totalParcelas || 1;
          const pago = item.pago ?? false;

          return (
            <View
              key={`${item.id || 'cartao'}-${index}`}
              style={[
                globalStyles.investmentItem,
                globalStyles.rowBetween,
                globalStyles.alignCenter,
                !pago && globalStyles.itemPendente, // modo fantasma se não pago
              ]}
            >
              {/* Esquerda: título + valor + info do cartão */}
              <View style={globalStyles.flex1}>
                <Text style={globalStyles.listItemTitle}>{descricao}</Text>

                <Text style={[globalStyles.textSecondary, globalStyles.mt2]}>
                  {formatValue(item.valor)}
                </Text>

                <Text style={[globalStyles.textSecondary, globalStyles.mt2]}>
                  {item.cartao} • Parcela {parcelaAtual}/{totalParcelas}
                </Text>
              </View>

              {/* Direita: badge de status */}
              <View
                style={[
                  globalStyles.statusBadge,
                  pago ? globalStyles.statusBadgePaid : globalStyles.statusBadgePending,
                ]}
              >
                <Text style={globalStyles.statusText}>
                  {pago ? 'Pago' : 'Aguardando'}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default SecaoCartoes;
