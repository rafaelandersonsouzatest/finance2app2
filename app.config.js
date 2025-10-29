export default ({ config }) => {
  // 🔹 Define o ambiente atual — se não for passado nada, usa "meu-app" (dev)
  const appEnv = process.env.APP_ENV || "meu-app";

  // 🔹 Configurações específicas de cada app
  const configs = {
    "meu-app": {
      name: "Financeiro DEV",
      slug: "meu-app",
      projectId: "559b4f2b-514f-42d8-bf1c-fca02444f277", // ID do projeto DEV no Expo
      updatesUrl: "https://u.expo.dev/559b4f2b-514f-42d8-bf1c-fca02444f277",
      icon: "./assets/icon.png",
    },
    rafael: {
      name: "Financeiro Rafael",
      slug: "rafael",
      projectId: "f7f74c43-6005-4300-95e2-2754e86ce3bb", // ID do projeto Rafael no Expo
      updatesUrl: "https://u.expo.dev/f7f74c43-6005-4300-95e2-2754e86ce3bb",
      icon: "./assets/icon.png",
    },
    marina: {
      name: "Financeiro Marina",
      slug: "marina",
      projectId: "ef2738e8-9756-4e34-9fd8-87e63b7cf9cd", // ID do projeto Marina no Expo
      updatesUrl: "https://u.expo.dev/ef2738e8-9756-4e34-9fd8-87e63b7cf9cd",
      icon: "./assets/icon.png",
    },
    christian: {
      name: "Financeiro Christian",
      slug: "christian",
      projectId: "8887c54c-8cde-4f30-9a5a-ccd977b9795e", // ID do projeto Christian no Expo
      updatesUrl: "https://u.expo.dev/8887c54c-8cde-4f30-9a5a-ccd977b9795e",
      icon: "./assets/icon.png",
    },

  };

  const selected = configs[appEnv] || configs["meu-app"];

  return {
    ...config,
    name: selected.name,
    slug: selected.slug,
    icon: selected.icon,
    ios: { ...config.ios },
    android: { ...config.android },
    web: { ...config.web },
    extra: {
      APP_ENV: appEnv,
      eas: { projectId: selected.projectId },
    },
    updates: { url: selected.updatesUrl },
  };
};
