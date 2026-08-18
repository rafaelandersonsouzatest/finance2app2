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
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';
import AlertaModal from './AlertaModal';

// ------------------------------------------------------
// 🔹 COMPONENTE DE LINHA DE INFORMAÇÃO
// ------------------------------------------------------
const InfoRow = ({ icon, label, value, color = colors.textPrimary, right }) => (
  <View style={globalStyles.infoRow}>
    <MaterialCommunityIcons
      name={icon}
      size={24}
      color={colors.textSecondary}
      style={globalStyles.infoRowIcon}
    />
    <View style={{ flex: 1 }}>
      <Text style={globalStyles.infoRowLabel}>{label}</Text>
      <Text style={[globalStyles.infoRowValue, { color }]}>{value}</Text>
    </View>
    {right}
  </View>
);

// Selo de status (Ativa/Encerrada) da linha de Compartilhamento — mesmo
// padrão visual das badges já usadas no app (fundo translúcido da própria
// cor do status, ver colors.badgePending/badgePaid), nunca cinza pra tudo
// (ARQUITETURA.md seção 18).
const SeloStatus = ({ texto, cor }) => (
  <View
    style={{
      backgroundColor: `${cor}20`,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginLeft: 8,
    }}
  >
    <Text style={{ color: cor, fontSize: 12, fontWeight: '600' }}>{texto}</Text>
  </View>
);

// ------------------------------------------------------
// 🔹 RESUMO FINANCEIRO
// ------------------------------------------------------
const ResumoFinanceiro = ({
  tipo,
  totalPago,
  totalReal,
  totalParcelas,
  parcelasPagas,
  totalDescontos = 0,
}) => {
  const ehEmprestimo = tipo === 'emprestimo';

  // 🔹 Empréstimo: totalReal é o valor CONTRATADO (fixo) — a barra precisa
  // medir o progresso contra o que de fato será pago (contratado menos a
  // economia já obtida), senão nunca chega a 100% havendo desconto.
  // Cartão: totalReal já é a soma ao vivo das parcelas (já reflete qualquer
  // desconto), então não subtraímos de novo.
  const valorReferencia = ehEmprestimo ? totalReal - totalDescontos : totalReal;
  const progresso =
    valorReferencia > 0 ? Math.min((totalPago / valorReferencia) * 100, 100) : 0;
  const quitado = totalParcelas > 0 && parcelasPagas === totalParcelas;

  const rotuloPago = ehEmprestimo
    ? 'Valor Efetivamente Pago'
    : totalDescontos > 0
    ? 'Total Pago (com descontos)'
    : 'Total Pago';
  const rotuloTotal = ehEmprestimo ? 'Valor Contratado' : 'Valor Total';
  const rotuloDesconto = ehEmprestimo ? 'Economia Obtida' : 'Total de Descontos';

  return (
    <View style={globalStyles.resumoFinanceiroContainer}>
      <View style={globalStyles.rowBetween}>
        <Text style={globalStyles.resumoFinanceiroLabel}>{rotuloPago}</Text>
        <Text style={globalStyles.resumoFinanceiroLabel}>{rotuloTotal}</Text>
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

      {quitado && (
        <Text
          style={{
            color: colors.balance,
            fontWeight: '600',
            textAlign: 'center',
            marginTop: 8,
          }}
        >
          ✅ {ehEmprestimo ? 'Empréstimo quitado' : 'Compra quitada'}
        </Text>
      )}

      {totalDescontos > 0 && (
        <View
          style={[globalStyles.infoRow, { justifyContent: 'space-between' }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialCommunityIcons
              name="cash-refund"
              size={22}
              color={colors.textTertiary}
              style={{ marginRight: 8, marginTop: -10 }}
            />
            <Text
              style={[globalStyles.infoRowLabel, { color: colors.textTertiary }]}
            >
              {rotuloDesconto}
            </Text>
          </View>
          <Text style={[globalStyles.infoRowValue, { color: colors.balance }]}>
            - R${' '}
            {totalDescontos.toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
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
  onSharePress,
  onGerenciarDivisao,
  mostrarIconeCompartilhado = false,
  statusDivisaoTexto,
}) {
  const [totalReal, setTotalReal] = useState(0);
  const [totalPago, setTotalPago] = useState(0);
  const [parcelasPagas, setParcelasPagas] = useState(0);
  const [totalParcelas, setTotalParcelas] = useState(0);
  const [alerta, setAlerta] = useState({ visivel: false });
  const [totalDescontos, setTotalDescontos] = useState(0);

  const { user } = useAuth();

  // ------------------------------------------------------
  // 🔹 CARREGAR TOTAIS PARA EMPRÉSTIMOS E CARTÕES
  // ------------------------------------------------------
  useEffect(() => {
    const carregarTotais = async () => {
      if (!item?.idCompra) return;

      try {
        const nomeColecao =
          tipo === 'emprestimo'
            ? 'emprestimos'
            : tipo === 'cartao'
            ? 'cartoes'
            : null;

        if (!nomeColecao) return;

        // ✅ Caminho com o UID do usuário
        const basePath = getBasePath(user);
        const parcelasSnap = await getDocs(
          query(
            collection(db, `${basePath}/${nomeColecao}`),
            where('idCompra', '==', item.idCompra)
          )
        );

        if (parcelasSnap.empty) {
          setTotalReal(0);
          setTotalPago(0);
          setParcelasPagas(0);
          setTotalParcelas(0);
          return;
        }

        const parcelas = parcelasSnap.docs.map((d) => d.data());

        // 🔹 Valor efetivamente pago: soma das parcelas realmente pagas (ou
        // antecipadas), já refletindo o desconto de cada uma — independe de
        // quantas outras parcelas ainda faltam. Vale igual para empréstimo e cartão.
        const somaPagas = parcelas.reduce(
          (acc, p) =>
            acc +
            ((p.pago === true || p.adiantada === true
              ? parseFloat(p.valor)
              : 0) || 0),
          0
        );
        setTotalPago(somaPagas);

        if (tipo === 'emprestimo') {
          // 🔹 Regra de negócio: valor contratado nunca muda; economia é
          // derivada dele (ver useEmprestimos.js). Fallback por soma cobre
          // empréstimos criados antes dessa mudança, sem esses campos.
          const temCamposNovos = parcelas.some(
            (p) => p.valorContratado !== undefined
          );

          const valorContratado = temCamposNovos
            ? parcelas[0].valorContratado || 0
            : parcelas.reduce((acc, p) => acc + (parseFloat(p.valor) || 0), 0);

          const economiaTotal = temCamposNovos
            ? parcelas[0].economiaTotal || 0
            : parcelas.reduce(
                (acc, p) => acc + (parseFloat(p.descontoAplicado) || 0),
                0
              );

          setTotalDescontos(economiaTotal);
          setTotalReal(valorContratado);
        } else {
          const somaDescontos = parcelas.reduce(
            (acc, p) => acc + (parseFloat(p.descontoAplicado) || 0),
            0
          );
          setTotalDescontos(somaDescontos);

          const somaTotal = parcelas.reduce(
            (acc, p) => acc + (parseFloat(p.valor) || 0),
            0
          );
          setTotalReal(somaTotal);
        }

        const pagas = parcelas.filter((p) => p.pago || p.adiantada).length;
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

    if (visible && (tipo === 'emprestimo' || tipo === 'cartao'))
      carregarTotais();
  }, [visible, item, tipo, user]);

  if (!visible) return null;

  // ------------------------------------------------------
  // 🔹 CONTEÚDO PRINCIPAL DO MODAL
  // ------------------------------------------------------
  const renderContent = () => {
    const formatarData = (data1, data2) => {
      const dataValida = data1 || data2;
      if (!dataValida) return 'Não informada';
      const dataObj = new Date(dataValida + 'T00:00:00');
      return isNaN(dataObj)
        ? 'Não informada'
        : dataObj.toLocaleDateString('pt-BR');
    };

    const desconto = item?.descontoAplicado ? Number(item.descontoAplicado) : 0;
    const valorIcon = desconto > 0 ? 'cash-minus' : 'cash';
    const valorColor = desconto > 0 ? colors.warning : colors.gasto;

    switch (tipo) {
      case 'entrada':
        return (
          <>
            <InfoRow
              icon="cash"
              label="Valor"
              value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}`}
              color={colors.entrada}
            />
            <InfoRow
              icon="shape-outline"
              label="Categoria"
              value={item.categoria || 'Não informada'}
            />

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
              icon={
                item.pago
                  ? 'check-circle-outline'
                  : 'alert-circle-outline'
              }
              label="Status"
              value={item.pago ? 'Recebido' : 'Pendente'}
              color={item.pago ? colors.balance : colors.pending}
            />

            <TouchableOpacity onPress={onHistoryPress}>
              <InfoRow
                icon="history"
                label="Histórico"
                value="Ver linha do tempo"
                color={colors.primary}
              />
            </TouchableOpacity>
          </>
        );

      case 'gasto':
        return (
          <>
            <InfoRow
              icon="cash"
              label="Valor"
              value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}`}
              color={colors.gasto}
            />
            <InfoRow
              icon="shape-outline"
              label="Categoria"
              value={item.categoria || 'Não informada'}
            />

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
              icon={
                item.pago
                  ? 'check-circle-outline'
                  : 'alert-circle-outline'
              }
              label="Status"
              value={item.pago ? 'Pago' : 'Pendente'}
              color={item.pago ? colors.balance : colors.pending}
            />

            <TouchableOpacity onPress={onHistoryPress}>
              <InfoRow
                icon="history"
                label="Histórico"
                value="Ver linha do tempo"
                color={colors.primary}
              />
            </TouchableOpacity>

            {/* Compartilhamento (Etapa 4.6 + seção 11.2/11.3, unificado em
                2026-08-17) — uma única linha pro tema inteiro, em vez de duas
                linhas separadas ("Compartilhar" e "Divisão") que chegavam a
                aparecer juntas ao mesmo tempo quando a divisão estava
                encerrada (mesmo assunto, duas entradas — feedback do
                usuário). O destino do toque muda conforme o estado, mas é
                exatamente o mesmo roteamento de antes, sem perder nenhum
                caminho:
                - nunca compartilhado, ou divisão anterior 'encerrada' →
                  onSharePress (escolher com quem compartilhar de novo);
                - divisão 'ativa' → onGerenciarDivisao (participantes, cotas,
                  cancelar, encerrar — tudo já implementado em
                  ModalGerenciarDivisao.js, nunca duplicado aqui).
                Escondido se o gasto veio de aceitar a divisão de outra
                pessoa (`origemCompartilhamento`) — ainda não há regra
                decidida pra "repassar"/encadear uma divisão (seção 11). */}
            {!item.origemCompartilhamento &&
              (() => {
                const compartilhado = !!item.compartilhamentoId;
                const encerrada = statusDivisaoTexto === 'Encerrada';
                const podeGerenciar = compartilhado && !encerrada && !!onGerenciarDivisao;
                const podeCompartilhar = (!compartilhado || encerrada) && !!onSharePress;

                if (podeGerenciar) {
                  return (
                    <TouchableOpacity onPress={() => onGerenciarDivisao(item)}>
                      <InfoRow
                        icon="account-multiple-outline"
                        label="Compartilhamento"
                        value="Toque para gerenciar participantes"
                        color={colors.primary}
                        right={<SeloStatus texto="Ativa" cor={colors.balance} />}
                      />
                    </TouchableOpacity>
                  );
                }
                if (podeCompartilhar) {
                  return (
                    <TouchableOpacity onPress={() => onSharePress(item)}>
                      <InfoRow
                        icon="account-multiple-plus-outline"
                        label="Compartilhamento"
                        value={compartilhado ? 'Toque para compartilhar de novo' : 'Dividir com alguém'}
                        color={colors.primary}
                        right={
                          compartilhado ? <SeloStatus texto="Encerrada" cor={colors.textSecondary} /> : null
                        }
                      />
                    </TouchableOpacity>
                  );
                }
                return null;
              })()}
          </>
        );

      case 'cartao':
        return (
          <>
            <InfoRow
              icon={valorIcon}
              label={desconto > 0 ? 'Valor com Desconto' : 'Valor da Parcela'}
              value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}`}
              color={valorColor}
            />

            {desconto > 0 && (
              <InfoRow
                icon="sale"
                label="Desconto Aplicado"
                value={`- R$ ${desconto.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}`}
                color={colors.success}
              />
            )}

            <InfoRow
              icon="credit-card-outline"
              label="Cartão"
              value={item.cartao || 'Não informado'}
            />
            <InfoRow
              icon="chart-donut"
              label="Parcelas Pagas"
              value={`${parcelasPagas} de ${totalParcelas} parcelas pagas`}
            />

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
              value={`R$ ${(Number(item.valor) || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}`}
              color={valorColor}
            />

            {desconto > 0 && (
              <InfoRow
                icon="sale"
                label="Desconto Aplicado"
                value={`- R$ ${desconto.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                })}`}
                color={colors.success}
              />
            )}

            <InfoRow
              icon="account-group-outline"
              label="Pessoa/Instituição"
              value={item.credor || 'Não informada'}
            />
            <InfoRow
              icon="chart-donut"
              label="Parcelas Pagas"
              value={`${parcelasPagas} de ${totalParcelas} parcelas pagas`}
            />

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
        return (
          <Text style={globalStyles.infoRowLabel}>
            Nenhum detalhe disponível
          </Text>
        );
    }
  };

  // ------------------------------------------------------
  // 🔹 RENDERIZAÇÃO FINAL
  // ------------------------------------------------------
  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContainer}>
            <View style={globalStyles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                {/* `globalStyles.modalTitle` já tem `flex: 1` — sem
                    sobrescrever aqui, o Text ocupa todo o espaço da linha e
                    empurra o ícone pro canto direito, longe do nome (bug
                    reportado em teste manual, 2026-08-17). */}
                <Text style={[globalStyles.modalTitle, { flex: 0, flexShrink: 1 }]}>
                  {item.descricao || item.nome || 'Detalhes'}
                </Text>
                {/* Mesmo ícone/regra da lista (ListItemGasto.js via
                    deveMostrarIconeCompartilhado). */}
                {mostrarIconeCompartilhado && (
                  <MaterialCommunityIcons
                    name="account-multiple-outline"
                    size={16}
                    color={colors.primary}
                    style={{ marginLeft: 6 }}
                  />
                )}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => {
                    vibrarLeve();
                    onEditPress?.(item);
                  }}
                  style={{ marginRight: 15 }}
                >
                  <MaterialCommunityIcons
                    name="pencil-circle-outline"
                    size={32}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={onClose}>
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={32}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {(tipo === 'emprestimo' || tipo === 'cartao') && (
              <ResumoFinanceiro
                tipo={tipo}
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

      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ visivel: false })}
        {...alerta}
      />
    </>
  );
}
