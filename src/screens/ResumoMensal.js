import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import AlertaModal from '../components/AlertaModal';
import { useDateFilter } from '../contexts/DateFilterContext';
import {useInvestimentos } from '../hooks/useInvestimentos';
import { useCartoes } from '../hooks/useCartoes';
import { useEntradas } from "../hooks/useEntradas";
import { useGastos } from "../hooks/useGastos";
import { useEmprestimos } from '../hooks/useEmprestimos';
import TelaPadrao from '../components/TelaPadrao';
import SecaoEntradas from '../components/SecaoEntradas';
import SecaoGastos from '../components/SecaoGastos';
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

  const { entradas, error: entradasError } = useEntradas(selectedMonth, selectedYear);
  const { gastos, error: gastosError } = useGastos(selectedMonth, selectedYear);
  const { emprestimos, error: emprestimosError } = useEmprestimos(selectedMonth, selectedYear);
  const { investimentos, error: investimentosError } = useInvestimentos();
  const { cartoes, error: cartoesError } = useCartoes(selectedMonth, selectedYear);

  // ======================================================
  // ⚠️ Tratamento de erros unificado
  // ======================================================
  useEffect(() => {
    const errors = [
      entradasError,
      gastosError,
      emprestimosError,
      investimentosError,
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
  }, [entradasError, gastosError, emprestimosError, investimentosError, cartoesError]);

  // ======================================================
  // ✅ CÁLCULOS ATUALIZADOS (Realizado vs. Previsto)
  // ======================================================

  // --- PREVISTO (Soma todos os itens do mês) ---
  const totalEntradaPrevisto = entradas.reduce(
    (sum, entrada) => sum + (entrada.valor || 0),
    0
  );

  const totalGastosPrevisto = gastos.reduce(
    (sum, gasto) => sum + (gasto.valor || 0),
    0
  );

  const totalEmprestimosPrevisto = emprestimos.reduce(
    (sum, emprestimo) => sum + (emprestimo.valor || 0),
    0
  );

  const totalCartoesPrevisto = cartoes.reduce(
    (sum, c) => sum + (c.valor || 0),
    0
  );

  // Soma geral de todos os tipos de gasto
  const totalGastosPrevistoGeral =
    totalGastosPrevisto + totalEmprestimosPrevisto + totalCartoesPrevisto;

  const finalBalancePrevisto = totalEntradaPrevisto - totalGastosPrevistoGeral;

  // --- REALIZADO (Soma apenas os itens com 'pago: true') ---
  const totalEntradaRealizado = entradas
    .filter((item) => item.pago === true)
    .reduce((sum, entrada) => sum + (entrada.valor || 0), 0);

  const totalGastosRealizado = gastos
    .filter((item) => item.pago === true)
    .reduce((sum, gasto) => sum + (gasto.valor || 0), 0);

  const totalEmprestimosRealizado = emprestimos
    .filter((item) => item.pago === true)
    .reduce((sum, emprestimo) => sum + (emprestimo.valor || 0), 0);

  const totalCartoesRealizado = cartoes
    .filter((item) => item.pago === true)
    .reduce((sum, c) => sum + (c.valor || 0), 0);

  const totalGastosRealizadoGeral =
    totalGastosRealizado + totalEmprestimosRealizado + totalCartoesRealizado;

  const finalBalanceRealizado = totalEntradaRealizado - totalGastosRealizadoGeral;

  // ======================================================
  // ✅ Renderização
  // ======================================================
  return (
    <>
      <TelaPadrao titulo="Resumo Mensal" tipo="resumo">
        <>
          <View style={globalStyles.mb16}>
            <MiniResumo
              totalEntradaPrevisto={totalEntradaPrevisto}
              totalGastosPrevisto={totalGastosPrevistoGeral}
              finalBalancePrevisto={finalBalancePrevisto}
              totalEntradaRealizado={totalEntradaRealizado}
              totalGastosRealizado={totalGastosRealizadoGeral}
              finalBalanceRealizado={finalBalanceRealizado}
            />
          </View>

          <View style={globalStyles.mb30}>
            <SecaoEntradas entradas={entradas} />
          </View>

          <View style={globalStyles.mb30}>
            <SecaoGastos
              gastos={gastos.map((gasto) => ({
                name: gasto.nome || gasto.name || gasto.descricao,
                icon: gasto.icone || gasto.icon,
                amount: gasto.valor || gasto.amount,
                pago: gasto.pago ?? false,
              }))}
            />
          </View>

          <View style={globalStyles.mb30}>
            <SecaoEmprestimos
              emprestimos={emprestimos.map((emprestimo) => ({
                description: emprestimo.descricao || 'Empréstimo sem nome',
                amount: emprestimo.valor || 0,
                parcelaAtual: emprestimo.parcelaAtual || 1,
                totalParcelas: emprestimo.totalParcelas || 1,
                pago: emprestimo.pago ?? false,
              }))}
            />
          </View>

          <View style={globalStyles.mb30}>
            <SecaoCartoes cartoes={cartoes} />
          </View>

          <View style={globalStyles.mb12}>
            <SecaoInvestimentos investimentos={investimentos} />
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
