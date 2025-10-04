import { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { MaterialCommunityIcons  } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  { value: 12, label: 'Dezembro' }
];

export default function MonthYearPicker({ 
  selectedMonth, 
  selectedYear, 
  onSelect,
  compact = false,
  showNavigation = false,
  style,
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

  const handleCancel = () => {
    setTempMonth(selectedMonth);
    setTempYear(selectedYear);
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
    } else if (direction === 'prev') {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    }
    onSelect(newMonth, newYear);
  };

  const formatDisplayText = () => {
    const date = new Date(selectedYear, selectedMonth - 1);
    if (compact) {
      return format(date, 'MMM/yy', { locale: ptBR });
    }
    return format(date, 'MMMM yyyy', { locale: ptBR });
  };

  // Renderizar versão compacta
  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        {showNavigation && (
          <TouchableOpacity 
            onPress={() => handleNavigation('prev')}
            style={styles.navButton}
          >
            <MaterialCommunityIcons  name="arrow-left" size={16} color="#2196F3" />
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          onPress={() => setModalVisible(true)} 
          style={styles.compactButton}
        >
          <MaterialCommunityIcons  name="calendar-outline" size={16} color="#2196F3" />
          <Text style={styles.compactButtonText}>
            {formatDisplayText()}
          </Text>
          <MaterialCommunityIcons  name="chevron-down" size={14} color="#BBBBBB" />
        </TouchableOpacity>

        {showNavigation && (
          <TouchableOpacity 
            onPress={() => handleNavigation("next")}
            style={styles.navButton}
          >
            <MaterialCommunityIcons  name="arrow-right" size={16} color="#2196F3" />
          </TouchableOpacity>
        )}

        {/* Botão de voltar para o mês atual */}
        {resetToCurrentMonth && !isCurrentMonth() && (
          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: '#1E1E1E',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#333333',
            }}
            onPress={resetToCurrentMonth}
          >
            <MaterialCommunityIcons name="calendar-today" size={16} color="#2196F3" />
          </TouchableOpacity>
        )}

        {/* Modal compartilhado */}
        <Modal visible={modalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <MaterialCommunityIcons  name="calendar" size={24} color="#2196F3" />
                <Text style={styles.modalTitle}>Selecionar mês e ano</Text>
              </View>
              
              <View style={styles.selectorsContainer}>
                {/* Seletor de Ano */}
                <View style={styles.selectorSection}>
                  <Text style={styles.sectionTitle}>Ano</Text>
                  <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        style={[
                          styles.optionItem,
                          tempYear === year && styles.selectedOption
                        ]}
                        onPress={() => setTempYear(year)}
                      >
                        <Text style={[
                          styles.optionText,
                          tempYear === year && styles.selectedOptionText
                        ]}>
                          {year}
                        </Text>
                        {tempYear === year && (
                          <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Seletor de Mês */}
                <View style={styles.selectorSection}>
                  <Text style={styles.sectionTitle}>Mês</Text>
                  <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                    {months.map((month) => (
                      <TouchableOpacity
                        key={month.value}
                        style={[
                          styles.optionItem,
                          tempMonth === month.value && styles.selectedOption
                        ]}
                        onPress={() => setTempMonth(month.value)}
                      >
                        <Text style={[
                          styles.optionText,
                          tempMonth === month.value && styles.selectedOptionText
                        ]}>
                          {month.label}
                        </Text>
                        {tempMonth === month.value && (
                          <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              <View style={styles.buttonsContainer}>
                <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                  <MaterialCommunityIcons  name="close-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
                  <MaterialCommunityIcons  name="check-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirmar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Renderizar versão completa (original)
  return (
    <View style={style}>
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.monthButton}>
        <Text style={styles.monthButtonText}>
          {formatDisplayText()}
        </Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <MaterialCommunityIcons  name="calendar" size={24} color="#2196F3" />
              <Text style={styles.modalTitle}>Selecionar mês e ano</Text>
            </View>
            
            <View style={styles.selectorsContainer}>
              {/* Seletor de Ano */}
              <View style={styles.selectorSection}>
                <Text style={styles.sectionTitle}>Ano</Text>
                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                  {years.map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.optionItem,
                        tempYear === year && styles.selectedOption
                      ]}
                      onPress={() => setTempYear(year)}
                    >
                      <Text style={[
                        styles.optionText,
                        tempYear === year && styles.selectedOptionText
                      ]}>
                        {year}
                      </Text>
                      {tempYear === year && (
                        <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Seletor de Mês */}
              <View style={styles.selectorSection}>
                <Text style={styles.sectionTitle}>Mês</Text>
                <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                  {months.map((month) => (
                    <TouchableOpacity
                      key={month.value}
                      style={[
                        styles.optionItem,
                        tempMonth === month.value && styles.selectedOption
                      ]}
                      onPress={() => setTempMonth(month.value)}
                    >
                      <Text style={[
                        styles.optionText,
                        tempMonth === month.value && styles.selectedOptionText
                      ]}>
                        {month.label}
                      </Text>
                      {tempMonth === month.value && (
                        <MaterialCommunityIcons  name="check" size={16} color="#FFFFFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View style={styles.buttonsContainer}>
              <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
                <MaterialCommunityIcons  name="close-outline" size={20} color="#FFFFFF" />
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
                <MaterialCommunityIcons  name="check-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Estilos da versão compacta
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 3,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333333',
    gap: 6,
  },
  compactButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  navButton: {
    width: 20,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333333',
  },

  // Estilos da versão completa
  monthButton: {
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#444444',
  },
  monthButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Estilos do Modal (compartilhados)
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContent: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 0,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 12,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  selectorsContainer: {
    flexDirection: 'row',
    gap: 16,
    padding: 20,
  },
  selectorSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  scrollContainer: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#444444',
    borderRadius: 8,
    backgroundColor: '#1A1A1A',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#444444',
  },
  selectedOption: {
    backgroundColor: '#2196F3',
  },
  optionText: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    flex: 1,
  },
  selectedOptionText: {
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#444444',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22C55E',
    borderRadius: 8,
    paddingVertical: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});