import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import BottomTabs from './src/navigation/BottomTabs';
import { DateFilterProvider } from './src/contexts/DateFilterContext';
import { VisibilityProvider } from './src/contexts/VisibilityContext';
import AlertaModal from './src/components/AlertaModal';

export default function App() {
  const [alerta, setAlerta] = useState({ visivel: false });

  // 🔹 Permite abrir o AlertaModal de qualquer lugar via global.alertaGlobal()
  useEffect(() => {
    global.alertaGlobal = (dados) => {
      setAlerta({ visivel: true, ...dados });
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <VisibilityProvider>
        <DateFilterProvider>
          <NavigationContainer>
            <BottomTabs />
            {/* 🔹 Modal global de alerta */}
            <AlertaModal
              visible={alerta.visivel}
              onClose={() => setAlerta({ visivel: false })}
              {...alerta}
            />
          </NavigationContainer>
        </DateFilterProvider>
      </VisibilityProvider>
    </GestureHandlerRootView>
  );
}
