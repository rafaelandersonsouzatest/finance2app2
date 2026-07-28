// src/navigation/navigationRef.js
// Permite navegar a partir de componentes que ficam FORA da árvore do
// Stack.Navigator (ex: UserMenu.js, montado como irmão do MainStack em
// App.js) — useNavigation() só funciona dentro de uma tela de um navigator;
// este é o padrão oficial do React Navigation para os demais casos.
import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}
