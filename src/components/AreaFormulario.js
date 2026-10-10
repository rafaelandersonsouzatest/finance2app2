// src/components/AreaFormulario.js
// Área de conteúdo padrão para modais com campos de digitação. Envolve só o
// CONTEÚDO do modal (cada modal mantém seu próprio visual — de baixo,
// centralizado etc.) e resolve num lugar só o que antes cada modal fazia de
// um jeito (ou não fazia):
//   1. sobe o conteúdo quando o teclado abre (KeyboardAvoidingView);
//   2. conteúdo sempre rolável — com fonte grande / tela pequena, todo campo
//      continua alcançável;
//   3. rola até o campo que está sendo digitado quando o teclado cobriria ele
//      (no Android o ScrollView não faz isso sozinho);
//   4. no iPhone, desconta a barrinha de gesto da parte de baixo. No Android
//      não: lá o modal já termina acima da barra de navegação (testado em
//      aparelho com botões — somar o recuo deixava um vão grande).
//
// Feito só com React Native puro (sem dependência nativa nova). Se um dia
// trocarmos por `react-native-keyboard-controller` (KeyboardAwareScrollView),
// a troca acontece só aqui.
import { useCallback, useEffect, useRef } from 'react';
import { KeyboardAvoidingView, ScrollView, View, Keyboard, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Folga entre o campo e o topo do teclado, para o texto não ficar colado.
const FOLGA_TECLADO = 24;

export default function AreaFormulario({
  children,
  // Botões fixos abaixo da área rolável (ex.: Cancelar/Salvar) — ficam
  // sempre visíveis acima do teclado.
  rodape = null,
  // `true` para modal colado na base da tela (bottom sheet); `false` para
  // modal centralizado, que não encosta na barra de navegação.
  descontarNavegacao = true,
  // `false` quando o conteúdo já é uma lista com rolagem própria (FlatList)
  // — lista virtualizada dentro de ScrollView não é suportada. Aí a área só
  // sobe com o teclado e encolhe; quem rola é a própria lista.
  rolavel = true,
  style,
  estiloScroll,
  estiloConteudo,
}) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);
  const topoTecladoRef = useRef(null);

  // Se o campo focado (dentro desta área) ficaria atrás do teclado, rola o
  // suficiente para ele aparecer.
  const garantirCampoVisivel = useCallback(() => {
    const campo = TextInput.State.currentlyFocusedInput?.();
    const topoTeclado = topoTecladoRef.current;
    if (!campo || topoTeclado == null || !scrollRef.current) return;

    scrollRef.current.measureInWindow((_sx, areaTopo, _sw, areaAltura) => {
      campo.measureInWindow((_x, y, _w, altura) => {
        // Campo acima desta área = é de outro modal/tela; não mexe.
        if (y < areaTopo) return;
        // Parte visível da área: termina no teclado ou antes, nos botões do
        // rodapé (que ficam entre a área rolável e o teclado).
        const limite = Math.min(areaTopo + areaAltura, topoTeclado) - FOLGA_TECLADO;
        const excesso = y + altura - limite;
        if (excesso > 0) {
          scrollRef.current?.scrollTo({ y: offsetRef.current + excesso, animated: true });
        }
      });
    });
  }, []);

  useEffect(() => {
    const aoMostrar = Keyboard.addListener('keyboardDidShow', (e) => {
      topoTecladoRef.current = e.endCoordinates.screenY;
      // Espera o KeyboardAvoidingView terminar de reposicionar o conteúdo.
      setTimeout(garantirCampoVisivel, 100);
    });
    const aoEsconder = Keyboard.addListener('keyboardDidHide', () => {
      topoTecladoRef.current = null;
    });
    return () => {
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, [garantirCampoVisivel]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[{ flexShrink: 1 }, style]}
    >
      {rolavel ? (
        <ScrollView
          ref={scrollRef}
          style={estiloScroll}
          contentContainerStyle={estiloConteudo}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          scrollEventThrottle={16}
          onScroll={(e) => {
            offsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          // Trocar de campo com o teclado já aberto não dispara
          // keyboardDidShow de novo — confere depois do toque.
          onTouchEnd={() => setTimeout(garantirCampoVisivel, 350)}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flexShrink: 1 }, estiloScroll]}>{children}</View>
      )}
      {rodape}
      {descontarNavegacao && Platform.OS === 'ios' && <View style={{ height: insets.bottom }} />}
    </KeyboardAvoidingView>
  );
}
