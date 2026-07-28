// 🔹 Lógica pura de normalização/projeção de eventos financeiros.
// Usada por useEventosFinanceiros — separada em arquivo próprio para poder
// ser testada sem depender de hooks/Firestore (ver SPRINT3_DISCOVERY.md, seção 11).
import { gerarDataComDia } from './gerarDataComDia';

// Um evento financeiro normalizado, independente da origem:
// { id, tipo, descricao, valor, data, pago, origem, cor, itemOriginal }
// `itemOriginal` é o documento cru do Firestore por trás do evento — usado
// pela Agenda Financeira/Central de Avisos para abrir o mesmo ModalDetalhes/
// ModalEdicao já usados no resto do app (ver SPRINT3_DISCOVERY.md). É `null`
// para eventos "projetados" (ver projetarModelo), que ainda não existem de
// verdade no Firestore — por isso não podem ser tocados/editados ainda.
function normalizarGasto(gasto) {
  return {
    id: `gasto-${gasto.id}`,
    tipo: 'gasto',
    descricao: gasto.descricao,
    valor: gasto.valor || 0,
    data: gasto.dataVencimento,
    pago: gasto.pago === true,
    origem: 'firestore',
    cor: null,
    itemOriginal: gasto,
  };
}

function normalizarEntrada(entrada) {
  return {
    id: `entrada-${entrada.id}`,
    tipo: 'entrada',
    descricao: entrada.descricao,
    valor: entrada.valor || 0,
    data: entrada.data,
    pago: entrada.pago === true,
    origem: 'firestore',
    cor: null,
    itemOriginal: entrada,
  };
}

function normalizarCartao(cartao) {
  return {
    id: `cartao-${cartao.id}`,
    tipo: 'cartao',
    descricao: cartao.descricao,
    valor: cartao.valor || 0,
    data: cartao.dataVencimento,
    pago: cartao.pago === true,
    origem: 'firestore',
    cor: cartao.corCartao || null,
    itemOriginal: cartao,
  };
}

function normalizarEmprestimo(emprestimo) {
  return {
    id: `emprestimo-${emprestimo.id}`,
    tipo: 'emprestimo',
    descricao: emprestimo.descricao,
    valor: emprestimo.valor || 0,
    data: emprestimo.dataVencimento,
    pago: emprestimo.pago === true,
    origem: 'firestore',
    cor: null,
    itemOriginal: emprestimo,
  };
}

// Projeta um lançamento fixo (gasto ou entrada) a partir de um modelo, para
// meses em que gerarFixosDoMes() ainda não rodou (ver achado da seção 2 do
// SPRINT3_DISCOVERY.md). Só modelos em modo "valor" são projetados — modelos
// em modo "porcentagem" dependem de entradas do próprio mês futuro, que ainda
// não existem, e projetar um valor errado seria pior do que não mostrar nada.
function projetarModelo(modelo, tipo, mes, ano) {
  if (modelo.modoCalculo === 'porcentagem') return null;

  const dia = modelo.diaVencimento || modelo.diaDoMes;
  const data = gerarDataComDia(dia, mes, ano);
  if (!data) return null;

  return {
    id: `${tipo}-projetado-${modelo.id}`,
    tipo,
    descricao: modelo.descricao,
    valor: modelo.valor || 0,
    data,
    pago: false,
    origem: 'projetado',
    cor: null,
    itemOriginal: null,
  };
}

/**
 * Normaliza gastos/entradas/cartões/empréstimos de um mês num formato comum
 * e, quando não há lançamentos fixos ainda gerados para o mês (mês futuro
 * nunca visitado), projeta os modelos ativos em modo "valor" para exibição.
 */
export function normalizarEventos({
  gastos = [],
  entradas = [],
  cartoes = [],
  emprestimos = [],
  modelosGasto = [],
  modelosEntrada = [],
  mes,
  ano,
}) {
  const eventos = [
    ...gastos.map(normalizarGasto),
    ...entradas.map(normalizarEntrada),
    ...cartoes.map(normalizarCartao),
    ...emprestimos.map(normalizarEmprestimo),
  ];

  const gastosFixosJaGerados = gastos.some((g) => g.origemModelo === true);
  if (!gastosFixosJaGerados) {
    modelosGasto
      // Mesma condição que gerarFixosDoMes() usa na hora de gerar de verdade
      // (where("ativo","==",true)) — projetar um modelo que a geração real
      // ignoraria criaria um evento fantasma que nunca vira lançamento.
      .filter((m) => m.ativo === true)
      .forEach((modelo) => {
        const projetado = projetarModelo(modelo, 'gasto', mes, ano);
        if (projetado) eventos.push(projetado);
      });
  }

  const entradasFixasJaGeradas = entradas.some((e) => e.origemModelo === true);
  if (!entradasFixasJaGeradas) {
    // Sem filtro por "ativo" aqui: gerarFixosDoMes() de entradas (useEntradas.js)
    // também não filtra por esse campo na geração real — projetar com o
    // mesmo critério evita a Agenda "prometer" um evento que a geração real
    // não geraria (ou vice-versa). Ver observações da entrega desta etapa.
    modelosEntrada.forEach((modelo) => {
      const projetado = projetarModelo(modelo, 'entrada', mes, ano);
      if (projetado) eventos.push(projetado);
    });
  }

  eventos.sort((a, b) => (a.data || '').localeCompare(b.data || ''));

  const eventosPorDia = {};
  eventos.forEach((evento) => {
    if (!evento.data) return;
    if (!eventosPorDia[evento.data]) {
      eventosPorDia[evento.data] = { eventos: [], total: 0 };
    }
    eventosPorDia[evento.data].eventos.push(evento);
    eventosPorDia[evento.data].total += evento.valor;
  });

  return { eventos, eventosPorDia };
}
