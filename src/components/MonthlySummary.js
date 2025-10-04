// import { View, Text, StyleSheet } from 'react-native';
// import { colors } from '../styles/colors';
// import { globalStyles } from '../styles/globalStyles';
// import MonthYearPicker from './MonthYearPicker';
// import { useDateFilter } from '../contexts/DateFilterContext';

// const MonthlySummary = ({ 
//   currentMonth,
//   totalIncome,
//   fixedExpenses,
//   finalBalance
// }) => {
//   const { selectedMonth, selectedYear, updateFilter } = useDateFilter();

//   const formatCurrency = (value) => {
//     return `R$${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
//   };

//   return (
//     <View style={styles.container}>
//       <View style={styles.header}>
//         <Text style={globalStyles.title}>Resumo Mensal</Text>
//         <View style={styles.monthSelectorContainer}>
//           <MonthYearPicker
//             selectedMonth={selectedMonth}
//             selectedYear={selectedYear}
//             onSelect={updateFilter}
//             compact={false} // Versão completa para a tela de resumo
//           />
//         </View>
//       </View>
      
//       <View style={styles.summaryCards}>
//         <View style={[styles.summaryCard, styles.incomeCard]}>
//           <Text style={styles.cardLabel}>Entradas</Text>
//           <Text style={[globalStyles.value, globalStyles.valueIncome]}>
//             {formatCurrency(totalIncome)}
//           </Text>
//         </View>
        
//         <View style={[styles.summaryCard, styles.expenseCard]}>
//           <Text style={styles.cardLabel}>Gastos Fixos</Text>
//           <Text style={[globalStyles.value, globalStyles.valueExpense]}>
//             {formatCurrency(fixedExpenses)}
//           </Text>
//         </View>
        
//         <View style={[styles.summaryCard, styles.balanceCard]}>
//           <Text style={styles.cardLabel}>Balanço Final</Text>
//           <Text style={[globalStyles.value, globalStyles.valueBalance]}>
//             {formatCurrency(finalBalance)}
//           </Text>
//         </View>
//       </View>
//     </View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     marginBottom: 24,
//   },
  
//   header: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
  
//   monthSelectorContainer: {
//     padding: 8,
//   },
  
//   summaryCards: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     gap: 12,
//   },
  
//   summaryCard: {
//     flex: 1,
//     backgroundColor: colors.cardBackground,
//     borderRadius: 12,
//     padding: 16,
//     alignItems: 'center',
//   },
  
//   incomeCard: {
//     borderLeftWidth: 4,
//     borderLeftColor: colors.income,
//   },
  
//   expenseCard: {
//     borderLeftWidth: 4,
//     borderLeftColor: colors.expense,
//   },
  
//   balanceCard: {
//     borderLeftWidth: 4,
//     borderLeftColor: colors.balance,
//   },
  
//   cardLabel: {
//     fontSize: 12,
//     color: colors.textSecondary,
//     marginBottom: 8,
//     textAlign: 'center',
//   },
// });

// export default MonthlySummary;
