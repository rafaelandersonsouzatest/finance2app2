// import React, { useState, useMemo, useCallback, useEffect } from 'react';
// import {
//   Animated,
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   ScrollView,
//   RefreshControl,
//   FlatList,
//   ActivityIndicator,
// } from 'react-native';
// import { MaterialCommunityIcons } from '@expo/vector-icons';

// import CartaoEmprestadoCard from '../components/GastoCartaoCard';
// import FiltroComponent from '../components/FiltroComponent';
// import EstatisticasComponent from '../components/EstatisticasComponent';
// import { useDateFilter } from '../contexts/DateFilterContext';
// import { useCartoesEmprestados } from '../hooks/useFirestore';
// import { useAdiantamento } from '../hooks/useAdiantamento';
// import ModalCriacao from '../components/ModalCriacao';
// import ModalEdicao from '../components/ModalEdicao';
// import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
// import ModalDetalhes from '../components/ModalDetalhes';
// import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
// import AlertaModal from '../components/AlertaModal';
// import TelaPadrao from '../components/TelaPadrao';
// import { vibrarLeve } from '../utils/haptics';
// import { colors } from '../styles/colors';

// export default function CartoesScreen({ isEmbedded = false }) {
//   const { selectedMonth, selectedYear } = useDateFilter();

//   // Hook Firestore
//   const {
//     cartoes: cartoesData = [],
//     loading,
//     addCartao,
//     updateCartao,
//     deleteCartao,
//     toggleCartaoStatus,
//   } = useCartoesEmprestados(selectedMonth, selectedYear);

//   // Hook de adiantamento (reutilizado) - AGORA COM UM NOME ESPECÍFICO PARA CARTÕES
//   const {
//     modalAdiantamentoVisivel: modalAdiantamentoCartoesVisivel,
//     parcelasParaAdiantar: parcelasParaAdiantarCartoes,
//     iniciarAdiantamento: iniciarAdiantamentoCartoes,
//     confirmarAdiantamento: confirmarAdiantamentoCartoes,
//     fecharModalAdiantamento: fecharModalAdiantamentoCartoes,
//     alerta: alertaAdiantamentoCartoes, // Usar o alerta diretamente
//   } = useAdiantamento('cartoesEmprestados');

//   // Estados locais
//   const [modo, setModo] = useState('gastos');
//   const [filtroCartao, setFiltroCartao] = useState('Todos');
//   const [filtroPessoa, setFiltroPessoa] = useState('Todos');
//   const [fadeAnim] = useState(new Animated.Value(1));
//   const [modalCartaoVisible, setModalCartaoVisible] = useState(false);
//   const [modalPessoaVisible, setModalPessoaVisible] = useState(false);
//   const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
//   const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);
//   const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
//   const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);
//   const [cartaoSelecionado, setCartaoSelecionado] = useState(null);
//   // Removido alertaLocal e useEffect de sincronização

//   // --- Filtros derivados ---
//   const cartoes = useMemo(() => {
//     const unicos = [...new Set(cartoesData.map((i) => i.cartao))];
//     return ['Todos', ...unicos.sort()];
//   }, [cartoesData]);

//   const pessoas = useMemo(() => {
//     const unicos = [...new Set(cartoesData.map((i) => i.pessoa))];
//     return ['Todos', ...unicos.sort()];
//   }, [cartoesData]);

//   const dadosFiltrados = useMemo(() => {
//     return cartoesData.filter(
//       (item) =>
//         (filtroCartao === 'Todos' || item.cartao === filtroCartao) &&
//         (filtroPessoa === 'Todos' || item.pessoa === filtroPessoa)
//     );
//   }, [cartoesData, filtroCartao, filtroPessoa]);

//   // --- Estatísticas ---
//   const estatisticas = useMemo(() => {
//     const total = dadosFiltrados.reduce((acc, it) => acc + (it.valor || 0), 0);
//     const pagos = dadosFiltrados.filter((it) => it.pago).length;
//     const emAberto = dadosFiltrados.filter((it) => !it.pago).length;
//     return { total, pagos, emAberto, totalItens: dadosFiltrados.length };
//   }, [dadosFiltrados]);

//   // --- Agrupamento por cartão ---
//   const agrupadoPorCartao = useMemo(() => {
//     const map = {};
//     dadosFiltrados.forEach((p) => {
//       const key = p.cartao || 'Sem cartão';
//       if (!map[key]) map[key] = { nome: key, parcelas: [], total: 0 };
//       map[key].parcelas.push(p);
//       map[key].total += Number(p.valor || 0);
//     });
//     return Object.values(map).sort((a, b) => b.total - a.total);
//   }, [dadosFiltrados]);

//   // --- Handlers ---
//   const handleAdicionar = useCallback(async (novo) => {
//     await addCartao(novo);
//     setModalCriacaoVisivel(false);
//   }, [addCartao]);

//   const handleEditar = useCallback(async (editado) => {
//     if (!editado?.id) return;
//     await updateCartao(editado.id, editado);
//     setModalEdicaoVisivel(false);
//     setCartaoSelecionado(null);
//   }, [updateCartao]);

//   const handleExcluir = useCallback(async (item) => {
//     if (!item?.id) return;
//     await deleteCartao(item.id);
//     setModalEdicaoVisivel(false);
//     setModalDetalhesVisivel(false);
//     setCartaoSelecionado(null);
//   }, [deleteCartao]);

//   const handleToggleStatus = useCallback(async (item) => {
//     if (!item?.id) return;
//     await toggleCartaoStatus(item.id, item.pago);
//   }, [toggleCartaoStatus]);

//   // --- Filtros / FAB ---
//   const limparFiltros = useCallback(() => {
//     Animated.sequence([
//       Animated.timing(fadeAnim, { toValue: 0.5, duration: 120, useNativeDriver: true }),
//       Animated.timing(fadeAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
//     ]).start();
//     setFiltroCartao('Todos');
//     setFiltroPessoa('Todos');
//   }, [fadeAnim]);

//   const filtrosAtivos = filtroCartao !== 'Todos' || filtroPessoa !== 'Todos';

//   const fabActions = useMemo(() => {
//     const a = [
//       {
//         icon: 'plus',
//         label: 'Adicionar Compra',
//         onPress: () => setModalCriacaoVisivel(true),
//       },
//       {
//         icon: 'filter-variant',
//         label: 'Filtrar por Cartão',
//         onPress: () => setModalCartaoVisible(true),
//       },
//       {
//         icon: 'account-filter-outline',
//         label: 'Filtrar por Pessoa',
//         onPress: () => setModalPessoaVisible(true),
//       },
//     ];
//     if (filtrosAtivos) {
//       a.push({
//         icon: 'filter-variant-remove',
//         label: 'Limpar Filtros',
//         onPress: limparFiltros,
//       });
//     }
//     return a;
//   }, [filtrosAtivos, limparFiltros]);

//   // --- Helpers ---
//   const formataValor = (v = 0) => {
//     try {
//       return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
//     } catch {
//       return `R$ ${Number(v || 0).toFixed(2)}`;
//     }
//   };

//   // --- Render mini faturas ---
//   const renderMiniFatura = ({ nomeCartao, parcelas, total }) => (
//     <View style={styles.cardFatura}>
//       <View style={styles.faturaHeader}>
//         <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//           <MaterialCommunityIcons name="credit-card" size={22} color={colors.primary} />
//           <Text style={[styles.faturaTitle, { color: colors.textPrimary }]}>{`  ${nomeCartao}`}</Text>
//         </View>
//         <Text style={{ color: colors.textSecondary }}>{`Total: ${formataValor(total)}`}</Text>
//       </View>

//       {parcelas.map((p) => (
//         <TouchableOpacity
//           key={p.id}
//           style={styles.faturaItem}
//           onPress={() => {
//             setCartaoSelecionado(p);
//             setModalDetalhesVisivel(true);
//           }}
//         >
//           <Text style={styles.faturaItemTitulo}>{p.descricao || 'Compra'}</Text>
//           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
//             <Text style={styles.faturaItemValor}>{formataValor(p.valor)}</Text>
//             <TouchableOpacity onPress={() => handleToggleStatus(p)}>
//               <MaterialCommunityIcons
//                 name={p.pago ? 'check-circle' : 'calendar-clock'}
//                 size={18}
//                 color={p.pago ? colors.income : colors.pending}
//               />
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       ))}
//     </View>
//   );

//   // --- Conteúdo principal da tela (reutilizável) ---
//   const renderMainContent = () => (
//     <ScrollView
//       contentContainerStyle={{ paddingBottom: isEmbedded ? 20 : 100 }} // Menor padding quando aninhado
//       refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {}} colors={[colors.primary]} />}
//       showsVerticalScrollIndicator={false}
//     >
//       {/* Estatísticas */}
//       <EstatisticasComponent estatisticas={estatisticas} />

//       {/* Filtros ativos */}
//       {filtrosAtivos && (
//         <View style={styles.activeFiltersContainer}>
//           <Text style={styles.activeFiltersText}>
//             {filtroCartao !== 'Todos' && `Cartão: ${filtroCartao}  `}
//             {filtroPessoa !== 'Todos' && `Pessoa: ${filtroPessoa}`}
//           </Text>
//         </View>
//       )}

//       {/* Alternador de modo */}
//       <View style={styles.toggleRow}>
//         <TouchableOpacity
//           style={[styles.toggleButton, modo === 'gastos' && styles.toggleButtonActive]}
//           onPress={() => setModo('gastos')}
//         >
//           <Text style={[styles.toggleText, modo === 'gastos' && styles.toggleTextActive]}>
//             Gastos do mês
//           </Text>
//         </TouchableOpacity>
//         <TouchableOpacity
//           style={[styles.toggleButton, modo === 'cartoes' && styles.toggleButtonActive]}
//           onPress={() => setModo('cartoes')}
//         >
//           <Text style={[styles.toggleText, modo === 'cartoes' && styles.toggleTextActive]}>
//             Por cartão
//           </Text>
//         </TouchableOpacity>
//       </View>

//       {/* Conteúdo */}
//       {modo === 'gastos' ? (
//         dadosFiltrados.length === 0 ? (
//           <View style={styles.emptyContainer}>
//             <MaterialCommunityIcons name="credit-card-off-outline" size={48} color={colors.textSecondary} />
//             <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Nenhuma compra encontrada.</Text>
//           </View>
//         ) : (
//           dadosFiltrados.map((item) => (
//             <TouchableOpacity
//               key={item.id}
//               onPress={() => {
//                 setCartaoSelecionado(item);
//                 setModalDetalhesVisivel(true);
//               }}
//             >
//               <Animated.View style={{ opacity: fadeAnim }}>
//                 <CartaoEmprestadoCard
//                   transacao={item}
//                   corCartao={item.corCartao}
//                   onToggleStatus={() => handleToggleStatus(item)}
//                   onAdiantar={() => {
//                     vibrarLeve();
//                     iniciarAdiantamentoCartoes([item]); // Usar o iniciarAdiantamento específico para cartões
//                   }}
//                 />
//               </Animated.View>
//             </TouchableOpacity>
//           ))
//         )
//       ) : (
//         agrupadoPorCartao.length === 0 ? (
//           <View style={styles.emptyContainer}>
//             <MaterialCommunityIcons name="credit-card-off-outline" size={48} color={colors.textSecondary} />
//             <Text style={{ color: colors.textSecondary, marginTop: 10 }}>Nenhuma fatura encontrada.</Text>
//           </View>
//         ) : (
//           <FlatList
//             data={agrupadoPorCartao}
//             keyExtractor={(item) => item.nome}
//             renderItem={({ item }) => renderMiniFatura({ nomeCartao: item.nome, parcelas: item.parcelas, total: item.total })}
//             contentContainerStyle={{ paddingBottom: 20 }}
//           />
//         )
//       )}
//     </ScrollView>
//   );

//   // --- Renderização Condicional --- //
//   return (
//     <View style={{ flex: 1 }}>
//       {isEmbedded ? (
//         // Renderiza apenas o conteúdo quando em modo aninhado
//         renderMainContent()
//       ) : (
//         // Renderiza a tela completa com TelaPadrao e FabMenu quando não aninhado
//         <TelaPadrao titulo="Cartões" tipo="cartao" fabActions={fabActions}>
//           {renderMainContent()}
//         </TelaPadrao>
//       )}

//       {/* Modais (sempre renderizados, mas controlados por visibilidade) */}
// <FiltroComponent
//         visible={modalCartaoVisible}
//         onClose={() => setModalCartaoVisible(false)} // Correção: onClose em vez de setVisible
//         opcoes={cartoes}
//         valorAtual={filtroCartao}
//         onSelect={setFiltroCartao}
//         titulo="Selecionar Cartão"
//       />

//       {/* Modal para filtrar por pessoa */}
//       <FiltroComponent
//         visible={modalPessoaVisible}
//         onClose={() => setModalPessoaVisible(false)} // Correção: onClose em vez de setVisible
//         opcoes={pessoas}
//         valorAtual={filtroPessoa}
//         onSelect={setFiltroPessoa}
//         titulo="Selecionar Pessoa"
//       />

//       {/* Modal de Criação */}
//       <ModalCriacao
//         visivel={modalCriacaoVisivel}          // Correção: visivel
//         aoFechar={() => setModalCriacaoVisivel(false)} // Correção: aoFechar
//         aoSalvar={handleAdicionar}             // Correção: aoSalvar
//         tipo="cartoesEmprestados"
//         titulo="Nova Compra no Cartão"
//       />

//       {/* Modal de Edição */}
//       <ModalEdicao
//         visivel={modalEdicaoVisivel}          // Correção: visivel
//         aoFechar={() => setModalEdicaoVisivel(false)} // Correção: aoFechar
//         aoSalvar={handleEditar}               // Correção: aoSalvar
//         aoExcluir={() => handleExcluir(cartaoSelecionado)} // Correção: aoExcluir
//         item={cartaoSelecionado}
//         tipo="cartoesEmprestados"
//         titulo="Editar Compra"
//       />

//       {/* Modal de Detalhes */}
//       <ModalDetalhes
//         visible={modalDetalhesVisivel}
//         onClose={() => setModalDetalhesVisivel(false)} // Correção: onClose
//         item={cartaoSelecionado}
//         tipo="cartao" // O ModalDetalhes espera 'cartao', não 'cartoesEmprestados'
//         onEditPress={() => {
//           setModalDetalhesVisivel(false);
//           setModalEdicaoVisivel(true);
//         }}
//         onHistoryPress={() => {
//             if (cartaoSelecionado) {
//                 setHistoricoModalVisivel(true);
//             }
//         }}
//       />

//       {/* Modal de Histórico de Parcelas */}
//       <ModalHistoricoParcelas
//         visible={historicoModalVisivel}
//         onClose={() => setHistoricoModalVisivel(false)} // Correção: onClose
//         item={{
//           idCompra: cartaoSelecionado?.idCompra,
//           descricao: cartaoSelecionado?.descricao,
//           collectionName: 'cartoesEmprestados',
//         }}
//       />

//       {/* Modal de Adiantamento de Parcelas */}
//       <ModalParcelasAdiantamento
//         visivel={modalAdiantamentoCartoesVisivel} // Correção: visivel
//         aoFechar={fecharModalAdiantamentoCartoes}   // Correção: aoFechar
//         parcelasFuturas={parcelasParaAdiantarCartoes} // Correção: parcelasFuturas
//         aoConfirmar={confirmarAdiantamentoCartoes} // Correção: aoConfirmar
//       />

//       {/* Alerta Modal (vindo do hook de adiantamento) */}
//       <AlertaModal
//         visible={alertaAdiantamentoCartoes?.visivel}
//         onClose={() => {
//             // Se o alerta tiver um onCancel, use-o para fechar, senão use a função do hook
//             if (alertaAdiantamentoCartoes?.botoes?.find(b => b.style === 'primary')) {
//                 const cancelButton = alertaAdiantamentoCartoes.botoes.find(b => b.style === 'primary');
//                 cancelButton.onPress();
//             }
//         }}
//         {...alertaAdiantamentoCartoes}
//       />
//     </View>
//   );
// }
// const styles = StyleSheet.create({
//   toggleRow: {
//     flexDirection: 'row',
//     justifyContent: 'center',
//     marginVertical: 15,
//     backgroundColor: colors.backgroundSecondary,
//     borderRadius: 8,
//     overflow: 'hidden',
//     marginHorizontal: 20,
//   },
//   toggleButton: {
//     flex: 1,
//     paddingVertical: 10,
//     alignItems: 'center',
//   },
//   toggleButtonActive: {
//     backgroundColor: colors.primary,
//   },
//   toggleText: {
//     color: colors.textSecondary,
//     fontWeight: 'bold',
//   },
//   toggleTextActive: {
//     color: colors.white,
//   },
//   emptyContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     marginTop: 50,
//   },
//   cardFatura: {
//     backgroundColor: colors.backgroundSecondary,
//     borderRadius: 10,
//     marginHorizontal: 20,
//     marginVertical: 8,
//     padding: 15,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.2,
//     shadowRadius: 1.41,
//     elevation: 2,
//   },
//   faturaHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 10,
//     paddingBottom: 10,
//     borderBottomWidth: 1,
//     borderBottomColor: colors.border,
//   },
//   faturaTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   faturaItem: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     paddingVertical: 8,
//     borderBottomWidth: 0.5,
//     borderBottomColor: colors.border,
//   },
//   faturaItemTitulo: {
//     fontSize: 14,
//     color: colors.textPrimary,
//   },
//   faturaItemValor: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: colors.textPrimary,
//   },
//   activeFiltersContainer: {
//     marginHorizontal: 20,
//     marginTop: 10,
//     padding: 10,
//     backgroundColor: colors.backgroundSecondary,
//     borderRadius: 8,
//     borderLeftWidth: 4,
//     borderLeftColor: colors.primary,
//   },
//   activeFiltersText: {
//     color: colors.textPrimary,
//     fontSize: 14,
//     fontWeight: '500',
//   },
// });






















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

