// =========================================================
// 🔹 Monta a frase e o ícone exibidos para um evento da Linha do Tempo a
// partir dos dados estruturados (`acao` + `entidade` + `alteracoes`) — ver
// ARQUITETURA.md seção 18. Nenhuma frase é gravada no Firestore; mudar o
// texto, traduzir, ou reformatar no futuro é só mudar este arquivo, nunca
// os eventos já gravados.
// =========================================================
const ROTULOS_CAMPO = {
  descricao: 'Descrição',
  categoria: 'Categoria',
  cartao: 'Cartão',
  pessoa: 'Comprador',
  credor: 'Credor',
};

const NOME_ENTIDADE = {
  cartao: { artigo: 'a compra', criado: 'Compra criada', excluido: 'Compra excluída' },
  emprestimo: { artigo: 'o empréstimo', criado: 'Empréstimo criado', excluido: 'Empréstimo excluído' },
};

const formatarValorExibicao = (valor) =>
  valor === null || valor === undefined || valor === '' ? '(vazio)' : String(valor);

export const ICONE_POR_ACAO = {
  criado: 'plus-circle-outline',
  editado: 'pencil-outline',
  excluido: 'trash-can-outline',
  pago: 'check-circle-outline',
  antecipado: 'clock-fast',
  revertido: 'history',
  redistribuido: 'swap-horizontal',
  valores_personalizados: 'tune-variant',
};

export const montarDescricaoEvento = (evento) => {
  const { acao, entidade, alteracoes, idCompra, entidadeId } = evento;
  const nomes = NOME_ENTIDADE[entidade] || { artigo: 'o item', criado: 'Item criado', excluido: 'Item excluído' };
  const ehGrupoInteiro = acao === 'excluido' && entidadeId === idCompra;

  switch (acao) {
    case 'criado':
      return nomes.criado;
    case 'excluido':
      return ehGrupoInteiro ? nomes.excluido : 'Parcela excluída';
    case 'pago':
      return 'Parcela paga';
    case 'antecipado':
      return 'Parcela antecipada';
    case 'revertido':
      return 'Antecipação revertida';
    case 'redistribuido':
      return 'Parcela excluída — valor redistribuído entre as demais';
    case 'valores_personalizados':
      return 'Valores das parcelas personalizados';
    case 'editado': {
      if (!alteracoes || Object.keys(alteracoes).length === 0) return 'Dados alterados';
      return Object.entries(alteracoes)
        .map(([campo, { antes, depois }]) => {
          const rotulo = ROTULOS_CAMPO[campo] || campo;
          return `${rotulo}: "${formatarValorExibicao(antes)}" → "${formatarValorExibicao(depois)}"`;
        })
        .join('; ');
    }
    default:
      return 'Evento registrado';
  }
};
