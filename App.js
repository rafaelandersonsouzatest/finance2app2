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
import MainStack from "./src/navigation/MainStack";
import { navigationRef } from "./src/navigation/navigationRef";

import { DateFilterProvider } from "./src/contexts/DateFilterContext";
import { VisibilityProvider } from "./src/contexts/VisibilityContext";
import { UserMenuProvider } from "./src/contexts/UserMenuContext";

import AlertaModal from "./src/components/AlertaModal";
import UserMenu from "./src/components/UserMenu";
import {
  AuthProvider,
  useAuth,
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
} from "./src/auth";

import { doc, setDoc } from "firebase/firestore";
import { db } from "./src/config/firebase";

import { ContaCriadaModal } from "./src/components/ContaCriadaModal";
import OnboardingScreen from "./src/auth/OnboardingScreen";

const Stack = createNativeStackNavigator();

function AppContent() {
  const { user, profile, loading, profileLoading, carregarPerfil } = useAuth();
  const [alerta, setAlerta] = useState({ visivel: false });

  const [primeiroAcesso, setPrimeiroAcesso] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    global.alertaGlobal = (dados) => setAlerta({ visivel: true, ...dados });
  }, []);

  // Atualiza flags assim que o perfil for carregado
  useEffect(() => {
    if (!profile) return;

    setPrimeiroAcesso(profile.primeiroAcesso === true);
    setShowOnboarding(profile.jaViuOnboarding === false);
  }, [profile]);

  // Loading geral
  if (loading || profileLoading) return null;

  // ================================
  // 🔥 PRIMEIRO O MODAL
  // ================================
  if (primeiroAcesso) {
    return (
      <ContaCriadaModal
        visivel={true}
        nomeUsuario={profile?.apelido || profile?.nome || ""}

        onFechar={async () => {
          setPrimeiroAcesso(false);
          setShowOnboarding(false);

          const ref = doc(db, "users", user.uid);
          await setDoc(
            ref,
            { primeiroAcesso: false, jaViuOnboarding: true },
            { merge: true }
          );

          carregarPerfil(user.uid);
        }}

        onTutorial={async () => {
          setPrimeiroAcesso(false);
          setShowOnboarding(true);

          const ref = doc(db, "users", user.uid);
          await setDoc(
            ref,
            { primeiroAcesso: false, jaViuOnboarding: false },
            { merge: true }
          );

          carregarPerfil(user.uid);
        }}
      />
    );
  }

  // ================================
  // 🔥 DEPOIS O ONBOARDING
  // ================================
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onFinish={() => {
          setShowOnboarding(false);

          const ref = doc(db, "users", user.uid);
          setDoc(ref, { jaViuOnboarding: true }, { merge: true });

          carregarPerfil(user.uid);
        }}
      />
    );
  }

  // ================================
  // 🔥 APP NORMAL
  // ================================
  return (
    <>
      <NavigationContainer ref={navigationRef}>
        {user ? (
          <UserMenuProvider>
            <MainStack />
            <UserMenu />
          </UserMenuProvider>
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
