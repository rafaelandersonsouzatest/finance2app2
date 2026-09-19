import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  initializeAuth,
  getReactNativePersistence,
  connectAuthEmulator,
} from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

const appEnv = Constants.expoConfig.extra.APP_ENV;

// 🔹 Configurações de cada ambiente Firebase
const firebaseConfigs = {
  "meu-app": {
    apiKey: "AIzaSyAFrftawD5_qGuS3XU_sw_82KZB4TFnaGM",
    authDomain: "fincanceapp-rafael.firebaseapp.com",
    projectId: "fincanceapp-rafael",
    storageBucket: "fincanceapp-rafael.appspot.com",
    messagingSenderId: "235824014044",
    appId: "1:235824014044:web:a416ca064ca3f61044ca19",
    measurementId: "G-KP26SFJ2N1",
  },
  rafael: {
    apiKey: "AIzaSyC0qWp-NGI6mcgAHCuAxL1c2-DAjRnjsV4",
    authDomain: "financeapp-teste-rafael.firebaseapp.com",
    projectId: "financeapp-teste-rafael",
    storageBucket: "financeapp-teste-rafael.appspot.com",
    messagingSenderId: "571812252045",
    appId: "1:571812252045:web:fd5cf81907afb06b86d5c4",
  },
  marina: {
    apiKey: "AIzaSyDNC-X6WCdKUT0xzx8GWrvGH6-R5IZuHwo",
    authDomain: "financeapp-teste-marina.firebaseapp.com",
    projectId: "financeapp-teste-marina",
    storageBucket: "financeapp-teste-marina.appspot.com",
    messagingSenderId: "370702667501",
    appId: "1:370702667501:web:8362477ccc5adc3884c6e4",
  },
  christian: {
  apiKey: "AIzaSyBl_jMe3Xjg9ki-Zgg0dNnrn0paoLtIDd8",
  authDomain: "financeapp-christian.firebaseapp.com",
  projectId: "financeapp-christian",
  storageBucket: "financeapp-christian.appspot.com",
  messagingSenderId: "539477944805",
  appId: "1:539477944805:web:efc2882f73177b98d4270c"
}
};

// 🔧 Firebase Local Emulator Suite — DESLIGADO por padrão. Só liga com as 3
// condições abaixo simultaneamente verdadeiras; nenhuma delas sozinha ativa
// nada, e nenhuma é setada num `npm run start:*` normal:
//   1. __DEV__               — nunca true numa build EAS/produção.
//   2. appEnv === "meu-app"  — nunca ativa em rafael/marina/christian.
//   3. EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true — variável explícita, exportada
//      manualmente no terminal antes de rodar (ver ARQUITETURA.md/PROJECT_STATUS.md
//      para o passo a passo completo de como usar em desenvolvimento).
// Quando ligado, o app nem chega a conhecer o projeto Firebase real — inicializa
// direto com um projeto fictício (demo-financeiro-local), então mesmo um
// connect*Emulator() esquecido não teria como "vazar" para produção.
export const usandoEmulador =
  __DEV__ &&
  appEnv === "meu-app" &&
  process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === "true";

// Host dos emuladores — sem IP fixo no código de propósito (a rede local muda).
// Definido via env var no momento de rodar; "localhost" só serve de fallback
// para quem testar via web/simulador na própria máquina.
const emulatorHost = process.env.EXPO_PUBLIC_EMULATOR_HOST || "localhost";

// 🔹 Seleciona o config com base no ambiente atual — em modo Emulator, usa um
// projeto fictício em vez do config real, para a conexão nunca apontar,
// mesmo por engano, para um ambiente Firebase de verdade.
const firebaseConfig = usandoEmulador
  ? { apiKey: "demo-api-key", projectId: "demo-financeiro-local" }
  : firebaseConfigs[appEnv] || firebaseConfigs["meu-app"];

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
export const functions = getFunctions(app);

if (usandoEmulador) {
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, emulatorHost, 8080);
  connectFunctionsEmulator(functions, emulatorHost, 5001);
  console.warn(
    `[DEV] Firebase conectado ao Emulator Suite local (${emulatorHost}) — ` +
      "NÃO é um projeto Firebase real. Para desligar, não defina EXPO_PUBLIC_USE_FIREBASE_EMULATOR."
  );
}

export default app;


// import { initializeApp } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
// import {
//   initializeAuth,
//   getReactNativePersistence,
// } from "firebase/auth";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import Constants from "expo-constants";

// const appEnv = Constants.expoConfig.extra.APP_ENV;

// // 🔹 Configurações de cada ambiente Firebase
// const firebaseConfigs = {
//   "meu-app": {
//     apiKey: "AIzaSyAFrftawD5_qGuS3XU_sw_82KZB4TFnaGM",
//     authDomain: "fincanceapp-rafael.firebaseapp.com",
//     projectId: "fincanceapp-rafael",
//     storageBucket: "fincanceapp-rafael.appspot.com",
//     messagingSenderId: "235824014044",
//     appId: "1:235824014044:web:a416ca064ca3f61044ca19",
//     measurementId: "G-KP26SFJ2N1",
//   },

//   rafael: {
//     apiKey: "AIzaSyC0qWp-NGI6mcgAHCuAxL1c2-DAjRnjsV4",
//     authDomain: "financeapp-teste-rafael.firebaseapp.com",
//     projectId: "financeapp-teste-rafael",
//     storageBucket: "financeapp-teste-rafael.appspot.com",
//     messagingSenderId: "571812252045",
//     appId: "1:571812252045:web:fd5cf81907afb06b86d5c4",
//   },

//   marina: {
//     apiKey: "AIzaSyDNC-X6WCdKUT0xzx8GWrvGH6-R5IZuHwo",
//     authDomain: "financeapp-teste-marina.firebaseapp.com",
//     projectId: "financeapp-teste-marina",
//     storageBucket: "financeapp-teste-marina.appspot.com",
//     messagingSenderId: "370702667501",
//     appId: "1:370702667501:web:8362477ccc5adc3884c6e4",
//   },

//   christian: {
//     apiKey: "AIzaSyBl_jMe3Xjg9ki-Zgg0dNnrn0paoLtIDd8",
//     authDomain: "financeapp-christian.firebaseapp.com",
//     projectId: "financeapp-christian",
//     storageBucket: "financeapp-christian.appspot.com",
//     messagingSenderId: "539477944805",
//     appId: "1:539477944805:web:efc2882f73177b98d4270c",
//   },
// };

// // 🔹 Seleciona config com base no ambiente atual
// const firebaseConfig = firebaseConfigs[appEnv] || firebaseConfigs["meu-app"];

// // 🔹 Inicializa Firebase
// const app = initializeApp(firebaseConfig);

// // 🔹 Firestore
// export const db = getFirestore(app);

// // 🔹 Auth com persistência no React Native
// export const auth = initializeAuth(app, {
//   persistence: getReactNativePersistence(AsyncStorage),
// });

// export default app;