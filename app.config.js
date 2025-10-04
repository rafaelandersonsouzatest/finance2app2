// import 'dotenv/config';

// export default ({ config }) => {
//   const appEnv = process.env.APP_ENV || "prod";

//   return {
//     ...config,

//     // Nome e slug mudam conforme ambiente
//     name: appEnv === "prod" ? "Meu App" : "Meu App Teste",
//     slug: appEnv === "prod" ? "meu-app" : "meu-app-teste",

//     // Ícones diferentes pra identificar rápido
//     icon: appEnv === "prod" ? "./assets/icon.png" : "./assets/icon-test.png",

//     // Mantém o resto igual ao app.json
//     ios: {
//       ...config.ios,
//     },
//     android: {
//       ...config.android,
//     },
//     web: {
//       ...config.web,
//     },

//     extra: {
//       ...config.extra,
//       APP_ENV: appEnv, // usado dentro do app (prod/test)
//     },
//   };
// };


export default ({ config }) => {
  const appEnv = process.env.APP_ENV || "prod";

  return {
    ...config,
    name: appEnv === "prod" ? "Meu App" : "Meu App Teste",
    slug: appEnv === "prod" ? "meu-app" : "meu-app-teste",
    icon: appEnv === "prod" ? "./assets/icon.png" : "./assets/icon-test.png",

    ios: { ...config.ios },
    android: { ...config.android },
    web: { ...config.web },

    extra: {
      APP_ENV: appEnv,
      eas: {
        projectId: "559b4f2b-514f-42d8-bf1c-fca02444f277",
      },
    },
  };
};
