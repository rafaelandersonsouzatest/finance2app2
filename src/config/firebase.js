// import { initializeApp, getApps } from "firebase/app";
// import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth";
// import Constants from "expo-constants";

// // 🔹 Pega ambiente do app.json
// const ENV = Constants.expoConfig.extra.env;

// // 🔹 Configurações
// const firebaseConfigs = {
//   prod: {
//     apiKey: "AIzaSyAFrftawD5_qGuS3XU_sw_82KZB4TFnaGM",
//     authDomain: "fincanceapp-rafael.firebaseapp.com",
//     projectId: "fincanceapp-rafael",
//     storageBucket: "fincanceapp-rafael.firebasestorage.app",
//     messagingSenderId: "235824014044",
//     appId: "1:235824014044:web:a416ca064ca3f61044ca19",
//   },
//   test: {
//     apiKey: "AIzaSyDNC-X6WCdKUT0xzx8GWrvGH6-R5IZuHwo",
//     authDomain: "financeapp-teste-marina.firebaseapp.com",
//     projectId: "financeapp-teste-marina",
//     storageBucket: "financeapp-teste-marina.appspot.com",
//     messagingSenderId: "370702667501",
//     appId: "1:370702667501:web:8362477ccc5adc3884c6e4",
//   },
// };

// // 🔹 Seleciona config com base no env
// const firebaseConfig = firebaseConfigs[ENV] || firebaseConfigs.prod;

// // 🔹 Inicializar Firebase apenas uma vez
// const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// // 🔹 Firestore e Auth
// export const db = getFirestore(app);
// export const auth = getAuth(app);

// export default app;


import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import Constants from "expo-constants";

const appEnv = Constants.expoConfig.extra.APP_ENV;

const firebaseConfig =
  appEnv === "prod"
    ? {
        apiKey: "AIzaSyAFrftawD5_qGuS3XU_sw_82KZB4TFnaGM",
        authDomain: "fincanceapp-rafael.firebaseapp.com",
        projectId: "fincanceapp-rafael",
        storageBucket: "fincanceapp-rafael.appspot.com",
        messagingSenderId: "235824014044",
        appId: "1:235824014044:web:a416ca064ca3f61044ca19",
      }
    : {
        apiKey: "AIzaSyDNC-X6WCdKUT0xzx8GWrvGH6-R5IZuHwo",
        authDomain: "financeapp-teste-marina.firebaseapp.com",
        projectId: "financeapp-teste-marina",
        storageBucket: "financeapp-teste-marina.appspot.com",
        messagingSenderId: "370702667501",
        appId: "1:370702667501:web:8362477ccc5adc3884c6e4",
      };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
