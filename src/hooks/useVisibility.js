import { useVisibility as useVisibilityContext } from '../contexts/VisibilityContext';

// Hook personalizado que pode ser expandido com lógicas adicionais
export const useVisibility = () => {
  const context = useVisibilityContext();
  
  // Função auxiliar para formatar valores monetários com configurações padrão
  const formatCurrency = (value, showCurrency = true) => {
    return context.formatValue(value, {
      hiddenText: '••••',
      prefix: showCurrency ? 'R$ ' : '',
      showPrefix: showCurrency,
    });
  };

  // Função auxiliar para formatar percentuais
  const formatPercentage = (value) => {
    if (!context.isVisible) {
      return '••%';
    }
    
    const numericValue = Number(value) || 0;
    return `${numericValue.toFixed(1)}%`;
  };

  // Função auxiliar para formatar números simples
  const formatNumber = (value) => {
    if (!context.isVisible) {
      return '••••';
    }
    
    const numericValue = Number(value) || 0;
    return numericValue.toLocaleString('pt-BR');
  };

  return {
    ...context,
    formatCurrency,
    formatPercentage,
    formatNumber,
  };
};

export default useVisibility;

