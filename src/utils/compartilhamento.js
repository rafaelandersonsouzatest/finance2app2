// src/utils/compartilhamento.js
// Decide se o ícone de "despesa compartilhada" deve aparecer num gasto —
// usado tanto na lista (ListItemGasto.js, via GastosScreen.js) quanto no
// ModalDetalhes.js, pra ficarem sempre consistentes (2026-08-17, feedback de
// teste manual: o ícone continuava aparecendo mesmo depois de encerrar o
// compartilhamento).
//
// Regra (decisão do usuário): só "Encerrar compartilhamento" (a divisão
// inteira) faz o ícone sumir — cancelar UM convite individual não, porque a
// divisão continua ativa com os demais participantes.
//
// `despesaVinculada` é o doc de `despesasCompartilhadas` do lado do criador
// (undefined se `item` não é dele) — só existe pra decidir com base no
// `status` real, nunca é buscado por este utilitário.
export function deveMostrarIconeCompartilhado(item, despesaVinculada) {
  if (item?.compartilhamentoId) {
    return despesaVinculada?.status !== 'encerrada';
  }
  if (item?.origemCompartilhamento) {
    return !item.origemCompartilhamento.encerrado;
  }
  return false;
}
