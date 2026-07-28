import { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useAuth } from '../auth/useAuth';

// ==========================================================
// 🧩 COMPONENTE: LINHA DE PARCELA INDIVIDUAL
// ==========================================================
const ParcelaItem = ({ item }) => {
  const isPago = item.pago;
  const isAdiantada = item.adiantada;

  let statusIcon = 'calendar-clock-outline';
  let statusColor = colors.pending;
  let statusText = 'Pendente';
  let dateText = `Vence em: ${
    item.dataVencimento
      ? new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'Data não informada'
  }`;

  if (isAdiantada) {
    statusIcon = 'rocket-launch-outline';
    statusColor = colors.chartPurple;
    statusText = 'Antecipada';
    dateText = `Paga em: ${
      item.dataPagamento
        ? new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'Data não registrada'
    }`;
  } else if (isPago) {
    statusIcon = 'check-circle-outline';
    statusColor = colors.balance;
    statusText = 'Paga';
    dateText = `Paga em: ${
      item.dataPagamento
        ? new Date(item.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')
        : 'Data não registrada'
    }`;
  }

  const valorOriginal = Number(item.valorOriginal ?? item.valor ?? 0);
  const valorPago = Number(item.valorPago ?? item.valor ?? 0);
  const desconto = valorOriginal - valorPago;
  const descontoPercentual =
    valorOriginal > 0 ? (desconto / valorOriginal) * 100 : 0;

  return (
    <View
      style={[
        globalStyles.listItem,
        { borderLeftColor: statusColor, borderLeftWidth: 4, marginBottom: 6 },
      ]}
    >
      <View style={globalStyles.listItemInfo}>
        <Text style={globalStyles.listItemTitle}>
          Parcela {item.parcelaAtual}/{item.totalParcelas}
        </Text>
        <Text style={globalStyles.listItemSubtitle}>{dateText}</Text>

        {desconto > 0 ? (
          <>
            <Text
              style={[
                globalStyles.text,
                { color: colors.textPrimary, marginTop: 2 },
              ]}
            >
              Valor Original: R$ {valorOriginal.toFixed(2)}
            </Text>
            <Text
              style={[
                globalStyles.text,
                { color: colors.balance, marginTop: 1 },
              ]}
            >
              Pago com Desconto: R$ {valorPago.toFixed(2)} (-{descontoPercentual.toFixed(1)}%)
            </Text>
          </>
        ) : (
          <Text
            style={[
              globalStyles.text,
              { color: colors.textPrimary, marginTop: 2 },
            ]}
          >
            Valor: R$ {valorPago.toFixed(2)}
          </Text>
        )}
      </View>

      <View
        style={[globalStyles.listItemActions, { alignItems: 'center' }]}
      >
        <MaterialCommunityIcons
          name={statusIcon}
          size={20}
          color={statusColor}
        />
        <Text
          style={[
            globalStyles.listItemStatus,
            { color: statusColor, marginTop: 4 },
          ]}
        >
          {statusText}
        </Text>
      </View>
    </View>
  );
};

// ==========================================================
// 💰 COMPONENTE: RESUMO FINANCEIRO
// ==========================================================
const ResumoFinanceiro = ({
  ehEmprestimo,
  totalPago,
  totalReal,
  totalDescontos,
  parcelasPagas,
  totalParcelas,
}) => {
  // 🔹 Empréstimo: totalReal é o valor contratado (fixo) — a barra precisa
  // medir contra o que de fato será pago (contratado menos economia), senão
  // nunca chega a 100% havendo desconto. Cartão: totalReal já é a soma ao
  // vivo das parcelas (já reflete desconto), não subtraímos de novo.
  const valorReferencia = ehEmprestimo ? totalReal - totalDescontos : totalReal;
  const progresso =
    valorReferencia > 0 ? Math.min((totalPago / valorReferencia) * 100, 100) : 0;
  const quitado = totalParcelas > 0 && parcelasPagas === totalParcelas;

  return (
    <View
      style={[
        globalStyles.resumoFinanceiroContainer,
        { marginVertical: 5, paddingVertical: 8 },
      ]}
    >
      <View style={globalStyles.rowBetween}>
        <Text style={globalStyles.resumoFinanceiroLabel}>Pago</Text>
        <Text style={globalStyles.resumoFinanceiroLabel}>Total</Text>
      </View>

      <View style={globalStyles.rowBetween}>
        <Text style={globalStyles.resumoFinanceiroValor}>
          R$ {totalPago.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
        <Text style={globalStyles.resumoFinanceiroValor}>
          R$ {totalReal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      </View>

      <View
        style={[globalStyles.progressBackground, { marginTop: 6 }]}
      >
        <View
          style={[
            globalStyles.progressFill,
            { width: `${progresso}%`, backgroundColor: colors.balance },
          ]}
        />
      </View>

      <Text
        style={[
          globalStyles.resumoFinanceiroLabel,
          { marginTop: 2, fontSize: 13, color: colors.textSecondary },
        ]}
      >
        {parcelasPagas}/{totalParcelas} pagas
      </Text>

      {quitado && (
        <Text
          style={{
            color: colors.balance,
            fontWeight: '600',
            fontSize: 13,
            marginTop: 3,
          }}
        >
          ✅ {ehEmprestimo ? 'Empréstimo quitado' : 'Compra quitada'}
        </Text>
      )}

      {totalDescontos > 0 && (
        <Text
          style={[
            globalStyles.resumoFinanceiroLabel,
            { marginTop: 3, color: colors.balance, fontSize: 13 },
          ]}
        >
          Descontos: R${' '}
          {totalDescontos.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
          })}
        </Text>
      )}
    </View>
  );
};

// ==========================================================
// 📦 MODAL PRINCIPAL COM RESUMO E HISTÓRICO
// ==========================================================
export default function ModalHistoricoParcelas({ visible, onClose, item }) {
  const { user, membroSelecionado } = useAuth();
  const [parcelas, setParcelas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resumo, setResumo] = useState({
    totalPago: 0,
    totalReal: 0,
    totalDescontos: 0,
    parcelasPagas: 0,
    totalParcelas: 0,
    ehEmprestimo: false,
  });

  useEffect(() => {
    const fetchParcelas = async () => {
      if (!visible || !item?.idCompra || !item?.collectionName || !user) return;

      setLoading(true);
      setError(null);
      setParcelas([]);

      try {
        const usuarioDestino =
          item?.compartilhadoCom || membroSelecionado?.uid || user.uid;
        const path = `users/${usuarioDestino}/${item.collectionName}`;
        const ref = collection(db, path);
        const q = query(
          ref,
          where('idCompra', '==', item.idCompra),
          orderBy('parcelaAtual', 'asc')
        );
        const querySnapshot = await getDocs(q);

        const dados = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const ehEmprestimo = item.collectionName === 'emprestimos';
        const temCamposNovos =
          ehEmprestimo && dados.some((p) => p.valorContratado !== undefined);

        // 🔹 Valor efetivamente pago: soma das parcelas realmente pagas (ou
        // antecipadas), já refletindo o desconto de cada uma — vale igual
        // para empréstimo e cartão, com ou sem os campos novos do A3.
        const totalPago = dados.reduce(
          (acc, p) =>
            acc +
            ((p.pago === true || p.adiantada === true
              ? parseFloat(p.valor)
              : 0) || 0),
          0
        );

        let totalReal, totalDescontos;

        if (temCamposNovos) {
          // 🔹 Regra de negócio: valor contratado nunca muda; economia é
          // derivada dele (ver useEmprestimos.js).
          totalReal = dados[0].valorContratado || 0;
          totalDescontos = dados[0].economiaTotal || 0;
        } else {
          // Fallback por soma — cobre cartões e empréstimos antigos sem os
          // campos novos.
          totalReal = dados.reduce(
            (acc, p) => acc + (parseFloat(p.valorOriginal || p.valor) || 0),
            0
          );
          totalDescontos = dados.reduce(
            (acc, p) => acc + (parseFloat(p.descontoAplicado) || 0),
            0
          );
        }

        const parcelasPagas = dados.filter((p) => p.pago || p.adiantada).length;

        setResumo({
          totalPago,
          totalReal,
          totalDescontos,
          parcelasPagas,
          totalParcelas: dados.length,
          ehEmprestimo,
        });
        setParcelas(dados);
      } catch (err) {
        console.error('❌ Erro ao carregar histórico de parcelas:', err);
        setError('Erro ao carregar histórico.');
      } finally {
        setLoading(false);
      }
    };

    fetchParcelas();
  }, [visible, item, user, membroSelecionado]);

  const renderContent = () => {
    if (loading)
      return (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginVertical: 40 }}
        />
      );
    if (error) return <Text style={globalStyles.noDataText}>{error}</Text>;
    if (parcelas.length === 0)
      return (
        <Text style={globalStyles.noDataText}>
          Nenhuma parcela encontrada.
        </Text>
      );

    return (
      <FlatList
        data={parcelas}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => <ParcelaItem item={item} />}
        ListHeaderComponent={<ResumoFinanceiro {...resumo} />}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={globalStyles.modalOverlay}>
        <View style={[globalStyles.modalContainer, { maxHeight: '85%' }]}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>
              {item?.collectionName === 'emprestimos'
                ? 'Histórico do Empréstimo'
                : 'Histórico da Compra'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons
                name="close-circle"
                size={32}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          <Text
            style={[
              globalStyles.modalSubtitle,
              { marginTop: -10, marginBottom: 10 },
            ]}
          >
            {item?.descricao || ''}
          </Text>

          {renderContent()}
        </View>
      </View>
    </Modal>
  );
}
