import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import AlertaModal from '../components/AlertaModal';
import { useDateFilter } from '../contexts/DateFilterContext';
import {
  useIncomes,
  useFixedExpenses,
  useLoans,
  useInvestments,
  useCartoesEmprestados,
} from '../hooks/useFirestore';
import TelaPadrao from '../components/TelaPadrao';
import SecaoEntradas from '../components/SecaoEntradas';
import SecaoGastosFixos from '../components/SecaoGastosFixos';
import SecaoEmprestimos from '../components/SecaoEmprestimos';
import SecaoInvestimentos from '../components/SecaoInvestimentos';
import SecaoCartoes from '../components/SecaoCartoes';
import MiniResumo from '../components/MiniResumo';

// ======================================================
// 🔹 COMPONENTE PRINCIPAL
// ======================================================
const ResumoMensal = () => {
  const [alerta, setAlerta] = useState({ visivel: false });
  const { selectedMonth, selectedYear } = useDateFilter();

  const { incomes, error: incomesError } = useIncomes(selectedMonth, selectedYear);
  const { fixedExpenses, error: fixedExpensesError } = useFixedExpenses(selectedMonth, selectedYear);
  const { loans, error: loansError } = useLoans(selectedMonth, selectedYear);
  const { investments, error: investmentsError } = useInvestments();
  const { cartoes, error: cartoesError } = useCartoesEmprestados(selectedMonth, selectedYear);

  useEffect(() => {
    const errors = [
      incomesError,
      fixedExpensesError,
      loansError,
      investmentsError,
      cartoesError,
    ].filter(Boolean);

    if (errors.length > 0) {
      setAlerta({
        visivel: true,
        titulo: 'Erro ao carregar dados',
        mensagem: 'Ocorreu um problema ao buscar as informações. Verifique sua conexão.',
        icone: 'wifi-off',
        corIcone: colors.error,
        textoBotao: 'Entendi',
      });
    }
  }, [incomesError, fixedExpensesError, loansError, investmentsError, cartoesError]);


  // ======================================================
  // ✅ CÁLCULOS ATUALIZADOS (Realizado vs. Previsto)
  // ======================================================

  // --- PREVISTO (Soma todos os itens do mês) ---
  const totalIncomePrevisto = incomes.reduce((sum, income) => sum + (income.valor || 0), 0);
  const totalFixedExpensesPrevisto = fixedExpenses.reduce(
    (sum, expense) => sum + (expense.valor || 0),
    0
  );
  const totalLoansPrevisto = loans.reduce((sum, loan) => sum + (loan.valor || 0), 0);
  const totalCartoesPrevisto = cartoes.reduce((sum, c) => sum + (c.valor || 0), 0);

  const totalExpensesPrevisto =
    totalFixedExpensesPrevisto + totalLoansPrevisto + totalCartoesPrevisto;
  const finalBalancePrevisto = totalIncomePrevisto - totalExpensesPrevisto;

  // --- REALIZADO (Soma apenas os itens com 'pago: true') ---
  const totalIncomeRealizado = incomes
    .filter((item) => item.pago === true)
    .reduce((sum, income) => sum + (income.valor || 0), 0);

  const totalFixedExpensesRealizado = fixedExpenses
    .filter((item) => item.pago === true)
    .reduce((sum, expense) => sum + (expense.valor || 0), 0);

  const totalLoansRealizado = loans
    .filter((item) => item.pago === true)
    .reduce((sum, loan) => sum + (loan.valor || 0), 0);

  const totalCartoesRealizado = cartoes
    .filter((item) => item.pago === true)
    .reduce((sum, c) => sum + (c.valor || 0), 0);

  const totalExpensesRealizado =
    totalFixedExpensesRealizado + totalLoansRealizado + totalCartoesRealizado;
  const finalBalanceRealizado = totalIncomeRealizado - totalExpensesRealizado;

return (
  <>
    <TelaPadrao titulo="Resumo Mensal" tipo="resumo">
      <>
        <View style={globalStyles.mb16}>
          <MiniResumo
            totalIncomePrevisto={totalIncomePrevisto}
            totalExpensesPrevisto={totalExpensesPrevisto}
            finalBalancePrevisto={finalBalancePrevisto}
            totalIncomeRealizado={totalIncomeRealizado}
            totalExpensesRealizado={totalExpensesRealizado}
            finalBalanceRealizado={finalBalanceRealizado}
          />
        </View>

        <View style={globalStyles.mb30}>
          <SecaoEntradas incomes={incomes} />
        </View>

        <View style={globalStyles.mb30}>
          <SecaoGastosFixos
            expenses={fixedExpenses.map((expense) => ({
              name: expense.nome || expense.name || expense.descricao,
              icon: expense.icone || expense.icon,
              amount: expense.valor || expense.amount,
              pago: expense.pago ?? false,
            }))}
          />
        </View>

        <View style={globalStyles.mb30}>
          <SecaoEmprestimos
            loans={loans.map((loan) => ({
              description: loan.descricao || 'Empréstimo sem nome',
              amount: loan.valor || 0,
              parcelaAtual: loan.parcelaAtual || 1,
              totalParcelas: loan.totalParcelas || 1,
              pago: loan.pago ?? false,
            }))}
          />
        </View>

        <View style={globalStyles.mb30}>
          <SecaoCartoes cartoes={cartoes} />
        </View>

        <View style={globalStyles.mb12}>
          <SecaoInvestimentos investments={investments} />
        </View>
      </>
    </TelaPadrao>

    <AlertaModal
      visible={alerta.visivel}
      onClose={() => setAlerta({ visivel: false })}
      {...alerta}
    />
  </>
);
};
export default ResumoMensal;