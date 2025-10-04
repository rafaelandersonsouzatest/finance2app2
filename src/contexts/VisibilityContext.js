import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VisibilityContext = createContext();

const VISIBILITY_STORAGE_KEY = '@app_visibility_state';

export const VisibilityProvider = ({ children }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar estado salvo ao inicializar
  useEffect(() => {
    loadVisibilityState();
  }, []);

  const loadVisibilityState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(VISIBILITY_STORAGE_KEY);
      if (savedState !== null) {
        setIsVisible(JSON.parse(savedState));
      }
    } catch (error) {
      console.log('Erro ao carregar estado de visibilidade:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveVisibilityState = async (newState) => {
    try {
      await AsyncStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(newState));
    } catch (error) {
      console.log('Erro ao salvar estado de visibilidade:', error);
    }
  };

  const toggleVisibility = () => {
    const newState = !isVisible;
    setIsVisible(newState);
    saveVisibilityState(newState);
  };

  const showValues = () => {
    setIsVisible(true);
    saveVisibilityState(true);
  };

  const hideValues = () => {
    setIsVisible(false);
    saveVisibilityState(false);
  };

  const formatValue = (value, options = {}) => {
    const {
      hiddenText = '••••',
      prefix = 'R$ ',
      showPrefix = true,
    } = options;

    if (!isVisible) {
      return showPrefix ? `${prefix}${hiddenText}` : hiddenText;
    }

    const numericValue = Number(value) || 0;
    const formattedValue = numericValue.toLocaleString('pt-BR', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    });

    return showPrefix ? `${prefix}${formattedValue}` : formattedValue;
  };

  const value = {
    isVisible,
    isLoading,
    toggleVisibility,
    showValues,
    hideValues,
    formatValue,
  };

  return (
    <VisibilityContext.Provider value={value}>
      {children}
    </VisibilityContext.Provider>
  );
};

export const useVisibility = () => {
  const context = useContext(VisibilityContext);
  if (!context) {
    throw new Error('useVisibility deve ser usado dentro de um VisibilityProvider');
  }
  return context;
};

export default VisibilityContext;

