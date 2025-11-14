// src/components/CartaoCard.js
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import GastoCartaoCard from './GastoCartaoCard';
import { vibrarLeve } from '../utils/haptics';

import { useAdiantamento } from '../hooks/useAdiantamento';
import ModalParcelasAdiantamento from './ModalParcelasAdiantamento';
import AlertaModal from './AlertaModal';

export default function CartaoCard({ cartao = {}, gastos = [], onToggleStatus, onDelete }) {
  const [modalVisivel, setModalVisivel] = useState(false);

  // 🔹 Hook de adiantamento local (cartoes)
  const {
    modalAdiantamentoVisivel,
    parcelasParaAdiantar,
    iniciarAdiantamento,
    confirmarAdiantamento,
    fecharModalAdiantamento,
    alerta,
    setAlerta,
  } = useAdiantamento('cartoes');

  // 🔹 Garantir que cartao.nome exista
  const nomeCartao = cartao.nome || 'Outro';

  // 🔹 Cor segura
  const corCartao =
    colors.byInstitution?.[nomeCartao.trim()] || colors.byInstitution?.Default || '#666';

  // 🔹 Total gasto seguro
  const totalGasto = gastos.reduce((acc, g) => acc + (g.valor || 0), 0);
  const quantidadeGastos = gastos.length;

  const handlePress = () => {
    vibrarLeve();
    setModalVisivel(true);
  };

  const handleClose = () => setModalVisivel(false);

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
            style={[globalStyles.cardTitle, { color: '#fff', fontWeight: '700', flex: 1 }]}
            numberOfLines={1}
          >
            {nomeCartao}
          </Text>
          <MaterialCommunityIcons
            name="credit-card-outline"
            size={22}
            color="#fff"
          />
        </View>

        <View style={globalStyles.mt16}>
          <Text style={[globalStyles.textSecondary, { color: '#ddd' }]}>
            Total gasto
          </Text>
          <Text
            style={[globalStyles.totalAmount, { color: '#fff', fontSize: 26, marginTop: 2 }]}
          >
            R$ {totalGasto.toFixed(2)}
          </Text>
        </View>

        <View style={[globalStyles.rowBetween, globalStyles.mt16]}>
          <Text style={[globalStyles.textSecondary, { color: '#fff' }]}>
            {quantidadeGastos} {quantidadeGastos === 1 ? 'transação' : 'transações'} neste mês
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
                {nomeCartao}
              </Text>
              <TouchableOpacity onPress={handleClose}>
                <MaterialCommunityIcons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Conteúdo */}
            <ScrollView
              style={[globalStyles.mt16]}
              contentContainerStyle={{
                paddingBottom: 40,
                ...(gastos.length === 0 ? { flex: 1, justifyContent: 'center', alignItems: 'center' } : {}),
              }}
              showsVerticalScrollIndicator={false}
            >
              {gastos.length > 0 ? (
                gastos.map((gasto, index) => (
                  <GastoCartaoCard
                    key={gasto.id || index}
                    transacao={gasto}
                    corCartao={corCartao}
                    onToggleStatus={(id, pago) => onToggleStatus?.(id, pago)}
                    onAdiantar={(transacao) => iniciarAdiantamento(transacao)} // <-- integra com o hook
                    onPressItem={() => {}}
                  />
                ))
              ) : (
                <Text
                  style={[
                    globalStyles.noDataText,
                    { color: colors.textSecondary, marginTop: 20, textAlign: 'center' },
                  ]}
                >
                  Nenhuma transação neste cartão.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de adiantamento local (igual ao da tela de empréstimos) */}
      <ModalParcelasAdiantamento
        visivel={modalAdiantamentoVisivel}
        aoFechar={fecharModalAdiantamento}
        parcelasFuturas={parcelasParaAdiantar}
        aoConfirmar={confirmarAdiantamento}
      />

      <AlertaModal
        visible={alerta?.visivel}
        onClose={() => setAlerta({ ...alerta, visivel: false })}
        {...alerta}
      />
    </>
  );
}
