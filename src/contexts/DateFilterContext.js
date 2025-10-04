// src/contexts/DateFilterContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DateFilterContext = createContext();

export const useDateFilter = () => {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilter deve ser usado dentro de um DateFilterProvider');
  }
  return context;
};

export const DateFilterProvider = ({ children }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);

  // Carregar filtro salvo ao inicializar
  useEffect(() => {
    loadSavedFilter();
  }, []);

  // Salvar filtro sempre que mudar
  useEffect(() => {
    if (!isLoading) {
      saveFilter();
    }
  }, [selectedMonth, selectedYear, isLoading]);

  const loadSavedFilter = async () => {
    try {
      const savedFilter = await AsyncStorage.getItem('@dateFilter');
      if (savedFilter) {
        const { month, year } = JSON.parse(savedFilter);
        setSelectedMonth(month);
        setSelectedYear(year);
      }
    } catch (error) {
      console.log('Erro ao carregar filtro salvo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveFilter = async () => {
    try {
      const filterData = {
        month: selectedMonth,
        year: selectedYear,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('@dateFilter', JSON.stringify(filterData));
    } catch (error) {
      console.log('Erro ao salvar filtro:', error);
    }
  };

  const updateFilter = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const navigateMonth = (direction) => {
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

    updateFilter(newMonth, newYear);
  };

  const resetToCurrentMonth = () => {
    const now = new Date();
    updateFilter(now.getMonth() + 1, now.getFullYear());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();
  };

  const getFormattedDate = (format = 'full') => {
    const date = new Date(selectedYear, selectedMonth - 1);
    
    switch (format) {
      case 'short':
        return date.toLocaleDateString('pt-BR', { 
          month: 'short', 
          year: '2-digit' 
        });
      case 'compact':
        return `${selectedMonth.toString().padStart(2, '0')}/${selectedYear}`;
      case 'full':
      default:
        return date.toLocaleDateString('pt-BR', { 
          month: 'long', 
          year: 'numeric' 
        });
    }
  };

  // Função para calcular qual parcela deve ser exibida baseada no mês/ano
  const calculateCurrentInstallment = (startDate, totalInstallments) => {
    try {
      const start = new Date(startDate);
      const current = new Date(selectedYear, selectedMonth - 1);
      
      // Calcular diferença em meses
      const monthsDiff = (current.getFullYear() - start.getFullYear()) * 12 + 
                        (current.getMonth() - start.getMonth());
      
      // Parcela atual (1-based)
      const currentInstallment = monthsDiff + 1;
      
      // Verificar se está dentro do range válido
      if (currentInstallment < 1) {
        return null; // Ainda não começou
      }
      
      if (currentInstallment > totalInstallments) {
        return totalInstallments; // Já terminou, mostrar última parcela
      }
      
      return currentInstallment;
    } catch (error) {
      console.log('Erro ao calcular parcela:', error);
      return 1; // Fallback para primeira parcela
    }
  };

  // Função para verificar se uma transação deve ser exibida no mês/ano atual
  const shouldShowTransaction = (transactionDate, installmentInfo = null) => {
    try {
      const transactionMonth = new Date(transactionDate).getMonth() + 1;
      const transactionYear = new Date(transactionDate).getFullYear();
      
      // Se não tem informação de parcela, mostrar apenas no mês da transação
      if (!installmentInfo) {
        return transactionMonth === selectedMonth && transactionYear === selectedYear;
      }
      
      // Se tem parcelas, calcular se deve mostrar baseado na parcela atual
      const currentInstallment = calculateCurrentInstallment(
        transactionDate, 
        installmentInfo.totalInstallments
      );
      
      return currentInstallment !== null && currentInstallment <= installmentInfo.totalInstallments;
    } catch (error) {
      console.log('Erro ao verificar transação:', error);
      return false;
    }
  };

  const value = {
    // Estado
    selectedMonth,
    selectedYear,
    isLoading,
    
    // Ações
    updateFilter,
    navigateMonth,
    resetToCurrentMonth,
    
    // Utilitários
    isCurrentMonth,
    getFormattedDate,
    calculateCurrentInstallment,
    shouldShowTransaction,
  };

  return (
    <DateFilterContext.Provider value={value}>
      {children}
    </DateFilterContext.Provider>
  );
};

