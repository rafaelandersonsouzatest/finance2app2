import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import BottomTabs from './src/navigation/BottomTabs';
import { DateFilterProvider } from './src/contexts/DateFilterContext';
import { VisibilityProvider } from './src/contexts/VisibilityContext';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <VisibilityProvider>
        <DateFilterProvider>
          <NavigationContainer>
            <BottomTabs />
          </NavigationContainer>
        </DateFilterProvider>
      </VisibilityProvider>
    </GestureHandlerRootView>
  );
}
