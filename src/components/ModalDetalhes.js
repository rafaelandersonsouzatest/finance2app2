// components/ModalDetalhes.js

import { Modal, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { vibrarLeve } from '../utils/haptics';


// SEU COMPONENTE InfoRow - SEM ALTERAÇÕES
const InfoRow = ({ icon, label, value, color = colors.textPrimary }) => (
  <View style={globalStyles.infoRow}>
    <MaterialCommunityIcons
      name={icon}
      size={24}
      color={colors.textSecondary}
      style={globalStyles.infoRowIcon}
    />
    <View>
      <Text style={globalStyles.infoRowLabel}>{label}</Text>
      <Text style={[globalStyles.infoRowValue, { color }]}>{value}</Text>
    </View>
  </View>
);

// ✨ 1. NOVO COMPONENTE PARA O RESUMO FINANCEIRO (Totalmente novo e autocontido) ✨
const ResumoFinanceiro = ({ item }) => {
  const valorTotal = item.valorTotal || (item.valor * item.totalParcelas);
  const totalPago = item.pago 
    ? (item.parcelaAtual * item.valor) 
    : ((item.parcelaAtual - 1) * item.valor);
  const progressoQuitacao = valorTotal > 0 ? (totalPago / valorTotal) * 100 : 0;

  return (
    <View style={globalStyles.resumoFinanceiroContainer}>
      <View style={globalStyles.rowBetween}>
        <Text style={globalStyles.resumoFinanceiroLabel}>Total Pago</Text>
        <Text style={globalStyles.resumoFinanceiroLabel}>Valor Total da Dívida</Text>
      </View>
      <View style={globalStyles.rowBetween}>
        <Text style={globalStyles.resumoFinanceiroValor}>
          R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={globalStyles.resumoFinanceiroValor}>
          R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      </View>
      <View style={[globalStyles.progressBackground, { marginTop: 8 }]}>
        <View style={[globalStyles.progressFill, { width: `${progressoQuitacao}%`, backgroundColor: colors.balance }]} />
      </View>
    </View>
  );
};

// SUA EXPORTAÇÃO DEFAULT - SEM ALTERAÇÕES NA ASSINATURA
export default function ModalDetalhes({ visible, onClose, item, onEditPress, tipo, onHistoryPress }) {
  if (!item) return null;

  const statusCor = item.pago ? colors.balance : colors.pending;

  // SUA FUNÇÃO renderContent - SEM ALTERAÇÕES
  const renderContent = () => {
    switch (tipo) {
      case 'entrada':
        return (
          <>
            <InfoRow icon="cash" label="Valor" value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color={colors.income} />
            <InfoRow icon="shape-outline" label="Categoria" value={item.categoria || 'Não informada'} />
            {item.pago && item.dataPagamento ? (
              <InfoRow icon="calendar-check" label="Data do Pagamento" value={new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')} color={statusCor} />
            ) : (
              <InfoRow icon="calendar-arrow-left" label="Data do Recebimento" value={item.data ? new Date(item.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'} />
            )}
            <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status" value={item.pago ? "Recebido" : "Pendente"} color={statusCor} />
          </>
        );

      case 'gasto':
        return (
          <>
            <InfoRow icon="cash" label="Valor" value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color={colors.expense} />
            <InfoRow icon="shape-outline" label="Categoria" value={item.categoria || 'Não informada'} />
            {item.pago && item.dataPagamento ? (
              <InfoRow icon="calendar-check" label="Data do Pagamento" value={new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')} color={statusCor} />
            ) : (
              <InfoRow icon="calendar-arrow-right" label="Data de Vencimento" value={item.dataVencimento ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'} />
            )}
            <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status" value={item.pago ? "Pago" : "Pendente"} color={statusCor} />
          </>
        );

      case 'emprestimo':
        return (
          <>
            <InfoRow icon="cash" label="Valor da Parcela" value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color={colors.expense} />
            <InfoRow icon="account-group-outline" label="Pessoa/Instituição" value={item.pessoa || 'Não informada'} />
            {item.pago && item.dataPagamento ? (
              <InfoRow icon="calendar-check" label="Data do Pagamento" value={new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')} color={statusCor} />
            ) : (
              <InfoRow icon="calendar-arrow-right" label="Vencimento da Parcela" value={item.dataVencimento ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'} />
            )}
            <InfoRow icon="chart-donut" label="Progresso" value={`${item.parcelaAtual} de ${item.totalParcelas}`} />
            <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status" value={item.pago ? "Paga" : "Pendente"} color={statusCor} />
            
            <TouchableOpacity onPress={onHistoryPress}>
              <InfoRow icon="history" label="Histórico da Dívida" value="Ver todas as parcelas" color={colors.primary} />
            </TouchableOpacity>
          </>
        );

      case 'cartao':
        const dataCompraFormatada = item.dataCompra ? new Date(item.dataCompra + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada';
        const valorTotalCompra = item.valorTotal || (item.valor * item.totalParcelas);

        return (
          <>
            <InfoRow icon="cash" label="Valor da Parcela" value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} color={colors.expense} />
            <InfoRow icon="credit-card-outline" label="Cartão" value={item.cartao || 'Não informado'} />
            <InfoRow icon="account-group-outline" label="Pessoa" value={item.pessoa || 'Não informada'} />
            <InfoRow icon="chart-donut" label="Progresso" value={`${item.parcelaAtual} de ${item.totalParcelas}`} />
            <InfoRow icon="calendar-star" label="Data da Compra" value={dataCompraFormatada} />
            <InfoRow icon="cash-multiple" label="Valor Total da Compra" value={`R$ ${(Number(valorTotalCompra) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
            {item.pago && item.dataPagamento ? (
              <InfoRow icon="calendar-check" label="Data do Pagamento" value={new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')} color={statusCor} />
            ) : (
              <InfoRow icon="calendar-arrow-right" label="Vencimento da Parcela" value={item.dataVencimento ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR') : 'Não informada'} />
            )}
            <InfoRow icon={item.pago ? "check-circle-outline" : "alert-circle-outline"} label="Status da Parcela" value={item.pago ? "Paga" : "Pendente"} color={statusCor} />

            <TouchableOpacity onPress={onHistoryPress}>
              <InfoRow icon="history" label="Histórico da Compra" value="Ver todas as parcelas" color={colors.primary} />
            </TouchableOpacity>
          </>
        );

      default:
        return <Text style={globalStyles.infoRowLabel}>Nenhum detalhe disponível</Text>;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            {/* ✨ 2. ADIÇÃO DO ÍCONE DA CATEGORIA NO CABEÇALHO ✨ */}
            {item.categoria && (
              <MaterialCommunityIcons
                name={getIconePorCategoria(item.categoria, tipo)}
                size={24}
                color={colors.textSecondary}
                style={{ marginRight: 12 }}
              />
            )}
            <Text style={globalStyles.modalTitle} numberOfLines={1}>
              {item.descricao || item.nome || 'Detalhes'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => {
                vibrarLeve(); // ✨ VIBRAÇÃO AQUI ✨
                onEditPress();
              }} 
              style={{ marginRight: 15 }}
            >
              <MaterialCommunityIcons name="pencil-circle-outline" size={32} color={colors.textTertiary} />
            </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ✨ 3. ADIÇÃO DO RESUMO FINANCEIRO (CONDICIONAL) ✨ */}
          {(tipo === 'emprestimo' || tipo === 'cartao') && <ResumoFinanceiro item={item} />}

          <ScrollView showsVerticalScrollIndicator={false}>{renderContent()}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ✨ 4. FUNÇÃO AUXILIAR PARA OBTER O ÍCONE (Totalmente nova e isolada) ✨
const getIconePorCategoria = (categoria, tipo) => {
  const iconesEntrada = { Renda: 'briefcase-outline', Extra: 'credit-card', Investimentos: 'trending-up', Vendas: 'cart-outline' };
  const iconesGasto = { Moradia: 'home', Utilidades: 'wifi', Saúde: 'healing', Transporte: 'car', Educação: 'school', Alimentação: 'restaurant', Lazer: 'movie' };
  const iconesEmprestimo = { Financiamento: 'car', Pessoal: 'face-man', Eletrônicos: 'laptop' };
  const iconesCartao = iconesGasto; // Reaproveita os ícones de gasto para categorias de compra

  switch (tipo) {
    case 'entrada': return iconesEntrada[categoria] || 'trending-up';
    case 'gasto': return iconesGasto[categoria] || 'cash';
    case 'emprestimo': return iconesEmprestimo[categoria] || 'wallet';
    case 'cartao': return iconesCartao[categoria] || 'credit-card-outline';
    default: return 'cash';
  }
};
