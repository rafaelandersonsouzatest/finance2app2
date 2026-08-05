// src/components/CartaoCard.js
// Resumo por cartão (Saídas → Cartões → Por Cartão) — deixou de ser um
// simples filtro (total + lista) para ser um resumo de verdade da entidade
// Cartão (Sprint 6): visual do cartão no topo (mesmo CartaoVisual usado em
// Gerenciar Cartões — nenhum componente duplicado), indicadores, e a lista
// de compras enriquecida (descrição, valor total, parcela atual, comprador,
// categoria, status). Ao abrir, busca todo o histórico do cartão (todos os
// meses), não só o mês em exibição — os indicadores (parcelas futuras,
// próximo vencimento) não têm como ser calculados só com os dados do mês
// atual (ver useCartoes.buscarParcelasDoCartao).
import { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { vibrarLeve } from '../utils/haptics';
import CartaoVisual from './CartaoVisual';

function Indicador({ label, valor, cor }) {
  return (
    <View style={{ width: '50%', paddingVertical: 8, paddingRight: 8 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: cor || colors.textPrimary, fontSize: 16, fontWeight: '700', marginTop: 2 }}>
        {valor}
      </Text>
    </View>
  );
}

function ItemCompraResumo({ item, onPress, onAdiantar }) {
  const nomeComprador = typeof item.pessoa === 'object' ? item.pessoa?.nome : item.pessoa;
  const nomeCategoria = typeof item.categoria === 'object' ? item.categoria?.nome : item.categoria;
  const statusTexto = item.quitada ? 'Quitada' : item.adiantada ? 'Antecipada' : item.pago ? 'Paga' : 'Pendente';
  const statusCor = item.quitada
    ? colors.entrada
    : item.adiantada
    ? colors.chartPurple
    : item.pago
    ? colors.entrada
    : colors.pending;
  // 🔹 Mesma condição de GastoCartaoCard.js para mostrar o atalho de
  // antecipar — não remove essa ação, só reorganiza onde ela aparece.
  const podeAntecipar = (item.totalParcelas || 1) > 1 && !item.pago && !item.adiantada && onAdiantar;

  return (
    <TouchableOpacity
      style={[globalStyles.listItem, { flexDirection: 'column', alignItems: 'stretch' }]}
      onPress={onPress}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={[globalStyles.listItemTitle, { flex: 1, marginRight: 8 }]} numberOfLines={1}>
          {item.descricao}
        </Text>
        <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
          R$ {Number(item.valorTotal || item.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1, marginRight: 8 }} numberOfLines={1}>
          Parcela {item.parcelaAtual}/{item.totalParcelas} · {nomeComprador || 'Sem comprador'} ·{' '}
          {nomeCategoria || 'Sem categoria'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {podeAntecipar && (
            <TouchableOpacity
              style={[globalStyles.iconButton, globalStyles.iconButtonWarning, { marginRight: 8 }]}
              onPress={(e) => {
                e.stopPropagation?.();
                onAdiantar(item);
              }}
            >
              <MaterialCommunityIcons name="rocket-launch-outline" size={14} color={colors.pending} />
            </TouchableOpacity>
          )}
          <Text style={{ color: statusCor, fontSize: 12, fontWeight: '600' }}>{statusTexto}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// =========================================================
// 🔹 `buscarParcelasDoCartao` e `onAdiantarParcelas` vêm de SaidasScreen.js
// (via CartoesScreen.js) — antes, este componente chamava `useCartoes()` e
// `useAdiantamento('cartoes')` por conta própria, criando um par extra de
// listeners do Firestore para CADA cartão cadastrado exibido na aba "Por
// Cartão" (ver ARQUITETURA.md seção 19, Sprint de Saneamento). O modal de
// resumo (indicadores + lista de compras) abaixo continua 100% local — não
// duplica nada, é uma necessidade própria deste componente.
// =========================================================
export default function CartaoCard({ cartao = {}, gastos = [], onPressItem, onAdiantarParcelas, buscarParcelasDoCartao }) {
  const [modalVisivel, setModalVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [historicoCompleto, setHistoricoCompleto] = useState(null);

  const handlePress = async () => {
    vibrarLeve();
    setModalVisivel(true);
    setCarregando(true);
    try {
      const dados = await buscarParcelasDoCartao({ cartaoId: cartao.id, nomeCartao: cartao.nome });
      setHistoricoCompleto(dados);
    } catch (err) {
      console.error('Erro ao buscar histórico do cartão:', err);
      setHistoricoCompleto(gastos); // 🔹 sem histórico completo, mostra ao menos o mês atual
    } finally {
      setCarregando(false);
    }
  };

  const handleClose = () => setModalVisivel(false);

  // 🔹 Enquanto o histórico completo não chega, mostra o que já se tem (mês
  // atual) — os indicadores que dependem de outros meses só ficam corretos
  // depois do carregamento, mas a tela nunca fica vazia.
  const parcelas = historicoCompleto || gastos;

  const resumo = useMemo(() => {
    // 🔹 Agrupa por compra (idCompra) — a lista mostrada ao usuário é de
    // COMPRAS, não de parcelas soltas (uma compra de 10x não deve aparecer
    // 10 vezes). Para cada compra, a "parcela atual" exibida é a primeira
    // ainda pendente (o que falta resolver); se todas já estão pagas, usa a
    // última — mesmo raciocínio de "compra quitada" já usado em
    // ModalHistoricoParcelas.js.
    const gruposPorCompra = {};
    parcelas.forEach((p) => {
      const chave = p.idCompra || p.id;
      if (!gruposPorCompra[chave]) gruposPorCompra[chave] = [];
      gruposPorCompra[chave].push(p);
    });

    const compras = Object.values(gruposPorCompra).map((grupo) => {
      const ordenado = [...grupo].sort((a, b) => (a.parcelaAtual || 0) - (b.parcelaAtual || 0));
      const pendente = ordenado.find((p) => !p.pago && !p.adiantada);
      const representativa = pendente || ordenado[ordenado.length - 1] || ordenado[0];
      const quitada = !pendente;
      return { ...representativa, quitada };
    });

    const hojeISO = new Date().toISOString().split('T')[0];

    const saldoUtilizado = parcelas.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
    const totalCompras = compras.reduce((acc, c) => acc + (Number(c.valorTotal) || 0), 0);
    const parcelasPagas = parcelas.filter((p) => p.pago || p.adiantada).length;
    const parcelasFuturas = parcelas.filter((p) => p.dataVencimento > hojeISO).length;
    const maiorCompra = compras.reduce((max, c) => Math.max(max, Number(c.valorTotal) || 0), 0);
    const proximoVencimento = parcelas
      .filter((p) => !p.pago && !p.adiantada && p.dataVencimento)
      .map((p) => p.dataVencimento)
      .sort()[0];

    return {
      compras,
      saldoUtilizado,
      totalCompras,
      quantidadeCompras: compras.length,
      parcelasFuturas,
      parcelasPagas,
      parcelasPendentes: parcelas.length - parcelasPagas,
      maiorCompra,
      proximoVencimento: proximoVencimento
        ? new Date(proximoVencimento + 'T00:00:00').toLocaleDateString('pt-BR')
        : '—',
    };
  }, [parcelas]);

  // 🔹 Quantas compras (não parcelas) tiveram alguma parcela neste mês —
  // mostrado no próprio desenho do cartão na lista "Por Cartão", como já
  // acontecia antes da Sprint 6 (achado do usuário: a info tinha sumido).
  const comprasNoMesAtual = new Set(gastos.map((g) => g.idCompra || g.id)).size;
  const resumoMesTexto =
    comprasNoMesAtual > 0
      ? `${comprasNoMesAtual} ${comprasNoMesAtual === 1 ? 'compra' : 'compras'} este mês`
      : 'Nenhuma compra este mês';

  const formatarMoeda = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <>
      <View style={{ marginBottom: 16 }}>
        <CartaoVisual cartao={cartao} onPress={handlePress} resumoMes={resumoMesTexto} />
      </View>

      <Modal visible={modalVisivel} animationType="slide" transparent onRequestClose={handleClose}>
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContainer, { maxHeight: '88%' }]}>
            <View style={globalStyles.modalHeader}>
              <Text style={globalStyles.modalTitle}>{cartao.nome || 'Cartão'}</Text>
              <TouchableOpacity onPress={handleClose}>
                <MaterialCommunityIcons name="close-circle" size={28} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <CartaoVisual cartao={cartao} />

              {carregando ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
              ) : (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      marginTop: 16,
                      borderTopWidth: 1,
                      borderTopColor: colors.borderLight,
                      paddingTop: 8,
                    }}
                  >
                    <Indicador label="Saldo utilizado" valor={formatarMoeda(resumo.saldoUtilizado)} />
                    <Indicador label="Total de compras" valor={formatarMoeda(resumo.totalCompras)} />
                    <Indicador label="Quantidade de compras" valor={resumo.quantidadeCompras} />
                    <Indicador label="Maior compra" valor={formatarMoeda(resumo.maiorCompra)} />
                    <Indicador label="Parcelas futuras" valor={resumo.parcelasFuturas} />
                    <Indicador label="Parcelas pagas" valor={resumo.parcelasPagas} cor={colors.entrada} />
                    <Indicador label="Parcelas pendentes" valor={resumo.parcelasPendentes} cor={colors.pending} />
                    <Indicador label="Próximo vencimento" valor={resumo.proximoVencimento} />
                  </View>

                  <Text
                    style={[
                      globalStyles.label,
                      { marginTop: 16, marginBottom: 4, borderTopWidth: 1, borderTopColor: colors.borderLight, paddingTop: 12 },
                    ]}
                  >
                    Compras
                  </Text>

                  {resumo.compras.length > 0 ? (
                    resumo.compras.map((item) => (
                      <ItemCompraResumo
                        key={item.idCompra || item.id}
                        item={item}
                        onPress={() => onPressItem?.(item)}
                        onAdiantar={onAdiantarParcelas}
                      />
                    ))
                  ) : (
                    <Text style={[globalStyles.noDataText, { marginTop: 12 }]}>
                      Nenhuma compra neste cartão.
                    </Text>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
