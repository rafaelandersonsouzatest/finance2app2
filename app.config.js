export default ({ config }) => {
  // 🔹 Define o ambiente atual — se não for passado nada, usa "meu-app" (dev)
  const appEnv = process.env.APP_ENV || "meu-app";

  // 🔹 Configurações específicas de cada app
  // 🔹 `owner` varia por ambiente porque o projeto "christian" é o ambiente
  // de Convidados/testadores externos, utilizado sob uma organização Expo
  // separada (finance-app-convidado). A infraestrutura técnica permanece a
  // mesma por questões de compatibilidade — os demais ambientes pertencem à
  // conta rafael.anderson.souza. O Expo exige que `owner` bata com a conta
  // dona do `projectId` de cada ambiente (ver
  // expo/fyi/eas-config-mismatch.md); por isso não dá para usar um valor
  // único fixo como antes.
  // 🔹 `googleWebClientId`: Client ID OAuth 2.0 do tipo "Web application" que
  // o Firebase gera automaticamente ao ativar o provedor Google em
  // Authentication → Sign-in method (Firebase Console → Configurações do
  // projeto → geral, ou direto em Google Cloud Console → APIs e serviços →
  // Credenciais). Cada projeto Firebase (um por ambiente, ver
  // src/config/firebase.js) tem o seu próprio — por isso vive aqui, junto
  // dos outros valores que já variam por ambiente. `meu-app` já tinha um
  // valor real (estava hardcoded em useAuth.js); os demais ainda não foram
  // configurados — ficam `null` até o usuário ativar o provedor Google no
  // Firebase Console de cada projeto e colar o valor aqui.
  const configs = {
    "meu-app": {
      name: "Financeiro DEV",
      slug: "meu-app",
      projectId: "559b4f2b-514f-42d8-bf1c-fca02444f277", // ID do projeto DEV no Expo
      updatesUrl: "https://u.expo.dev/559b4f2b-514f-42d8-bf1c-fca02444f277",
      icon: "./assets/icon.png",
      owner: "rafael.anderson.souza",
      googleWebClientId:
        "235824014044-5jri4robn2smlpaf6q46g4hin7bv8rlq.apps.googleusercontent.com",
    },
    rafael: {
      name: "Financeiro Rafael",
      slug: "rafael",
      projectId: "f7f74c43-6005-4300-95e2-2754e86ce3bb", // ID do projeto Rafael no Expo
      updatesUrl: "https://u.expo.dev/f7f74c43-6005-4300-95e2-2754e86ce3bb",
      icon: "./assets/icon.png",
      owner: "rafael.anderson.souza",
      googleWebClientId: "", // TODO: preencher após configurar no Firebase Console do projeto "financeapp-teste-rafael"
    },
    marina: {
      name: "Financeiro Marina",
      slug: "marina",
      projectId: "ef2738e8-9756-4e34-9fd8-87e63b7cf9cd", // ID do projeto Marina no Expo
      updatesUrl: "https://u.expo.dev/ef2738e8-9756-4e34-9fd8-87e63b7cf9cd",
      icon: "./assets/icon.png",
      owner: "rafael.anderson.souza",
      googleWebClientId: "", // TODO: preencher após configurar no Firebase Console do projeto "financeapp-teste-marina"
    },
    christian: {
      name: "Financeiro - Convidado",
      // 🔹 O slug real do projeto no Expo é "christian" (imutável depois da
      // criação — não existe campo de renomear no painel, só "Display name",
      // que é cosmético). Mantido por compatibilidade, mesmo princípio já
      // aplicado a APP_ENV/projectId/owner (ver CLAUDE.md) — invisível para
      // quem usa o app, que já vê "Financeiro - Convidado" normalmente.
      slug: "christian",
      projectId: "8887c54c-8cde-4f30-9a5a-ccd977b9795e", // ID do projeto do ambiente de Convidados no Expo
      updatesUrl: "https://u.expo.dev/8887c54c-8cde-4f30-9a5a-ccd977b9795e",
      icon: "./assets/icon.png",
      owner: "finance-app-convidado",
      googleWebClientId: "", // TODO: preencher após configurar no Firebase Console do projeto "financeapp-christian"
    },

  };

  const selected = configs[appEnv] || configs["meu-app"];

  return {
    ...config,
    name: selected.name,
    slug: selected.slug,
    owner: selected.owner,
    scheme: "meuapp", 
    plugins: [
      "expo-web-browser",
      "expo-status-bar",
      "expo-font",
      [
        "expo-splash-screen",
        {
          image: "./assets/splash-icon.png",
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
    ],
    icon: selected.icon,
    ios: { ...config.ios },
    android: { ...config.android },
    web: { ...config.web },
    extra: {
      APP_ENV: appEnv,
      googleWebClientId: selected.googleWebClientId,
      eas: { projectId: selected.projectId },
    },
    updates: { url: selected.updatesUrl },
  };
};
