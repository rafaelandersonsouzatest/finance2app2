// Base de cálculo de gastos em modo "porcentagem" (ex.: dízimo = 10% do
// salário).
//
// Antes, o modelo guardava os ids das ENTRADAS escolhidas (`entradasSelecionadas`)
// — que só existem num mês específico. No mês seguinte as entradas são
// documentos novos, com ids novos, e o gasto era gerado zerado. Agora a base
// aponta para MODELOS de entrada (estáveis entre meses) + a opção de incluir
// as entradas avulsas do mês:
//   - `baseModelosEntrada`: ids de modelos de entrada;
//   - `baseIncluiAvulsas`: soma também toda entrada que não veio de modelo.
// `entradasSelecionadas` continua gravado em dado antigo, só como legado.

import { parseBRL } from './formatarValor';

const normalizarDescricao = (texto) => String(texto || '').trim().toLowerCase();

export const temBaseNova = (item) => Array.isArray(item?.baseModelosEntrada);

// Arredonda para centavos sem o erro de ponto flutuante de toFixed
// (ex.: 1.005.toFixed(2) === '1.00').
export const arredondarCentavos = (valor) =>
  Math.round((Number(valor) + Number.EPSILON) * 100) / 100;

/**
 * Soma as entradas do mês que compõem a base.
 *
 * Uma entrada entra na soma quando:
 * - veio de um modelo da base (`modeloId`), ou
 * - é antiga, gerada por modelo antes de existir `modeloId`, e a descrição
 *   bate com a de um modelo da base (mesma regra de utils/modelosPendentes.js), ou
 * - não veio de modelo e `baseIncluiAvulsas` está ligado.
 */
export function somarBase(base, entradasDoMes = [], modelosEntrada = []) {
  const ids = new Set(base?.baseModelosEntrada || []);
  const descricoesBase = new Set(
    modelosEntrada
      .filter((m) => ids.has(m.id))
      .map((m) => normalizarDescricao(m.descricao))
  );

  const total = entradasDoMes.reduce((soma, e) => {
    const deModelo = e?.origemModelo === true;
    const entra = deModelo
      ? e.modeloId
        ? ids.has(e.modeloId)
        : descricoesBase.has(normalizarDescricao(e.descricao))
      : base?.baseIncluiAvulsas === true;
    return entra ? soma + parseBRL(e.valor) : soma;
  }, 0);

  return arredondarCentavos(total);
}

export const calcularValorPercentual = (total, percentual) =>
  arredondarCentavos(parseBRL(total) * (parseBRL(percentual) / 100));

/**
 * Converte a base antiga (ids de entradas de um mês) para a nova, a partir das
 * entradas que foram encontradas por esses ids (as apagadas simplesmente não
 * vêm na lista).
 *
 * Retorna `null` quando nada pôde ser convertido — o modelo fica como está e o
 * usuário resseleciona a base.
 */
export function converterBaseLegada(entradasEncontradas = [], modelosEntrada = []) {
  const idsModelos = new Set(modelosEntrada.map((m) => m.id));
  const modeloPorDescricao = new Map(
    modelosEntrada.map((m) => [normalizarDescricao(m.descricao), m.id])
  );

  const baseModelosEntrada = new Set();
  let baseIncluiAvulsas = false;

  entradasEncontradas.forEach((e) => {
    if (e?.origemModelo !== true) {
      baseIncluiAvulsas = true;
      return;
    }
    const modeloId =
      e.modeloId && idsModelos.has(e.modeloId)
        ? e.modeloId
        : modeloPorDescricao.get(normalizarDescricao(e.descricao));
    if (modeloId) baseModelosEntrada.add(modeloId);
  });

  if (baseModelosEntrada.size === 0 && !baseIncluiAvulsas) return null;
  return { baseModelosEntrada: [...baseModelosEntrada], baseIncluiAvulsas };
}
