// src/hooks/useFabPosition.js
// Posição flutuante padrão do botão "+" do app — extraído de TelaPadrao.js
// (onde vivia só como um cálculo inline) para que qualquer tela nova que
// precise do mesmo FAB (ex.: CategoriasManager.js) use exatamente o mesmo
// posicionamento, sem duplicar a fórmula. `globalStyles.fabPrimary` não
// declara `position`/`right`/`bottom` (o `FabMenu`, usado pelas telas com
// várias ações, resolve isso via seu próprio wrapper) — este hook cobre o
// caso do botão simples (uma ação só).
import { Platform, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useFabPosition() {
  const insets = useSafeAreaInsets();
  const { height } = Dimensions.get('window');

  const bottom =
    Platform.OS === 'ios'
      ? insets.bottom > 0
        ? insets.bottom + (height < 750 ? 100 : 80) // iPhones menores sobem mais
        : 100 // iPhones antigos sem notch
      : insets.bottom + (height < 750 ? 90 : 70); // Android: soma a área da navegação (barra de gestos ou botões) — sem isso, o FAB fica atrás do menu inferior em aparelhos com botões físicos/na tela

  return { position: 'absolute', right: 20, bottom };
}
