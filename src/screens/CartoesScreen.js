// src/screens/CartoesScreen.js
import { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useCartoes } from '../hooks/useCartoes';
import { useAdiantamento } from '../hooks/useAdiantamento';
import GastoCartaoCard from '../components/GastoCartaoCard';
import CartaoCard from '../components/CartaoCard';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import AlertaModal from '../components/AlertaModal';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import ModernTabs from '../components/ModernTabs';

const extractDate = (item) => {
  const possible = [
    item.dataVencimento,
    item.vencimento,
    item.dataPagamento,
    item.data,
    item.createdAt,
  ];
  for (const d of possible) {
    if (!d) continue;
    if (d instanceof Date) return d;
    const parsed = new Date(d);
    if (!isNaN(parsed)) return parsed;
  }
  return new Date(8640000000000000);
};

export default function CartoesScreen({ isEmbedded = false, onPressItem, onDeleteItem }) {
  const { selectedMonth, selectedYear } = useDateFilter();
  const { cartoes: cartoesData = [], updateCartao, deleteCartao, toggleCartaoStatus } =
    useCartoes(selectedMonth, selectedYear);

  const {
    modalAdiantamentoVisivel,
    parcelasParaAdiantar,
    iniciarAdiantamento,
    confirmarAdiantamento,
    fecharModalAdiantamento,
    alerta,
    setAlerta,
  } = useAdiantamento('cartoes');

  const [abaInterna, setAbaInterna] = useState('mes');

  const sortedCartoes = useMemo(() => {
    return [...cartoesData].sort((a, b) => {
      const dateA = extractDate(a);
      const dateB = extractDate(b);
      const diff = dateA - dateB;
      if (diff !== 0) return diff;
      return (a.descricao || '').localeCompare(b.descricao || '');
    });
  }, [cartoesData]);

  const agrupadoPorCartao = useMemo(() => {
    const grupos = {};
    sortedCartoes.forEach((item) => {
      const nome =
        typeof item.cartao === 'string'
          ? item.cartao
          : item.cartao?.nome || 'Outro';
      if (!grupos[nome]) grupos[nome] = [];
      grupos[nome].push(item);
    });
    return Object.entries(grupos).map(([nome, gastos]) => ({
      nome,
      gastos,
    }));
  }, [sortedCartoes]);

  const handleToggleStatus = async (id, pago) => {
    await toggleCartaoStatus(id, pago);
  };

  const handleExcluir = async (item) => {
    if (!item?.id) return;
    await deleteCartao(item.id);
  };

  return (
    <View style={{ flex: 1 }}>
      <ModernTabs
        tabs={[
          { key: 'mes', label: 'Gastos do mês', icon: 'calendar-month-outline' },
          { key: 'cartoes', label: 'Por Cartão', icon: 'credit-card-multiple-outline' },
        ]}
        activeTab={abaInterna}
        setActiveTab={setAbaInterna}
      >
        {/* 🔹 Aba: Gastos do mês */}
        <ScrollView
          tabKey="mes"
          style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {sortedCartoes.length === 0 ? (
            <View style={globalStyles.emptyContainer}>
              <MaterialCommunityIcons
                name="credit-card-off-outline"
                size={48}
                color="#666"
              />
              <Text style={globalStyles.noDataText}>
                Nenhuma compra encontrada neste mês.
              </Text>
            </View>
          ) : (
            sortedCartoes.map((item) => (
              <GastoCartaoCard
                key={item.id}
                transacao={item}
                corCartao={item.corCartao || colors.byInstitution.Default}
                onPressItem={() => onPressItem?.(item)}
                onToggleStatus={() => handleToggleStatus(item.id, item.pago)}
                onAdiantar={() => iniciarAdiantamento(item)}
                onDelete={() =>
                  isEmbedded ? onDeleteItem?.(item) : handleExcluir(item)
                }
              />
            ))
          )}

          {/* ✅ Modal dentro da aba “Gastos do mês” */}
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
        </ScrollView>

        {/* 🔹 Aba: Por Cartão */}
        <ScrollView
          tabKey="cartoes"
          style={{ flex: 1, paddingHorizontal: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {agrupadoPorCartao.length === 0 ? (
            <View style={globalStyles.emptyContainer}>
              <MaterialCommunityIcons
                name="credit-card-multiple-outline"
                size={48}
                color="#666"
              />
              <Text style={globalStyles.noDataText}>
                Nenhum cartão encontrado.
              </Text>
            </View>
          ) : (
            agrupadoPorCartao.map(({ nome, gastos }) => (
              <CartaoCard key={nome} cartao={{ nome }} gastos={gastos} />
            ))
          )}

          {/* ✅ Modal também dentro da aba “Por Cartão” */}
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
        </ScrollView>
      </ModernTabs>
    </View>
  );
}
