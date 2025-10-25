// import { useState } from 'react';
// import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
// import { MaterialCommunityIcons  } from '@expo/vector-icons';
// import { format } from 'date-fns';
// import { ptBR } from 'date-fns/locale';

// const months = [
//   { value: 1, label: 'Janeiro' },
//   { value: 2, label: 'Fevereiro' },
//   { value: 3, label: 'Março' },
//   { value: 4, label: 'Abril' },
//   { value: 5, label: 'Maio' },
//   { value: 6, label: 'Junho' },
//   { value: 7, label: 'Julho' },
//   { value: 8, label: 'Agosto' },
//   { value: 9, label: 'Setembro' },
//   { value: 10, label: 'Outubro' },
//   { value: 11, label: 'Novembro' },
//   { value: 12, label: 'Dezembro' }
// ];

// export default function MonthYearPicker({ 
//   selectedMonth, 
//   selectedYear, 
//   onSelect,
//   compact = false,
//   showNavigation = false,
//   style,
//   resetToCurrentMonth,
//   isCurrentMonth,
// }) {
//   const [modalVisible, setModalVisible] = useState(false);
//   const [tempMonth, setTempMonth] = useState(selectedMonth);
//   const [tempYear, setTempYear] = useState(selectedYear);

//   const currentYear = new Date().getFullYear();
//   const years = Array.from({ length: 15 }, (_, i) => currentYear - 7 + i);

//   const handleConfirm = () => {
//     onSelect(tempMonth, tempYear);
//     setModalVisible(false);
//   };

//   const handleCancel = () => {
//     setTempMonth(selectedMonth);
//     setTempYear(selectedYear);
//     setModalVisible(false);
//   };

//   const handleNavigation = (direction) => {
//     let newMonth = selectedMonth;
//     let newYear = selectedYear;

//     if (direction === 'next') {
//       newMonth++;
//       if (newMonth > 12) {
//         newMonth = 1;
//         newYear++;
//       }
//     } else if (direction === 'prev') {
//       newMonth--;
//       if (newMonth < 1) {
//         newMonth = 12;
//         newYear--;
//       }
//     }
//     onSelect(newMonth, newYear);
//   };

//   const formatDisplayText = () => {
//     const date = new Date(selectedYear, selectedMonth - 1);
//     if (compact) {
//       return format(date, 'MMM/yy', { locale: ptBR });
//     }
//     return format(date, 'MMMM yyyy', { locale: ptBR });
//   };

//   // Renderizar versão compacta
//   if (compact) {
//     return (
//       <View style={[styles.compactContainer, style]}>
//         {showNavigation && (
//           <TouchableOpacity 
//             onPress={() => handleNavigation('prev')}
//             style={styles.navButton}
//           >
//             <MaterialCommunityIcons  name="arrow-left" size={16} color="#2196F3" />
//           </TouchableOpacity>
//         )}
        
//         <TouchableOpacity 
//           onPress={() => setModalVisible(true)} 
//           style={styles.compactButton}
//         >
//           <MaterialCommunityIcons  name="calendar-outline" size={16} color="#2196F3" />
//           <Text style={styles.compactButtonText}>
//             {formatDisplayText()}
//           </Text>
//           <MaterialCommunityIcons  name="chevron-down" size={14} color="#BBBBBB" />
//         </TouchableOpacity>

//         {showNavigation && (
//           <TouchableOpacity 
//             onPress={() => handleNavigation("next")}
//             style={styles.navButton}
//           >
//             <MaterialCommunityIcons  name="arrow-right" size={16} color="#2196F3" />
//           </TouchableOpacity>
//         )}

//         {/* Botão de voltar para o mês atual */}
//         {resetToCurrentMonth && !isCurrentMonth() && (
//           <TouchableOpacity
//             style={{
//               width: 32,
//               height: 32,
//               borderRadius: 16,
//               backgroundColor: '#1E1E1E',
//               alignItems: 'center',
//               justifyContent: 'center',
//               borderWidth: 1,
//               borderColor: '#333333',
//             }}
//             onPress={resetToCurrentMonth}
//           >
//             <MaterialCommunityIcons name="calendar-today" size={16} color="#2196F3" />
//           </TouchableOpacity>
//         )}

//         {/* Modal compartilhado */}
//         <Modal visible={modalVisible} transparent animationType="slide">
//           <View style={styles.modalOverlay}>
//             <View style={styles.modalContent}>
//               <View style={styles.modalHeader}>
//                 <MaterialCommunityIcons  name="calendar" size={24} color="#2196F3" />
//                 <Text style={styles.modalTitle}>Selecionar mês e ano</Text>
//               </View>
              
//               <View style={styles.selectorsContainer}>
//                 {/* Seletor de Ano */}
//                 <View style={styles.selectorSection}>
//                   <Text style={styles.sectionTitle}>Ano</Text>
//                   <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
//                     {years.map((year) => (
//                       <TouchableOpacity
//                         key={year}
//                         style={[
//                           styles.optionItem,
//                           tempYear === year && styles.selectedOption
//                         ]}
//                         onPress={() => setTempYear(year)}
//                       >
//                         <Text style={[
//                           styles.optionText,
//                           tempYear === year && styles.selectedOptionText
//                         ]}>
//                           {year}
//                         </Text>
//                         {tempYear === year && (
//                           <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
//                         )}
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>

//                 {/* Seletor de Mês */}
//                 <View style={styles.selectorSection}>
//                   <Text style={styles.sectionTitle}>Mês</Text>
//                   <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
//                     {months.map((month) => (
//                       <TouchableOpacity
//                         key={month.value}
//                         style={[
//                           styles.optionItem,
//                           tempMonth === month.value && styles.selectedOption
//                         ]}
//                         onPress={() => setTempMonth(month.value)}
//                       >
//                         <Text style={[
//                           styles.optionText,
//                           tempMonth === month.value && styles.selectedOptionText
//                         ]}>
//                           {month.label}
//                         </Text>
//                         {tempMonth === month.value && (
//                           <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
//                         )}
//                       </TouchableOpacity>
//                     ))}
//                   </ScrollView>
//                 </View>
//               </View>

//               <View style={styles.buttonsContainer}>
//                 <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
//                   <MaterialCommunityIcons  name="close-outline" size={20} color="#FFFFFF" />
//                   <Text style={styles.cancelButtonText}>Cancelar</Text>
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
//                   <MaterialCommunityIcons  name="check-circle-outline" size={20} color="#FFFFFF" />
//                   <Text style={styles.confirmButtonText}>Confirmar</Text>
//                 </TouchableOpacity>
//               </View>
//             </View>
//           </View>
//         </Modal>
//       </View>
//     );
//   }

//   // Renderizar versão completa (original)
//   return (
//     <View style={style}>
//       <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.monthButton}>
//         <Text style={styles.monthButtonText}>
//           {formatDisplayText()}
//         </Text>
//       </TouchableOpacity>

//       <Modal visible={modalVisible} transparent animationType="slide">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}>
//               <MaterialCommunityIcons  name="calendar" size={24} color="#2196F3" />
//               <Text style={styles.modalTitle}>Selecionar mês e ano</Text>
//             </View>
            
//             <View style={styles.selectorsContainer}>
//               {/* Seletor de Ano */}
//               <View style={styles.selectorSection}>
//                 <Text style={styles.sectionTitle}>Ano</Text>
//                 <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
//                   {years.map((year) => (
//                     <TouchableOpacity
//                       key={year}
//                       style={[
//                         styles.optionItem,
//                         tempYear === year && styles.selectedOption
//                       ]}
//                       onPress={() => setTempYear(year)}
//                     >
//                       <Text style={[
//                         styles.optionText,
//                         tempYear === year && styles.selectedOptionText
//                       ]}>
//                         {year}
//                       </Text>
//                       {tempYear === year && (
//                         <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
//                       )}
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>

//               {/* Seletor de Mês */}
//               <View style={styles.selectorSection}>
//                 <Text style={styles.sectionTitle}>Mês</Text>
//                 <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
//                   {months.map((month) => (
//                     <TouchableOpacity
//                       key={month.value}
//                       style={[
//                         styles.optionItem,
//                         tempMonth === month.value && styles.selectedOption
//                       ]}
//                       onPress={() => setTempMonth(month.value)}
//                     >
//                       <Text style={[
//                         styles.optionText,
//                         tempMonth === month.value && styles.selectedOptionText
//                       ]}>
//                         {month.label}
//                       </Text>
//                       {tempMonth === month.value && (
//                         <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
//                       )}
//                     </TouchableOpacity>
//                   ))}
//                 </ScrollView>
//               </View>
//             </View>

//             <View style={styles.buttonsContainer}>
//               <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
//                 <MaterialCommunityIcons  name="close-outline" size={20} color="#FFFFFF" />
//                 <Text style={styles.cancelButtonText}>Cancelar</Text>
//               </TouchableOpacity>
//               <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
//                 <MaterialCommunityIcons  name="check-circle-outline" size={20} color="#FFFFFF" />
//                 <Text style={styles.confirmButtonText}>Confirmar</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   // Estilos da versão compacta
//   compactContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 5,
//   },
//   compactButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: '#1E1E1E',
//     paddingHorizontal: 3,
//     paddingVertical: 6,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#333333',
//     gap: 6,
//   },
//   compactButtonText: {
//     fontSize: 14,
//     color: '#FFFFFF',
//     fontWeight: '500',
//     textTransform: 'capitalize',
//   },
//   navButton: {
//     width: 20,
//     height: 32,
//     borderRadius: 16,
//     backgroundColor: '#1E1E1E',
//     alignItems: 'center',
//     justifyContent: 'center',
//     borderWidth: 1,
//     borderColor: '#333333',
//   },

//   // Estilos da versão completa
//   monthButton: {
//     backgroundColor: '#2A2A2A',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 8,
//     borderWidth: 1,
//     borderColor: '#444444',
//   },
//   monthButtonText: {
//     fontSize: 16,
//     color: '#FFFFFF',
//     fontWeight: '500',
//     textTransform: 'capitalize',
//   },

//   // Estilos do Modal (compartilhados)
//   modalOverlay: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0, 0, 0, 0.7)',
//   },
//   modalContent: {
//     backgroundColor: '#2A2A2A',
//     borderRadius: 16,
//     padding: 0,
//     width: '90%',
//     maxHeight: '80%',
//     shadowColor: '#000',
//     shadowOffset: {
//       width: 0,
//       height: 4,
//     },
//     shadowOpacity: 0.3,
//     shadowRadius: 6,
//     elevation: 8,
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: 20,
//     paddingHorizontal: 20,
//     borderBottomWidth: 1,
//     borderBottomColor: '#444444',
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginLeft: 12,
//     textAlign: 'center',
//     color: '#FFFFFF',
//   },
//   selectorsContainer: {
//     flexDirection: 'row',
//     gap: 16,
//     padding: 20,
//   },
//   selectorSection: {
//     flex: 1,
//   },
//   sectionTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     marginBottom: 10,
//     textAlign: 'center',
//     color: '#FFFFFF',
//   },
//   scrollContainer: {
//     maxHeight: 200,
//     borderWidth: 1,
//     borderColor: '#444444',
//     borderRadius: 8,
//     backgroundColor: '#1A1A1A',
//   },
//   optionItem: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     paddingVertical: 12,
//     paddingHorizontal: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: '#444444',
//   },
//   selectedOption: {
//     backgroundColor: '#2196F3',
//   },
//   optionText: {
//     fontSize: 16,
//     color: '#FFFFFF',
//     textAlign: 'center',
//     flex: 1,
//   },
//   selectedOptionText: {
//     fontWeight: 'bold',
//     color: '#FFFFFF',
//   },
//   buttonsContainer: {
//     flexDirection: 'row',
//     gap: 12,
//     padding: 20,
//     borderTopWidth: 1,
//     borderTopColor: '#444444',
//   },
//   cancelButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#EF4444',
//     borderRadius: 8,
//     paddingVertical: 12,
//     gap: 8,
//   },
//   confirmButton: {
//     flex: 1,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     backgroundColor: '#22C55E',
//     borderRadius: 8,
//     paddingVertical: 12,
//     gap: 8,
//   },
//   cancelButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   confirmButtonText: {
//     color: '#FFFFFF',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });















////////////////////////////
//Versão Calendario
////////////////////////////

// import { useState } from 'react';
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   Modal,
//   ScrollView,
//   StyleSheet,
//   Animated,
// } from 'react-native';
// import { MaterialCommunityIcons } from '@expo/vector-icons';
// import { format } from 'date-fns';
// import { ptBR } from 'date-fns/locale';
// import { colors } from '../styles/colors';

// const months = [
//   { value: 1, label: 'Janeiro' },
//   { value: 2, label: 'Fevereiro' },
//   { value: 3, label: 'Março' },
//   { value: 4, label: 'Abril' },
//   { value: 5, label: 'Maio' },
//   { value: 6, label: 'Junho' },
//   { value: 7, label: 'Julho' },
//   { value: 8, label: 'Agosto' },
//   { value: 9, label: 'Setembro' },
//   { value: 10, label: 'Outubro' },
//   { value: 11, label: 'Novembro' },
//   { value: 12, label: 'Dezembro' },
// ];

// export default function MonthYearPicker({
//   selectedMonth,
//   selectedYear,
//   onSelect,
//   resetToCurrentMonth,
//   isCurrentMonth,
// }) {
//   const [modalVisible, setModalVisible] = useState(false);
//   const [tempMonth, setTempMonth] = useState(selectedMonth);
//   const [tempYear, setTempYear] = useState(selectedYear);

//   const currentYear = new Date().getFullYear();
//   const years = Array.from({ length: 15 }, (_, i) => currentYear - 7 + i);

//   const handleConfirm = () => {
//     onSelect(tempMonth, tempYear);
//     setModalVisible(false);
//   };

//   const handleNavigation = (direction) => {
//     let newMonth = selectedMonth;
//     let newYear = selectedYear;

//     if (direction === 'next') {
//       newMonth++;
//       if (newMonth > 12) {
//         newMonth = 1;
//         newYear++;
//       }
//     } else {
//       newMonth--;
//       if (newMonth < 1) {
//         newMonth = 12;
//         newYear--;
//       }
//     }
//     onSelect(newMonth, newYear);
//   };

//   const formatDisplayText = () => {
//     const date = new Date(selectedYear, selectedMonth - 1);
//     return format(date, "MMMM yyyy", { locale: ptBR });
//   };

//   return (
//     <View style={styles.wrapper}>
//       <Animated.View style={styles.card}>
//         <TouchableOpacity
//           style={styles.arrowBtn}
//           onPress={() => handleNavigation('prev')}
//         >
//           <MaterialCommunityIcons name="chevron-left" size={26} color={colors.textPrimary} />
//         </TouchableOpacity>

//         <TouchableOpacity
//           onPress={() => setModalVisible(true)}
//           activeOpacity={0.8}
//           style={styles.centerBtn}
//         >
//           <MaterialCommunityIcons
//             name="calendar-outline"
//             size={18}
//             color={colors.textSecondary}
//             style={{ marginRight: 6 }}
//           />
//           <Text style={styles.monthText}>{formatDisplayText()}</Text>
//           <MaterialCommunityIcons
//             name="chevron-down"
//             size={16}
//             color={colors.textSecondary}
//             style={{ marginLeft: 6 }}
//           />
//         </TouchableOpacity>

//         <TouchableOpacity
//           style={styles.arrowBtn}
//           onPress={() => handleNavigation('next')}
//         >
//           <MaterialCommunityIcons name="chevron-right" size={26} color={colors.textPrimary} />
//         </TouchableOpacity>

//         {!isCurrentMonth() && (
//           <TouchableOpacity
//             onPress={resetToCurrentMonth}
//             style={styles.todayBtn}
//           >
//             <MaterialCommunityIcons name="calendar-today" size={16} color="#FFF" />
//           </TouchableOpacity>
//         )}
//       </Animated.View>

//       {/* Modal */}
//       <Modal visible={modalVisible} transparent animationType="slide">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <Text style={styles.modalTitle}>Selecionar mês e ano</Text>
//             <View style={styles.selectorRow}>
//               <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
//                 {months.map((month) => (
//                   <TouchableOpacity
//                     key={month.value}
//                     style={[
//                       styles.option,
//                       tempMonth === month.value && styles.selectedOption,
//                     ]}
//                     onPress={() => setTempMonth(month.value)}
//                   >
//                     <Text
//                       style={[
//                         styles.optionText,
//                         tempMonth === month.value && styles.selectedOptionText,
//                       ]}
//                     >
//                       {month.label}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//               <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
//                 {years.map((year) => (
//                   <TouchableOpacity
//                     key={year}
//                     style={[
//                       styles.option,
//                       tempYear === year && styles.selectedOption,
//                     ]}
//                     onPress={() => setTempYear(year)}
//                   >
//                     <Text
//                       style={[
//                         styles.optionText,
//                         tempYear === year && styles.selectedOptionText,
//                       ]}
//                     >
//                       {year}
//                     </Text>
//                   </TouchableOpacity>
//                 ))}
//               </ScrollView>
//             </View>
//             <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
//               <Text style={styles.confirmText}>Confirmar</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   wrapper: {
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   card: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     backgroundColor: colors.card,
//     borderRadius: 16,
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     shadowColor: '#da0e0eff',
//     shadowOffset: { width: 0, height: 3 },
//     shadowOpacity: 0.3,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   arrowBtn: {
//     padding: 4,
//   },
//   centerBtn: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingHorizontal: 10,
//     borderRadius: 12,
//   },
//   monthText: {
//     fontSize: 16,
//     color: colors.textPrimary,
//     fontWeight: '600',
//     textTransform: 'capitalize',
//   },
//   todayBtn: {
//     marginLeft: 8,
//     backgroundColor: colors.primary,
//     padding: 6,
//     borderRadius: 20,
//     elevation: 2,
//   },
//   // Modal
//   modalOverlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContent: {
//     backgroundColor: colors.card,
//     borderRadius: 16,
//     padding: 16,
//     width: '90%',
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: colors.textPrimary,
//     textAlign: 'center',
//     marginBottom: 12,
//   },
//   selectorRow: {
//     flexDirection: 'row',
//     gap: 8,
//   },
//   scroll: {
//     maxHeight: 200,
//     flex: 1,
//   },
//   option: {
//     paddingVertical: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   selectedOption: {
//     backgroundColor: colors.primary + '25',
//   },
//   optionText: {
//     textAlign: 'center',
//     color: colors.textPrimary,
//   },
//   selectedOptionText: {
//     fontWeight: '700',
//   },
//   confirmBtn: {
//     backgroundColor: colors.primary,
//     borderRadius: 10,
//     paddingVertical: 10,
//     marginTop: 20,
//   },
//   confirmText: {
//     color: '#FFF',
//     fontWeight: 'bold',
//     textAlign: 'center',
//   },
// });










////////////////////////////
//Versão Minimalista Moderno
////////////////////////////

// components/MonthYearPicker.js
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

export default function MonthYearPicker({
  selectedMonth,
  selectedYear,
  onSelect,
  resetToCurrentMonth,
  isCurrentMonth,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempMonth, setTempMonth] = useState(selectedMonth);
  const [tempYear, setTempYear] = useState(selectedYear);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 7 + i);

  const handleConfirm = () => {
    onSelect(tempMonth, tempYear);
    setModalVisible(false);
  };

  const handleNavigation = (direction) => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (direction === 'next') {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    } else {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    }
    onSelect(newMonth, newYear);
  };

  // Gera "Outubro de 2025" com 'de' minúsculo e mês com inicial maiúscula
  const formatDisplayText = () => {
    const date = new Date(selectedYear, selectedMonth - 1);
    const month = format(date, 'MMMM', { locale: ptBR });
    const monthCap = month.charAt(0).toUpperCase() + month.slice(1);
    return `${monthCap} de ${selectedYear}`;
  };

  return (
    <View style={globalStyles.datePickerContainer}>
      <View style={globalStyles.datePickerRow}>
        <TouchableOpacity onPress={() => handleNavigation('prev')} style={styles.iconPad}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={22}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          activeOpacity={0.85}
          style={globalStyles.datePickerCenterBtn}
        >
          <Text style={globalStyles.datePickerText}>{formatDisplayText()}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => handleNavigation('next')} style={styles.iconPad}>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Mantém o espaço do botão para evitar deslocamento.
            Quando é mês atual, mostramos um placeholder invisível do mesmo tamanho */}
        {isCurrentMonth() ? (
          <View style={globalStyles.todayButtonPlaceholder} />
        ) : (
          <TouchableOpacity
            onPress={resetToCurrentMonth}
            style={globalStyles.todayButtonMinimal}
            accessibilityLabel="Voltar ao mês atual"
          >
            {/* ícone leve, sem círculo pesado */}
            <MaterialCommunityIcons name="calendar-today" size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Modal centralizado */}
<Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
  <View style={globalStyles.modalOverlayCenter}>
    <View style={globalStyles.modalBox}>
      <Text style={globalStyles.modalTitle}>Selecionar mês e ano</Text>

      <View style={globalStyles.modalSelectorRow}>
        {/* SCROLL DE MESES */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={globalStyles.modalScroll}
          ref={(ref) => {
            if (ref && tempMonth) {
              setTimeout(() => {
                const index = months.findIndex((m) => m.value === tempMonth);
                if (index >= 0) ref.scrollTo({ y: index * 45 - 90, animated: false });
              }, 10);
            }
          }}
        >
          {months.map((month) => (
            <TouchableOpacity
              key={month.value}
              style={[
                globalStyles.modalOption,
                tempMonth === month.value && globalStyles.modalOptionSelected,
              ]}
              onPress={() => {
                setTempMonth(month.value);
              }}
            >
              <Text
                style={[
                  globalStyles.modalOptionText,
                  tempMonth === month.value && globalStyles.modalOptionTextSelected,
                  tempMonth === month.value && { fontSize: 18, fontWeight: '800' }, // 👈 destaque
                ]}
              >
                {month.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* SCROLL DE ANOS */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={globalStyles.modalScroll}
          ref={(ref) => {
            if (ref && tempYear) {
              setTimeout(() => {
                const index = years.findIndex((y) => y === tempYear);
                if (index >= 0) ref.scrollTo({ y: index * 45 - 90, animated: false });
              }, 10);
            }
          }}
        >
          {years.map((year) => (
            <TouchableOpacity
              key={year}
              style={[
                globalStyles.modalOption,
                tempYear === year && globalStyles.modalOptionSelected,
              ]}
              onPress={() => {
                setTempYear(year);
              }}
            >
              <Text
                style={[
                  globalStyles.modalOptionText,
                  tempYear === year && globalStyles.modalOptionTextSelected,
                  tempYear === year && { fontSize: 18, fontWeight: '800' }, // 👈 destaque
                ]}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Botões confirm/cancel */}
      <View style={globalStyles.modalButtonsRow}>
        <TouchableOpacity
          onPress={() => {
            setTempMonth(selectedMonth);
            setTempYear(selectedYear);
            setModalVisible(false);
          }}
          style={globalStyles.modalCancelBtn}
        >
          <Text style={globalStyles.modalCancelText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleConfirm} style={globalStyles.modalConfirmBtn}>
          <Text style={globalStyles.modalConfirmText}>Confirmar</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  iconPad: { paddingHorizontal: 6, paddingVertical: 2 },
});
