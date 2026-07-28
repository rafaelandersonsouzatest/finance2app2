// src/components/agenda/ItemEventoFinanceiro.js
// Item compartilhado entre a Linha do Tempo, o detalhe de dia do Calendário e
// a Central de Avisos — todos consomem o mesmo formato normalizado do
// useEventosFinanceiros (ver SPRINT3_DISCOVERY.md, seções 3 e 4.2).
//
// Totalmente interativo: tocar no card abre o mesmo ModalDetalhes/ModalEdicao
// já usados em Entradas/Saídas/Cartões/Empréstimos (nenhuma tela nova de
// detalhes/edição), e o botão de status é o mesmo BotaoStatusPagamento usado
// em TelaPadrao.js. Eventos "projetados" (sem `itemOriginal`, ainda não
// existem no Firestore) ficam só de exibição, sem toque.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { useVisibility } from '../../contexts/VisibilityContext';
import { formatarDataParaExibicao, normalizarParaISO } from '../../utils/formatarData';
import { vibrarLeve } from '../../utils/haptics';
import BotaoStatusPagamento from '../BotaoStatusPagamento';
import ModalDetalhes from '../ModalDetalhes';
import ModalEdicao from '../ModalEdicao';
import ModalHistoricoParcelas from '../ModalHistoricoParcelas';

const ICONE_POR_TIPO = {
  gasto: 'cash-minus',
  entrada: 'cash-plus',
  cartao: 'credit-card-outline',
  emprestimo: 'bank-outline',
};

const COR_POR_TIPO = {
  gasto: colors.gasto,
  entrada: colors.entrada,
  cartao: colors.iconPurple,
  emprestimo: colors.warning,
};

const TITULO_EDICAO_POR_TIPO = {
  gasto: 'Gasto',
  entrada: 'Entrada',
  cartao: 'Compra',
  emprestimo: 'Empréstimo',
};

// Só cartão e empréstimo têm histórico de parcelas (ModalHistoricoParcelas
// exige item.collectionName — ver ModalHistoricoParcelas.js).
const COLLECTION_POR_TIPO = {
  cartao: 'cartoes',
  emprestimo: 'emprestimos',
};

// `saldoAcumuladoAteAqui` é uma prop reservada para a Sprint 4 (impacto do
// evento no saldo previsto, ver SPRINT3_DISCOVERY.md seção 4.2) — não
// utilizada ainda, propositalmente.
export default function ItemEventoFinanceiro({
  evento,
  onToggleStatus,
  onEditar,
  onExcluir,
  saldoAcumuladoAteAqui = null,
}) {
  const { formatValue } = useVisibility();
  const [modalDetalhesVisivel, setModalDetalhesVisivel] = useState(false);
  const [modalEdicaoVisivel, setModalEdicaoVisivel] = useState(false);
  const [modalHistoricoVisivel, setModalHistoricoVisivel] = useState(false);

  const interativo = !!evento.itemOriginal;
  const temHistorico = !!COLLECTION_POR_TIPO[evento.tipo];

  const hojeISO = normalizarParaISO(new Date());
  const vencido = !evento.pago && evento.data < hojeISO;
  const statusLabel = evento.pago ? 'Pago' : vencido ? 'Vencido' : 'Pendente';
  const statusColor = evento.pago ? colors.paid : vencido ? colors.error : colors.pending;

  const card = (
    <View style={globalStyles.listItem}>
      <View style={globalStyles.listItemContent}>
        <MaterialCommunityIcons
          name={ICONE_POR_TIPO[evento.tipo] || 'calendar-blank-outline'}
          size={22}
          color={evento.cor || COR_POR_TIPO[evento.tipo] || colors.textSecondary}
          style={globalStyles.listItemIcon}
        />
        <View style={globalStyles.listItemInfo}>
          <Text style={globalStyles.listItemTitle}>{evento.descricao}</Text>
          <Text style={globalStyles.listItemSubtitle}>
            {formatarDataParaExibicao(evento.data)} · {statusLabel}
            {evento.origem === 'projetado' ? ' · previsto' : ''}
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[globalStyles.listItemTitle, { color: statusColor }]}>
          {formatValue(evento.valor)}
        </Text>
        {interativo && (
          <BotaoStatusPagamento
            pago={evento.pago}
            onPress={() => onToggleStatus?.(evento)}
            style={{ marginTop: 4 }}
          />
        )}
      </View>
    </View>
  );

  if (!interativo) return card;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          vibrarLeve();
          setModalDetalhesVisivel(true);
        }}
      >
        {card}
      </TouchableOpacity>

      <ModalDetalhes
        visible={modalDetalhesVisivel}
        onClose={() => setModalDetalhesVisivel(false)}
        item={evento.itemOriginal}
        tipo={evento.tipo}
        onEditPress={() => {
          setModalDetalhesVisivel(false);
          setModalEdicaoVisivel(true);
        }}
        onHistoryPress={
          temHistorico
            ? () => {
                setModalDetalhesVisivel(false);
                setModalHistoricoVisivel(true);
              }
            : undefined
        }
      />

      <ModalEdicao
        visivel={modalEdicaoVisivel}
        aoFechar={() => setModalEdicaoVisivel(false)}
        aoSalvar={(dadosEditados) => onEditar?.(evento, dadosEditados)}
        aoExcluir={() => onExcluir?.(evento)}
        item={evento.itemOriginal}
        tipo={evento.tipo}
        titulo={`Editar ${TITULO_EDICAO_POR_TIPO[evento.tipo] || ''}`}
      />

      {temHistorico && (
        <ModalHistoricoParcelas
          visible={modalHistoricoVisivel}
          onClose={() => setModalHistoricoVisivel(false)}
          item={{
            idCompra: evento.itemOriginal?.idCompra,
            descricao: evento.itemOriginal?.descricao,
            collectionName: COLLECTION_POR_TIPO[evento.tipo],
          }}
        />
      )}
    </>
  );
}
