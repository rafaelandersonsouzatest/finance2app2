import React, { useState, useMemo } from 'react';
import { Animated, View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Componentes e Hooks
import GastoCartaoCard from '../components/GastoCartaoCard';
import FiltroComponent from '../components/FiltroComponent';
import EstatisticasComponent from '../components/EstatisticasComponent';
import { useDateFilter } from '../contexts/DateFilterContext';
import ModalCriacao from '../components/ModalCriacao';
import ModalEdicao from '../components/ModalEdicao';
import TelaPadrao from '../components/TelaPadrao';
import { useCartoesEmprestados } from '../hooks/useFirestore';
import { useAdiantamento } from '../hooks/useAdiantamento';
import ModalParcelasAdiantamento from '../components/ModalParcelasAdiantamento';
import ModalDetalhes from '../components/ModalDetalhes';
import ModalHistoricoParcelas from '../components/ModalHistoricoParcelas';
import { vibrarLeve } from '../utils/haptics';

export default function CartoesEmprestadosScreen() {
  const { selectedMonth, selectedYear } = useDateFilter();
  const { cartoes: cartoesEmprestados, loading, addCartao, updateCartao, deleteCartao, toggleCartaoStatus } =
    useCartoesEmprestados(selectedMonth, selectedYear);
  const { modalAdiantamentoVisivel, parcelasParaAdiantar, iniciarAdiantamento, confirmarAdiantamento, fecharModalAdiantamento } =
    useAdiantamento('cartoesEmprestados');

  // Estados
  const [filtroCartao, setFiltroCartao] = useState('Todos');
  const [filtroPessoa, setFiltroPessoa] = useState('Todos');
  const [modalCartaoVisible, setModalCartaoVisible] = useState(false);
  const [modalPessoaVisible, setModalPessoaVisible] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);
  const [cartaoSelecionado, setCartaoSelecionado] = useState(null);
  const [historicoModalVisivel, setHistoricoModalVisivel] = useState(false);

  // --- Memos para otimização ---
  const cartoes = useMemo(() => {
    const cartoesUnicos = [...new Set(cartoesEmprestados.map(item => item.cartao))];
    return ['Todos', ...cartoesUnicos.sort()];
  }, [cartoesEmprestados]);

  const pessoas = useMemo(() => {
    const pessoasUnicas = [...new Set(cartoesEmprestados.map(item => item.pessoa))];
    return ['Todos', ...pessoasUnicas.sort()];
  }, [cartoesEmprestados]);

  const dadosFiltrados = useMemo(() => {
    const filtrados = cartoesEmprestados.filter(
      item =>
        (filtroCartao === 'Todos' || item.cartao === filtroCartao) &&
        (filtroPessoa === 'Todos' || item.pessoa === filtroPessoa)
    );

    // Ordenar por dataCompra (mais recente primeiro) e depois por nome
    return filtrados.sort((a, b) => {
      const dataA = new Date(a.dataCompra || a.dataVencimento || 0);
      const dataB = new Date(b.dataCompra || b.dataVencimento || 0);

      if (dataB - dataA !== 0) return dataB - dataA;
      return (a.descricao || '').localeCompare(b.descricao || '');
    });
  }, [cartoesEmprestados, filtroCartao, filtroPessoa]);

  const estatisticas = useMemo(() => {
    const total = dadosFiltrados.reduce((acc, item) => acc + item.valor, 0);
    const emAberto = dadosFiltrados.filter(item => !item.pago).length;
    const pagos = dadosFiltrados.filter(item => item.pago).length;
    return { total, emAberto, pagos, totalItens: dadosFiltrados.length };
  }, [dadosFiltrados]);

  const limparFiltros = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0.5, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setFiltroCartao('Todos');
    setFiltroPessoa('Todos');
  };

  // --- Handlers ---
  const handleAdicionarCartao = async (novoCartao) => {
    await addCartao(novoCartao);
    setModalCriacaoVisivel(false);
  };

  const handleEditarCartao = async (cartaoAtualizado) => {
    await updateCartao(cartaoAtualizado.id, cartaoAtualizado);
    setModalEdicaoVisivel(false);
    setCartaoSelecionado(null);
  };

  const handleExcluirCartao = async (cartaoParaExcluir) => {
    await deleteCartao(cartaoParaExcluir.id);
    setModalEdicaoVisivel(false);
    setModalDetalhesVisivel(false);
    setCartaoSelecionado(null);
  };

  const handleToggleStatus = (cartao) => {
    if (cartao && cartao.id) {
      toggleCartaoStatus(cartao.id, cartao.pago);
    }
  };

  const filtrosAtivos = filtroCartao !== 'Todos' || filtroPessoa !== 'Todos';

  // --- Ações do FAB ---
  const fabActions = useMemo(() => {
    const acoes = [
      {
        icon: 'plus',
        label: 'Adicionar Compra',
        onPress: () => setModalCriacaoVisivel(true),
        name: 'bt_add',
      },
      {
        icon: 'filter-variant',
        label: 'Filtrar por Cartão',
        onPress: () => setModalCartaoVisible(true),
        name: 'bt_filter_card',
      },
      {
        icon: 'account-filter-outline',
        label: 'Filtrar por Pessoa',
        onPress: () => setModalPessoaVisible(true),
        name: 'bt_filter_person',
      },
    ];

    if (filtrosAtivos) {
      acoes.push({
        icon: 'filter-variant-remove',
        label: 'Limpar Filtros',
        onPress: limparFiltros,
        name: 'bt_clear_filters',
      });
    }

    return acoes;
  }, [filtrosAtivos]);

  return (
    <TelaPadrao
      titulo="Cartões"
      tipo="cartao"
      fabActions={fabActions}
    >
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => {}} colors={["#2196F3"]} tintColor="#2196F3" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <EstatisticasComponent estatisticas={estatisticas} />

        {/* Badge de Filtros Ativos */}
        {filtrosAtivos && (
          <View style={styles.activeFiltersContainer}>
            <Text style={styles.activeFiltersText}>
              Filtros: {filtroCartao !== 'Todos' ? `Cartão (${filtroCartao})` : ''} {filtroPessoa !== 'Todos' ? `Pessoa (${filtroPessoa})` : ''}
            </Text>
          </View>
        )}

        <View style={styles.contadorContainer}>
          <Text style={styles.contadorTexto}>
            {dadosFiltrados.length} {dadosFiltrados.length === 1 ? 'parcela neste mês' : 'parcelas neste mês'}
          </Text>
        </View>

        {dadosFiltrados.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="credit-card-off-outline" size={48} color="#666" />
            <Text style={{ color: '#999', marginTop: 16, fontSize: 16 }}>Nenhuma parcela para este mês.</Text>
          </View>
        ) : (
          dadosFiltrados.map((item) => (
            <TouchableOpacity key={item.id} onPress={() => { setCartaoSelecionado(item); setModalDetalhesVisivel(true); }}>
              <Animated.View style={{ opacity: fadeAnim }}>
                <GastoCartaoCard
                  transacao={item}
                  corCartao={item.corCartao} 
                  onToggleStatus={() => handleToggleStatus(item)}
                  onAdiantar={() => {
                    vibrarLeve();
                    iniciarAdiantamento(item);
                  }}
                />
              </Animated.View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modais */}
      <FiltroComponent visible={modalCartaoVisible} setVisible={setModalCartaoVisible} opcoes={cartoes} valorAtual={filtroCartao} onSelect={setFiltroCartao} titulo="Selecionar Cartão" icone="card-outline" />
      <FiltroComponent visible={modalPessoaVisible} setVisible={setModalPessoaVisible} opcoes={pessoas} valorAtual={filtroPessoa} onSelect={setFiltroPessoa} titulo="Selecionar Pessoa" icone="face-man" />

      <ModalCriacao
        visivel={modalCriacaoVisivel}
        aoFechar={() => setModalCriacaoVisivel(false)}
        aoSalvar={handleAdicionarCartao}
        tipo="cartao"
        titulo="Nova Compra no Cartão"
        mesSelecionado={selectedMonth}
        anoSelecionado={selectedYear}
      />

      <ModalDetalhes
        visible={modalDetalhesVisivel}
        onClose={() => { setModalDetalhesVisivel(false); setCartaoSelecionado(null); }}
        onEditPress={() => { setModalDetalhesVisivel(false); setModalEdicaoVisivel(true); }}
        onHistoryPress={() => setHistoricoModalVisivel(true)}
        item={cartaoSelecionado}
        tipo="cartao" 
      />      

      <ModalEdicao
        visivel={modalEdicaoVisivel}
        aoFechar={() => { setModalEdicaoVisivel(false); setCartaoSelecionado(null); }}
        aoSalvar={handleEditarCartao}
        aoExcluir={() => handleExcluirCartao(cartaoSelecionado)}
        item={cartaoSelecionado}
        tipo="cartao"
        titulo="Editar Compra no Cartão"
      />
      
      <ModalHistoricoParcelas
        visible={historicoModalVisivel}
        onClose={() => setHistoricoModalVisivel(false)}
        item={{ idCompra: cartaoSelecionado?.idCompra, descricao: cartaoSelecionado?.descricao, collectionName: 'cartoesEmprestados' }}
      />

      <ModalParcelasAdiantamento
        visivel={modalAdiantamentoVisivel}
        aoFechar={fecharModalAdiantamento}
        parcelasFuturas={parcelasParaAdiantar}
        aoConfirmar={confirmarAdiantamento}
      />
    </TelaPadrao>
  );
}

const styles = StyleSheet.create({
  contadorContainer: { marginBottom: 12 },
  contadorTexto: { color: '#BBBBBB', fontSize: 14, textAlign: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  activeFiltersContainer: {
    backgroundColor: 'rgba(79, 195, 247, 0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'center',
    marginBottom: 16,
  },
  activeFiltersText: {
    color: '#4FC3F7',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
