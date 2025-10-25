import { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useCartoesEmprestados } from '../hooks/useFirestore';
import { useAdiantamento } from '../hooks/useAdiantamento';
import EstatisticasComponent from '../components/EstatisticasComponent';
import GastoCartaoCard from '../components/GastoCartaoCard';
import CartaoCard from '../components/CartaoCard';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import AlertaModal from '../components/AlertaModal';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import ModernTabs from '../components/ModernTabs';

export default function CartoesScreen({
  isEmbedded = false,
  onPressItem,
  onDeleteItem,
}) {
  const { selectedMonth, selectedYear } = useDateFilter();
  const {
    cartoes: cartoesData = [],
    updateCartao,
    deleteCartao,
    toggleCartaoStatus,
  } = useCartoesEmprestados(selectedMonth, selectedYear);

  const {
    modalAdiantamentoVisivel,
    parcelasParaAdiantar,
    iniciarAdiantamento,
    confirmarAdiantamento,
    fecharModalAdiantamento,
    alerta,
    setAlerta,
  } = useAdiantamento('cartoesEmprestados');

  const [abaInterna, setAbaInterna] = useState('mes');

  // 🔹 Agrupar gastos por cartão
  const agrupadoPorCartao = useMemo(() => {
    const grupos = {};
    cartoesData.forEach((item) => {
      const nome = item.cartao || 'Outro';
      if (!grupos[nome]) grupos[nome] = [];
      grupos[nome].push(item);
    });
    return Object.entries(grupos).map(([nome, gastos]) => ({
      nome,
      gastos,
    }));
  }, [cartoesData]);

  // 🔹 Estatísticas gerais
  const estatisticas = useMemo(
    () => ({
      total: cartoesData.reduce((acc, it) => acc + (it.valor || 0), 0),
      pagos: cartoesData.filter((it) => it.pago).length,
      emAberto: cartoesData.filter((it) => !it.pago).length,
      totalItens: cartoesData.length,
    }),
    [cartoesData]
  );

  const handleToggleStatus = async (id, pago) => {
    await toggleCartaoStatus(id, pago);
  };

  const handleExcluir = async (item) => {
    if (!item?.id) return;
    await deleteCartao(item.id);
  };

  return (
    <View style={{ flex: 1 }}>

      {/* 🔹 Abas internas abaixo do cabeçalho */}
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
          {cartoesData.length === 0 ? (
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
            cartoesData.map((item) => (
              <GastoCartaoCard
                key={item.id}
                transacao={item}
                corCartao={item.corCartao}
                onPressItem={() => onPressItem?.(item)}
                onToggleStatus={() => handleToggleStatus(item.id, item.pago)}
                onAdiantar={() => iniciarAdiantamento([item])}
                onDelete={() =>
                  isEmbedded ? onDeleteItem?.(item) : handleExcluir(item)
                }
              />
            ))
          )}
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
        </ScrollView>
      </ModernTabs>

      {/* 🔹 Modais (somente se não estiver embutido) */}
      {!isEmbedded && (
        <>
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
      )}
    </View>
  );
}

