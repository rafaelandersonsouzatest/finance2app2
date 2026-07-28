// 🔹 HOOK: EVENTOS FINANCEIROS
// Fonte única de "o que vai acontecer" — usada pela Agenda Financeira
// (calendário + linha do tempo) e pela Central de Avisos.
// Ver SPRINT3_DISCOVERY.md (seção 3) para o raciocínio de arquitetura por
// trás deste hook antes de alterá-lo.
import { useMemo } from 'react';
import { useGastos } from './useGastos';
import { useEntradas } from './useEntradas';
import { useCartoes } from './useCartoes';
import { useEmprestimos } from './useEmprestimos';
import { useModelos } from './useModelos';
import { normalizarEventos } from '../utils/eventosFinanceiros';
import { normalizarParaISO } from '../utils/formatarData';

// Eventos de um único mês/ano (real + projeção de fixos ainda não gerados).
// Base para a visão de Calendário da Agenda Financeira.
//
// Também expõe `toggleStatus`/`editar`/`excluir` — não são regras de negócio
// novas, apenas despacham para a mesma função de CRUD que TelaPadrao.js e as
// telas de Entradas/Saídas já usam para cada tipo (updateGasto, updateCartao
// etc.), já obtidas aqui mesmo pelos hooks de dados. Isso permite que a
// Agenda Financeira/Central de Avisos reaproveitem ModalDetalhes/ModalEdicao
// e o botão de status sem duplicar lógica (ver SPRINT3_DISCOVERY.md).
// Eventos "projetados" (sem `itemOriginal`) não têm ação — ainda não existem
// no Firestore para serem tocados.
export const useEventosFinanceiros = (mes, ano) => {
  const gastosHook = useGastos(mes, ano);
  const entradasHook = useEntradas(mes, ano);
  const cartoesHook = useCartoes(mes, ano);
  const emprestimosHook = useEmprestimos(mes, ano);
  const { modelos: modelosGasto, loading: loadingModelosGasto } = useModelos('gasto');
  const { modelos: modelosEntrada, loading: loadingModelosEntrada } = useModelos('entrada');

  const loading =
    gastosHook.loading ||
    entradasHook.carregando ||
    cartoesHook.loading ||
    emprestimosHook.loading ||
    loadingModelosGasto ||
    loadingModelosEntrada;

  const error =
    gastosHook.error || entradasHook.erro || cartoesHook.error || emprestimosHook.error || null;

  const { eventos, eventosPorDia } = useMemo(
    () =>
      normalizarEventos({
        gastos: gastosHook.gastos,
        entradas: entradasHook.entradas,
        cartoes: cartoesHook.cartoes,
        emprestimos: emprestimosHook.emprestimos,
        modelosGasto,
        modelosEntrada,
        mes,
        ano,
      }),
    [
      gastosHook.gastos,
      entradasHook.entradas,
      cartoesHook.cartoes,
      emprestimosHook.emprestimos,
      modelosGasto,
      modelosEntrada,
      mes,
      ano,
    ]
  );

  const toggleStatus = (evento) => {
    if (!evento.itemOriginal) return undefined;
    const dados = { ...evento.itemOriginal, pago: !evento.pago };
    switch (evento.tipo) {
      case 'gasto':
        return gastosHook.updateGasto(evento.itemOriginal.id, dados);
      case 'entrada':
        return entradasHook.atualizarEntrada(evento.itemOriginal.id, dados);
      case 'cartao':
        return cartoesHook.updateCartao(evento.itemOriginal.id, dados);
      case 'emprestimo':
        return emprestimosHook.updateEmprestimo(evento.itemOriginal.id, dados);
      default:
        return undefined;
    }
  };

  const editar = (evento, dadosEditados) => {
    if (!evento.itemOriginal) return undefined;
    switch (evento.tipo) {
      case 'gasto':
        return gastosHook.updateGasto(evento.itemOriginal.id, dadosEditados);
      case 'entrada':
        return entradasHook.atualizarEntrada(evento.itemOriginal.id, dadosEditados);
      case 'cartao':
        return cartoesHook.updateCartao(evento.itemOriginal.id, dadosEditados);
      case 'emprestimo':
        return emprestimosHook.updateEmprestimo(evento.itemOriginal.id, dadosEditados);
      default:
        return undefined;
    }
  };

  const excluir = (evento) => {
    if (!evento.itemOriginal) return undefined;
    switch (evento.tipo) {
      case 'gasto':
        return gastosHook.deleteGasto(evento.itemOriginal.id);
      case 'entrada':
        return entradasHook.excluirEntrada(evento.itemOriginal.id);
      case 'cartao':
        return cartoesHook.deleteCartao(evento.itemOriginal.id);
      case 'emprestimo':
        return emprestimosHook.deleteEmprestimo(evento.itemOriginal.id);
      default:
        return undefined;
    }
  };

  return { eventos, eventosPorDia, loading, error, toggleStatus, editar, excluir };
};

// Eventos "a partir de hoje", cruzando a virada de mês quando necessário —
// base da Central de Avisos e da visão padrão da Linha do Tempo Financeira.
// Limitação conhecida (aceita conscientemente, ver SPRINT3_DISCOVERY.md):
// "vencidos" só enxerga atraso dentro do mês atual e do mês seguinte, não
// lançamentos não pagos de meses mais antigos.
export const useProximosEventos = (dias = 7) => {
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();

  const proximoMesData = new Date(anoAtual, mesAtual, 1);
  const mesSeguinte = proximoMesData.getMonth() + 1;
  const anoSeguinte = proximoMesData.getFullYear();

  const atual = useEventosFinanceiros(mesAtual, anoAtual);
  const seguinte = useEventosFinanceiros(mesSeguinte, anoSeguinte);

  const { vencidos, venceHoje, proximosDias } = useMemo(() => {
    const todos = [...atual.eventos, ...seguinte.eventos];
    const naoPagos = todos.filter((e) => !e.pago);

    const hojeISO = normalizarParaISO(hoje);
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() + dias);
    const limiteISO = normalizarParaISO(limite);

    return {
      vencidos: naoPagos.filter((e) => e.data < hojeISO),
      venceHoje: naoPagos.filter((e) => e.data === hojeISO),
      proximosDias: naoPagos.filter((e) => e.data > hojeISO && e.data <= limiteISO),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual.eventos, seguinte.eventos, dias]);

  return {
    vencidos,
    venceHoje,
    proximosDias,
    loading: atual.loading || seguinte.loading,
    error: atual.error || seguinte.error || null,
    // As ações não dependem de qual instância (mês atual/seguinte) as expôs —
    // updateGasto/updateCartao/etc. operam por id de documento, não pelo
    // mes/ano com que o hook foi instanciado. Tanto faz usar as de `atual`.
    toggleStatus: atual.toggleStatus,
    editar: atual.editar,
    excluir: atual.excluir,
  };
};
