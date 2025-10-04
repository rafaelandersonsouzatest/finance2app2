// src/components/EstatisticasComponent.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons  } from '@expo/vector-icons';

const EstatisticasComponent = ({ estatisticas }) => {
  const estatisticasData = [
    {
      valor: `R$ ${estatisticas.total.toFixed(2)}`,
      label: 'Total',
      cor: '#2196F3',
      icone: 'credit-card',
    },
    {
      valor: estatisticas.emAberto.toString(),
      label: 'Aguardando',
      cor: '#FFB74D',
      icone: 'clock-outline',
    },
    {
      valor: estatisticas.pagos.toString(),
      label: 'Pagos',
      cor: '#4CAF50',
      icone: 'check-circle-outline',
    },
  ];

  return (
    <View style={styles.container}>
      {estatisticasData.map((item, index) => (
        <View key={index} style={styles.estatisticaItem}>
          <View style={[styles.iconeContainer, { backgroundColor: `${item.cor}20` }]}>
            <MaterialCommunityIcons  name={item.icone} size={24} color={item.cor} />
          </View>
          <Text style={[styles.estatisticaValor, { color: item.cor }]}>
            {item.valor}
          </Text>
          <Text style={styles.estatisticaLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  estatisticaItem: {
    alignItems: 'center',
    flex: 1,
  },
  iconeContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  estatisticaValor: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  estatisticaLabel: {
    fontSize: 12,
    color: '#BBBBBB',
    textAlign: 'center',
  },
});

export default EstatisticasComponent;

