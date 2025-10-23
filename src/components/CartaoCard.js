import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import GastoCartaoCard from './GastoCartaoCard';
import { vibrarLeve } from '../utils/haptics';
import { LinearGradient } from 'expo-linear-gradient';


export default function CartaoCard({ cartao, gastos = [] }) {
  const [modalVisivel, setModalVisivel] = useState(false);

  // 🔹 Cor pelo nome do cartão
  const corCartao =
    colors.byInstitution[cartao.nome?.trim()] || colors.byInstitution.Default;

  const totalGasto = gastos.reduce((acc, g) => acc + (g.valor || 0), 0);
  const quantidadeGastos = gastos.length;

  const handlePress = () => {
    vibrarLeve();
    setModalVisivel(true);
  };

  return (
    <>
      {/* 🔹 Cartão principal */}
      <TouchableOpacity
        style={[
          globalStyles.cardElegant,
          {
            backgroundColor: corCartao,
            borderLeftWidth: 4,
            borderLeftColor: '#fff3',
          },
        ]}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        <View style={globalStyles.rowBetween}>
          <Text
            style={[
              globalStyles.cardTitle,
              { color: '#fff', fontWeight: '700', flex: 1 },
            ]}
          >
            {cartao.nome}
          </Text>
          <MaterialCommunityIcons
            name="credit-card-outline"
            size={22}
            color="#fff"
          />
        </View>

        <View style={[globalStyles.mt16]}>
          <Text style={[globalStyles.textSecondary, { color: '#ddd' }]}>
            Total gasto
          </Text>
          <Text
            style={[
              globalStyles.totalAmount,
              { color: '#fff', fontSize: 26, marginTop: 2 },
            ]}
          >
            R$ {totalGasto.toFixed(2)}
          </Text>
        </View>

        <View style={[globalStyles.rowBetween, globalStyles.mt16]}>
          <Text style={[globalStyles.textSecondary, { color: '#fff' }]}>
            {quantidadeGastos} transações neste mês
          </Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={22}
            color="#fff"
          />
        </View>
      </TouchableOpacity>

      {/* 🔹 Modal de detalhes */}
      <Modal visible={modalVisivel} animationType="slide" transparent>
        <View style={globalStyles.modalOverlay}>
          <View
            style={[
              globalStyles.modalContainer,
              { borderTopColor: corCartao, borderTopWidth: 3 },
            ]}
          >
            {/* Cabeçalho */}
            <View
              style={[
                globalStyles.modalHeader,
                { backgroundColor: corCartao, borderRadius: 12, marginTop: -4 },
              ]}
            >
              <Text style={[globalStyles.modalTitle, { color: '#fff' }]}>
                {cartao.nome}
              </Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <MaterialCommunityIcons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Conteúdo */}
            <ScrollView
              style={[globalStyles.mt16]}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
            >
              {gastos.length > 0 ? (
                gastos.map((gasto, index) => (
                  <GastoCartaoCard
                    key={index}
                    transacao={gasto}
                    corCartao={corCartao}
                    onToggleStatus={() => {}}
                    onAdiantar={() => {}}
                  />
                ))
              ) : (
                <Text
                  style={[
                    globalStyles.noDataText,
                    { color: colors.textSecondary, marginTop: 20 },
                  ]}
                >
                  Nenhum gasto encontrado.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
