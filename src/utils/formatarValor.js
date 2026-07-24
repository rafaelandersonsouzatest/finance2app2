export const formatarBRL = (valor) => {
  if (valor === null || valor === undefined || valor === 0) return '';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(Number(valor || 0));
};

// 🔹 converte string BRL → número (aceita também um número já pronto)
export const parseBRL = (valor) => {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;

  return (
    parseFloat(
      String(valor || '')
        .replace(/\s/g, '')
        .replace('R$', '')
        .replace(/\./g, '')
        .replace(',', '.')
    ) || 0
  );
};
