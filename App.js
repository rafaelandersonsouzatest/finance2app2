// import { useEffect, useState } from 'react';
// import { GestureHandlerRootView } from 'react-native-gesture-handler';
// import { NavigationContainer } from '@react-navigation/native';
// import BottomTabs from './src/navigation/BottomTabs';
// import { DateFilterProvider } from './src/contexts/DateFilterContext';
// import { VisibilityProvider } from './src/contexts/VisibilityContext';
// import AlertaModal from './src/components/AlertaModal';

// export default function App() {
//   const [alerta, setAlerta] = useState({ visivel: false });

//   useEffect(() => {
//     global.alertaGlobal = (dados) => {
//       setAlerta({ visivel: true, ...dados });
//     };
//   }, []);

//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <VisibilityProvider>
//         <DateFilterProvider>
//           <NavigationContainer>
//             <BottomTabs />
//             <AlertaModal
//               visible={alerta.visivel}
//               onClose={() => setAlerta({ visivel: false })}
//               {...alerta}
//             />
//           </NavigationContainer>
//         </DateFilterProvider>
//       </VisibilityProvider>
//     </GestureHandlerRootView>
//   );
// }



import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import BottomTabs from "./src/navigation/BottomTabs";
import { DateFilterProvider } from "./src/contexts/DateFilterContext";
import { VisibilityProvider } from "./src/contexts/VisibilityContext";
import AlertaModal from "./src/components/AlertaModal";
import { AuthProvider, useAuth, LoginScreen, RegisterScreen, ForgotPasswordScreen, ResetPasswordScreen } from "./src/auth";


const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, loading } = useAuth();
  const [alerta, setAlerta] = useState({ visivel: false });

  useEffect(() => {
    global.alertaGlobal = (dados) => setAlerta({ visivel: true, ...dados });
  }, []);

  if (loading) return null; // opcional: mostrar splash ou loading aqui

  return (
    <>
      <NavigationContainer>
        {user ? (
          <BottomTabs />
        ) : (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
          </Stack.Navigator>
        )}
      </NavigationContainer>

      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ visivel: false })}
        {...alerta}
      />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <VisibilityProvider>
          <DateFilterProvider>
            <AppContent />
          </DateFilterProvider>
        </VisibilityProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}


// import { useEffect, useState } from "react";
// import { GestureHandlerRootView } from "react-native-gesture-handler";
// import { NavigationContainer } from "@react-navigation/native";
// import { createNativeStackNavigator } from "@react-navigation/native-stack";
// import BottomTabs from "./src/navigation/BottomTabs";
// import { DateFilterProvider } from "./src/contexts/DateFilterContext";
// import { VisibilityProvider } from "./src/contexts/VisibilityContext";
// import AlertaModal from "./src/components/AlertaModal";
// import { AuthProvider, useAuth, LoginScreen, RegisterScreen, ForgotPasswordScreen, ResetPasswordScreen } from "./src/auth";

// const Stack = createNativeStackNavigator();

// function AppContent() {
//   const { user, loading } = useAuth();
//   const [alerta, setAlerta] = useState({ visivel: false });

//   useEffect(() => {
//     global.alertaGlobal = (dados) => setAlerta({ visivel: true, ...dados });
//   }, []);

//   // 🔸 Temporariamente ignora o estado de login
//   // if (loading) return null;

//   return (
//     <>
//       <NavigationContainer>
//         {/* 🔸 Força o app a abrir direto nas rotas principais */}
//         <BottomTabs />

//         {/*
//         🔸 Código original (mantido comentado para restaurar depois)
//         {user ? (
//           <BottomTabs />
//         ) : (
//           <Stack.Navigator screenOptions={{ headerShown: false }}>
//             <Stack.Screen name="Login" component={LoginScreen} />
//             <Stack.Screen name="Register" component={RegisterScreen} />
//             <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
//             <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
//           </Stack.Navigator>
//         )}
//         */}
//       </NavigationContainer>

//       <AlertaModal
//         visible={alerta.visivel}
//         onClose={() => setAlerta({ visivel: false })}
//         {...alerta}
//       />
//     </>
//   );
// }

// export default function App() {
//   return (
//     <GestureHandlerRootView style={{ flex: 1 }}>
//       <AuthProvider>
//         <VisibilityProvider>
//           <DateFilterProvider>
//             <AppContent />
//           </DateFilterProvider>
//         </VisibilityProvider>
//       </AuthProvider>
//     </GestureHandlerRootView>
//   );
// }
