import React from 'react';
import { View, Text } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext'; // 👈 novo

const SecaoEmprestimos = ({ loans = [] }) => {
  const { formatValue } = useVisibility(); // 👈 usar o contexto

  return (
    <View style={[globalStyles.card, globalStyles.mb4]}>
      <Text style={globalStyles.subtitle}>Empréstimos</Text>

      <View style={globalStyles.gap12}>
        {loans.length > 0 ? (
          loans.map((loan, index) => {
            const descricao = loan.description || 'Empréstimo sem nome';
            const parcelaAtual = loan.parcelaAtual ?? '?';
            const totalParcelas = loan.totalParcelas ?? '?';
            const pago = loan.pago ?? false;

            return (
              <View
                key={`${descricao}-${index}`}
                style={[
                  globalStyles.investmentItem,
                  globalStyles.rowBetween, 
                  globalStyles.alignCenter,
                  !pago && globalStyles.itemPendente
                ]}
              >
                {/* Informações principais do empréstimo */}
                <View style={globalStyles.flex1}>
                  <Text style={globalStyles.listItemTitle}>{descricao}</Text>
                  <Text style={[globalStyles.textSecondary, globalStyles.mt2]}>
                    {`Parcela ${parcelaAtual} / ${totalParcelas}`}
                  </Text>
                  <Text style={[globalStyles.textSecondary, globalStyles.mt2]}>
                    {formatValue(loan.amount, { prefix: 'R$ ' })} {/* 👈 usando visibilidade */}
                  </Text>
                </View>

                {/* Status visual */}
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
          })
        ) : (
          <Text style={globalStyles.noDataText}>Nenhum empréstimo encontrado.</Text>
        )}
      </View>
    </View>
  );
};

export default SecaoEmprestimos;
