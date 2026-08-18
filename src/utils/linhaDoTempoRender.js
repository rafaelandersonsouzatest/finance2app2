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
  membro: 'Membro',
  nome: 'Nome',
  instituicao: 'Instituição',
  meta: 'Meta',
};

// 🔹 Cartão/empréstimo são "agrupados" (várias parcelas com o mesmo
// idCompra) — só eles distinguem "grupo inteiro excluído" de "uma parcela
// excluída". Gasto/entrada/investimento são avulsos, sem esse conceito.
const ENTIDADES_AGRUPADAS = ['cartao', 'emprestimo'];

const NOME_ENTIDADE = {
  cartao: { artigo: 'a compra', criado: 'Compra criada', excluido: 'Compra excluída' },
  emprestimo: { artigo: 'o empréstimo', criado: 'Empréstimo criado', excluido: 'Empréstimo excluído' },
  gasto: { artigo: 'o gasto', criado: 'Gasto criado', excluido: 'Gasto excluído', pago: 'Gasto pago' },
  entrada: { artigo: 'a entrada', criado: 'Entrada criada', excluido: 'Entrada excluída', pago: 'Entrada recebida' },
  investimento: { artigo: 'o investimento', criado: 'Investimento criado', excluido: 'Investimento excluído' },
};

const formatarValorExibicao = (valor) =>
  valor === null || valor === undefined || valor === '' ? '(vazio)' : String(valor);

// 🔹 "João" | "João e Maria" | "João, Maria e Carlos" — usado pelos eventos
// de divisão de despesa (Colaboração), que sempre envolvem outra(s)
// pessoa(s) além do dono da timeline (ver COLABORACAO_ARQUITETURA_V1.md
// seção 2.1).
const formatarListaNomes = (participantes) => {
  const nomes = (participantes || []).map((p) => p.nome || 'alguém');
  if (nomes.length === 0) return 'alguém';
  if (nomes.length === 1) return nomes[0];
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
};

export const ICONE_POR_ACAO = {
  criado: 'plus-circle-outline',
  editado: 'pencil-outline',
  excluido: 'trash-can-outline',
  pago: 'check-circle-outline',
  reaberto: 'restore',
  antecipado: 'clock-fast',
  revertido: 'history',
  redistribuido: 'swap-horizontal',
  valores_personalizados: 'tune-variant',
  compartilhado: 'account-multiple-plus-outline',
  convite_recebido: 'email-outline',
  convite_aceito: 'check-circle-outline',
  convite_recusado: 'close-circle-outline',
  convite_cancelado: 'cancel',
  convite_expirado: 'clock-alert-outline',
  compartilhamento_encerrado: 'account-multiple-remove-outline',
  participante_adicionado: 'account-plus-outline',
  participante_removido: 'account-minus-outline',
  alteracao_proposta: 'file-document-edit-outline',
  alteracao_aceita: 'check-circle-outline',
  alteracao_recusada: 'close-circle-outline',
};

// 🔹 `meuUid` (opcional) — quem está vendo a timeline agora. Sem ele, os
// eventos de divisão de despesa caem no texto "em terceira pessoa" (nome de
// quem agiu, nunca "Você"); os demais `acao`/`entidade` já existentes não
// usam esse parâmetro e continuam idênticos a antes (extensão compatível,
// ver ARQUITETURA.md seção 18 sobre `versao`). Passar `meuUid` é trabalho da
// tela que exibe a Linha do Tempo — ver Etapa 5 da Colaboração.
export const montarDescricaoEvento = (evento, meuUid) => {
  const { acao, entidade, alteracoes, idCompra, entidadeId, participantes, usuarioId } = evento;

  if (entidade === 'divisaoDespesa') {
    const souEu = !!meuUid && usuarioId === meuUid;
    const nomes = formatarListaNomes(participantes);
    switch (acao) {
      case 'compartilhado':
        return `Você compartilhou uma despesa com ${nomes}`;
      case 'convite_recebido':
        return `Convite de divisão recebido de ${nomes}`;
      case 'convite_aceito':
        return souEu ? `Você aceitou a divisão com ${nomes}` : `${nomes} aceitou a divisão`;
      case 'convite_recusado':
        return souEu ? `Você recusou a divisão com ${nomes}` : `${nomes} recusou a divisão`;
      case 'convite_cancelado':
        return souEu
          ? `Você cancelou o convite de divisão com ${nomes}`
          : `${nomes} cancelou o convite de divisão`;
      case 'convite_expirado':
        return `Convite de divisão com ${nomes} expirou`;
      case 'compartilhamento_encerrado':
        return souEu
          ? `Você encerrou o compartilhamento desta despesa com ${nomes}`
          : `${nomes} encerrou o compartilhamento desta despesa`;
      case 'redistribuido':
        return souEu
          ? `Você decidiu o destino de um valor sem dono com ${nomes}`
          : `${nomes} decidiu o destino de um valor sem dono desta divisão`;
      case 'participante_adicionado':
        return souEu ? `Você adicionou ${nomes} a esta divisão` : `${nomes} foi adicionado a esta divisão`;
      case 'participante_removido':
        return souEu ? `Você removeu ${nomes} desta divisão` : `${nomes} foi removido desta divisão`;
      case 'alteracao_proposta':
        return souEu
          ? `Você propôs uma alteração de valor com ${nomes}`
          : `${nomes} propôs uma alteração de valor nesta divisão`;
      case 'alteracao_aceita':
        return souEu ? `Você aceitou a alteração proposta por ${nomes}` : `${nomes} aceitou a alteração proposta`;
      case 'alteracao_recusada':
        return souEu ? `Você recusou a alteração proposta por ${nomes}` : `${nomes} recusou a alteração proposta`;
      default:
        return 'Evento de divisão de despesa';
    }
  }

  const nomes = NOME_ENTIDADE[entidade] || {
    artigo: 'o item',
    criado: 'Item criado',
    excluido: 'Item excluído',
    pago: 'Marcado como pago',
  };
  const ehAgrupada = ENTIDADES_AGRUPADAS.includes(entidade);
  const ehGrupoInteiro = ehAgrupada && acao === 'excluido' && entidadeId === idCompra;

  switch (acao) {
    case 'criado':
      return nomes.criado;
    case 'excluido':
      return !ehAgrupada || ehGrupoInteiro ? nomes.excluido : 'Parcela excluída';
    case 'pago':
      return ehAgrupada ? 'Parcela paga' : nomes.pago || 'Marcado como pago';
    case 'reaberto':
      return ehAgrupada ? 'Parcela marcada como pendente novamente' : 'Marcado como pendente novamente';
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
