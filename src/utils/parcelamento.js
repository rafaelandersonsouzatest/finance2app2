import { parseBRL } from './formatarValor';

// 🔹 Divide um valor em N parcelas iguais (mesmo cálculo que useCartoes.js já
// fazia inline na criação — extraído para não duplicar a fórmula entre a
// criação automática e o editor de parcelas personalizadas).
export const dividirValorIgualmente = (valorTotal, quantidadeParcelas) => {
  const total = parseBRL(valorTotal);
  const quantidade = parseInt(quantidadeParcelas, 10) || 1;
  const valorParcela = quantidade > 0 ? total / quantidade : 0;
  return Array.from({ length: quantidade }, () =>
    parseFloat(valorParcela.toFixed(2))
  );
};

// 🔹 Soma das parcelas — única fórmula usada para derivar o valor total de
// uma compra a partir das parcelas (nunca o contrário).
export const somarParcelas = (valores) =>
  parseFloat(
    (valores || []).reduce((soma, v) => soma + parseBRL(v), 0).toFixed(2)
  );
