// =========================================================
// 🔹 Configuração central da Linha do Tempo (ver ARQUITETURA.md seção 18) —
// lista única, por entidade, dos campos "dignos de evento" quando alterados
// numa edição comum (`acao: 'editado'`). Campos internos/técnicos (ids,
// timestamps, totalParcelas, corCartao derivada etc.) nunca entram aqui —
// a Linha do Tempo é para o usuário, não uma auditoria técnica. `valor` e
// `pago` ficam de fora de propósito: valor muda junto de ações próprias
// (antecipação, redistribuição) e pago tem sua própria `acao` dedicada
// (ver detectarPagamento em registrarEvento.js).
//
// Incluir um campo novo no futuro é só adicionar o nome na lista da
// entidade certa — nenhuma outra lógica precisa mudar.
// =========================================================
export const CAMPOS_RELEVANTES = {
  cartao: ['descricao', 'categoria', 'cartao', 'pessoa'],
  emprestimo: ['descricao', 'categoria', 'credor'],
};

// 🔹 Compara só os campos relevantes da entidade entre o estado atual e os
// dados recebidos numa atualização, devolvendo só o que de fato mudou.
export const detectarAlteracoes = (entidade, atual, novosDados) => {
  const campos = CAMPOS_RELEVANTES[entidade] || [];
  const alteracoes = {};

  campos.forEach((campo) => {
    if (novosDados?.[campo] === undefined) return;
    const antes = atual?.[campo] ?? null;
    const depois = novosDados[campo] ?? null;
    if (antes !== depois) {
      alteracoes[campo] = { antes, depois };
    }
  });

  return alteracoes;
};
