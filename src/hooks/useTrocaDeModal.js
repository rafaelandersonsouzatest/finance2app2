// src/hooks/useTrocaDeModal.js
// Troca segura de um modal por outro (ex.: formulário fecha → aviso "Sucesso!").
//
// 🔹 Por quê: o iPhone só apresenta UMA janela modal por vez a partir da tela.
// Se um segundo modal é aberto enquanto o primeiro ainda está aberto ou
// fechando, o iOS recusa em silêncio e sobra uma camada invisível por cima da
// tela — o app continua vivo (dados atualizam), mas nenhum toque funciona
// (diagnosticado no aparelho em 2026-10-15, ver PROJECT_STATUS.md seção 25).
// O Android aceita vários ao mesmo tempo, então lá a troca é imediata.
//
// Uso:
//   const { abrirDepoisDeFechar, aoTerminarDeFechar } = useTrocaDeModal();
//   <ModalA ... onDismiss={aoTerminarDeFechar} />      // modal que vai fechar
//   setModalAVisivel(false);
//   abrirDepoisDeFechar(() => setModalBVisivel(true)); // abre B só depois
//
// Modal desenhado DENTRO de outro (filho na árvore) não precisa disto — o iOS
// aceita modal sobre modal quando um está dentro do outro.
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// Rede de segurança: se o iOS não avisar que o modal fechou (onDismiss), o
// próximo abre mesmo assim depois deste tempo — nunca fica "pendurado". Cobre
// a animação de saída do react-native-modal (~300 ms) com folga.
const ESPERA_MAXIMA_MS = 1000;

export function useTrocaDeModal() {
  const pendenteRef = useRef(null);
  const timerRef = useRef(null);

  const aoTerminarDeFechar = useCallback(() => {
    clearTimeout(timerRef.current);
    const abrir = pendenteRef.current;
    pendenteRef.current = null;
    abrir?.();
  }, []);

  const abrirDepoisDeFechar = useCallback(
    (abrir) => {
      if (Platform.OS !== 'ios') {
        abrir();
        return;
      }
      pendenteRef.current = abrir;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(aoTerminarDeFechar, ESPERA_MAXIMA_MS);
    },
    [aoTerminarDeFechar]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return { abrirDepoisDeFechar, aoTerminarDeFechar };
}
