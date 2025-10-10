import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useVisibility } from '../contexts/VisibilityContext';
import MonthYearPicker from '../components/MonthYearPicker';
import ModalCriacao from '../components/ModalCriacao';
import ModalEdicao from '../components/ModalEdicao';
import ModalDetalhes from './ModalDetalhes';
import ToggleVisibilidade from '../components/ToggleVisibilidade';
import { vibrarLeve, vibrarSucesso, vibrarAlerta, vibrarMedio } from '../utils/haptics';
import FabMenu from '../components/FabMenu'; // ✨ 1. Importa o FabMenu

const InfoRow = ({ icon, label, value, color = colors.textPrimary, isMonetary = false }) => {
  const { formatValue } = useVisibility();

  const displayValue = isMonetary ? formatValue(value) : String(value ?? '');

  return (
    <View style={globalStyles.infoRow}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={colors.textSecondary}
        style={globalStyles.infoRowIcon}
      />
      <View>
        <Text style={globalStyles.infoRowLabel}>{label}</Text>
        <Text style={[globalStyles.infoRowValue, { color: color }]}>{displayValue}</Text>
      </View>
    </View>
  );
};

export default function TelaPadrao({
  titulo,
  tipo,
  dados = [],
  total = 0,
  onAdd,
  onEdit,
  onDelete,
  onToggleStatus,
  getIconePorCategoria = () => 'cash',
  onPressItem,
  onAdiantarParcelas,
  children,
  renderCustomItem,
  hideAddButton = false,
  hideDateFilter = false,
  refreshing = false,
  setRefreshing = () => {},
  onHistoryPress,
  contentContainerStyle,
  fabActions = [],
  disableDefaultList = false,
}) {
  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);
  const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState(null);

  const {
    selectedMonth,
    selectedYear,
    updateFilter,
    resetToCurrentMonth,
    isCurrentMonth,
  } = useDateFilter();

  const { formatValue } = useVisibility();

  const loading = false;

  const handleAbrirDetalhes = (item) => {
    onPressItem?.(item);
    setItemSelecionado(item);
    setModalDetalhesVisivel(true);
  };

  const handleAbrirEdicao = () => {
    vibrarLeve();
    setModalDetalhesVisivel(false);
    setModalEdicaoVisivel(true);
  };

  const handleSalvarEdicao = (itemAtualizado) => {
    vibrarSucesso();
    const itemCompleto = {
      ...itemAtualizado,
      id: itemSelecionado?.id,
      mes: selectedMonth,
      ano: selectedYear,
      icone: getIconePorCategoria(itemAtualizado.categoria),
      pago: itemSelecionado?.pago || false,
    };
    onEdit(itemCompleto);
    setModalEdicaoVisivel(false);
    setItemSelecionado(null);
  };

  const handleExcluir = () => {
    vibrarAlerta();
    if (!itemSelecionado?.id) return;
    onDelete(itemSelecionado);
    setModalEdicaoVisivel(false);
    setItemSelecionado(null);
  };

  const handleSalvarCriacao = (novoItem) => {
    const itemCompleto = {
      ...novoItem,
      pago: false,
      mes: selectedMonth,
      ano: selectedYear,
      icone: getIconePorCategoria(novoItem.categoria),
    };
    onAdd(itemCompleto);
    setModalCriacaoVisivel(false);
  };

  const renderResumoItem = (tipo, item) => {
    switch (tipo) {
      case 'entrada':
        return (
          <Text style={globalStyles.listItemSubtitle}>
            {item.categoria} • Receb:{' '}
            {item.data
              ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')
              : ''}
          </Text>
        );
      case 'gasto':
        return (
          <Text style={globalStyles.listItemSubtitle}>
            {item.categoria} • Venc:{' '}
            {item.dataVencimento
              ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')
              : ''}
          </Text>
        );
      case 'emprestimo':
        return (
          <Text style={globalStyles.listItemSubtitle}>
            {item.pessoa} • {item.parcelaAtual}/{item.totalParcelas}
          </Text>
        );
      case 'investimento': {
        const valorAtual = Number(item?.valorAtual) || 0;
        const meta = Number(item?.meta) || 0;
        const temMeta = meta > 0;
        const percentual = temMeta ? (valorAtual / meta) * 100 : 0;

        return (
          <>
            {temMeta && (
              <View style={{ marginTop: 8 }}>
                <View style={globalStyles.progressBackground}>
                  <View style={[globalStyles.progressFill, { width: `${percentual}%` }]} />
                </View>
                <View style={[globalStyles.rowBetween, { marginTop: 4 }]}>
                  <Text style={globalStyles.listItemSubtitle}>
                    Meta: {formatValue(meta)}
                  </Text>
                  <Text style={globalStyles.listItemSubtitle}>{percentual.toFixed(1)}%</Text>
                </View>
              </View>
            )}
          </>
        );
      }
      default:
        return null;
    }
  };

  const renderModalDetailsContent = () => {
    if (!itemSelecionado) return null;

    const item = itemSelecionado;
    const statusCor = item.pago ? colors.balance : colors.pending;

    if (tipo === 'entrada') {
      const dataExibicao = item.data
        ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'Não informada';

      return (
        <>
          <InfoRow icon="cash" label="Valor" value={item.valor} color={colors.income} isMonetary={true} />
          <InfoRow icon="shape-outline" label="Categoria" value={item.categoria || 'Não informada'} />
          <InfoRow icon="calendar-arrow-left" label="Data do Recebimento" value={dataExibicao} />
          <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status" value={item.pago ? "Recebido" : "Pendente"} color={statusCor} />
        </>
      );
    }

    if (tipo === 'gasto') {
      const dataExibicao = item.dataVencimento
        ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'Não informada';

      return (
        <>
          <InfoRow icon="cash" label="Valor" value={item.valor} color={colors.expense} isMonetary={true} />
          <InfoRow icon="shape-outline" label="Categoria" value={item.categoria || 'Não informada'} />
          <InfoRow icon="calendar-arrow-right" label="Data de Vencimento" value={dataExibicao} />
          <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status" value={item.pago ? "Pago" : "Pendente"} color={statusCor} />
        </>
      );
    }

    if (tipo === 'emprestimo') {
      const dataExibicao = item.dataVencimento
        ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'Não informada';

      return (
        <>
          <InfoRow icon="cash" label="Valor da Parcela" value={item.valor} color={colors.expense} isMonetary={true} />
          <InfoRow icon="account-group-outline" label="Pessoa/Instituição" value={item.pessoa || 'Não informada'} />
          <InfoRow icon="calendar-arrow-right" label="Vencimento da Parcela" value={dataExibicao} />
          <InfoRow
            icon="chart-donut"
            label="Progresso"
            value={`${item.parcelaAtual} de ${item.totalParcelas}`}
          />
          <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status" value={item.pago ? "Paga" : "Pendente"} color={statusCor} />
        </>
      );
    }

    if (tipo === 'cartao') {
      const dataCompraFormatada = item.dataCompra
        ? new Date(item.dataCompra + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'Não informada';
      const valorTotalCompra = Number(item.valorTotal || (item.valor * item.totalParcelas)) || 0;

      return (
        <>
          <InfoRow icon="cash" label="Valor da Parcela" value={item.valor} color={colors.expense} isMonetary={true} />
          <InfoRow icon="credit-card-outline" label="Cartão" value={item.cartao || 'Não informado'} />
          <InfoRow icon="account-group-outline" label="Pessoa" value={item.pessoa || 'Não informada'} />
          <InfoRow
            icon="chart-donut"
            label="Progresso"
            value={`${item.parcelaAtual} de ${item.totalParcelas}`}
          />
          <InfoRow icon="calendar-star" label="Data da Compra" value={dataCompraFormatada} />
          <InfoRow icon="cash-multiple" label="Valor Total da Compra" value={valorTotalCompra} isMonetary={true} />
          <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status da Parcela" value={item.pago ? "Paga" : "Pendente"} color={statusCor} />
        </>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <SafeAreaView style={[globalStyles.container, globalStyles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={globalStyles.loadingText}>Carregando...</Text>
      </SafeAreaView>
    );
  }

  const renderHeader = () => (
    <View style={globalStyles.header}>
      <Text style={globalStyles.headerTitle}>{titulo}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ToggleVisibilidade size={20} />
        {!hideDateFilter && (
          <MonthYearPicker
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onSelect={updateFilter}
            compact
            showNavigation
            resetToCurrentMonth={resetToCurrentMonth}
            isCurrentMonth={isCurrentMonth}
          />
        )}
      </View>
    </View>
  );

  if (tipo === 'resumo') {
    return (
      <SafeAreaView style={globalStyles.container}>
        <ScrollView style={globalStyles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>
          {renderHeader()}
          <View style={[globalStyles.sectionContainer, contentContainerStyle]}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (tipo === 'cartao') {
    return (
      <SafeAreaView style={globalStyles.container}>
        <ScrollView style={globalStyles.scrollView} contentContainerStyle={{ paddingBottom: 24 }}>
          {renderHeader()}
          <View style={globalStyles.sectionContainer}>{children}</View>
        </ScrollView>

        {/* ✨ 3. Lógica de renderização do botão flutuante ATUALIZADA */}
        {!hideAddButton && fabActions.length > 0 ? (
          <FabMenu actions={fabActions} />
        ) : !hideAddButton ? (
          <TouchableOpacity
            style={globalStyles.fabPrimary}
            onPress={() => {
              vibrarMedio();
              setModalCriacaoVisivel(true);
            }}
          >
            <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
          </TouchableOpacity>
        ) : null}

      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={globalStyles.container}>
      <ScrollView style={globalStyles.scrollView} contentContainerStyle={{ paddingBottom: 80 }}>
        {renderHeader()}

        {/* Card com total */}
        <View style={globalStyles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={globalStyles.cardTitle}>
                {tipo === 'investimento' ? 'Total Investido' : 'Total do Mês'}
              </Text>
              <Text
                style={[
                  globalStyles.totalAmount,
                  tipo === 'investimento' && { color: colors.primary },
                ]}
              >
                {formatValue(total)}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={getIconePorCategoria(titulo)}
              size={40}
              color={colors.primary}
            />
          </View>
        </View>

        {/* 👇 ADIÇÃO: agora os children aparecem antes da lista */}
        {children && <View style={{ marginTop: 10 }}>{children}</View>}

        {/* Lista de itens padrão */}
        {!disableDefaultList && (
        dados.length > 0 ? (
          dados.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={globalStyles.listItem}
              onPress={() => {
                vibrarLeve();
                if (tipo === 'investimento') {
                  onPressItem?.(item);
                } else {
                  handleAbrirDetalhes(item);
                }
              }}
            >
              <View style={globalStyles.listItemContent}>
                <MaterialCommunityIcons
                  name={getIconePorCategoria(item.categoria || item.instituicao)}
                  size={24}
                  color={colors.textPrimary}
                  style={globalStyles.listItemIcon}
                />
                <View style={globalStyles.listItemInfo}>
                  <View style={globalStyles.rowBetween}>
                    <Text style={globalStyles.listItemTitle}>
                      {item.nome || item.descricao || 'Sem título'}
                    </Text>
                    {tipo === 'investimento' && (
                      <Text
                        style={[
                          globalStyles.listItemAmount,
                          { marginBottom: 0, color: colors.textPrimary },
                        ]}
                      >
                        {formatValue(item.valorAtual)}
                      </Text>
                    )}
                  </View>
                  {renderResumoItem(tipo, item)}
                  {tipo !== 'investimento' && (
                    <Text
                      style={[
                        globalStyles.listItemStatus,
                        {
                          color: item.adiantada
                            ? colors.warning
                            : item.pago
                            ? colors.income
                            : colors.pending,
                        },
                      ]}
                    >
                      {tipo === 'entrada'
                        ? item.pago
                          ? '✓ Recebido'
                          : '⏳ Aguardando'
                        : tipo === 'emprestimo'
                        ? item.adiantada
                          ? '🚀 Adiantada'
                          : item.pago
                          ? '✓ Paga'
                          : '⏳ Aguardando'
                        : item.pago
                        ? '✓ Paga'
                        : '⏳ Aguardando'}
                    </Text>
                  )}
                </View>
              </View>
              {tipo !== 'investimento' && (
                <View style={globalStyles.listItemActions}>
                  <Text style={globalStyles.listItemAmount}>
                    {formatValue(item.valor ?? 0)}
                  </Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
                    {typeof onAdiantarParcelas === 'function' && tipo === 'emprestimo' && (
                      <TouchableOpacity
                        style={[globalStyles.iconButton, globalStyles.iconButtonWarning, { marginRight: 8 }]}
                        onPress={(e) => {
                          e.stopPropagation?.();
                          vibrarLeve();
                          onAdiantarParcelas(item);
                        }}
                      >
                        <MaterialCommunityIcons
                          name="rocket-launch-outline"
                          size={18}
                          color={colors.pending}
                        />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[
                        globalStyles.statusButton,
                        {
                          backgroundColor: item.pago
                            ? colors.income + '20'
                            : colors.pending + '20',
                        },
                      ]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        vibrarLeve();
                        onToggleStatus(item.id);
                      }}
                    >
                      <MaterialCommunityIcons
                        name={item.pago ? 'check-circle' : 'calendar-clock-outline'}
                        size={16}
                        color={item.pago ? colors.income : colors.pending}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={globalStyles.emptyContainer}>
            <MaterialCommunityIcons name="receipt" size={48} color="#666" />
            <Text style={globalStyles.noDataText}>Nenhum registro para este mês.</Text>
            <Text style={globalStyles.emptySubtext}>
              Clique no '+' para adicionar seu primeiro {tipo}.
            </Text>
          </View>
          )
        )}
      </ScrollView>
      
      {/* ✨ 3. Lógica de renderização do botão flutuante ATUALIZADA */}
      {!hideAddButton && fabActions.length > 0 ? (
        <FabMenu actions={fabActions} />
      ) : !hideAddButton ? (
        <TouchableOpacity
          style={[globalStyles.fabPrimary, { position: 'absolute', bottom: 65, right: 20 }]} // Adiciona posicionamento para o fallback
          onPress={() => {
            vibrarMedio();
            setModalCriacaoVisivel(true);
          }}
        >
          <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
        </TouchableOpacity>
      ) : null}

      <ModalCriacao
        visivel={modalCriacaoVisivel}
        aoFechar={() => setModalCriacaoVisivel(false)}
        aoSalvar={handleSalvarCriacao}
        tipo={tipo}
        titulo={`Novo ${titulo}`}
      />

<ModalDetalhes
  visible={modalDetalhesVisivel}
  onClose={() => {
    setModalDetalhesVisivel(false);
    setItemSelecionado(null);
  }}
  onEditPress={handleAbrirEdicao}
  item={itemSelecionado}
  tipo={tipo}
  // 👇 AQUI ESTÁ A CORREÇÃO
  onHistoryPress={() => {
    if (onHistoryPress && itemSelecionado) {
      onHistoryPress(itemSelecionado);
    }
  }}
/>

      {tipo !== 'investimento' && (
        <ModalEdicao
          visivel={modalEdicaoVisivel}
          aoFechar={() => {
            setModalEdicaoVisivel(false);
            setItemSelecionado(null);
          }}
          aoSalvar={handleSalvarEdicao}
          aoExcluir={handleExcluir}
          item={itemSelecionado}
          tipo={tipo}
          titulo={`Editar ${tipo}`}
        />
      )}
    </SafeAreaView>
  );
}
