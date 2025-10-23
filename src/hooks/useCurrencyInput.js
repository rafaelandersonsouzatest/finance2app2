import { useState, useRef } from 'react';
import { formatarBRL } from '../utils/formatarValor';

/**
 * Hook para entrada monetária BRL fluida e sem travamentos.
 */
export function useCurrencyInput(valorInicial = 0, onChangeNumber) {
  const [texto, setTexto] = useState(formatarBRL(valorInicial || 0));
  const bloqueadoRef = useRef(false);

  const handleChange = (novoTexto) => {
    if (bloqueadoRef.current) return;
    bloqueadoRef.current = true;

    // 🔹 remove tudo que não for número
    const apenasNumeros = novoTexto.replace(/\D/g, '');
    const numero = apenasNumeros ? parseFloat(apenasNumeros) / 100 : 0;

    // 🔹 formata visualmente
    const formatado = formatarBRL(numero);
    setTexto(formatado);
    onChangeNumber?.(numero);

    setTimeout(() => {
      bloqueadoRef.current = false;
    }, 50);
  };

  return { texto, handleChange, setTexto };
}
