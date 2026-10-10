// src/components/AreaFormulario.js
// Área de conteúdo padrão para modais com campos de digitação. Envolve só o
// CONTEÚDO do modal (cada modal mantém seu próprio visual — de baixo,
// centralizado etc.) e resolve num lugar só o que antes cada modal fazia de
// um jeito (ou não fazia):
//   1. sobe o conteúdo quando o teclado abre;
//   2. conteúdo sempre rolável — com fonte grande / tela pequena, todo campo
//      continua alcançável;
//   3. rola até o campo que está sendo digitado quando o teclado cobriria ele
//      (no Android o ScrollView não faz isso sozinho);
//   4. desconta a barra de navegação do sistema (botões ou gestos) / a
//      barrinha de gesto do iPhone.
//
// 🔹 Como sobe: o app é de borda a borda (Expo SDK 57) e, com o
// KeyboardProvider da react-native-keyboard-controller (App.js), os modais
// também — a janela do modal NÃO encolhe com o teclado. Nem o
// KeyboardAvoidingView do React Native nem o da biblioteca funcionaram aqui
// dentro (medido no aparelho, ver PROJECT_STATUS.md seção 24), então a casca
// calcula sozinha: mede onde ela termina na tela, compara com o topo do
// teclado e coloca a diferença como espaço extra embaixo — como os modais são
// ancorados embaixo (ou têm altura fixa), isso empurra o conteúdo para cima.
// Da biblioteca usamos só os eventos do teclado, que são iguais em
// Android/iOS e funcionam dentro de Modal.
//
// Requisito: o Modal que contém esta área precisa de `statusBarTranslucent`
// e `navigationBarTranslucent` — assim ocupa a tela inteira e as medidas
// (measureInWindow) ficam nas mesmas coordenadas da tela, usadas para o
// topo do teclado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View, TextInput, Dimensions } from 'react-native';
import { KeyboardEvents } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Folga entre o campo e o topo do teclado, para o texto não ficar colado.
const FOLGA_TECLADO = 24;

const topoDoTeclado = (alturaTeclado) => Dimensions.get('screen').height - alturaTeclado;

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
  const containerRef = useRef(null);
  const scrollRef = useRef(null);
  const offsetRef = useRef(0);
  const topoTecladoRef = useRef(null);
  // Espaço extra embaixo = quanto da área ficaria atrás do teclado.
  const [espacoTeclado, setEspacoTeclado] = useState(0);

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
    // O espaço fica DENTRO do container, então o fundo dele continua no mesmo
    // lugar — recalcular (ex.: troca do teclado de letras para o numérico)
    // dá o mesmo resultado, sem acumular.
    const subirConteudo = (alturaTeclado) => {
      const topoTeclado = topoDoTeclado(alturaTeclado);
      containerRef.current?.measureInWindow((_x, y, _w, altura) => {
        setEspacoTeclado(Math.max(0, y + altura - topoTeclado));
      });
    };

    // "Will": sobe junto com o teclado (o evento já traz a altura final).
    const aoComecarAMostrar = KeyboardEvents.addListener('keyboardWillShow', (e) =>
      subirConteudo(e.height)
    );
    // "Did": teclado terminou de abrir — repete o cálculo (caso o "Will" não
    // chegue em algum aparelho) e só então confere o campo focado, já com o
    // layout novo.
    const aoMostrar = KeyboardEvents.addListener('keyboardDidShow', (e) => {
      topoTecladoRef.current = topoDoTeclado(e.height);
      subirConteudo(e.height);
      setTimeout(garantirCampoVisivel, 150);
    });
    const aoEsconder = KeyboardEvents.addListener('keyboardDidHide', () => {
      topoTecladoRef.current = null;
      setEspacoTeclado(0);
    });
    return () => {
      aoComecarAMostrar.remove();
      aoMostrar.remove();
      aoEsconder.remove();
    };
  }, [garantirCampoVisivel]);

  return (
    <View
      ref={containerRef}
      style={[{ flexShrink: 1 }, style, { paddingBottom: espacoTeclado }]}
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
      {descontarNavegacao && <View style={{ height: insets.bottom }} />}
    </View>
  );
}
