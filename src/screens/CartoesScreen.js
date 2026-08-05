// src/screens/CartoesScreen.js
import { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCarteira } from '../hooks/useCarteira';
import GastoCartaoCard from '../components/GastoCartaoCard';
import CartaoCard from '../components/CartaoCard';
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

// =========================================================
// 🔹 Componente de apresentação pura para os gastos do mês (`cartoes`,
// `onToggleStatus`, `onDeleteItem`, `onAdiantarParcelas`, `buscarParcelasDoCartao`
// vêm de SaidasScreen.js, única fonte de verdade de dados/ações — ver
// ARQUITETURA.md seção 19, Sprint de Saneamento). `useCarteira()` continua
// chamado aqui: é uma necessidade própria e única desta tela (metadados dos
// cartões cadastrados para o agrupamento "Por Cartão"), não uma duplicação —
// nenhum outro lugar da árvore usa esse hook. `onDeleteItem` aciona o mesmo
// mecanismo único de exclusão usado por ModalEdicao (ver ARQUITETURA.md
// seção 20) — o ícone de excluir na linha agora funciona.
// =========================================================
export default function CartoesScreen({
  cartoes: cartoesData = [],
  onPressItem,
  onToggleStatus,
  onDeleteItem,
  onAdiantarParcelas,
  buscarParcelasDoCartao,
}) {
  const { cartoesCadastrados } = useCarteira();

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

  // 🔹 Agrupa por cartaoId quando o lançamento referencia um cartão
  // cadastrado (Sprint 6) — usa o cadastro (cor/banco/últimos dígitos) para
  // o resumo visual; cai para o nome (string) só para cartão informal ou
  // lançamentos antigos, sem cartaoId, mesmo critério de antes.
  const agrupadoPorCartao = useMemo(() => {
    const grupos = {};
    sortedCartoes.forEach((item) => {
      const nome =
        typeof item.cartao === 'string'
          ? item.cartao
          : item.cartao?.nome || 'Outro';
      const chave = item.cartaoId || nome;
      if (!grupos[chave]) {
        const cadastro = item.cartaoId
          ? cartoesCadastrados.find((c) => c.id === item.cartaoId)
          : null;
        grupos[chave] = {
          cartao: cadastro || { nome, cor: item.corCartao || colors.byInstitution.Default },
          gastos: [],
        };
      }
      grupos[chave].gastos.push(item);
    });
    return Object.values(grupos);
  }, [sortedCartoes, cartoesCadastrados]);

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
                onToggleStatus={() => onToggleStatus?.(item.id, item.pago)}
                onAdiantar={() => onAdiantarParcelas?.(item)}
                onDelete={() => onDeleteItem?.(item)}
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
            agrupadoPorCartao.map(({ cartao, gastos }) => (
              <CartaoCard
                key={cartao.id || cartao.nome}
                cartao={cartao}
                gastos={gastos}
                onPressItem={onPressItem}
                onAdiantarParcelas={onAdiantarParcelas}
                buscarParcelasDoCartao={buscarParcelasDoCartao}
              />
            ))
          )}
        </ScrollView>
      </ModernTabs>
    </View>
  );
}
