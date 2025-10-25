import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { vibrarLeve } from '../utils/haptics';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import AlertaModal from './AlertaModal';

// ------------------------------------------------------
// 🔹 COMPONENTE DE LINHA DE INFORMAÇÃO
// ------------------------------------------------------
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

// ------------------------------------------------------
// 🔹 RESUMO FINANCEIRO
// ------------------------------------------------------
const ResumoFinanceiro = ({ totalPago, totalReal, totalParcelas, parcelasPagas, totalDescontos = 0 }) => {
  const progresso = totalReal > 0 ? (totalPago / totalReal) * 100 : 0;

  return (
    <View style={globalStyles.resumoFinanceiroContainer}>
      <View style={globalStyles.rowBetween}>
      <Text style={globalStyles.resumoFinanceiroLabel}>
        {totalDescontos > 0 ? 'Total Pago (com descontos)' : 'Total Pago'}
      </Text>
        <Text style={globalStyles.resumoFinanceiroLabel}>Valor Total</Text>
      </View>

      <View style={globalStyles.rowBetween}>
        <Text style={globalStyles.resumoFinanceiroValor}>
          R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={globalStyles.resumoFinanceiroValor}>
          R$ {totalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <View style={[globalStyles.progressBackground, { marginTop: 8 }]}>
        <View
          style={[
            globalStyles.progressFill,
            { width: `${progresso}%`, backgroundColor: colors.balance },
          ]}
        />
      </View>

      {totalDescontos > 0 && (
        <View style={[globalStyles.infoRow, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons
              name="cash-refund"
              size={22}
              color={colors.textTertiary}
              style={{ marginRight: 8, marginTop: -10 }}
            />
            <Text style={[globalStyles.infoRowLabel, { color: colors.textTertiary }]}>
              Total de Descontos
            </Text>
          </View>
          <Text style={[globalStyles.infoRowValue, { color: colors.balance }]}>
            - R$ {totalDescontos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      )}
    </View>
  );
};

// ------------------------------------------------------
// 🔹 COMPONENTE PRINCIPAL
// ------------------------------------------------------
export default function ModalDetalhes({
  visible,
  onClose,
  item,
  onEditPress,
  tipo,
  onHistoryPress,
}) {
  const [totalReal, setTotalReal] = useState(0);
  const [totalPago, setTotalPago] = useState(0);
  const [parcelasPagas, setParcelasPagas] = useState(0);
  const [totalParcelas, setTotalParcelas] = useState(0);
  const [alerta, setAlerta] = useState({ visivel: false });
  const [totalDescontos, setTotalDescontos] = useState(0);


  // ------------------------------------------------------
  // 🔹 CARREGAR TOTAIS PARA EMPRÉSTIMOS
  // ------------------------------------------------------
// 🔹 CARREGAR TOTAIS PARA EMPRÉSTIMOS E CARTÕES
useEffect(() => {
  const carregarTotais = async () => {
    if (!item?.idCompra) return;

    try {
      const nomeColecao =
        tipo === 'emprestimo' ? 'emprestimos' :
        tipo === 'cartao' ? 'cartoesEmprestados' :
        null;

      if (!nomeColecao) return;

      const parcelasSnap = await getDocs(
        query(collection(db, nomeColecao), where('idCompra', '==', item.idCompra))
      );

      if (parcelasSnap.empty) {
        setTotalReal(0);
        setTotalPago(0);
        setParcelasPagas(0);
        setTotalParcelas(0);
        return;
      }

      const parcelas = parcelasSnap.docs.map((d) => d.data());

      // 🔹 Descontos (se houver)
      const somaDescontos = parcelas.reduce(
        (acc, p) => acc + (parseFloat(p.descontoAplicado) || 0),
        0
      );
      setTotalDescontos(somaDescontos);

      // 🔹 Totais reais
      const somaTotal = parcelas.reduce(
        (acc, p) => acc + (parseFloat(p.valor) || 0),
        0
      );

      const somaPagas = parcelas.reduce(
        (acc, p) => acc + ((p.pago === true || p.adiantada === true) ? parseFloat(p.valor) || 0 : 0),
        0
      );

      const pagas = parcelas.filter((p) => p.pago || p.adiantada).length;

      setTotalReal(somaTotal);
      setTotalPago(somaPagas);
      setParcelasPagas(pagas);
      setTotalParcelas(parcelas.length);
    } catch (err) {
      console.error('Erro ao calcular totais:', err);
      setAlerta({
        visivel: true,
        titulo: 'Erro ao carregar dados',
        mensagem: 'Não foi possível calcular os totais.',
        icone: 'wifi-off',
        corIcone: colors.error,
        textoBotao: 'Entendi',
      });
    }
  };

  if (visible && (tipo === 'emprestimo' || tipo === 'cartao')) carregarTotais();
}, [visible, item, tipo]);

  if (!visible) return null;

  const statusCor = item?.pago ? colors.balance : colors.pending;


  // ------------------------------------------------------
  // 🔹 CONTEÚDO PRINCIPAL DO MODAL
  // ------------------------------------------------------
  const renderContent = () => {
    const formatarData = (data1, data2) => {
      const dataValida = data1 || data2;
      if (!dataValida) return 'Não informada';
      const dataObj = new Date(dataValida + 'T00:00:00');
      return isNaN(dataObj) ? 'Não informada' : dataObj.toLocaleDateString('pt-BR');
    };
    const desconto = item?.descontoAplicado ? Number(item.descontoAplicado) : 0;
const valorIcon = desconto > 0 ? 'cash-minus' : 'cash';
const valorColor = desconto > 0 ? colors.warning : colors.expense;


    switch (tipo) {
      case 'entrada':
        return (
          <>
            <InfoRow
  icon="cash"
  label="Valor"
  value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
  color={colors.income}
/>
<InfoRow icon="shape-outline" label="Categoria" value={item.categoria || 'Não informada'} />

{item.pago ? (
  <InfoRow
    icon="calendar-check"
    label="Data de Recebimento"
    value={formatarData(item.dataPagamento, item.data)}
    color={colors.balance}
  />
) : (
  <InfoRow
    icon="calendar-outline"
    label="Data Prevista de Recebimento"
    value={formatarData(item.data, item.dataPagamento)}
  />
)}

<InfoRow
  icon={item.pago ? 'check-circle-outline' : 'alert-circle-outline'}
  label="Status"
  value={item.pago ? 'Recebido' : 'Pendente'}
  color={item.pago ? colors.balance : colors.pending}
/>

          </>
        );

      case 'gasto':
        return (
          <>
            <InfoRow
  icon="cash"
  label="Valor"
  value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
  color={colors.expense}
/>
<InfoRow icon="shape-outline" label="Categoria" value={item.categoria || 'Não informada'} />

{item.pago ? (
  <InfoRow
    icon="calendar-check"
    label="Data de Pagamento"
    value={formatarData(item.dataPagamento, item.dataVencimento)}
    color={colors.balance}
  />
) : (
  <InfoRow
    icon="calendar-outline"
    label="Data de Vencimento"
    value={formatarData(item.dataVencimento, item.dataPagamento)}
  />
)}

<InfoRow
  icon={item.pago ? 'check-circle-outline' : 'alert-circle-outline'}
  label="Status"
  value={item.pago ? 'Pago' : 'Pendente'}
  color={item.pago ? colors.balance : colors.pending}
/>

          </>
        );

      case 'cartao':
        return (
          <>
<InfoRow
  icon={valorIcon}
  label={desconto > 0 ? 'Valor com Desconto' : 'Valor da Parcela'}
  value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
  color={valorColor}
/>

{desconto > 0 && (
  <InfoRow
    icon="sale"
    label="Desconto Aplicado"
    value={`- R$ ${desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
    color={colors.success}
  />
)}

<InfoRow icon="credit-card-outline" label="Cartão" value={item.cartao || 'Não informado'} />
<InfoRow icon="chart-donut" label="Progresso" value={`${item.parcelaAtual} de ${item.totalParcelas}`} />

{item.pago ? (
  <InfoRow
    icon="calendar-check"
    label="Data de Pagamento"
    value={formatarData(item.dataPagamento, item.dataVencimento)}
    color={colors.balance}
  />
) : (
  <InfoRow
    icon="calendar-outline"
    label="Vencimento da Parcela"
    value={formatarData(item.dataVencimento, item.dataPagamento)}
  />
)}

<TouchableOpacity onPress={onHistoryPress}>
  <InfoRow
    icon="history"
    label="Histórico da Compra"
    value="Ver todas as parcelas"
    color={colors.primary}
  />
</TouchableOpacity>

          </>
        );

      case 'emprestimo':
        return (
          <>
<InfoRow
  icon={valorIcon}
  label={desconto > 0 ? 'Valor com Desconto' : 'Valor da Parcela'}
  value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
  color={valorColor}
/>

{desconto > 0 && (
  <InfoRow
    icon="sale"
    label="Desconto Aplicado"
    value={`- R$ ${desconto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
    color={colors.success}
  />
)}

<InfoRow icon="account-group-outline" label="Pessoa/Instituição" value={item.pessoa || 'Não informada'} />
<InfoRow icon="chart-donut" label="Progresso" value={`${item.parcelaAtual} de ${item.totalParcelas}`} />

{item.pago ? (
  <InfoRow
    icon="calendar-check"
    label="Data de Pagamento"
    value={formatarData(item.dataPagamento, item.dataVencimento)}
    color={colors.balance}
  />
) : (
  <InfoRow
    icon="calendar-outline"
    label="Vencimento da Parcela"
    value={formatarData(item.dataVencimento, item.dataPagamento)}
  />
)}

<TouchableOpacity onPress={onHistoryPress}>
  <InfoRow
    icon="history"
    label="Histórico da Dívida"
    value="Ver todas as parcelas"
    color={colors.primary}
  />
</TouchableOpacity>

          </>
        );

      default:
        return <Text style={globalStyles.infoRowLabel}>Nenhum detalhe disponível</Text>;
    }
  };

  // ------------------------------------------------------
  // 🔹 RENDERIZAÇÃO FINAL
  // ------------------------------------------------------
  return (
    <>
      <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContainer}>
            <View style={globalStyles.modalHeader}>
              <Text style={globalStyles.modalTitle}>{item.descricao || item.nome || 'Detalhes'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => { vibrarLeve(); onEditPress?.(item); }} style={{ marginRight: 15 }}>
                  <MaterialCommunityIcons name="pencil-circle-outline" size={32} color={colors.textTertiary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons name="close-circle" size={32} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            </View>

            {tipo === 'emprestimo' && (
<ResumoFinanceiro
  totalPago={totalPago}
  totalReal={totalReal}
  parcelasPagas={parcelasPagas}
  totalParcelas={totalParcelas}
  totalDescontos={totalDescontos}
/>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              {renderContent()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <AlertaModal visible={alerta.visivel} onClose={() => setAlerta({ visivel: false })} {...alerta} />
    </>
  );
}
