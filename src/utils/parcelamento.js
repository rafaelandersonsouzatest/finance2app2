import { parseBRL } from './formatarValor';

// 🔹 Divide um valor em N parcelas iguais (mesmo cálculo que useCartoes.js já
// fazia inline na criação — extraído para não duplicar a fórmula entre a
// criação automática e o editor de parcelas personalizadas).
//
// 🔹 Divide em centavos inteiros, não em reais fracionados — arredondar cada
// parcela de forma independente (ex.: R$100 ÷ 3 = 3× R$33,33) somava
// R$99,99, um centavo a menos que o total original. O resto da divisão
// inteira é distribuído nas ÚLTIMAS parcelas (1 centavo a mais cada),
// prática comum em parcelamento de compras — garante que a soma das
// parcelas bata exatamente com o total em qualquer divisão.
export const dividirValorIgualmente = (valorTotal, quantidadeParcelas) => {
  const total = parseBRL(valorTotal);
  const quantidade = parseInt(quantidadeParcelas, 10) || 1;
  if (quantidade <= 0) return [];

  const totalCentavos = Math.round(total * 100);
  const centavosPorParcela = Math.floor(totalCentavos / quantidade);
  const resto = totalCentavos - centavosPorParcela * quantidade;

  return Array.from({ length: quantidade }, (_, indice) => {
    const recebeAjuste = indice >= quantidade - resto;
    const centavos = centavosPorParcela + (recebeAjuste ? 1 : 0);
    return parseFloat((centavos / 100).toFixed(2));
  });
};

// 🔹 Soma das parcelas — única fórmula usada para derivar o valor total de
// uma compra a partir das parcelas (nunca o contrário).
export const somarParcelas = (valores) =>
  parseFloat(
    (valores || []).reduce((soma, v) => soma + parseBRL(v), 0).toFixed(2)
  );
