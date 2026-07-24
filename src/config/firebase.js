import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
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

// 🔹 Seleciona o config com base no ambiente atual
const firebaseConfig = firebaseConfigs[appEnv] || firebaseConfigs["meu-app"];

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
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