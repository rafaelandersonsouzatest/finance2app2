# Arquitetura

> Documentação técnica do estado atual do código (2026-07-23, seções 12 e 13 adicionadas em 2026-07-28). Este documento descreve **o que existe**, não o que deveria existir — para a visão de evolução, ver `ROADMAP.md`; para pendências e bugs, ver `PROJECT_STATUS.md`.

## 1. Stack tecnológica

- **React Native + Expo (SDK 54)**, React 19, `react-native-web` para build web experimental.
- **Firebase**: Authentication (e-mail/senha, Google OAuth manual) + Firestore (banco de dados em tempo real). Não há backend próprio — toda regra de negócio roda no cliente.
- **React Navigation**: `@react-navigation/bottom-tabs` (navegação principal) + `@react-navigation/native-stack` (fluxo de autenticação) + `@react-navigation/material-top-tabs` (existe como dependência, ver observação na seção 4).
- **AsyncStorage**: persistência local leve (filtro de mês/ano, estado de visibilidade, categorias customizadas).
- **EAS Build/Update**: publicação e OTA updates, com 4 variantes de app (ver seção 7).

## 2. Organização de pastas

```
src/
 ├─ auth/        → telas de autenticação + AuthProvider (contexto)
 ├─ components/  → componentes reutilizáveis (cards, modais, seções, seletores)
 ├─ config/      → inicialização do Firebase por ambiente
 ├─ contexts/    → Context API (filtro de data, visibilidade de valores)
 ├─ hooks/       → um hook por entidade financeira (listener Firestore + CRUD)
 ├─ navigation/  → MainStack + BottomTabs (raiz)
 ├─ screens/     → telas por módulo financeiro
 ├─ styles/      → cores e estilos globais (arquivo único)
 └─ utils/       → formatação de data/valor, geração de datas, path do Firestore
```

Raiz do projeto: `App.js` (bootstrap), `app.config.js` (config Expo dinâmica por ambiente), `android/` (projeto nativo gerado), `assets/` (ícones, imagens, animações).

## 3. Fluxo de autenticação

**Contexto:** `src/auth/useAuth.js` expõe `AuthProvider`/`useAuth()` via Context API (não Redux/Zustand — estado global só via React Context em todo o app).

**Estado exposto:** `user` (objeto bruto do Firebase Auth), `profile` (documento `users/{uid}` do Firestore), `loading`, `profileLoading`, e as ações `login`, `register`, `logout`, `loginWithGoogle`, `carregarPerfil`, `atualizarPerfil` (nova, 2026-07-28 — `updateDoc` genérico no próprio perfil, usada hoje só para editar `apelido` em `ContaScreen.js`, mas aceita qualquer campo).

**Fluxo:**
1. `onAuthStateChanged` (Firebase Auth) dispara ao carregar o app.
2. Se há usuário autenticado, `criarUserProfileSeNaoExistir` cria o documento `users/{uid}` na primeira vez (com `primeiroAcesso: true`, `jaViuOnboarding: false`, `tenantId: uid`, `plano: "free"`, `tipoUsuario`, `documento`, `avatarUrl: null`, etc.), depois `carregarPerfil` busca o documento completo. Esse mecanismo de recuperação é também a origem de um sintoma investigado em 2026-07-28 (ver `PROJECT_STATUS.md` seção 10): contas criadas antes do commit `007c167` (14/11/2025) nunca tiveram `apelido` coletado no cadastro (o campo não existia no formulário da época) e nunca tiveram `displayName` definido no Firebase Auth — então, ao ganharem um perfil só agora por este fallback, `nome`/`apelido` nascem vazios. Não é um bug de dado, é ausência real de informação nunca coletada.
3. `register()` (atualizado em 2026-07-24) checa duplicidade de CPF/CNPJ via `getDoc` na reserva `documentosCadastrados/{cpf}` antes de criar qualquer coisa; duplicidade de e-mail é delegada ao próprio Firebase Authentication (`auth/email-already-in-use`), sem consulta própria. Perfil (`users/{uid}`) e reserva são gravados juntos em um `writeBatch` (atômico). Um `useRef` (`registrandoRef`) evita que o listener `onAuthStateChanged` (que também cria perfil, sem os dados completos) grave um perfil incompleto em paralelo — corrige uma race condition que já existia antes dessa mudança.
4. `login()` traduz códigos de erro do Firebase (`auth/wrong-password` etc.) em mensagens em português.
5. `loginWithGoogle()` monta a URL de OAuth manualmente (`expo-auth-session` + `expo-web-browser`) em vez de usar um provedor pronto do Expo.

**Bootstrap em `App.js`:**
```
loading/profileLoading → (nada renderizado)
  → profile.primeiroAcesso === true → ContaCriadaModal (escolher: pular ou ver tutorial)
    → profile.jaViuOnboarding === false → OnboardingScreen
      → user existe → BottomTabs (app principal)
      → user não existe → Stack (Login / Register / ForgotPassword / ResetPassword)
```
Esse arquivo contém, além da versão ativa, **duas versões anteriores inteiras comentadas** da mesma lógica — histórico de iteração mantido no próprio arquivo de produção.

## 4. Navegação

- **`BottomTabs.js`** (raiz pós-login): `Resumo` (`ResumoMensal`), `Entradas`, `Saídas` (`SaidasScreen`), `Investimentos`. Usa uma `tabBar` customizada (`CustomTabBar.js`) em vez do tab bar padrão do React Navigation.
- Existem `Tab.Screen` **comentados** para `Cartão` (`CartoesScreen`), `Membros` (`MembrosScreen`) e `AlterarSenha` (`AlterarSenhaScreen`) — implementados mas não navegáveis hoje.
- Dentro de `SaidasScreen.js`, a navegação entre Gastos/Empréstimos/Cartões é feita por estado local + renderização condicional (`ModernTabs`), não pelo React Navigation. `GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js` não são rotas — são componentes de apresentação renderizados só por `SaidasScreen.js` (ver seção 19). Existia um `SaidasTabs.js` (material-top-tabs) que registraria os mesmos três como abas de verdade, nunca foi conectado a nada, e foi removido na Sprint de Saneamento (seção 19) por não fazer mais sentido depois da consolidação.

## 5. Hooks de dados (`src/hooks/`)

Padrão comum a `useGastos`, `useEntradas`, `useCartoes`, `useEmprestimos`, `useInvestimentos`:

1. Recebem `(mes, ano)` (exceto `useInvestimentos`, que não filtra por período).
2. Assinam um listener `onSnapshot` do Firestore, filtrado por `where("mes", "==", mes)` / `where("ano", "==", ano)` quando aplicável.
3. Normalizam o documento recebido (`parseFloat(valor)`, ordenação por data).
4. Expõem funções de CRUD (`add*`, `update*`, `delete*`) que escrevem diretamente no Firestore via `getBasePath(user)` + subcoleção.
5. Mantêm `loading`/`error` próprios — não há camada de cache ou de invalidação compartilhada entre hooks (cada tela que usa dois hooks tem dois listeners independentes).

**`useModelos.js`** é o hook de "lançamentos recorrentes" (gastos e entradas fixas), parametrizado por `tipo` (`'gasto' | 'entrada'`) e usado por `GerenciarModelosModal.js`. Chegou a ter uma tentativa de suportar "modo família" via `membroSelecionado`/`modoFamiliaAtivo`, mas era código morto (`useAuth()` nunca expunha esse campo, e nenhuma chamada passava `modoFamiliaAtivo=true`) — removido na Sprint 5, ver seção 14.

**`useAdiantamento.js`** não tem listener próprio: instancia `useCartoes`/`useEmprestimos` internamente para reaproveitar uma função de antecipação de parcela — isso duplica os listeners `onSnapshot` desses hooks quando a tela que usa `useAdiantamento` também já usa `useCartoes`/`useEmprestimos` diretamente.

**`useCurrencyInput.js`** é o único ponto do app que converte texto digitado em número monetário de forma consistente (trata centavos via regex, formata em BRL). Os hooks de dados, por outro lado, fazem `parseFloat(valor)` cru ao salvar — funcionam hoje porque o valor já chega numérico de `useCurrencyInput`, mas não há garantia de que todo formulário sempre passe por ele.

`src/hooks/useFirestore.js` é apenas um barrel file (`export { useEntradas } from './useEntradas'` etc.), não contém lógica.

## 6. Contexts (`src/contexts/`)

- **`DateFilterContext`**: mês/ano selecionado globalmente, persistido em `AsyncStorage` (`@dateFilter`). Também concentra a lógica de **cálculo de parcelamento** (`calculateCurrentInstallment`, `shouldShowTransaction`) — ou seja, regra de negócio de parcelas mora num contexto de UI, não num hook de domínio.
- **`VisibilityContext`**: booleano de "mostrar/ocultar valores", persistido em `AsyncStorage` (`@app_visibility_state`).
- **Modo Família não tem contexto próprio.** Nunca chegou a existir um `ModoFamiliaContext`. A Sprint 5 (ver seção 14) decidiu a arquitetura oficial para quando essa fase for implementada (`tenants/{tenantId}`, via `getBasePath(user, compartilhado)`) e removeu a tentativa concorrente que dependia de `membroSelecionado` (nunca exposto por `useAuth()`).

## 7. Firestore — modelo de dados e ambientes

**Caminho base** (`src/utils/firestorePaths.js`):
```js
getBasePath(user, compartilhado = false)
// compartilhado && user.tenantId → "tenants/{tenantId}"
// caso padrão                    → "users/{uid}"
```
Na prática, **`compartilhado` nunca é passado como `true`** em nenhuma chamada do app hoje — todo dado vive sempre em `users/{uid}/...`.

**Subcoleções sob `users/{uid}/`:** `gastos`, `entradas`, `emprestimos`, `cartoes` (com compras aninhadas), `investimentos` (com array `movimentacoes` embutido no documento), `modelosDeGasto`, `modelosDeEntrada`.

**Coleção `documentosCadastrados/{cpfOuCnpjLimpo}`** (adicionada em 2026-07-24, Sprint 1): guarda só um carimbo de existência (`{ reservado: true }`, sem nenhum dado pessoal) para permitir checar duplicidade de CPF/CNPJ no cadastro sem precisar consultar a coleção `users` inteira — o que as regras de segurança não permitem mais para outro usuário. Regra: `get` liberado para qualquer um (só confirma existência de um CPF já conhecido por quem pergunta, sem expor dado nenhum), `create` exige login, `update`/`delete` sempre negados. Alternativa mais forte considerada e descartada por ora (priorizando simplicidade): usar hash do CPF/CNPJ como ID do documento em vez do valor limpo direto, usando `expo-crypto` (já é dependência do projeto) — reavaliar se a arquitetura evoluir para exigir mais defesa em profundidade.

**Documento de perfil** (`users/{uid}`, raiz — não subcoleção): `uid`, `email`, `nome`, `apelido`, `tipoUsuario` (`pessoa_fisica`/`empresa`), `plano` (`free`, sem verificação ativa hoje), `tenantId` (hoje sempre igual ao `uid`), `documento`, `tipoDocumento`, `primeiroAcesso`, `jaViuOnboarding`, `avatarUrl` (sempre `null` hoje — reservado em 2026-07-28 para uma futura foto de usuário, ver `PROJECT_STATUS.md` seção 10; perfis criados antes dessa data não têm esse campo, já que não houve migração retroativa).

**Regras de segurança:** não existe `firestore.rules` neste repositório. `firebase.json` só configura `hosting` (deploy web estático). Não há como auditar via código se o acesso ao banco está restrito.

**Múltiplos ambientes:** `app.config.js` seleciona configuração (nome do app, `projectId` do Expo, ícone) por `APP_ENV` (`meu-app` | `rafael` | `marina` | `christian`); `src/config/firebase.js` seleciona a configuração do Firebase (cada ambiente aponta para um **projeto Firebase distinto**, não apenas uma coleção diferente dentro do mesmo projeto). Ou seja, hoje "múltiplos usuários" = "múltiplos apps/builds", não múltiplos usuários dentro do mesmo backend.

**`owner` também varia por `APP_ENV`** (desde 2026-07-28): o projeto `christian` (hoje o ambiente de distribuição para convidados/testadores externos) foi criado sob uma organização Expo separada (`finance-app-convidado`), diferente da conta `rafael.anderson.souza` que é dona de `meu-app`/`rafael`/`marina`. O Expo exige que o campo `owner` bata com a conta real dona do `projectId` de cada ambiente — variar `owner` dinamicamente em `app.config.js` (mesmo padrão já usado para `name`/`slug`/`projectId`) é a forma documentada pelo próprio Expo para repositórios que publicam para contas diferentes ([expo/fyi/eas-config-mismatch.md](https://github.com/expo/fyi/blob/main/eas-config-mismatch.md)). Vale lembrar: essa correção cobre `eas update` (roda local, lê `APP_ENV` do terminal); se um dia `christian` também precisar de `eas build` na nuvem, vai precisar de um perfil próprio em `eas.json` com `"env": {"APP_ENV": "christian"}` (os workers do EAS Build não enxergam variáveis de ambiente locais) — `eas.json` hoje só tem perfis para `meuapp`/`rafael`/`marina`.

**Publicação de atualizações OTA:** `publish-all.ps1` (raiz do projeto) é o script padrão para publicar uma release nos 3 apps de uma vez (`meu-app`, `rafael`, `christian`), sempre na branch `main` — ver `PROJECT_STATUS.md` para como usá-lo e o histórico de releases.

## 8. Principais regras de negócio implementadas

- **Lançamentos fixos via modelos**: `gerarFixosDoMes()` (presente em `useGastos` e `useEntradas`) verifica se já existem lançamentos com `origemModelo: true` no mês; se não, lê os modelos ativos (`modelosDeGasto`/`modelosDeEntrada`) e gera lançamentos em lote (`writeBatch`). Suporta modo de cálculo `valor` (fixo) ou `porcentagem` (calculado sobre entradas selecionadas).
- **Gastos dinâmicos recalculados automaticamente**: `useEntradas.js` mantém um segundo listener que, sempre que as entradas do mês mudam, recalcula e sobrescreve (via `writeBatch`) os gastos com `fixacao: "dinamico"` e `modoCalculo: "porcentagem"`.
- **Parcelamento e antecipação de empréstimos** (regra oficializada em 2026-07-24, Sprint 1 / A3): `useEmprestimos.js` gera parcelas dividindo o valor total. Cada parcela grava `valorContratado` (o valor total original — **fixo desde a criação, nunca recalculado depois**) e `economiaTotal` (soma dos descontos de todas as antecipações do empréstimo, denormalizada em todas as parcelas do mesmo `idCompra`, recalculada via `recalcularEconomiaTotal` só quando uma antecipação ou reversão de antecipação realmente muda um desconto). "Valor efetivamente pago" é sempre derivado **na exibição** — soma do campo `valor` (já reflete desconto, quando antecipada) apenas das parcelas com `pago === true` ou `adiantada === true`; nunca é `valorContratado - economiaTotal` (isso foi um erro conceitual do A3, corrigido em 2026-07-25 após a 1ª bateria de testes — aquela fórmula projetava o total final considerando descontos já aplicados, e não refletia quantas parcelas de fato já tinham sido pagas). A barra de progresso (ajustada em 2026-07-25, após 2ª bateria de testes) é `valorPago ÷ valorReferencia`, onde `valorReferencia` **difere por tipo**: para empréstimo é `valorContratado - economiaTotal` (o que de fato será pago, descontos já considerados — necessário para a barra chegar a 100% mesmo com desconto, já que `valorContratado` é fixo e nunca diminui); para cartão é o próprio `valorReal` (soma ao vivo das parcelas, que já reflete qualquer desconto, sem precisar subtrair de novo). Quando todas as parcelas de um grupo (`idCompra`) estão pagas (`parcelasPagas === totalParcelas`), exibe um selo "✅ Empréstimo quitado"/"✅ Compra quitada" — checagem por contagem de parcelas, não por dinheiro, então não depende de arredondamento. O indicador "Parcelas Pagas" por item individual (antes chamado "Progresso", mostrava a posição `parcelaAtual/totalParcelas`) também foi corrigido para mostrar `parcelasPagas/totalParcelas` — quantas já foram pagas, não a posição da parcela sendo vista. Exibido em `ModalDetalhes.js`/`ModalHistoricoParcelas.js` (com fallback por soma para empréstimos criados antes da mudança do A3, sem `valorContratado`/`economiaTotal`). Cartões (`useCartoes.js`) não têm `valorContratado`/`economiaTotal` — continuam com o cálculo por soma de parcelas, escopo do A3 foi só empréstimos.
- **`valorTotal` do cartão é sempre derivado da soma das parcelas** (regra oficializada em 2026-08-03, ver seção 15): diferente do `valorContratado` do empréstimo (fixo por design), o `valorTotal` de uma compra no cartão nunca é uma fonte de verdade independente — é recalculado (`recalcularValorTotalCompra`) sempre que o `valor` de qualquer parcela do grupo (`idCompra`) muda, inclusive fora do fluxo de personalização de parcelas.

### Riscos residuais aceitos conscientemente (backlog arquitetural, 2026-07-24)

- **Conta órfã** se `createUserWithEmailAndPassword` suceder mas `batch.commit()` (perfil + reserva de CPF) falhar por queda de conexão/app encerrado/erro transitório do Firestore — ver `PROJECT_STATUS.md` para detalhes e caminho de resolução futura (Cloud Function).
- **Ciclo de vida de `documentosCadastrados` na exclusão de conta** (fluxo que ainda não existe): quatro alternativas comparadas (apagar junto / nunca apagar / marcar como liberada / delegar a Cloud Function) — recomendação é "marcar como liberada", mas decisão fica para quando o fluxo de exclusão for desenhado.
- **Faturas de cartão**: `useCartoes.js` calcula uma data de "fechamento estimado" a partir do dia de vencimento (regra fixa, sem configuração por cartão).
- **Investimentos** (regra reforçada em 2026-07-24, Sprint 1 / A4): cada documento guarda um array de `movimentacoes` (aportes/resgates). Regra de negócio: o saldo nunca pode ficar negativo. `useInvestimentos.js` calcula `calcSaldoReal` (valor real, sem esconder nada) e usa esse valor para **rejeitar** qualquer operação que resultaria em saldo negativo — em `addTransaction` (nova retirada), `updateTransaction` (editar movimentação), `deleteTransaction` (excluir movimentação — inclui excluir um aporte do qual uma retirada já dependia) e `updateInvestment` (reduzir o valor inicial). `calcValorAtual` (com `Math.max(0, ...)`) deixou de ser a fonte da regra — é só uma rede de segurança visual para exibir dados legados que porventura já estejam inconsistentes. `DetalhesInvestimentoModal.js` captura esses erros e exibe via `AlertaModal`, mantendo o modal de edição aberto para o usuário corrigir o valor. Continua sem `runTransaction` do Firestore (a leitura-antes-de-escrever ainda pode, em teoria, colidir entre dois dispositivos simultâneos — risco pré-existente, não resolvido por esta melhoria).
- **Visibilidade e filtro de período** são regras de apresentação (contexts), não de dados — não afetam o que é lido/escrito no Firestore, só o que é exibido.

## 9. Estilo e componentes de UI

- **`globalStyles.js`** (1360 linhas) é o único arquivo de estilos do projeto, importado por 39 arquivos de `src/`. Não há tema (dark mode, tokens por plataforma) — cores vêm de `src/styles/colors.js`.
- **Modais de lançamento** (`ModalCriacao.js`, `ModalEdicao.js`, `ModalDetalhes.js`) tratam múltiplos tipos de lançamento (entrada, gasto, empréstimo, cartão, investimento) dentro do mesmo componente via `switch`/`case` por tipo, cada um implementado de forma independente (não compartilham um componente de campo único entre si).
- **`TelaPadrao.js`** é o layout compartilhado usado pelas telas de listagem (Entradas, Gastos, Empréstimos, Investimentos): renderiza cabeçalho, `MonthYearPicker`, lista de itens e os três modais de CRUD, controlando o estado deles internamente.
- **`CategoriaSelect.js`** combina uma lista de categorias padrão (hardcoded) com categorias customizadas persistidas em `AsyncStorage` local (não sincronizadas no Firestore, portanto não compartilhadas entre dispositivos/membros).

## 10. Observações para quem for modificar esta arquitetura

- Qualquer mudança nos hooks de dados deve considerar que **cada tela que consome mais de um hook mantém múltiplos listeners `onSnapshot` simultâneos** — não há um cache/store central.
- `getBasePath(user)` é o único ponto de acoplamento entre "onde os dados moram" e "quem está logado" — é o lugar natural para evoluir para Modo Família/Empresa (ver `ROADMAP.md`, Fase 2), mas hoje ele recebe o objeto de `useAuth().user` (Firebase Auth puro), que **não tem `tenantId`** — só o `profile` (Firestore) tem. Isso precisa ser resolvido antes de qualquer suporte real a dados compartilhados.

## 11. Menu do Usuário / Hub de Configurações (✅ implementado em 2026-07-27, Sprint 2)

> Esta seção agora descreve o estado real do código (implementado nesta sessão, ainda sem validação manual do usuário em um app rodando).

### 11.1 Motivação

Hoje não existe nenhum ponto central de acesso a conta/configurações. Sintoma mais grave: **não existe botão de logout em lugar nenhum da interface** — a função `logout()` existe em `useAuth.js`, mas nunca é chamada por nenhum componente. Ações espalhadas tendem a se multiplicar conforme o produto cresce (Modo Família, Modo Empresa, Premium, IA — ver `ROADMAP.md`), então esse hub precisa ser desenhado para acomodar categorias que hoje têm pouco conteúdo, sem exigir reestruturação de navegação mais tarde.

### 11.2 Navegação: novo Stack envolvendo as abas

Hoje, pós-login, `App.js` renderiza `<BottomTabs />` diretamente. Isso muda para um Stack novo que **envolve** as abas:

```
RootStack (novo, substitui a renderização direta de <BottomTabs/> em App.js)
 ├─ Tabs        → <BottomTabs /> (inalterado internamente)
 ├─ Conta
 ├─ Financeiro
 ├─ Membros     → tela reescrita (ver 11.5), não reaproveita MembrosScreen.js como está
 ├─ GerenciarCartoes
 ├─ Aparencia
 ├─ Notificacoes
 └─ Sobre
```

Por quê um Stack e não telas dentro do próprio bottom sheet: as categorias (especialmente Conta e Membros) vão crescer em conteúdo (trocar e-mail/senha, vincular Google, excluir conta) — não cabem confortavelmente em bottom sheet, e um Stack dá de graça botão de voltar, gestos de navegação nativos e a possibilidade de aprofundar (ex: Conta → Alterar Senha) sem inventar navegação própria.

### 11.3 O menu em si: bottom sheet, sem nova dependência

`react-native-modal` já é usado em 5 arquivos (`ContaCriadaModal.js`, `GerenciarMembrosModal.js`, `MembroSelect.js`, `ModalCriacao.js`, `ModalEdicao.js`) com o padrão `style={{ justifyContent: 'flex-end', margin: 0 }}` — é literalmente um bottom sheet. O novo `UserMenu.js` reaproveita esse mesmo padrão, sem adicionar `@gorhom/bottom-sheet` ou similar.

Cada categoria (exceto "Sair") fecha o sheet e navega (`navigation.navigate('Conta')` etc.) para a tela correspondente no `RootStack`. "Sair" não navega — chama `useAuth().logout()` direto, com uma confirmação (mesmo padrão de alerta destrutivo já usado em `GerenciarMembrosModal.js`).

### 11.4 Estado do menu: novo `UserMenuContext`

Para abrir o menu a partir do cabeçalho (dentro de `TelaPadrao.js`) sem precisar passar `navigation` por props e sem duplicar a instância do modal em cada tela: novo `src/contexts/UserMenuContext.js` (mesmo padrão de `DateFilterContext`/`VisibilityContext`), expondo `{ isOpen, open, close }`. Uma única instância de `<UserMenu />` é montada em `App.js`, como **irmã** do `<MainStack />` (dentro do mesmo `UserMenuProvider`, ambos dentro do `<NavigationContainer>`) — não como uma tela dele. `TelaPadrao.js` só chama `useUserMenu().open()` no cabeçalho.

**Detalhe de implementação importante:** por `UserMenu.js` ser irmão do `MainStack` (fora da árvore do `Stack.Navigator`), `useNavigation()` não funciona ali (só funciona dentro de uma tela de um navigator). A navegação usa o padrão oficial do React Navigation para esse caso: `src/navigation/navigationRef.js` (via `createNavigationContainerRef()`), com `ref={navigationRef}` no `<NavigationContainer>` em `App.js`, e `UserMenu.js` chama a função `navigate()` desse módulo em vez do hook.

### 11.5 Cabeçalho: identidade do usuário em `TelaPadrao.js`

`renderHeader()` (chamado pelas 3 variações de `TelaPadrao.js` — resumo, cartão, padrão — portanto já cobre todas as telas principais) ganha uma linha nova, acima do título da tela: "👤 Olá, {profile.apelido || profile.nome || 'Usuário'} ▼", tocável, abrindo o menu. `TelaPadrao.js` passa a chamar `useAuth()` (hoje não chama). O toggle de ocultar valores **não muda de lugar** — continua na mesma linha do `MonthYearPicker`, como já é hoje.

### 11.6 Consolidação de Membros — elimina a triplicação (✅ implementado em 2026-07-27)

Havia três implementações Firestore para "membros", incompatíveis entre si:
- `MembroSelect.js` e `GerenciarMembrosModal.js` usavam `users/{uid}/membros` (caminho correto), cada um com sua própria cópia de `getDocs`/`addDoc`/`deleteDoc`.
- `MembrosScreen.js` (órfã, fora de qualquer navegação) usava uma coleção **global** `membros`, sem escopo de usuário — bug de dados real (misturaria membros de contas diferentes se fosse reativada como estava), não só duplicação de código.

Criado `src/hooks/useMembros.js`, no mesmo padrão dos demais hooks de domínio (`useGastos`, `useEntradas` etc.): listener em tempo real de `${getBasePath(user)}/membros` (usa `getBasePath`, não `users/{uid}` hardcoded — já pronto para o Modo Família quando `compartilhado=true` for ligado) + `adicionarMembro`/`atualizarMembro`/`excluirMembro`, com a validação de nome duplicado centralizada no hook (antes replicada em cada componente). `MembroSelect.js`, `GerenciarMembrosModal.js` e `MembrosScreen.js` (reescrita do zero — a versão antiga com a coleção global foi descartada, não migrada) consomem esse único hook. Cada documento de membro grava um campo `avatar` — na época desta consolidação (2026-07-27) ainda reservado (`null`); ganhou geração e edição funcionais na Sprint 5 (ver seção 14).

### 11.7 Telas novas vs. reaproveitadas

| Categoria | Arquivo | Situação |
|---|---|---|
| Conta | `src/screens/ContaScreen.js` (novo) | Nome, e-mail (de `profile`), botão Sair. Placeholder textual para o que é "futuro" (alterar dados, vincular Google, excluir conta). |
| Financeiro | `src/screens/FinanceiroScreen.js` (novo) | Usa `PlaceholderMenuScreen` (ver 11.8) — só estrutura por enquanto. |
| Membros | `src/screens/MembrosScreen.js` (reescrita completa) | Consome `useMembros`; abandona a coleção global incorreta. |
| Cartões (admin) | `src/screens/GerenciarCartoesScreen.js` (novo) | Nome novo para não colidir com `CartoesScreen.js` (que já existe e trata lançamentos/faturas, não cadastro). Usa `PlaceholderMenuScreen` — hoje não existe nem o conceito de "cartão cadastrado" separado de lançamento. |
| Aparência | `src/screens/AparenciaScreen.js` (novo) | `PlaceholderMenuScreen`. |
| Notificações | `src/screens/NotificacoesScreen.js` (novo) | `PlaceholderMenuScreen`. |
| Sobre | `src/screens/SobreScreen.js` (novo) | Versão (via `expo-constants`) + nome do app. Conteúdo real, não placeholder. |
| — | `src/auth/AlterarSenhaScreen.js` (existente, **não tocada agora**) | Já funciona (reautentica + `updatePassword`); reservada para quando "alterar senha" entrar no escopo de Conta. |

### 11.8 Padrão de tela-placeholder (evita reorganizar depois)

Novo componente `src/components/PlaceholderMenuScreen.js`: recebe `titulo`, `icone` e uma lista de bullets "o que vem por aí" (ex: para Aparência: "Tema claro", "Tema escuro", "Automático"). Usado por Financeiro, Cartões (admin), Aparência e Notificações. Quando cada área for desenvolvida de verdade, só o conteúdo interno da tela muda — a rota, o nome, e a entrada no menu continuam os mesmos, sem qualquer reorganização de navegação.

### 11.9 O que NÃO está sendo implementado nesta sprint

Busca global, filtros avançados, dashboard mais completo, metas, categorias inteligentes, notificações reais, planejamento financeiro, IA, relatórios, backup/sincronização, preferências gerais, recursos Premium — todos citados pelo usuário como visão de longo prazo. Nenhum é construído agora; a arquitetura acima (Stack de categorias + padrão de placeholder) é o que permite que cada um "encaixe" numa categoria existente quando chegar a hora, sem mexer no menu em si.

## 12. Agenda Financeira e Central de Avisos (✅ implementado em 2026-07-28, Sprint 3)

> Discovery completo (motivação, alternativas avaliadas, escopo negociado com o usuário) em `SPRINT3_DISCOVERY.md`. Esta seção descreve só o estado técnico resultante.

### 12.1 `useEventosFinanceiros` — fonte única de "o que vai acontecer"

`src/hooks/useEventosFinanceiros.js` exporta dois hooks:

- **`useEventosFinanceiros(mes, ano)`**: instancia `useGastos`, `useEntradas`, `useCartoes`, `useEmprestimos` (mesmo padrão de composição que `useAdiantamento.js` já usava) + `useModelos('gasto')`/`useModelos('entrada')`, e normaliza tudo via `src/utils/eventosFinanceiros.js` (`normalizarEventos`, função pura) num formato comum:
  ```js
  { id, tipo, descricao, valor, data, pago, origem, cor, itemOriginal }
  ```
  `tipo` é `'gasto' | 'entrada' | 'cartao' | 'emprestimo'`; `origem` é `'firestore'` (lançamento real) ou `'projetado'` (ver 12.2); `itemOriginal` é o documento cru por trás do evento (`null` quando projetado). Retorna também `eventosPorDia` (agrupado por data, com `total` do dia — usado no calendário) e as ações `toggleStatus`/`editar`/`excluir` (ver 12.3).
- **`useProximosEventos(dias = 7)`**: compõe duas instâncias de `useEventosFinanceiros` (mês atual + mês seguinte) para cobrir uma janela rolante a partir de hoje, mesmo perto da virada do mês. Retorna `vencidos`/`venceHoje`/`proximosDias` (todos filtrados para `pago === false`) e repassa as mesmas ações da instância do mês atual (a operação de CRUD independe de qual instância a expôs, já que atua por id de documento, não pelo `mes`/`ano` do hook).

**Projeção de meses futuros**: cartões/empréstimos já têm todas as parcelas gravadas no Firestore desde a criação (`writeBatch` na hora da compra/contratação), então meses futuros são lidos direto. Gastos/entradas fixos (via `modelosDeGasto`/`modelosDeEntrada`) só existem no Firestore depois que `gerarFixosDoMes()` roda para aquele mês (ao abrir a tela) — para meses ainda não visitados, `normalizarEventos` projeta os modelos ativos em modo `"valor"` (não `"porcentagem"`, que dependeria de entradas daquele mês futuro) usando o mesmo critério de "já gerado?" que `gerarFixosDoMes()` usa (`origemModelo === true` presente no mês).

### 12.2 Ações — reaproveitamento em vez de nova lógica de negócio

`toggleStatus`/`editar`/`excluir` (expostas pelo hook) só despacham por `evento.tipo` para a mesma função de CRUD que as telas atuais já chamam (`updateGasto`, `atualizarEntrada`, `updateCartao`, `updateEmprestimo`, `deleteGasto` etc.) — nenhuma regra de negócio nova. Eventos projetados (sem `itemOriginal`) não têm ação.

### 12.3 Componentes — `src/components/agenda/`

- **`CalendarioFinanceiro.js`**: usa `react-native-calendars` (`Calendar`, `markingType="custom"`). Marca dias com `eventos` (cor única, sem gradiente de intensidade — removido após teste do usuário) e dias com algo vencido (ponto vermelho); dia selecionado ganha borda. Navegação de mês é local ao componente (não usa o `DateFilterContext` global — aqui o usuário está explorando, não filtrando uma tela).
- **`LegendaCalendario.js`**: legenda das 3 marcações acima.
- **`LinhaDoTempoFinanceira.js`**: lista cronológica dos próximos 14 dias (`useProximosEventos(14)`), agrupada por rótulo relativo ("Hoje", "Amanhã", "Em X dias"). 14 dias por ser a janela mais larga que `useProximosEventos` sempre cobre com dado real (2 meses), mesmo quando "hoje" cai no fim de um mês curto como fevereiro. Só olha para frente — atrasados ficam na Central de Avisos, para não duplicar conteúdo.
- **`ItemEventoFinanceiro.js`**: card compartilhado pelas 3 superfícies acima e pela Central de Avisos. Totalmente interativo quando `itemOriginal` existe: toca no card → abre `ModalDetalhes` (mesmo componente já usado em Entradas/Saídas/Cartões/Empréstimos) → "editar" abre `ModalEdicao` → "ver histórico" (só cartão/empréstimo) abre `ModalHistoricoParcelas`. Todos os três são importados diretamente, não reimplementados. O botão de status usa `BotaoStatusPagamento` (ver 12.5).

### 12.4 Telas e navegação

- **`src/screens/AgendaFinanceiraScreen.js`**: abas locais (mesmo padrão de `SaidasScreen.js`, sem `@react-navigation/material-top-tabs`) alternando `CalendarioFinanceiro`/`LinhaDoTempoFinanceira`.
- **`src/screens/CentralAvisosScreen.js`**: três blocos fixos (Vencidos/Vencem hoje/Próximos 7 dias) via `useProximosEventos(7)`, sem nenhuma configuração de usuário.
- **`MainStack.js`**: ganhou as rotas `AgendaFinanceira` e `CentralAvisos`, junto das rotas de categoria do Menu do Usuário (Sprint 2).
- **Cabeçalho** (`TelaPadrao.js`, `renderHeader()`): evoluiu de só `👤 Nome ▼` para `👤 Nome ▼  🔔  📅` — os dois ícones novos chamam `useNavigation().navigate(...)` diretamente. Diferente do `UserMenu` (irmão do `MainStack`, por isso precisa de `navigationRef`), `TelaPadrao.js` roda dentro de uma tela de verdade (dentro do `Tab.Screen`/`MainStack`), então `useNavigation()` funciona normalmente ali.

### 12.5 `BotaoStatusPagamento` — dedup do botão de "marcar como pago"

O botão de status (usado nas listas de Entradas/Saídas/Cartões/Empréstimos) estava embutido como JSX direto dentro de `TelaPadrao.js`. Extraído para `src/components/BotaoStatusPagamento.js` nesta sprint, para que `ItemEventoFinanceiro.js` pudesse reaproveitar exatamente o mesmo componente em vez de duplicar o botão — `TelaPadrao.js` foi atualizado para consumir esse novo componente também, então há uma única implementação hoje, não duas.

### 12.6 Limitações conhecidas (aceitas conscientemente)

- "Vencidos" só enxerga meses atual + seguinte (janela de dados que `useProximosEventos` sempre busca) — não alcança atrasos de meses mais antigos.
- `useProximosEventos` mantém 8 listeners `onSnapshot` simultâneos (2 meses × 4 hooks) — mesma observação da seção 10 (múltiplos listeners por tela, sem cache central), não uma regressão nova.
- Ação de "antecipar parcelas" não está disponível a partir do card da Agenda (só nas telas de origem) — fora do escopo desta sprint por decisão do usuário.

## 13. Categorias e Subcategorias / módulo Planejamento Financeiro (✅ implementado em 2026-07-28, Sprint 4)

> Discovery completo (pesquisa no código, alternativas de modelo de dados, decisões
> negociadas incrementalmente) em `SPRINT4_DISCOVERY.md`. Esta seção descreve o estado
> técnico resultante — o enquadramento de produto (por que isso é uma mudança estrutural,
> não só uma tela nova) está em `PROJECT_STATUS.md` seção 11.

### 13.1 Modelo de dados: `users/{uid}/categorias/{id}`

Coleção plana com referência ao pai (`parentId`), não um array embutido — decisão
deliberada para não repetir o padrão de risco já conhecido em `useInvestimentos.js`
(`movimentacoes` reescrito por inteiro a cada edição, sem transação atômica — ver seção 8).
Cada documento:

```js
{
  nome: string,
  parentId: string | null,        // null = categoria de topo; preenchido = subcategoria
  tipoOrigem: "padrao" | "personalizada",
  tipoTransacao: "despesa" | "receita" | "ambos",
  icone: string,                   // nome de ícone (MaterialCommunityIcons) ou emoji
  cor: string,                     // hex
  ordem: number,
  ativa: boolean,                  // false = arquivada (nunca excluída de verdade)
  criadoEm: timestamp,
  atualizadoEm: timestamp | null,
}
```

**Profundidade da hierarquia**: `parentId` é uma referência genérica — nada no modelo de
dados nem em `useCategorias.js` impede mais de 2 níveis (categoria → subcategoria →
sub-subcategoria). A limitação de "só 2 níveis" existe unicamente na UI
(`CategoriaSelect.js`/`CategoriasManager.js` renderizam um único nível de filhos, via
`.map()` não recursivo). Se um dia mais níveis forem necessários, é trabalho de UI
(renderização recursiva), não de dado — verificado explicitamente a pedido do usuário
antes do incremento 4, sem alterar nada (ver `SPRINT4_DISCOVERY.md` seção 14).

### 13.2 `useCategorias.js` — fonte única, mesmo padrão de `useMembros.js`

`src/hooks/useCategorias.js` segue o mesmo modelo já validado por `useMembros.js` na
Sprint 2: listener `onSnapshot` via `getBasePath(user)`, CRUD (`adicionarCategoria`,
`atualizarCategoria`, `arquivarCategoria`, `reativarCategoria`, `excluirCategoria`),
validação de nome duplicado (case-insensitive, escopada por `parentId` — duas
subcategorias podem ter o mesmo nome se estiverem sob categorias-pai diferentes).

**Seed automático de categorias padrão** (`src/utils/categoriasPadrao.js`): na primeira
vez que o listener retorna a coleção vazia, `useCategorias` grava o catálogo padrão com
**IDs determinísticos** (`padrao-alimentacao`, `padrao-transporte-uber`, etc., não gerados
por `addDoc`) — um `batch.set` repetido com o mesmo ID apenas sobrescreve, nunca duplica,
o que torna o seed seguro mesmo se dois aparelhos abrirem o app quase ao mesmo tempo logo
após o cadastro. Cada usuário recebe sua própria cópia editável/arquivável/excluível das
categorias padrão — não é um catálogo somente-leitura compartilhado.

**Exclusão definitiva tem duas guardas** (`excluirCategoria`): bloqueia se a categoria tiver
subcategorias, e bloqueia se qualquer transação em `gastos`/`entradas`/`cartoes`/
`emprestimos` referenciar seu `id` via `categoriaId` (4 consultas `where('categoriaId','==',id)`
antes de permitir excluir). "Arquivar" (`ativa: false`) é sempre permitido e reversível.

### 13.3 `CategoriaSelect.js` — componente genérico, não acoplado a formulário

Reescrito para consumir `useCategorias()` diretamente (nenhum acesso a Firestore por quem
usa o componente) e selecionar **objetos completos** (`{id, nome, icone, cor, ...}`), não
strings — mesmo padrão que `MembroSelect.js` já usa com `useMembros`. Pensado desde o
início para ser reaproveitado fora dos formulários de lançamento (Metas, Orçamentos,
Relatórios, Dashboard, filtros futuros) — por isso não assume nada sobre "estar dentro de
um formulário", só devolve a seleção via `onSelecionar`.

Preparado (documentado, não implementado) para um futuro modo de seleção múltipla: a
árvore de dados (`categoriasTopo`, `subcategoriasDe`, `resultadoBusca`) já é independente
de como a seleção é confirmada — adicionar `multiplo`/`categoriasSelecionadas` no futuro só
exigiria trocar a função que hoje sempre fecha o modal na primeira escolha.

O atalho "Gerenciar categorias" abre `GerenciarCategoriasModal.js` (bottom sheet) em vez de
navegar para fora do formulário que o usuário estava preenchendo — mesmo padrão do
"Gerenciar membros" a partir de `MembroSelect.js`.

### 13.4 `src/components/planejamento/` — CRUD sem duplicação entre tela e atalho

- **`FormularioCategoriaModal.js`**: criar/editar (nome, tipo de transação, ícone, cor).
- **`CategoriasManager.js`**: lista com árvore expansível (editar/arquivar/reativar/excluir)
  — miolo compartilhado.
- **`GerenciarCategoriasModal.js`** (bottom sheet, a partir de `CategoriaSelect`) e
  **`src/screens/CategoriasScreen.js`** (tela cheia, a partir do menu) são embrulhos finos
  em volta do mesmo `CategoriasManager` — o CRUD não existe em duplicata.

### 13.5 Navegação: hub "Planejamento Financeiro"

`src/screens/PlanejamentoFinanceiroScreen.js` é um hub (não navega direto para uma tela
final) — hoje só lista "Categorias" como item real, com "Metas Financeiras"/"Orçamentos e
Limites"/"Relatórios" como "Em breve" (mesmo padrão visual de `PlaceholderMenuScreen.js`,
Sprint 2). `UserMenu.js` ganhou a entrada "Planejamento Financeiro"; `MainStack.js` ganhou
as rotas `PlanejamentoFinanceiro` e `Categorias`. Pensado para as próximas funcionalidades
do módulo entrarem no mesmo hub sem reorganizar o menu principal de novo.

### 13.6 Referência nas transações: convivência de `categoria` + `categoriaId` + `categoriaNome`

Decisão explícita do usuário: **sem migração em massa**. Lançamentos novos (via
`ModalCriacao.js`, `ModalEdicao.js`, `GerenciarModelosModal.js`) gravam os 3 campos:
`categoria` (string, legado — mantém toda a exibição existente funcionando sem tocar em
`ListItemGasto.js`/`ModalDetalhes.js`/ícones por categoria), `categoriaId` e
`categoriaNome` (referência estável para Metas/Relatórios futuros). Lançamentos antigos
continuam só com `categoria` — a mesma UI resolve o objeto completo via `categoriaId`
quando existe, e cai para um objeto sintético (só nome, sem `id`) quando não existe, sem
quebrar a edição desses registros antigos.

`ModalEdicao.js` ganhou o campo de categoria também para **empréstimos** nesta sprint —
antes só existia na criação (`ModalCriacao.js`), não na edição.

**Auditoria pós-implementação** (pedida pelo usuário antes de avançar) encontrou 2 gaps
reais na propagação, ambos corrigidos: `useCartoes.js` (`addCartao`) descartava a
categoria inteira ao criar uma compra nova (bug pré-existente, não introduzido nesta
sprint — só a criação, `updateCartao` sempre funcionou); `useEmprestimos.js`
(`addEmprestimo`) mantinha `categoria` mas descartava `categoriaId`/`categoriaNome`. Depois
da correção, os 5 tipos de lançamento e a geração de recorrentes (`gerarFixosDoMes`, que
também passou a propagar `categoriaId`/`categoriaNome` do modelo) gravam os 3 campos de
forma consistente, na criação e na edição.

### 13.7 `src/utils/metas.js` — unificação do cálculo de progresso de meta

`calcularProgressoMeta(valorAtual, valorMeta)` (sempre 0–100, sempre travado em 100) e
`corProgressoMeta(percentual)` substituem 3 implementações divergentes que existiam em
`SecaoInvestimentos.js`, `TelaPadrao.js` (não travava em 100 — bug real, corrigido) e
`DetalhesInvestimentoModal.js` (escala 0–1, multiplicava por 100 de novo na exibição). Só
consolidação — nenhuma funcionalidade nova de meta foi adicionada, por decisão do usuário
(a evolução de Meta de Investimento propriamente dita fica para quando Metas Financeiras,
Sprint 6, chegar).

### 13.8 Compatibilidade com Modo Família

Categorias vivem em `getBasePath(user)` sem `compartilhado=true` — mesma posição que
`useMembros.js` já ocupa. Quando o Modo Família for implementado de verdade, compartilhar
categorias entre membros da família é trocar essa chamada para
`getBasePath(user, true)`, **desde que** o gap já registrado na seção 3 deste documento
(`user.tenantId` não existe no objeto do Firebase Auth, só no `profile` do Firestore) seja
resolvido nessa hora — não é um bloqueio desta sprint, só um lembrete de que "pronto para
Modo Família" aqui significa "não vai exigir redesenho", não "já funciona compartilhado
hoje".

## 14. Identidade e Avatares (✅ implementado em 2026-07-30, Sprint 5)

Discovery completo em `SPRINT5_DISCOVERY.md`. Resumo de produto em `PROJECT_STATUS.md`
seção 12. Esta seção documenta só o desenho técnico.

### 14.1 Membro-espelho

Todo usuário passa a ter um documento em `users/{uid}/membros/{uid}` (mesmo `id` do `uid`,
não um id gerado) representando a si mesmo, com `ehProprietario: true`. Criado em dois
pontos de `useAuth.js`:
- `register()`: gravado no mesmo `writeBatch` do restante do cadastro (atômico com a
  criação do perfil), reaproveitando `userData.avatarUrl` recém-gerado.
- `criarMembroProprietarioSeNaoExistir(uid, nome)`: autocura para contas que já existiam
  antes desta sprint, chamada no fluxo de login. Checa a **existência do campo `avatar`**,
  não a existência do documento — importante porque o documento pode já existir (criado
  antes desta sprint, sem avatar) e o autocura não deve sobrescrever uma customização já
  salva, só preencher o que está faltando.

`isMembroProprietario(membro)` (`src/utils/membros.js`) é a única função que checa
`ehProprietario` no código — nenhum outro arquivo compara esse campo diretamente. Centraliza
a regra de "não pode excluir o dono da conta" e "edições vão para `atualizarPerfil`, não
para `atualizarMembro`", usada em `useMembros.js`, `EditarMembroModal.js`,
`GerenciarMembrosModal.js` e `MembrosScreen.js`.

`atualizarPerfil()` (`useAuth.js`) sincroniza `apelido` → `membro.nome` e `avatarUrl` →
`membro.avatar` no mesmo documento de membro-espelho sempre que o proprietário edita o
próprio perfil — um único lugar de edição (`ContaScreen.js`) para dois documentos.

### 14.2 Unificação `membroId`/`membroNome`

Mesmo padrão de convivência que `categoriaId`/`categoriaNome` (Sprint 4, seção 13.6): sem
migração em massa. Entradas e compras de cartão gravam `membroId` (referência estável,
`null` quando a pessoa não é um Membro cadastrado) + `membroNome` (sempre preenchido).
`MembroSelect.js` é o único componente que resolve essa escolha — nem `ModalCriacao.js` nem
`ModalEdicao.js` acessam `useMembros` diretamente.

O campo `pessoa` do empréstimo (credor/instituição) foi renomeado para `credor` — é um
conceito não relacionado a "pessoa da família" e não participa dessa unificação.

### 14.3 Modo Família — arquitetura oficial e remoção da concorrente

`tenants/{tenantId}` (via `getBasePath(user, compartilhado)`, já existente desde antes desta
sprint — ver seção 7) é a arquitetura escolhida para dado compartilhado. A arquitetura
concorrente — `membroSelecionado`/`modoFamiliaAtivo` (parâmetro de `useModelos.js`,
nunca chamado com `true`) e `compartilhadoCom` (campo lido em `ModalHistoricoParcelas.js`,
nunca gravado em lugar nenhum) — foi removida por decisão do usuário, para não manter duas
abordagens documentadas ao mesmo tempo quando só uma seria de fato usada.

### 14.4 Avatar vetorial — formato e motor

Formato persistido (em `users/{uid}.avatarUrl` e `users/{uid}/membros/{id}.avatar`):
```js
{ tipo: "vetorial", motor: "dicebear", versao: 1, dados: { estilo: "avataaars", opcoes: {...} } }
```
`motor` existe para permitir trocar o motor de geração no futuro (ex.: outro pacote, ou uma
IA) sem quebrar avatares já persistidos — hoje só `"dicebear"` é implementado. `opcoes` é a
configuração **já resolvida** (não uma seed crua): `@dicebear/core` permite gerar por seed e
depois ler as opções resolvidas via `.toJSON().options`, reaproveitáveis para sempre sem
guardar a seed — validado empiricamente antes de adotar essa abordagem. A seed só é usada no
momento da criação (ou ao pedir "aleatório" no editor); nunca no render.

`src/utils/avatar.js` concentra toda a lógica específica de motor/estilo:
- `gerarAvatarPadrao(seed)` / `gerarAvatarAleatorio()`: geram o objeto acima.
- `sanitizarOpcoes()`: remove `seed`, campos de transform (`*Rotate`/`*TranslateX/Y`/`*Scale`)
  e `undefined`/`null` (Firestore rejeita `undefined`) — reaplicada depois de toda edição.
- Catálogo `CATEGORIAS_AVATAAARS`: cada categoria editável é `{chave, label, secao, tipo:
  'cor'|'variante', opcoes, ler(avatar), aplicar(avatar, valor)}` — a única parte do arquivo
  que sabe o nome dos campos do DiceBear/avataaars. `listarCategoriasEditaveis`/
  `listarSecoesEditaveis`/`aplicarEdicaoAvatar`/`renderizarPreviaCategoria` são a API pública
  usada pelo editor — motor-agnóstica.
- `renderizarAvatarSvg(avatar)`: converte o objeto persistido em SVG.

`AvatarRenderer.js` (exibição) e `AvatarEditor.js` (edição, seccionado por categoria: pele,
cabelo, barba, roupa, expressão, acessórios, fundo) **nunca importam `@dicebear/*`
diretamente** — só chamam as funções de `utils/avatar.js`. Decisão explícita do usuário para
não espalhar condicionais específicas de Avataaars pelo projeto, mesmo mantendo só um estilo
implementado hoje.

**Escolha do estilo `avataaars`**: avaliação técnica comparativa (contagem de componentes/
variantes/cores, licença) de mais de uma dezena de estilos do DiceBear concluiu que os
estilos alternativos mais ricos em variedade sacrificam a categoria de roupa inteiramente —
`avataaars` continua sendo o melhor equilíbrio para o caso de uso (avatar de pessoa,
editável, com roupa). Documentado com o raciocínio completo em `SPRINT5_DISCOVERY.md`.

### 14.5 UX de administração de Membros

`EditarMembroModal.js` unifica nome, avatar e exclusão de um Membro num único fluxo. É
acionado tocando em qualquer parte da linha do Membro (não só no avatar) em
`GerenciarMembrosModal.js` e `MembrosScreen.js` — ambos derivam o Membro em edição via
`membros.find(m => m.id === membroEditandoId)` a cada render (guardando só o `id` no
estado), não um snapshot do objeto, para refletir imediatamente qualquer alteração salva.

`MembroSelect.js`: lista de Membros + uma única opção final "Outra pessoa..." (modal
pequeno, só pede o nome — usado no caso raro de alguém fora da família registrada). Atalho
para "Gerenciar membros" mantido como link de texto discreto no rodapé da lista, não como
ação em destaque.

## 15. Parcelas personalizadas no cartão (✅ implementado em 2026-08-03)

Resumo de produto em `PROJECT_STATUS.md` seção 13. Esta seção documenta o desenho técnico.

### 15.1 Modelo de dados: sem entidade nova

Uma compra parcelada continua sendo o que já era desde antes desta mudança (ver seção 7):
N documentos independentes em `users/{uid}/cartoes`, ligados só pela string `idCompra`, cada
um com o seu próprio campo `valor`. **Não existe um novo campo "modo de parcelamento" nem um
documento "compra" separado** — se as parcelas de um `idCompra` não são todas iguais, a
compra está personalizada; se são, não está. Essa decisão evita criar uma segunda
representação de algo que os documentos já expressam sozinhos.

### 15.2 Correção de base: `valorTotal` sempre derivado

Antes desta mudança, `valorTotal` era gravado uma vez na criação e nunca mais tocado —
`GastoCartaoCard.js` lê esse campo diretamente (diferente de `ModalDetalhes.js`/
`ModalHistoricoParcelas.js`, que já resomavam as parcelas), então uma edição pontual de
parcela deixava o total exibido nesse card errado. `useCartoes.js` ganhou:

- `recalcularValorTotalCompra(basePath, idCompra)`: mesmo padrão de
  `recalcularEconomiaTotal` em `useEmprestimos.js` — soma o `valor` de todas as parcelas do
  grupo e grava o resultado como `valorTotal` em todas elas, num só `writeBatch`. Chamada por
  `updateCartao` sempre que o `valor` de uma parcela muda (comparando com o valor anterior,
  para não gerar leitura/escrita extra em ações que não tocam o valor, como marcar como
  pago).
- `addCartao` também passou a gravar `valorTotal` como a soma real das parcelas criadas
  (`somarParcelas`), não o valor bruto digitado no campo "Valor Total" — no caso comum
  (parcelas iguais, divisão exata), o resultado é idêntico a antes; só passa a ser mais
  preciso quando a divisão não é exata (ex.: R$ 100 ÷ 3).

### 15.3 `src/utils/parcelamento.js` — única fórmula de divisão igual

`dividirValorIgualmente(valorTotal, quantidadeParcelas)` é a mesma conta que `addCartao` já
fazia inline (sem arredondamento redistribuído — a última parcela não absorve a diferença de
centavos, para não introduzir um comportamento novo no cálculo automático padrão). Extraída
para ser reaproveitada tanto pela criação automática quanto pelo editor de parcelas
(preenchimento inicial e botão "Restaurar parcelas iguais"), evitando duas implementações da
mesma divisão. `somarParcelas(valores)` é a única fórmula usada para derivar um total a
partir de parcelas — nunca o inverso.

### 15.4 `ModalEditorParcelas.js` — editor, sem conhecimento de Firestore

Componente puramente controlado: recebe `valoresIniciais` (array já resolvido pelo chamador)
e devolve o array final em `aoConfirmar`, sem saber se está numa compra nova (criação) ou
numa já existente (edição). Cada linha (`LinhaParcela`) usa sua própria instância de
`useCurrencyInput` — uma por componente de lista, não dentro de um loop, mesmo padrão de
máscara monetária do resto do app. "Restaurar parcelas iguais" reparte o **total atual**
(soma do que está sendo exibido no momento, não o valor total original antes de abrir o
editor) — decisão deliberada: dentro do editor não existe um campo "total" separado dos
valores das parcelas, então o total exibido é a única referência que faz sentido.
Editar uma parcela nunca recalcula as demais (pedido explícito) — redistribuição automática
fica como possível melhoria futura, não implementada.

### 15.5 `OpcaoPersonalizarParcelas.js` — opção única, reaproveitada

Um só componente usado por `ModalCriacao.js` e `ModalEdicao.js`: linha com checkbox
("Editar valores das parcelas", ícone `checkbox-marked`/`checkbox-blank-outline`, mesmo
padrão visual de `ModalParcelasAdiantamento.js`), visível só quando `totalParcelas > 1`.
Prioridade do valor inicial do editor: (1) já personalizado nesta sessão → (2) valores já
gravados no Firestore, quando a compra já existe (`valoresExistentes`, edição) → (3) cálculo
automático de sempre (criação nova). Isso garante que, ao editar uma compra já personalizada,
o editor abre com os valores reais gravados, não com uma divisão recalculada do zero.

### 15.6 Criação (`ModalCriacao.js`) — interface inalterada

Os dois modos de lançamento existentes ("Valor Total" / "Valor da Parcela") continuam
exatamente iguais. A opção nova aparece uma única vez, logo abaixo dos campos de parcela,
independente do modo escolhido. Enquanto personalizado, os campos "Valor Total"/"Valor da
Parcela"/"Número de Parcelas" ficam desabilitados (evita os campos automáticos e o array
personalizado ficarem depois com contagens diferentes) — removendo a personalização
(`Remover`) os reabilita. No salvamento, se há parcelas personalizadas, o `valorTotal`
gravado é sempre a soma delas, nunca o valor calculado pelos campos automáticos.

### 15.7 Edição (`ModalEdicao.js`) — busca as parcelas irmãs

Diferente da criação, `ModalEdicao` abre para **uma única parcela** (o documento que o
usuário tocou na lista). Para oferecer "Editar valores das parcelas" ali, o componente
principal (não o `CamposModal` memoizado) instancia `useCartoes()` sem `mes`/`ano` (não liga
o listener, só reaproveita `buscarParcelasDaCompra`) e, ao abrir para uma compra com mais de
1 parcela, busca todos os documentos do mesmo `idCompra` (não só o que está aberto — a lista
mensal não contém as parcelas de outros meses). Se os valores reais já não são todos iguais,
a personalização é detectada automaticamente (checkbox abre marcado, mostrando o total real).
O salvamento passa o array de valores para `updateCartao`, que grava todas as parcelas do
grupo + o `valorTotal` num único `writeBatch` (`salvarParcelasPersonalizadas`) — os outros
campos da parcela aberta (descrição, comprador, data, categoria, pago) são gravados
separadamente, sem tocar `valor`/`valorTotal` de novo.

### 15.8 Fora do escopo, por decisão explícita

- **Empréstimos**: mesma necessidade poderia existir (ex.: seguro/IOF numa parcela), mas a
  arquitetura de âncora é diferente (`valorContratado` fixo, nunca derivado — ver seção 8) —
  precisaria de uma proposta própria, não uma extensão direta deste desenho.
- **Redistribuição automática ao editar uma parcela**: pedido explícito do usuário para não
  implementar agora — editar uma parcela nunca toca as demais.
- **Arredondamento do split automático**: o cálculo automático padrão (fora do editor)
  continua sem redistribuir centavos de divisão não exata — comportamento preexistente, não
  alterado, para não introduzir uma mudança de resultado em compras que nunca usarem o editor.

### 15.9 Regra de negócio: parcela paga/antecipada tem valor imutável

Decisão (2026-08-03): entre permitir editar qualquer parcela (mais flexível, mas risco de
"reescrever" quanto já foi efetivamente pago) e bloquear a edição de parcelas já pagas ou
antecipadas, permitindo só as em aberto — optamos pela segunda. Justificativa: o valor de uma
parcela com `pago === true` ou `adiantada === true` já entrou no cálculo de "quanto já foi
pago" em `ModalDetalhes.js`/`ModalHistoricoParcelas.js`; alterá-lo depois seria reescrever um
registro histórico, não corrigir uma compra futura — o mesmo princípio já aplicado a
`valorContratado` do empréstimo (fixo desde a criação, nunca recalculado, ver seção 8). Só
metadados (descrição, comprador, data, categoria) continuam editáveis numa parcela paga —
a trava é só sobre o campo `valor`.

Aplicado em duas camadas (defesa em profundidade, não só UI):

- **UI**: `ModalEditorParcelas.js` recebe `bloqueadas` (array de booleans, mesmo índice de
  `valoresIniciais`) — linhas bloqueadas mostram um ícone de cadeado e o valor em texto, sem
  campo editável. "Restaurar parcelas iguais" reparte o total só entre as parcelas abertas,
  nunca toca as bloqueadas. `ModalEdicao.js` calcula `parcelasBloqueadas` a partir do que
  `buscarParcelasDaCompra` retorna (`pago === true || adiantada === true`) e também bloqueia
  o campo "Valor" comum quando a própria parcela aberta já está paga/antecipada — regra vale
  tanto dentro do editor quanto fora dele.
- **Dados**: `useCartoes.js` — `updateCartao` (caminho comum, fora do editor) ignora qualquer
  mudança de `valor` se a parcela já está bloqueada; `salvarParcelasPersonalizadas` (caminho
  do editor) recalcula `valorTotal` a partir do valor **real gravado** de cada parcela
  bloqueada, não do array recebido, mesmo que a UI tentasse enviar outro número.

**Lacuna encontrada e corrigida durante esta mudança** (não introduzida agora, preexistente):
`anteciparParcelas` mudava o `valor` da parcela (aplicando desconto) sem nunca recalcular o
`valorTotal` do grupo — e também nunca gravava `valorOriginal`, então a reversão de
antecipação (`updateCartao`, branch "Reverter antecipação?") sempre caía no fallback
`atual.valor` em vez de restaurar o valor pré-desconto de verdade. Corrigido: `valorOriginal`
agora é gravado na antecipação, e tanto antecipar quanto reverter chamam
`recalcularValorTotalCompra` no final. `mesOriginal`/`anoOriginal` (data original, não valor)
continuam com o mesmo problema — fora do escopo desta correção, que foi só sobre valores.

### 15.10 Destaque no histórico (`ModalHistoricoParcelas.js`)

`ParcelaItem` já distinguia Pendente/Antecipada/Paga (ícone, cor, e "Pago com Desconto" vs.
"Valor Original" quando há desconto) — igual para empréstimo e cartão, nada mudou aí. Ganhou
um selo adicional, não-exclusivo com os anteriores (uma parcela pode estar paga **e** ter
valor personalizado ao mesmo tempo): "✏️ Valor personalizado", calculado no momento da busca
(`fetchParcelas`), comparando o valor original de cada parcela (`valorOriginal ?? valor` —
antes de qualquer desconto de antecipação) contra uma divisão igual do `totalReal` do grupo
(`dividirValorIgualmente`, mesma fórmula do resto da feature). Não é um campo persistido — é
recalculado a cada abertura do histórico, então funciona tanto para compras já existentes
antes desta mudança (nenhuma nunca vai aparecer como alterada, já que todas nasceram iguais)
quanto para novas. Só se aplica a cartão — empréstimo não tem personalização (ver 15.8).

### 15.11 Bug real encontrado em produção: `undefined` em `updateDoc` (corrigido em 2026-08-04)

Cenário relatado: compra parcelada com comprador "Outra pessoa..." (nome digitado, sem
Membro cadastrado) → personalizar parcelas → "Restaurar parcelas iguais" → Salvar → Firestore
rejeitava a escrita (`Unsupported field value: undefined`). Investigação encontrou **duas
causas raiz distintas**, as duas em `useCartoes.js`, nenhuma introduzida pela feature de
parcelas personalizadas — só exposta por ela, no primeiro fluxo de edição completo testado
para uma compra "Outra pessoa":

1. **Campo `membro` vestigial no listener de `cartoes`**: a normalização do snapshot
   declarava incondicionalmente `membro: typeof data.membro === 'object' ? data.membro?.nome
   : data.membro` — mas nenhuma compra de cartão jamais grava um campo `membro` (cartão usa
   `pessoa`/`membroId`/`membroNome`, unificados na Sprint 5; `membro` é o campo de
   **Entradas**, não de cartão). Como `data.membro` nunca existe, essa linha sempre produzia
   `membro: undefined` — presente como chave explícita em todo item de cartão, carregado sem
   alteração por `ModalEdicao.js` (`{...item}`) até o `updateDoc` final. Removida — cartão não
   declara mais esse campo, ponto.
2. **`typeof x === 'object'` sem excluir `null`**: em JS, `typeof null === 'object'` também é
   `true`. Os campos opcionais `pessoa`/`categoria` são gravados como `null` (não `undefined`)
   quando ausentes — mas o listener fazia `typeof data.categoria === 'object' ?
   data.categoria?.nome : data.categoria`, que para `null` cai no ramo verdadeiro e resolve
   `null?.nome` → `undefined`. Ou seja: **toda compra sem categoria selecionada** já carregava
   `categoria: undefined` no estado do app, pronta para quebrar a próxima edição. Corrigido
   adicionando o guard `data.categoria && typeof ...` (mesmo padrão que `ModalCriacao.js`/
   `ModalEdicao.js` já usavam corretamente nas suas próprias conversões — `v.categoria &&
   typeof v.categoria === 'object'` — só o listener do hook estava sem o guard).

**Correção estrutural, não só pontual**: `removerIndefinidos(objeto)` (mesmo princípio de
`sanitizarOpcoes` em `utils/avatar.js` — Firestore rejeita `undefined` em qualquer escrita)
foi extraída para `src/utils/firestoreSanitize.js` (compartilhada, não duplicada por hook) e
aplicada em **todo** `updateDoc`/`addDoc`/`batch.set` que grava um objeto vindo de UI:
- `useCartoes.js`: `addCartao`, e as três escritas de `updateCartao` (caminho comum,
  personalização e reversão de antecipação).
- `useEntradas.js`: `adicionarEntrada`, `atualizarEntrada`, e o `batch.set` de
  `gerarFixosDoMes`.
- `useGastos.js`: `addGasto`, `updateGasto`, e o `batch.set` de `gerarFixosDoMes`.
- `useEmprestimos.js`: `addEmprestimo` (`batch.set`) e as duas escritas de `updateEmprestimo`
  (caminho comum e reversão de antecipação).

Escritas que só constroem objetos internamente, sem entrada de UI (`recalcularValorTotalCompra`,
`salvarParcelasPersonalizadas`, `anteciparParcelas`/`anteciparParcelasEmprestimo`,
`toggleCartaoStatus`, `recalcularEconomiaTotal`, o `batch.update` de gastos dinâmicos em
`useEntradas.js`) não precisaram do wrapper — todos os valores ali já são deterministicamente
definidos, sem entrada de UI.

**`useEntradas.js` — mesmo bug, corrigido (2026-08-04)**: tinha o mesmo padrão sem guard
(`typeof data.membro === "object"` / `typeof data.categoria === "object"`, sem o `data.X &&`
antes) no listener — mesmo risco relatado em cartão, mas aqui para Entradas com "Outra
pessoa..." ou sem categoria. Diferença importante: em Entradas, `membro` **é** um campo real
(não vestigial como em cartão) — a correção foi só adicionar o guard, sem remover o campo.

**Varredura completa em todos os hooks/listeners (2026-08-04)**, a pedido do usuário, para
eliminar a classe inteira do bug, não só os dois casos já encontrados:

- **`typeof x === 'object'` sem excluir `null`**: só existia nos listeners de `useCartoes.js`
  e `useEntradas.js` (ambos já corrigidos acima). Achados adicionais do mesmo padrão, sem
  risco de escrita (leitura pura, dentro de JSX): `GastoCartaoCard.js` (`transacao.pessoa`) e
  `GerenciarModelosModal.js` (`entrada.membro`, ao listar entradas para o modo "porcentagem")
  — corrigidos por completude, mesmo sem crash possível hoje (`pessoa` é campo obrigatório em
  cartão; `entrada.membro` já vem seguro do listener corrigido). `ModalCriacao.js`/
  `ModalEdicao.js` já tinham o guard correto nas suas 3 ocorrências cada — não precisaram de
  mudança.
- **Campo vestigial (como o `membro` de cartão)**: nenhum outro encontrado. Só
  `useCartoes.js`/`useEntradas.js` re-derivam campos (`pessoa`/`categoria`/`membro`) no
  listener via esse padrão — os demais hooks (`useGastos.js`, `useEmprestimos.js`,
  `useInvestimentos.js`, `useMembros.js`, `useCategorias.js`, `useModelos.js`) só espalham
  `...data()` sem redeclarar nada, então não têm como introduzir essa classe específica de bug.
- **Mesma classe, formato diferente (campo opcional sem `|| null`)**: encontrados dois
  gêmeos do que já tinha sido corrigido em `useEntradas.js`'s `gerarFixosDoMes` — `useGastos.js`
  (`gerarFixosDoMes`: `categoria: modelo.categoria` sem fallback) e `useEmprestimos.js`
  (`addEmprestimo`: `categoria` na construção de cada parcela, sem fallback — os campos
  vizinhos `categoriaId`/`categoriaNome` já tinham `|| null`). Ambos corrigidos com o mesmo
  `|| null`. Nenhum dos dois era alcançável pelo fluxo atual do app (`ModalCriacao.js`
  sempre inicializa `categoria` como `null`, nunca deixa `undefined`), mas ficam protegidos
  contra dados legados (modelos antigos sem o campo).
- **`useInvestimentos.js`/`useMembros.js`/`useCategorias.js`/`useModelos.js`**: auditados,
  nenhum risco encontrado — não usam o padrão `typeof === 'object'`, e todo campo opcional já
  tem fallback explícito (`|| null`, `|| 'Sem nome'` etc.) nas funções de escrita. Não
  alterados.

### 15.12 `removerIndefinidos` — contrato exato (remove só `undefined`)

Confirmado por leitura e verificação empírica: `removerIndefinidos` só remove chaves com
`objeto[chave] !== undefined`. `null`, `""`, `NaN`, `0`, `false` e objetos/arrays vazios
**nunca** são removidos nem alterados — continuam gravados exatamente como vieram. Isso é
proposital: `null` faz parte da modelagem do app (ex.: `categoria: null` = "nenhuma categoria
selecionada", um valor válido e diferente de "campo ausente"). O comentário no topo do
arquivo (`src/utils/firestoreSanitize.js`) documenta esse contrato explicitamente.

### 15.13 Causa raiz real: `valorTotal` voltando a ficar obsoleto depois de personalizar

**Sintoma relatado (2026-08-04)**: o card da lista de cartões mostrava um total diferente do
`ModalDetalhes.js` para uma compra com parcela personalizada (card: total antigo; detalhes:
total correto). A seção 15.2 já tinha corrigido `valorTotal` para ser sempre recalculado — mas
havia um segundo ponto, mais sutil, onde ele voltava a ficar velho.

**Causa raiz**: `updateCartao` recebe `cartao` (= `v`, construído em `ModalEdicao.js` a partir
de `{...item}`) — e `item` já carrega o `valorTotal` que estava gravado **no momento em que o
modal abriu**. Antes desta correção, esse campo nunca era removido do objeto antes das
escritas. Sequência exata do bug:

1. Usuário abre `ModalEdicao` para a parcela X de uma compra de 4 parcelas iguais (ex.: R$26
   cada, `valorTotal: 104`). `item.valorTotal` = `104`.
2. Usuário personaliza as parcelas (uma vai para R$250) e confirma no editor. `salvarParcelasPersonalizadas`
   já roda aqui? **Não** — o editor só guarda o array em `valores.parcelasPersonalizadas`;
   nada é escrito no Firestore ainda (ver seção 15.6/15.7).
3. Usuário toca "Salvar" no `ModalEdicao`. `updateCartao` entra no ramo de personalização:
   `salvarParcelasPersonalizadas` grava corretamente `valor` + `valorTotal: 328` (a soma real)
   em **todas** as parcelas do grupo, incluindo a parcela X.
4. Na sequência, o mesmo `updateCartao` faz uma **segunda escrita** na parcela X, só para
   salvar os outros campos do formulário (descrição, comprador, data, categoria, pago) —
   `outrosCampos = {...dadosAtualizados}` menos `valor`. Mas `dadosAtualizados` **ainda
   carregava o `valorTotal: 104` antigo** (de `item`, do passo 1) — essa segunda escrita
   sobrescrevia de volta o `valorTotal` correto (328) para o valor antigo (104), só na parcela
   X (as outras parcelas do grupo, não tocadas por essa segunda escrita, ficavam com 328
   correto — por isso o total variava dependendo de qual parcela do grupo era exibida no
   card).
5. O mesmo problema existia no caminho comum (edição sem personalização): se `valorMudou` for
   `false` (ex.: o usuário só editou a descrição), `recalcularValorTotalCompra` nem roda — mas
   a própria escrita comum já tinha acabado de gravar o `valorTotal` antigo de `item`,
   silenciosamente, mesmo sem precisar.

**Por que o card e o `ModalDetalhes`/`ModalHistoricoParcelas` discordavam**: `GastoCartaoCard.js`
é a única tela que ainda lê `transacao.valorTotal` diretamente (ver seção 15.2) — então foi a
única a exibir o valor poluído. `ModalDetalhes.js`/`ModalHistoricoParcelas.js` sempre
resomam as parcelas via query própria, nunca confiam no campo — por isso mostravam o valor
certo, mascarando o bug em vez de expô-lo.

**Correção — fonte única de verdade de fato única**: `updateCartao` agora remove
`valorTotal` do objeto recebido **antes de qualquer outra coisa**, no mesmo lugar onde já
removia `parcelasPersonalizadas`:
```js
const { parcelasPersonalizadas, valorTotal: _valorTotalIgnorado, ...dadosCartao } = cartao;
```
Isso garante, por construção, que **nenhuma escrita genérica** (comum ou de personalização)
possa gravar um `valorTotal` vindo de fora — só `recalcularValorTotalCompra` e
`salvarParcelasPersonalizadas` (as duas funções dedicadas) têm permissão de escrevê-lo. Não é
mais possível reintroduzir esse bug adicionando um novo campo ou um novo caminho de edição.

**Mesma causa raiz, corrigida por precaução em `useEmprestimos.js`**: `economiaTotal` (que,
diferente de `valorContratado`, pode mudar depois da criação — via antecipação/reversão) tinha
exatamente a mesma exposição em `updateEmprestimo`. `valorContratado` nunca muda de verdade
(sempre igual em `item` e no banco), então não havia bug vivo ali — mas `economiaTotal` podia
sofrer o mesmo problema se uma parcela do grupo fosse antecipada por outra tela entre a
abertura do modal e o "Salvar" de uma edição não relacionada nesta parcela. Corrigido com o
mesmo padrão: `valorContratado`/`economiaTotal` removidos do objeto recebido antes de qualquer
escrita — só `recalcularEconomiaTotal` pode defini-los.

### 15.14 Formatação monetária no histórico de parcelas (ponto em vez de vírgula)

**Causa raiz**: `ParcelaItem`, em `ModalHistoricoParcelas.js`, usava `.toFixed(2)`
(`valorOriginal.toFixed(2)`, `valorPago.toFixed(2)` ×2) e `.toFixed(1)`
(`descontoPercentual.toFixed(1)`) — método nativo do JS que **sempre** usa ponto como
separador decimal, independente de localidade. O componente vizinho no mesmo arquivo,
`ResumoFinanceiro`, já usava corretamente `.toLocaleString('pt-BR', { minimumFractionDigits:
2 })` (o padrão usado no resto do app) — só `ParcelaItem` tinha ficado com o método errado,
provavelmente por ser um trecho mais antigo que nunca foi revisitado quando o padrão
`toLocaleString('pt-BR', ...)` se consolidou no restante do projeto. Corrigido trocando as 4
ocorrências para `.toLocaleString('pt-BR', ...)`, igual ao `ResumoFinanceiro` — nenhuma
mudança de comportamento além do separador decimal.

### 15.15 `CampoMonetario.js` — único componente de entrada monetária do app (2026-08-05)

A pedido do usuário, auditoria de todos os campos de valor monetário do app (criação e edição
de entrada/gasto/empréstimo/cartão, investimentos, modelos recorrentes, editor de parcelas)
para confirmar se `ModalEditorParcelas.js` usava a mesma implementação do resto do projeto.

**Padrão já confirmado como oficial antes desta auditoria**: `useCurrencyInput` (`src/hooks/
useCurrencyInput.js`) — digita em centavos, formata via `formatarBRL` a cada tecla, com um
`bloqueadoRef` para não processar dois `onChangeText` em paralelo. Usado (corretamente) em
`ModalCriacao.js`, `ModalParcelasAdiantamento.js`, `MovimentacaoInvestModal.js`, e — o achado
importante — **também já em `ModalEditorParcelas.js`**: a máscara em si nunca foi diferente
ali, `LinhaParcela` já usava `useCurrencyInput` + `handleChange` + `formatarBRL`, sem parse
próprio, sem reposicionamento manual de cursor.

**Duas diferenças reais encontradas, nenhuma na máscara**:

1. **`GerenciarModelosModal.js` tinha uma implementação própria e paralela**: funções locais
   `formatarMoeda`/`desformatarMoeda`, chamadas direto no `onChangeText` (sem o
   `bloqueadoRef`/debounce que `useCurrencyInput` tem), `keyboardType="decimal-pad"`. Essa era
   a segunda forma real de editar dinheiro no projeto — não estava relacionada a
   `ModalEditorParcelas.js`, mas era exatamente o tipo de duplicação que o usuário queria
   eliminar.
2. **`ModalEditorParcelas.js`'s `LinhaParcela` não era `memo`izada**, e vive dentro de uma
   `FlatList` (uma linha por parcela). Mecanismo de máscara idêntico ao resto do app, mas
   digitar em UMA linha disparava `setValores` no componente pai, que re-renderizava **todas**
   as linhas (não só a editada) a cada tecla — diferente de `CampoMonetario` usado em
   `ModalEdicao.js`, que sempre vive isolado (um campo por formulário, sem lista). Sob
   digitação rápida, o `bloqueadoRef` de 50ms do `useCurrencyInput` podia colidir com o
   próximo `onChangeText` se o re-render de N linhas demorasse mais que isso — sintoma
   plausível de "trava"/lentidão ao digitar, mesmo com a máscara sendo a mesma.

**Correção — componente único, exportado, reaproveitado nos três lugares**:
`src/components/CampoMonetario.js` (novo) extrai exatamente o componente que já existia
localmente dentro de `ModalEdicao.js` (mesmo `useCurrencyInput`, mesmo `useEffect` de
resincronização, mesmo `TextInput`/`keyboardType="numeric"`/placeholder), agora `memo`izado e
compartilhado:
- `ModalEdicao.js`: o `CampoMonetario` local virou um adaptador fino (`campo`/`valores`/
  `atualizarCampo` → `valor`/`onChange`) que chama o componente compartilhado — nenhum dos
  ~6 call sites em `CamposModal` precisou mudar.
- `ModalEditorParcelas.js`: `LinhaParcela` agora é `memo`izada e delega a edição ao
  `CampoMonetario` compartilhado; `atualizarParcela` (no componente pai) passou a ser uma
  referência estável (`useCallback`) repassada igual para todas as linhas — sem isso, o
  `memo` não teria efeito (toda linha receberia uma função `onChange` nova a cada render do
  pai). Cada linha passa a receber `indice` como prop e delega para essa mesma função, em vez
  de cada linha criar seu próprio closure.
- `GerenciarModelosModal.js`: `formatarMoeda`/`desformatarMoeda` removidos; o campo "Valor"
  (modo `"valor"`) passou a usar `CampoMonetario`. O campo de porcentagem (modo
  `"porcentagem"`) foi mantido como estava — não é um valor monetário, é um número solto, sem
  relação com esse padrão.

**Fora do escopo, por decisão explícita (risco vs. benefício)**: `ModalCriacao.js` já usa
`useCurrencyInput` diretamente nos seus 5 campos monetários (`valor`, `valorTotal`,
`valorParcela`, `valorInicial`, `meta`) — mecanismo idêntico ao componente compartilhado, só
não está encapsulado num componente. Migrar esses 5 call sites para `CampoMonetario` não
mudaria nenhum comportamento (mesmo hook por baixo) e exigiria tocar num arquivo grande e já
frágil (837 linhas, "god component" documentado na seção 6) só por uniformidade de código —
sem reduzir bug nem duplicação real de comportamento. Não feito agora; candidato a limpeza
futura de baixo risco, não urgente.

## 16. Entidade Cartões / Carteira (✅ implementado em 2026-08-05, Sprint 6)

Quarta entidade própria do sistema, no mesmo desenho de Categorias (Sprint 4) e Membros
(Sprint 2/5): antes desta sprint, "cartão" era só uma string livre digitada em cada compra,
com vencimento/cor resolvidos por três lookups hardcoded independentes (`vencimentoCartaoPorNome`
em `utils/datasPadrao.js`, `colors.byInstitution` lido em 4 lugares com fallbacks diferentes,
e uma heurística de ícone por `.includes()` em `GastoCartaoCard.js`) — não escalava para
usuários com bancos diferentes dos 3 hardcoded (Nubank/Inter/C6).

### 16.1 Escolha de nome da coleção: `carteira`, não `cartoes`

Decisão tomada em conversa com o usuário antes de escrever qualquer código: o nome óbvio
("seguir o mesmo padrão de `categorias`/`membros`" sugeriria `cartoes`) **colide** com
`users/{uid}/cartoes`, que já é a coleção de **lançamentos** (parcelas de compra no cartão,
usada por `useCartoes.js` desde antes desta sprint). Renomear a coleção de lançamentos foi
descartado (exigiria migração só por causa de um nome). A entidade nova vive em
`users/{uid}/carteira` — nome que representa o conceito ("a carteira de cartões do usuário"),
sem colidir com nada existente e sem exigir nenhuma migração.

### 16.2 Modelo de dados: `users/{uid}/carteira/{id}`

```js
{
  nome: string,             // ex.: "Nubank Roxinho" — livre, escolhido pelo usuário
  banco: string | null,     // ex.: "Nubank" — livre, sem lookup hardcoded
  ultimos4Digitos: string | null,  // opcional
  cor: string,              // hex — substitui colors.byInstitution para cartão cadastrado
  diaVencimento: number,    // 1-31 — substitui vencimentoCartaoPorNome
  diaFechamento: number,    // 1-31 — substitui a estimativa "diaVencimento - 7"
  ativo: boolean,           // arquivar em vez de excluir, mesmo padrão de categorias/membros
  criadoEm: timestamp,
  atualizadoEm: timestamp | null,
}
```
Escopo desta sprint, por decisão explícita: nada além disso. `limite`, `bandeira`, `cashback`,
`anuidade`, `programa de pontos` ficam preparados para uma sprint futura — o modelo de dados
(documento plano, por usuário, com `ativo`) não precisa mudar de forma para acomodá-los depois.

### 16.3 `useCarteira.js` — mesmo padrão de `useMembros.js`/`useCategorias.js`

Listener `onSnapshot` (`orderBy('criadoEm','asc')`) + CRUD (`adicionarCartao`,
`atualizarCartao`, `arquivarCartao`/`reativarCartao`, `excluirCartao`), validação de nome
duplicado (case-insensitive, mesmo critério de `useMembros.js`). `excluirCartao` bloqueia a
exclusão se o cartão já foi usado em algum lançamento (`where('cartaoId','==', id)` em
`users/{uid}/cartoes`) — mesma guarda de `excluirCategoria`, para nunca deixar um `cartaoId`
órfão. Arquivar (`ativo: false`) é sempre permitido e reversível.

### 16.4 Convivência nos lançamentos: `cartaoId` + `cartao`, sem migração

Mesmo padrão já usado duas vezes (`categoriaId`+`categoriaNome`, `membroId`+`membroNome`):
cada parcela em `users/{uid}/cartoes` grava `cartaoId` (referência estável, `null` para
cartão informal ou lançamento antigo) e continua gravando `cartao` (nome, string, sempre
preenchido) — nenhuma tela nunca depende só do `cartaoId` para renderizar. Lançamentos
antigos (só `cartao`, sem `cartaoId`) continuam funcionando exatamente como antes; não há
nenhuma migração em massa.

### 16.5 `CartaoSelect.js` — mesmo padrão de `MembroSelect.js`

Substitui o `TextInput` livre em `ModalCriacao.js` (única opção antes desta sprint) e passa a
existir também em `ModalEdicao.js` (**antes desta sprint, não havia nenhum jeito de editar o
cartão de uma compra já lançada** — gap fechado agora). Dentro do seletor só existem duas
coisas, por decisão explícita do usuário: a lista de cartões cadastrados (renderizados com
`CartaoVisual` em tamanho compacto — não é lista textual) e o atalho "Gerenciar cartões". Sem
botão de criação rápida dentro do seletor — quem precisa cadastrar um cartão acessa
"Gerenciar cartões", cadastra, volta e continua o lançamento (mesmo fluxo de
"Gerenciar membros" a partir do `MembroSelect`). Existe também "Outro cartão..." — mesmo
tratamento de "Outra pessoa..." do `MembroSelect` (decisão tomada em conversa com o usuário
antes de implementar: cartão informal continua permitido, não é obrigatório cadastrar).

### 16.6 `CartaoVisual.js` — único componente visual, reaproveitado em 3 lugares

Cartão bancário genérico (inspirado em Apple Wallet/Google Wallet, sem copiar identidade
visual de nenhuma instituição): gradiente a partir da cor cadastrada (`expo-linear-gradient`,
dependência já instalada — não foi preciso adicionar nenhuma nova), nome, banco, últimos 4
dígitos mascarados, dia de vencimento. Dois tamanhos (`normal`/`compacto`), nenhum outro
componente duplica essa renderização — usado em `CartoesManager.js` (Gerenciar Cartões),
`CartaoSelect.js` (lista de seleção) e `CartaoCard.js` (resumo por cartão).

### 16.7 Gestão de cartões: `CartoesManager.js`, mesmo padrão de `CategoriasManager.js`

CRUD completo (listar, criar, editar, arquivar/reativar, excluir com a guarda da seção 16.3),
compartilhado entre `GerenciarCartoesScreen.js` (tela cheia, deixou de ser `PlaceholderMenuScreen`
— rota já existia desde a Sprint 2, só ganhou conteúdo real agora) e `GerenciarCarteiraModal.js`
(bottom sheet, aberto a partir do atalho dentro do `CartaoSelect`) — nenhuma lógica duplicada
entre os dois, ambos só embrulham `CartoesManager`, mesmo padrão de
`CategoriasScreen.js`/`GerenciarCategoriasModal.js`.

### 16.8 Remoção de hardcodes: o que muda de fonte, o que continua como fallback

`useCartoes.js` (`addCartao`) passa a resolver `cor`/`diaVencimento`/`diaFechamento` a partir
do cartão cadastrado (`getDoc` por `cartaoId`) quando o lançamento referencia um; **só cai**
para `vencimentoCartaoPorNome`/`colors.byInstitution` (inalterados, ver `utils/datasPadrao.js`/
`styles/colors.js`) quando o lançamento é informal ("Outro cartão...") ou antigo (sem
`cartaoId`) — mantidos deliberadamente como fallback de compatibilidade, não removidos, para
não quebrar lançamentos que nunca vão referenciar um cartão cadastrado. `updateCartao`
recalcula `corCartao` sempre que o lançamento referencia um `cartaoId` (a cada edição, não só
quando o cartão muda) — se o usuário alterar a cor do cartão em "Gerenciar Cartões", os
lançamentos antigos desse cartão se atualizam sozinhos na próxima vez que forem editados.
`GastoCartaoCard.js` perdeu a heurística de ícone por nome (`getCartaoIcon`, `.includes()`) —
usa sempre o mesmo ícone genérico agora, já que a identidade visual do cartão vem do cadastro
(cor), não de adivinhar o banco pelo texto digitado.

**Dia de fechamento real**: `addCartao` usa `diaFechamento` do cartão cadastrado (quando
existir) para decidir em qual mês cai a primeira parcela de uma compra nova — substitui a
estimativa "diaVencimento - 7" já catalogada como dívida técnica de baixa severidade em
`PROJECT_STATUS.md`. Essa estimativa continua sendo usada só para cartão informal/lançamento
antigo, sem cartão cadastrado.

### 16.9 Resumo por cartão (`CartoesScreen.js`, aba "Por Cartão") — de filtro a resumo de verdade

Antes desta sprint, "Por Cartão" só agrupava as compras do mês por nome de texto e mostrava um
total + lista simples (`CartaoCard.js` antigo). Passou a agrupar por `cartaoId` (nome só para
informal/legado) e, ao abrir um cartão, buscar **todo o histórico daquele cartão** (todos os
meses — `useCartoes.buscarParcelasDoCartao`, nova função, `where('cartaoId', ...)` sem filtro
de mês/ano) — indicadores como "parcelas futuras"/"próximo vencimento" não têm como ser
calculados só com os dados do mês em exibição, que é tudo que o listener escopado por mês/ano
do `useCartoes.js` sempre teve. O resumo mostra o `CartaoVisual` no topo, os indicadores
(saldo utilizado, total de compras, quantidade, parcelas futuras/pagas/pendentes, maior
compra, próximo vencimento) e a lista de compras enriquecida (descrição, valor total, parcela
atual, comprador, categoria, status) — nenhuma informação que já existia foi removida, só
organizada e ampliada. Tocar numa compra continua abrindo os detalhes normalmente
(`onPressItem`, mesmo callback que a tela já repassava antes).

### 16.10 Fora do escopo desta sprint, por decisão explícita

`limite`, `bandeira`, `cashback`, `anuidade`, `programa de pontos` — preparados para o modelo
de dados (seção 16.2), não implementados. Nenhuma migração retroativa de lançamentos antigos
para vincular a um cartão cadastrado (o usuário precisa selecionar o cartão certo manualmente
da próxima vez que editar um lançamento antigo, se quiser vinculá-lo).

### 16.11 Ajustes pós-teste (2026-08-06)

Achados do usuário testando a Sprint 6:

- **Paleta de cores ampliada**: `CORES_DISPONIVEIS` em `FormularioCartaoModal.js` passou de
  11 cores decorativas (compartilhadas com `FormularioCategoriaModal.js`) para uma paleta
  própria de 15 cores reais de cartão (preto, grafite, prata, dourado, rosé gold etc.) — cor
  de cartão é um domínio diferente de cor de categoria, não faz sentido as duas usarem a
  mesma paleta. Todas escolhidas escuras o bastante para o texto branco do `CartaoVisual`
  continuar legível por cima.
- **Resumo do mês de volta ao desenho do cartão**: `CartaoVisual.js` ganhou a prop opcional
  `resumoMes` (ex.: "3 compras este mês"), renderizada só no tamanho `normal`. Achado do
  usuário: o modal antigo (pré-Sprint 6) mostrava "X transações neste mês" na face do cartão
  antes de abrir o resumo — a reescrita da seção 16.9 tinha perdido essa informação ao mover
  tudo para dentro do modal. `CartaoCard.js` calcula a partir de `gastos` (mês atual, já
  disponível sem busca extra) e passa só para a `CartaoVisual` de fora do modal — a de dentro
  não recebe, para não confundir "este mês" com os indicadores de histórico completo.
- **Lista do resumo agrupada por compra, não por parcela**: `CartaoCard.js` mostrava uma
  linha por PARCELA (uma compra de 10x aparecia 10 vezes, uma por parcela) — o pedido original
  (seção 16.9) era mostrar as *compras*. Corrigido: agrupa por `idCompra`, escolhendo como
  "parcela atual" a primeira ainda pendente (ou a última, se a compra já estiver quitada —
  mesmo critério de "compra quitada" de `ModalHistoricoParcelas.js`) como representante da
  linha. O selo de status passa a mostrar "Quitada" quando não sobra nenhuma parcela pendente.
- **Seletor de cartão com miniatura no formato de cartão**: `CartaoSelect.js` trocou a bolinha
  colorida (mesmo padrão do círculo de cor em outros seletores) por um pequeno retângulo
  arredondado na cor do cartão, proporção parecida com um cartão de verdade — mais imersivo,
  sem introduzir um segundo componente visual (é só um `View` inline, não usa `CartaoVisual`
  em tamanho reduzido, que ficaria grande demais dentro do campo fechado do seletor).
- **Cascata de cartão entre parcelas da mesma compra** (achado real de inconsistência): editar
  o cartão de UMA parcela só atualizava aquele documento — as demais parcelas da mesma compra
  continuavam com o cartão antigo. Corrigido: `updateCartao` (em `useCartoes.js`) agora
  propaga `cartaoId`/`cartao`/`corCartao` para todas as parcelas do mesmo `idCompra`
  (`propagarCartaoParaGrupo`, mesmo padrão de batch já usado para `valorTotal`) sempre que o
  `CartaoSelect` é tocado numa edição — independente de a parcela estar bloqueada por já ter
  sido paga (cartão é metadado da compra, só o `valor` de uma parcela paga é imutável, ver
  seção 15.9). **Categoria e comprador têm exatamente o mesmo problema hoje** (editar numa
  parcela não propaga para as demais) — decisão e implementação registradas na seção 16.12.

### 16.12 Regra de negócio: campos da compra vs. campos da parcela (2026-08-06)

Generalização do achado da seção 16.11 (cascata de cartão). O usuário formalizou como regra de
negócio: toda compra parcelada — cartão ou empréstimo — tem campos que descrevem a COMPRA
inteira (devem ser sempre iguais em todas as parcelas do mesmo `idCompra`) e campos que
descrevem a PARCELA (legitimamente diferentes entre parcelas).

- **Campos da compra, cartão** (`CAMPOS_DA_COMPRA_CARTAO` em `useCartoes.js`): `descricao`,
  `pessoa`/`membroId`/`membroNome` (comprador), `categoria`/`categoriaId`/`categoriaNome`,
  `cartaoId`/`cartao`/`corCartao`, `dataCompra`. `valorTotal` continua fora dessa lista — não é
  um campo digitado pelo usuário, é derivado (soma das parcelas) e já tem seu próprio mecanismo
  (`recalcularValorTotalCompra`/`salvarParcelasPersonalizadas`).
- **Campos da compra, empréstimo** (`CAMPOS_DA_COMPRA_EMPRESTIMO` em `useEmprestimos.js`):
  `descricao`, `credor`, `categoria`/`categoriaId`/`categoriaNome`. `valorContratado` e
  `economiaTotal` seguem fora pelo mesmo motivo (derivados, com mecanismo próprio já existente).
- **Campos da parcela** (nas duas entidades): `valor`, `pago`, `adiantada`, `dataPagamento`,
  `dataVencimento`, `mes`/`ano`, `valorOriginal`/`descontoAplicado` (antecipação),
  `parcelaAtual`.
- **Mecanismo único** (`src/utils/propagacaoCompra.js`): antes desta mudança, cada campo de
  compra que precisasse de propagação exigiria sua própria função dedicada (era o caso de
  `propagarCartaoParaGrupo`, específica de cartão/cor). Isso foi generalizado em duas funções
  puras reaproveitadas pelos dois hooks:
  - `extrairCamposDaCompra(dadosAtualizados, camposDaCompra)` — tira do objeto que seria
    gravado só na parcela atual os campos presentes na lista de campos da compra.
  - `propagarCamposDaCompra(colecaoPath, idCompra, campos)` — grava esses campos, num único
    `writeBatch`, em todas as parcelas com o mesmo `idCompra`.
  Incluir um novo campo de compra no futuro é só adicionar o nome na lista
  `CAMPOS_DA_COMPRA_CARTAO`/`CAMPOS_DA_COMPRA_EMPRESTIMO` do hook correspondente — nenhuma
  lógica nova precisa ser escrita. `propagarCartaoParaGrupo` (seção 16.11) foi removida, seu
  comportamento agora é um caso do mecanismo genérico.
- **Achado corrigido de passagem**: `useEmprestimos.js` não tinha a trava de `valor` imutável
  para parcela paga/antecipada que `useCartoes.js` já tinha desde a seção 15.9 — as duas
  entidades ficam consistentes agora (`parcelaBloqueada` em `updateEmprestimo`).
- **Auditoria feita antes de implementar** (pedido explícito do usuário): busca por todo
  escritor direto de `${basePath}/cartoes` e `${basePath}/emprestimos` no projeto — os únicos
  são os dois hooks acima; `useCarteira.js` só faz uma leitura (`getDocs`) nessas coleções para
  validar exclusão de um cartão cadastrado, não escreve nelas. Nenhum outro ponto do código
  atualiza um campo de compra isoladamente numa única parcela.
- **`useGastos.js`/`useEntradas.js` não têm `idCompra`** — não existe conceito de "mesma
  compra, várias parcelas" nesses dois hooks hoje, então essa regra não se aplica a eles.

## 17. Exclusão parcelada e mecanismo único de confirmação (2026-08-06)

Antes desta mudança, "excluir" era 4+ implementações independentes e inconsistentes: só
`SaidasScreen.js` (aba Empréstimos) perguntava "só esta parcela ou tudo"; cartão nunca
oferecia essa escolha e nunca recalculava `valorTotal` das parcelas restantes; e o botão
"Excluir" dentro de `ModalEdicao.js` (usado pela Agenda Financeira/Calendário e Central de
Avisos) excluía **sem nenhuma confirmação**, para qualquer tipo de lançamento. As telas
`GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js` também tinham seu próprio
`handleExcluir` duplicado — inerte porque só eram exercitadas com `isEmbedded=true`
dentro de `SaidasScreen.js` (não existe rota própria para elas). *Atualização: essa
duplicação (e o próprio flag `isEmbedded`) foi eliminada na Sprint de Saneamento — ver
seção 19.*

### 17.1 `reestruturarParcelamento` — único ponto que altera a estrutura de um parcelamento

`src/utils/reestruturarParcelamento.js` exporta `reestruturarParcelamento(colecaoPath,
idCompra, { idsParaRemover, novosValores })`: um único `writeBatch` que remove os documentos
indicados, renumera as parcelas restantes (`parcelaAtual` 1..N) e atualiza `totalParcelas`, e
aplica `novosValores[docId]` só nas parcelas não bloqueadas. **Nunca mexe no estado
financeiro de uma parcela** (`pago`, `adiantada`, `dataPagamento`, `valorOriginal`,
`descontoAplicado` etc.) — renumeração e exclusão são uma preocupação puramente estrutural,
separada do histórico financeiro de cada parcela.

Reaproveitada por três fluxos, nenhum duplica a lógica de renumeração:
- Exclusão de uma parcela (`excluirParcela`/`excluirParcelaComValoresPersonalizados` em
  `useCartoes.js`/`useEmprestimos.js`).
- `salvarParcelasPersonalizadas` (editor de parcelas, seção 15) — refatorada para chamar
  `reestruturarParcelamento` com `idsParaRemover: []` (só redefine valores, não remove nada).

### 17.2 Regra de negócio: o que fazer com o valor da parcela excluída

Ao excluir só uma parcela de um grupo com mais de uma (`totalParcelas > 1`), o valor daquela
parcela pode: **(a)** simplesmente sair do total (`modo: 'reduzir'`, nenhuma outra parcela
muda), ou **(b)** ser redistribuído entre as parcelas restantes ainda não bloqueadas — igualmente
(`modo: 'igual'`) ou manualmente (reaproveitando o `ModalEditorParcelas` já existente, seção
15). **A redistribuição sempre reparte só o valor da PARCELA EXCLUÍDA, nunca o valor total da
compra** — o incremento por parcela vem de `dividirValorIgualmente(valorDaParcelaExcluida,
quantidadeDeParcelasElegíveis)`, somado ao valor que cada parcela restante já tinha. Se
nenhuma parcela restante for elegível (todas já pagas/antecipadas), a opção "Redistribuir"
simplesmente não é oferecida.

O fluxo de "Redistribuir manualmente" abre o `ModalEditorParcelas` **antes** de qualquer
gravação: os valores iniciais mostrados já simulam o estado pós-exclusão (N-1 parcelas, cada
uma com seu valor atual + a fração do valor excluído). Cancelar o editor não grava nada — a
exclusão do documento, a renumeração e a gravação dos novos valores só acontecem juntas,
num único `reestruturarParcelamento`, quando o usuário confirma o editor. Isso mantém a
operação atômica e o `ModalEditorParcelas` **100% desacoplado de persistência**, como já era
antes (ele só recebe valores iniciais e devolve o array final em `aoConfirmar` — nunca soube o
que o chamador faz com isso).

### 17.3 `useExclusaoParcelada.js` — mecanismo único de confirmação

Novo hook, mesmo padrão de `useAdiantamento.js` (guarda só o estado dos modais; quem chama
renderiza `<AlertaModal>`/`<ModalEditorParcelas>` com esse estado — nenhuma JSX é retornada
pelo hook). Cada chamador só descreve as funções de exclusão do hook de dados
correspondente (`excluirParcela`, `excluirGrupoInteiro`, `excluirComValoresPersonalizados`,
`buscarParcelasDoGrupo`); o hook decide a árvore de perguntas:

- Gasto/entrada, ou cartão/empréstimo com 1 parcela só: 1 alerta — Cancelar/Excluir.
- Cartão/empréstimo com mais de 1 parcela: (1) Cancelar/Somente esta parcela/Excluir tudo →
  (2, se "somente esta") Cancelar/Remover do total/Redistribuir → (3, se "Redistribuir")
  Cancelar/Igualmente/Manualmente.

Usado por **todos** os pontos de exclusão do app, eliminando a duplicação: `SaidasScreen.js`,
`GastosScreen.js`, `EmprestimosScreen.js`, `CartoesScreen.js` e, via `useEventosFinanceiros.js`
(`confirmarExcluir`, que substituiu o antigo `excluir` sem confirmação), o botão "Excluir" de
`ModalEdicao.js` alcançado pela Agenda Financeira (Calendário e Linha do Tempo) e pela Central
de Avisos. Gasto e entrada, que antes excluíam sem perguntar nada nesses últimos caminhos,
agora também pedem confirmação simples.

### 17.4 Novas funções expostas pelos hooks

- `useCartoes.js`/`useEmprestimos.js`: `excluirParcela(id, {idCompra, modo})`,
  `excluirParcelaComValoresPersonalizados(id, idCompra, novosValoresPorId)`,
  `excluirGrupoInteiro(idCompra)` substituem `deleteCartao`/`deleteEmprestimo`.
  `useEmprestimos.js` ganhou `buscarParcelasDaCompra` (já existia em `useCartoes.js`).
- Cartão sempre roda `recalcularValorTotalCompra` depois de excluir/redistribuir (mesma
  função da seção 15.12); empréstimo não precisa — não tem `valorTotal` agregado.

### 17.5 Achados

- `useEmprestimos.js` não tinha (e continua sem, por decisão explícita: fora do escopo desta
  mudança) o `valorTotal` agregado que `useCartoes.js` tem — `valorContratado` é o valor
  original da contratação, nunca recalculado.
- `GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js` como telas standalone continuam
  sem rota própria — não é um problema novo desta mudança, mas agora que usam o mesmo
  mecanismo de exclusão de `SaidasScreen.js`, deixou de ser uma armadilha latente: qualquer
  caminho de exclusão do app se comporta da mesma forma. *Atualização: a Sprint de Saneamento
  (seção 19) resolveu isso de vez — essas três telas deixaram de ter capacidade standalone,
  viraram apresentação pura, e `SaidasTabs.js` (o navegador que reativaria essa capacidade) foi
  removido.*

## 18. Linha do Tempo (Histórico de Eventos) (✅ implementada em 2026-08-06 para Cartões e Empréstimos)

> **Status: implementada para Cartões e Empréstimos, conforme a ordem sugerida na seção 18.6.**
> Gastos, Entradas e Investimentos ainda não emitem eventos — ver `PROJECT_STATUS.md` seção 16
> para o registro do que falta.

### 18.0 Motivação e análise do que já existe

Pedido do usuário: um registro de eventos relevantes (compra criada, parcela paga, categoria
alterada etc.) reutilizável entre Gastos, Entradas, Cartões, Empréstimos e Investimentos —
explicitamente **não** uma auditoria completa (sem snapshots inteiros de documentos).

Antes de desenhar, mapeou-se o projeto inteiro em busca de estrutura reaproveitável.
Conclusão: **não existe hoje nenhum log de eventos ou trilha de auditoria**. Dois primos que
parecem mas não são a mesma coisa:
- `ModalHistoricoParcelas.js` — visão **derivada do estado atual** (consulta ao vivo as
  parcelas por `idCompra`, calcula pago/antecipada/personalizado na hora); não guarda nada do
  que já aconteceu no passado.
- `useEventosFinanceiros.js`/`utils/eventosFinanceiros.js` — projeção **para frente**
  (agenda/calendário), não histórico.

Achado estrutural relevante: não existe um funil único de escrita no projeto — cada hook
(`useGastos`, `useEntradas`, `useCartoes`, `useEmprestimos`, `useInvestimentos`) chama
`addDoc`/`updateDoc`/`deleteDoc` diretamente. Isso significa que gerar eventos não pode ser
plugado num só lugar central; vai exigir uma chamada a mais em cada função de mutação
relevante dos 5 hooks (~15 pontos). A duplicação evitada por esta arquitetura é a *mecânica*
de gravar o evento (schema, formato, escrita), não o "lembrar de chamar" em cada função — isso
é inerente à ausência de um funil de escrita, e corrigir isso seria um refactor bem maior,
fora do escopo desta proposta.

### 18.1 Modelo de dados

Coleção única e plana, mesmo padrão de convivência de `categorias`/`membros`/`carteira`:
`users/{uid}/linhaDoTempo/{eventoId}`.

```
{
  versao: 1,                    // schema do evento — evolução futura sem migrar eventos antigos
  acao: 'criado' | 'editado' | 'excluido' | 'pago' | 'antecipado' | 'revertido'
      | 'redistribuido' | 'valores_personalizados',
  entidade: 'gasto' | 'entrada' | 'cartao' | 'emprestimo' | 'investimento',
  entidadeId: string,
  idCompra: string | null,      // presente em cartão/empréstimo; null em gasto/entrada/investimento avulso
  alteracoes: {                 // só quando acao === 'editado'; um evento cobre N campos de uma vez
    categoria: { antes: 'Alimentação', depois: 'Transporte' },
    cartao:    { antes: 'Nubank',      depois: 'Inter' },
  } | null,
  origem: {
    agente: 'usuario' | 'sistema',
    canal: 'modal_edicao' | 'modal_criacao' | 'exclusao' | 'geracao_automatica' | 'recorrencia' | string,
  },
  usuarioId: string,
  criadoEm: serverTimestamp(),
}
```

Decisões de modelagem e o porquê de cada uma:

- **`acao` separado de `entidade`** (não um `tipo` misturando os dois) — conjunto pequeno e
  fechado de verbos genéricos, válido para qualquer entidade (nem toda entidade usa todos:
  `antecipado` não se aplica a gasto/entrada). Isso evita ter que inventar um novo valor de
  enum cada vez que surgir uma ação nova no futuro — o eixo que cresce é `entidade` (já
  fechado hoje) ou, dentro de `acao: 'editado'`, a lista de campos relevantes (ver 18.2), nunca
  o próprio conjunto de ações.
- **`pago`/`antecipado`/`revertido`/`redistribuido`/`valores_personalizados` como ações
  próprias**, em vez de todas caírem em `editado` — são ações que o usuário reconhece como
  coisas distintas ("antecipei uma parcela" ≠ "editei um campo"), mesmo sendo, por baixo, um
  `updateDoc` como qualquer outro. `revertido` cobre o fluxo já existente de "Reverter
  antecipação?" (`global.alertaGlobal` em `useCartoes.js`/`useEmprestimos.js`).
- **`alteracoes` como objeto por campo, não lista de `{campo, antes, depois}`** — decisão
  tomada por consultabilidade no Firestore, não por facilidade de implementação: um campo mapa
  permite `where('alteracoes.cartao', '!=', null)` direto, com índice; uma lista não é
  consultável por campo sem trazer tudo e filtrar no cliente (Firestore não indexa "existe um
  elemento do array com `campo === X`"). Também garante, pela própria estrutura, que um campo
  não apareça duplicado no mesmo evento.
- **Sem `descricao` pronta gravada no evento** — só dados estruturados com valores já
  legíveis (nomes, não IDs — mesmo princípio de denormalização usado em todo o projeto:
  `categoriaNome`, `membroNome`, `cartao`). A frase exibida na UI é montada por uma função de
  renderização única, a partir de `acao` + `entidade` + `alteracoes`, no momento de exibir —
  trocar o texto, traduzir, ou mudar o estilo no futuro é mudar essa função, não os dados já
  gravados. Como os *valores* guardados em `alteracoes` já são o nome legível no momento do
  evento (não uma referência), o evento continua legível mesmo que a categoria/cartão original
  tenha sido renomeado ou excluído depois.
- **`origem` como objeto (`agente`+`canal`), não uma string única** — permite filtrar só por
  `agente` sem se importar com o `canal` (`where('origem.agente','==','sistema')`); com uma
  string concatenada isso exigiria truque de prefixo, que o Firestore não faz bem. `agente` é
  fechado (`usuario`/`sistema`); `canal` é deliberadamente mais solto (não um enum rígido),
  porque novas telas vão continuar aparecendo.
- **Sem campo de referências cruzadas (`referencias`/`loteId`) por enquanto** — cenários reais
  existem (a reversão de uma antecipação referenciar o evento de antecipação original; um
  futuro lote de importação agrupar N eventos), mas nenhum tem consumidor hoje. Como o schema
  já tem `versao`, esse campo pode ser adicionado depois sem migrar nem quebrar eventos
  antigos — não vale a pena incluir algo especulativo agora.

### 18.2 Gravação sem duplicação — configuração central, não constantes espalhadas

Um utilitário novo, mesmo estilo de `propagacaoCompra.js`/`reestruturarParcelamento.js`
(arquivo pequeno, uma responsabilidade, chamado pelos hooks): `src/utils/registrarEvento.js`,
exportando uma função só (`addDoc` + `removerIndefinidos` na coleção `linhaDoTempo`).

Os "campos relevantes" por entidade — a lista curada que decide o que vira evento de
`acao: 'editado'` (para não transformar a Linha do Tempo numa auditoria técnica: timestamps,
IDs internos, `totalParcelas`, propagações automáticas nunca geram evento) — ficam
centralizados num único arquivo de configuração, não espalhados pelos hooks:

```js
// src/utils/linhaDoTempoConfig.js
export const CAMPOS_RELEVANTES = {
  gasto: ['descricao', 'categoria', 'valor'],
  entrada: ['descricao', 'categoria', 'membro', 'valor'],
  cartao: ['descricao', 'categoria', 'cartao', 'pessoa'],
  emprestimo: ['descricao', 'categoria', 'credor'],
  investimento: [...],
};
```

Uma função pura, `detectarAlteracoes(entidade, atual, novosDados)`, compara só esses campos e
devolve o `alteracoes` já pronto. Cada função de mutação nos hooks chama essa função +
`registrarEvento` numa linha a mais, no ponto em que já sabe o que mudou (todo `update*` já lê
o documento atual antes de escrever — o mesmo `atual` serve para a comparação). Incluir um
campo novo no futuro é editar essa lista central, igual já foi feito com
`CAMPOS_DA_COMPRA_CARTAO`/`CAMPOS_DA_COMPRA_EMPRESTIMO` (seção 16.12).

**Regra de ouro, para não estourar volume de escrita**: um evento por ação do usuário, nunca
um por documento alterado internamente. Uma propagação automática de campo de compra
(`propagarCamposDaCompra`) ou um recálculo de total não geram evento — só a ação que os
disparou (uma edição do usuário) gera um evento `editado` cobrindo todos os campos que
mudaram naquela ação, mesmo que por baixo dos panos vários documentos tenham sido tocados.

### 18.3 Exibição — mesma infraestrutura para visão contextual e futura visão global

A consulta muda só o filtro, o mecanismo é o mesmo:
- **Contextual** (nova aba "Linha do Tempo" dentro de `ModalHistoricoParcelas.js`, ao lado da
  aba "Parcelas" já existente, que continua mostrando o estado atual sem nenhuma mudança):
  `idCompra` presente → filtra por ele; gasto/entrada/investimento avulso (sem `idCompra`) →
  filtra por `entidadeId`.
- **Futura tela global de atividade do app**: mesma coleção, filtro por `usuarioId` +
  paginação (`limit`/`startAfter`, coleção cresce indefinidamente ao longo da vida da conta).

Um único componente de apresentação (lista cronológica, mesma linguagem visual de
`LinhaDoTempoFinanceira.js` — ícone + descrição por linha, agrupado por data) recebe os
eventos já buscados e só renderiza; quem decide o filtro é sempre quem chama, nunca o
componente. Evita dois mecanismos de UI diferentes quando a visão global existir.

### 18.4 Performance

- Sem `onSnapshot` — histórico é append-only e consultado sob demanda (abrir um modal/tela),
  então `getDocs` simples basta; nenhum listener permanente rodando, ao contrário dos hooks de
  dinheiro que precisam de tempo real.
- Índices em `(idCompra, criadoEm)`, `(entidadeId, criadoEm)` e `(usuarioId, criadoEm)`
  mantêm as três consultas (por compra / por item avulso / geral) baratas mesmo com a coleção
  grande.
- Paginação obrigatória na visão global (não na contextual, que é sempre um conjunto pequeno).

### 18.5 Preparado para auditoria completa no futuro

`alteracoes` já é o embrião de um diff completo — no futuro, dá para engordar cada entrada com
mais metadado (ex.: `motivo`) sem quebrar eventos antigos, graças ao `versao`. `usuarioId` em
todo evento antecipa o Modo Família (multi-usuário). Se um dia for necessária uma trilha de
auditoria separada e mais pesada (snapshots completos), os mesmos pontos de chamada podem
adicionar uma segunda chamada (`registrarAuditoria`) sem misturar com `linhaDoTempo` — os dois
propósitos continuam desacoplados desde o início.

### 18.6 Ordem de implementação — Cartões e Empréstimos (2026-08-06)

Implementado conforme a ordem sugerida: Cartões e Empréstimos primeiro. Gastos, Entradas e
Investimentos ficam para uma próxima rodada, seguindo o mesmo padrão (ver seção 18.8).

### 18.7 Decisões tomadas durante a implementação

- **`orderBy` do Firestore evitado por propósito** (`useLinhaDoTempo.js`): uma consulta com
  igualdade num campo (`idCompra`) e ordenação por outro (`criadoEm`) exige um índice composto
  configurado manualmente no console do Firebase — e o app tem 4 projetos Firebase
  independentes (meu-app/rafael/marina/christian). Para não depender de infraestrutura fora do
  código (que eu não tenho como criar em nome do usuário), a ordenação é feita no cliente após
  a busca — mesmo critério já usado em `buscarParcelasDaCompra`. Sem custo de desempenho real:
  poucos eventos por compra.
- **Mapeamento `modo` de exclusão → `acao`** (`excluirParcela`/`excluirParcelaComValoresPersonalizados`
  em `useCartoes.js`/`useEmprestimos.js`): `modo: 'reduzir'` (ou nenhum grupo) → `acao: 'excluido'`;
  `modo: 'igual'` ou exclusão com valores manuais → `acao: 'redistribuido'` (as duas variantes de
  "excluir com redistribuição" da seção 17 caem na mesma ação — o que importa pro usuário é que
  o valor foi redistribuído, não qual dos dois métodos escolheu).
- **`pago` como ação própria, não `editado`**: em `updateCartao`/`updateEmprestimo`, uma
  transição de `pago` para `true` sempre emite `acao: 'pago'` (com `alteracoes` de outros
  campos que tenham mudado na mesma chamada, se houver); desmarcar como pago não gera evento.
  `toggleCartaoStatus` (`useCartoes.js`) é um caminho de mutação **separado** de `updateCartao`
  (usado pelo toggle direto em `CartoesScreen.js` — aba "Gastos do mês") e precisou do próprio
  `registrarEvento`, mesma regra do "só marcar como pago gera evento".
- **`alteracoesCampos` sempre calculado antes de qualquer mutação do objeto de entrada** — a
  propagação de campos da compra (seção 16.12) remove chaves de `dadosAtualizados`/`dados`
  depois de as propagar; `detectarAlteracoes` precisa rodar antes disso, contra o objeto
  original recebido.
- **Aba "Linha do Tempo" dentro de `ModalHistoricoParcelas.js`**: reaproveita `ModernTabs.js`
  (mesmo componente de abas de `CartoesScreen.js`/`SaidasScreen.js`), busca os eventos num
  `useEffect` próprio (independente da aba ativa, para não recarregar ao alternar), e
  renderiza via `LinhaDoTempoEventos.js` (componente único de apresentação, ver seção 18.3).

### 18.8 Arquivos

`src/utils/linhaDoTempoConfig.js` (`CAMPOS_RELEVANTES`, `detectarAlteracoes`),
`src/utils/registrarEvento.js`, `src/utils/linhaDoTempoRender.js` (frase e ícone por evento),
`src/hooks/useLinhaDoTempo.js` (`buscarEventosDaCompra`), `src/components/LinhaDoTempoEventos.js`
(apresentação), `src/components/ModalHistoricoParcelas.js` (aba nova), `src/hooks/useCartoes.js`
e `src/hooks/useEmprestimos.js` (todas as funções de mutação passam a chamar `registrarEvento`).

**Pendente para uma próxima rodada**: Gastos, Entradas e Investimentos ainda não emitem
eventos nem têm `CAMPOS_RELEVANTES` próprios; quando entrarem, também precisam de
`buscarEventosDoItem(entidadeId)` em `useLinhaDoTempo.js` (hoje só existe
`buscarEventosDaCompra`, para entidades com `idCompra`).

## 19. Sprint de Saneamento Arquitetural (✅ implementada em 2026-08-06)

Escopo controlado, definido junto com o usuário depois de uma auditoria de navegação e
composição de telas: resolver a duplicação de hooks/listeners entre `SaidasScreen.js` e as
telas que ela embute (P1), eliminar o código morto/callbacks inalcançáveis resultantes (P3), e
remover arquivos órfãos confirmados — **sem** redesenhar navegação, sem reescrever
`TelaPadrao.js`, sem mudanças puramente estéticas.

### Princípio arquitetural desta sprint — por que "um dono, vários apresentadores"

A correção não foi só apagar chamadas de hook duplicadas — é a adoção de uma regra que deveria
valer para qualquer tela composta por outras no futuro (Modo Família, Modo Empresa, Web):

> **Quando uma tela renderiza outra como parte da sua própria interface (composição, não
> navegação), só a tela de fora busca dados no Firestore. As telas de dentro recebem tudo por
> prop — dados já buscados e funções já prontas — e nunca chamam `useX(...)` por conta
> própria.**

Por quê:

- **Um hook com `onSnapshot` é uma assinatura, não uma leitura pontual.** Cada componente que
  chama `useGastos`/`useEmprestimos`/`useCartoes` por conta própria abre seu **próprio**
  listener contra o Firestore — se dois componentes fazem isso para os mesmos dados (um pai e
  um filho que ele renderiza), o custo dobra sem nenhum ganho: os dois listeners trazem
  exatamente a mesma coisa. Isso não aparece revisando um componente isolado — só aparece
  quando alguém pergunta "quem mais, na árvore que está montada agora, já busca isso?".
- **Duplicar o dono dos dados sempre acaba duplicando também a ação.** Foi exatamente o que
  aconteceu aqui: como cada tela filha tinha sua própria instância de `useCartoes`/
  `useEmprestimos`, cada uma também acabou ganhando sua própria cópia de `useAdiantamento`, de
  `ModalHistoricoParcelas`, de `ModalParcelasAdiantamento` — não porque alguém decidiu
  duplicar de propósito, mas porque, uma vez que o componente já "tem" os dados, é natural
  também escrever a ação ali do lado. A causa raiz nunca foi "esqueceram de desligar um
  modal" — foi "o dado já estava duplicado, então a ação em cima dele também ficou".
- **Um dono só facilita responder "quem manda aqui?"** Quando existe exatamente um lugar que
  busca os dados e decide as ações (editar, excluir, antecipar), qualquer comportamento novo
  (ex.: uma regra de negócio que dependa do estado de mais de uma aba ao mesmo tempo) tem um
  único lugar óbvio para entrar. Com dono espalhado, cada tela filha só enxerga o próprio
  pedaço — e regras que precisem enxergar o todo (como o resumo/estatísticas que
  `SaidasScreen.js` já calcula) exigiriam reimplementar a mesma lógica em cada filho.

**Como reconhecer, no futuro, que essa regra está sendo violada**: se um componente que só
existe para ser renderizado dentro de outro (não tem rota própria, não aparece em nenhum
navegador) chama `useGastos`/`useEntradas`/`useCartoes`/`useEmprestimos`/`useInvestimentos`
diretamente — ou qualquer hook que por baixo dos panos chame um desses (como
`useAdiantamento` fazia) —, é sinal de que o dado está duplicado. A pergunta de revisão a se
fazer sempre que um componente novo for criado para viver dentro de outro: *"quem já busca
esse dado na árvore que vai renderizar este componente? Ele devia vir por prop, não por um
hook novo aqui dentro."*

### 19.0 Achado feito ao planejar, antes de qualquer código

A auditoria original mapeou a duplicação em `SaidasScreen.js`/`GastosScreen.js`/
`EmprestimosScreen.js`/`CartoesScreen.js`. Ao detalhar o plano de implementação, apareceu uma
duplicação mais profunda que a auditoria não tinha capturado: `CartaoCard.js` (renderizado uma
vez por cartão cadastrado na aba "Por Cartão") chamava `useCartoes()` e
`useAdiantamento('cartoes')` por conta própria — e `useAdiantamento.js` **sempre** instanciava
`useCartoes`+`useEmprestimos` internamente, não importa o `collectionName` passado. Ou seja, a
causa raiz da duplicação não estava só nos 3 componentes embutidos, estava dentro do próprio
`useAdiantamento.js` — corrigir só os componentes, sem tocar no hook, teria deixado a
duplicação mais séria (múltiplos listeners por cartão cadastrado) intacta.

### 19.0.1 Medição do ganho (antes vs. depois)

Não foi uma medição em runtime (nenhum profiler, nenhuma contagem instrumentada) — é uma
contagem estática, rastreando exatamente qual componente fica montado em cada aba (o
`ModernTabs` só renderiza o filho da aba ativa — `GastosScreen`/`EmprestimosScreen`/
`CartoesScreen` nunca coexistem) e quantas vezes cada hook é chamado dentro dessa árvore.
Confiável porque hooks em React são determinísticos por render, mas vale registrar que é
análise de código contra o commit anterior à sprint (`b456b11`), não medição empírica.
Contagem só de instâncias com **listener ativo do Firestore** — a chamada `useCartoes()` sem
argumentos dentro de `CartaoCard.js` não conta, porque sem mês/ano o próprio hook nunca chega
a assinar (guarda já existente em `useCartoes.js`).

| Cenário (aba ativa em `SaidasScreen`) | `useGastos` antes | `useEmprestimos` antes | `useCartoes` antes | Depois |
|---|---|---|---|---|
| Gastos | 2 | 2 | 2 | 1 / 1 / 1 |
| Empréstimos | 1 | 4 | 3 | 1 / 1 / 1 |
| Cartões → "Gastos do mês" | 1 | 3 | 4 | 1 / 1 / 1 |
| Cartões → "Por Cartão" (N cartões cadastrados) | 1 | 3+N | 4+N | 1 / 1 / 1 |

O pior caso era "Por Cartão": cada cartão cadastrado adicionava mais um par de listeners
(`useCartoes`+`useEmprestimos`) via a própria instância de `useAdiantamento` dentro de
`CartaoCard.js` — o custo crescia com o cadastro do usuário, não era um número fixo. Depois da
sprint, é sempre exatamente 1 instância de cada hook, em qualquer aba/sub-aba, independente de
quantos cartões o usuário tiver cadastrado.

### 19.1 `useAdiantamento.js` — a correção na raiz

Assinatura mudou de `useAdiantamento(collectionName, anteciparParcelasEmprestimoExternas)`
para `useAdiantamento(collectionName, { anteciparParcelasCartao, anteciparParcelasEmprestimo })`
— as duas funções de antecipação passam a ser recebidas prontas, em vez de o hook buscá-las
chamando `useCartoes`/`useEmprestimos` por dentro. A busca de "parcelas futuras"
(`iniciarAdiantamento`) continua igual — é uma leitura avulsa (`getDocs`), nunca foi parte do
problema.

### 19.2 `SaidasScreen.js` — único dono de dados e ações

Passou a extrair de `useCartoes(...)`/`useEmprestimos(...)` (já chamados ali, só não eram
totalmente aproveitados) também `anteciparParcelas`, `buscarParcelasDoCartao`,
`toggleCartaoStatus` e `anteciparParcelasEmprestimo`, e a passar as duas primeiras funções de
antecipação para o novo formato de `useAdiantamento`.

`handleAbrirHistorico(item)` foi extraída do código que antes vivia inline dentro do
`onHistoryPress` do `ModalDetalhes` — agora é reaproveitada tanto por ele quanto pelo ícone de
histórico direto na linha de `EmprestimosScreen` (que antes abria uma cópia própria e
independente do modal).

**Achado só percebido ao reler o código com atenção**: `SaidasScreen.js` já tinha sua própria
instância de `useAdiantamento`, mas ela era **morta** — nada dentro da árvore de
`SaidasScreen.js` chamava `iniciarAdiantamento` (as linhas de gasto/empréstimo/cartão são
renderizadas pelos componentes filhos, que tinham suas próprias instâncias vivas). Ao remover
as instâncias dos filhos, se eu não também passasse `iniciarAdiantamento` para eles como prop —
e não capturasse `alerta`/`setAlerta` dessa mesma instância para renderizar um `AlertaModal`
correspondente — a funcionalidade de antecipar parcelas continuaria funcionando, mas a
mensagem de sucesso/erro ("Parcelas Antecipadas!") teria simplesmente desaparecido, uma
regressão silenciosa. `SaidasScreen.js` agora renderiza esse `AlertaModal` adicional.

### 19.3 `GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js` — apresentação pura

As três telas deixaram de chamar `useGastos`/`useEmprestimos`/`useCartoes`/`useAdiantamento`/
`useExclusaoParcelada` — passam a receber tudo por prop (`gastos`/`emprestimos`/`cartoes`,
`onPressItem`, `onToggleStatus`, `onDeleteItem`, `onAdiantarParcelas`, e só em
`EmprestimosScreen`, `onHistoryPress`). A prop `isEmbedded` foi removida por completo — essas
telas nunca mais têm um modo "standalone"; tudo que só existia para esse modo (modais
próprios de criação/edição, `handleExcluir`, `handleGerarFixos`, o `useMemo` de estatísticas de
`GastosScreen` que nunca era renderizado, a prop `onEditItem` nunca usada por ninguém) foi
removido, não apenas desligado.

`CartoesScreen.js` continua chamando `useCarteira()` — não é uma duplicação (nenhum outro
ponto da árvore usa esse hook), é uma necessidade própria e legítima do agrupamento "Por
Cartão"; por decisão de escopo, não foi tocado.

`onDeleteItem` existia nas três desde esta sprint, mas `SaidasScreen.js` não o passava — o
ícone de excluir na linha, ao navegar por Saídas, não fazia nada (a exclusão só funcionava via
linha → Detalhes → Editar → Excluir). Corrigido depois, na sprint de correções funcionais
(2026-08-06, ver seção 20) — na época, corrigir isso teria mudado comportamento, fora do
escopo combinado desta sprint especificamente.

### 19.4 `CartaoCard.js` — a duplicação mais profunda

Removidas as chamadas internas a `useCartoes()` e `useAdiantamento('cartoes')` — recebe agora
`buscarParcelasDoCartao` e `onAdiantarParcelas` como props, repassadas por `CartoesScreen.js`.
O modal de resumo do cartão (indicadores + lista de compras) continua 100% local — é um
estado próprio e legítimo deste componente, não duplicava nada.

### 19.5 Arquivos removidos

- `src/navigation/SaidasTabs.js` — confirmado, por busca em todo o `src/`, que não era
  importado por nenhum arquivo. Registraria os mesmos três componentes como abas de
  navegação de verdade; depois da consolidação acima (eles viraram apresentação pura, sem
  capacidade standalone), essa arquitetura concorrente deixou de ter qualquer sentido.
- `src/screens/CartoesEmprestadosScreen.js` — já catalogado como código morto (arquivo
  inteiro comentado, zero referências) antes desta sprint; removido agora que a limpeza de
  arquivos órfãos já estava em andamento.

### 19.6 Fora do escopo, por decisão explícita (registrado como dívida técnica)

- ~~**Ícone de excluir inerte nas linhas individuais**~~ ✅ Corrigido em 2026-08-06 (fora desta
  sprint especificamente, numa rodada seguinte de correções funcionais — ver seção 20).
- **`extractDate`/`extractDateFromItem`** — lógica pura duplicada (com pequenas variações)
  entre `SaidasScreen.js`, `EmprestimosScreen.js` e `CartoesScreen.js`. Não é um problema de
  listener nem de código morto, é uma duplicação de utilitário — fora do escopo desta sprint.
- **Nomes de callback inconsistentes** (`onAdiantar` em `GastoCartaoCard`/`CartaoCard` vs
  `onAdiantarParcelas` em `ListItemEmprestimo`, para o mesmo conceito) — mantidos como
  estavam, para não misturar limpeza estrutural com renomeação estética.
- **`GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js` não são mais "Screens" de
  fato** (não têm hook próprio nem são rotas) mas mantiveram nome e local atuais — renomear
  (ex.: para `ListaGastos.js`) é uma mudança estética, fora do escopo.
- **Responsabilidades do `TelaPadrao.js`** (casca visual + dono dos modais de CRUD) — fora do
  escopo por pedido explícito do usuário. Detalhado como item estruturado na seção 19.7.

### 19.7 Dívida técnica estruturada — achados do diagnóstico não resolvidos nesta sprint

A auditoria de navegação/composição de telas que originou esta sprint (2026-08-06) levantou
sete problemas (P1–P7); só P1, P3 e P4 (mais o achado extra de P2, resolvido como efeito
colateral do fix de P1) foram tratados. Os três abaixo ficaram deliberadamente de fora — cada
um registrado com problema, motivo da decisão, impacto atual e o gatilho certo pra revisitar,
para que a decisão continue compreensível mesmo sem o contexto desta conversa.

#### P5 — Convenção de callback inconsistente entre modais

- **Problema observado**: não existe uma convenção única de nome para callbacks de
  fechar/salvar. Dois estilos coexistem no projeto — verbo em português (`aoFechar`,
  `aoSalvar`, `aoRenomear`, `aoSalvarAvatar`, `aoExcluir`, usados pela família
  `ModalCriacao`/`ModalEdicao` e por alguns modais de edição de entidade) e verbo em inglês
  (`onClose`, `onPress*`, usados por `AlertaModal`, `GerenciarModelosModal`,
  `ModalHistoricoParcelas`, `DetalhesInvestimentoModal`, e pela convenção
  `onPressItem`/`onEditItem`/`onDeleteItem` das listas). Mais grave: dois componentes
  **misturam os dois estilos na mesma lista de props** — `EditarMembroModal` aceita `onFechar`
  ao lado de `aoRenomear`/`aoSalvarAvatar`/`aoExcluir`; `AvatarEditor` aceita `onFechar` junto
  com `aoSalvar`.
- **Por que não foi resolvido nesta sprint**: renomear props é uma mudança de superfície ampla
  (toca em toda a árvore de quem usa esses modais) sem nenhum ganho funcional — é puramente
  estético/consistência, e o escopo combinado desta sprint excluiu explicitamente mudanças
  estéticas.
- **Impacto atual**: 🟢 Baixo. Não causa bug nem afeta o usuário final — o custo é cognitivo:
  cada modal novo escolhe a convenção arbitrariamente, e a inconsistência tende a crescer, não
  encolher, conforme o app ganha módulos novos.
- **Quando revisitar**: ao criar um padrão de modal novo para um módulo grande (Modo Família,
  Modo Empresa, Web) — esse é o momento natural de fixar uma convenção única. Se uma mudança
  futura por outro motivo já for tocar em `EditarMembroModal.js`/`AvatarEditor.js`, aproveitar
  para corrigir a mistura ali também. Não justifica, sozinho, abrir uma sprint dedicada.

#### P6 — Famílias de composição de tela sem critério documentado

- **Problema observado**: o app tem hoje 4 formas diferentes de montar uma tela, nenhuma
  delas documentada como "a forma certa para este tipo de caso": (a) `TelaPadrao` pura
  (Entradas, Investimentos); (b) `TelaPadrao` com `disableDefaultList` + componentes
  embutidos de apresentação pura (Saídas, arquitetura desta sprint — seção 19); (c) tela fina
  + `*Manager` compartilhado, sem `TelaPadrao` (Categorias, Cartões cadastrados); (d)
  composição bespoke, sem nenhum dos padrões acima (Membros, Conta, Planejamento Financeiro).
  Cada uma foi decidida organicamente, sprint a sprint, sem uma diretriz escrita de quando
  usar qual.
- **Por que não foi resolvido nesta sprint**: documentar critérios de quando usar cada padrão
  é síntese/definição de convenção, não correção de bug — nenhuma das 4 famílias está quebrada
  hoje; o risco é só para decisões futuras. O escopo combinado desta sprint priorizou ganho
  mensurável agora (P1), não definição de convenção.
- **Impacto atual**: 🟢 Baixo hoje, crescente com o tempo. O risco real é o *próximo* módulo
  grande escolher uma 5ª abordagem em vez de reconhecer que uma das 4 já resolve o caso,
  aumentando a fragmentação em vez de reduzi-la.
- **Quando revisitar**: no início do Modo Família ou da versão Web (fases do `ROADMAP.md`) —
  antes de criar a primeira tela nova dessas fases, documentar em `ARQUITETURA.md` um guia
  curto "que padrão usar quando" (tela de transação → `TelaPadrao`; gerenciar uma entidade
  simples → Manager compartilhado; tela que agrega várias sub-telas → padrão de
  `SaidasScreen.js` desta sprint, seção 19).

#### P7 — `TelaPadrao.js` acumulando responsabilidades demais

- **Problema observado**: `TelaPadrao.js` (610 linhas) faz ao mesmo tempo: casca visual
  (cabeçalho, menu do usuário, sino, calendário, seletor de mês, toggle de visibilidade), card
  de total, lista padrão de itens, FAB, **e** é dono do estado e da renderização dos 3 modais
  de CRUD (`ModalCriacao`/`ModalDetalhes`/`ModalEdicao`) para qualquer tela que o use — mesmo
  quando a tela não precisa de um deles (Investimentos já exige uma exceção interna,
  `tipo==='investimento'`, só para desligar o `ModalEdicao`). Tem ainda pelo menos duas props
  aceitas e nunca processadas no corpo do componente (`renderCustomItem`, `refreshing`/
  `setRefreshing`), e uma função inteira nunca chamada (`renderModalDetailsContent`, já
  catalogada em `PROJECT_STATUS.md` seção 6).
- **Por que não foi resolvido nesta sprint**: separar essas responsabilidades é reescrever um
  componente usado por 4 telas simultaneamente (Entradas, Investimentos, Saídas, e
  indiretamente Resumo) — risco alto de regressão visual/funcional para um ganho hoje só
  arquitetural (nenhuma tela sofre por causa disso agora). O usuário pediu explicitamente para
  não reescrever `TelaPadrao.js` nesta sprint.
- **Impacto atual**: 🟡 Médio — diferente de P5/P6, este já tem custo real e recorrente:
  qualquer mudança em `ModalCriacao`/`ModalEdicao` precisa ser raciocinada em conjunto com
  `TelaPadrao.js`, mesmo quando a mudança pedida não parece ter nada a ver com layout, porque
  é `TelaPadrao` quem decide QUANDO esses modais aparecem, não a tela que os usa.
- **Quando revisitar**: na próxima vez que uma tela de transação precisar de um comportamento
  de modal genuinamente diferente do que `TelaPadrao` força hoje — por exemplo, se o Modo
  Empresa precisar de um fluxo de criação em múltiplas etapas, ou a versão Web quiser modais
  como painéis laterais em vez de bottom sheets. Nesse momento, o padrão de "exceção pontual"
  (como `tipo==='investimento'` já é hoje) deixa de ser sustentável e compensa separar casca
  visual de posse dos modais.

### 19.8 Armadilha registrada: `ModernTabs` exige altura concreta no pai, não `maxHeight`

Achado ao corrigir um bug relatado pelo usuário (a aba "Linha do Tempo" de
`ModalHistoricoParcelas.js` abria mostrando só ~1,5cm da tela — cabeçalho e início das abas,
nada do conteúdo). Causa: `ModernTabs.js` usa `flex: 1` internamente para a área de conteúdo
crescer e ocupar o espaço restante do seu pai — isso só funciona quando o pai tem uma altura
**concreta** (`height`). Todo outro modal do projeto usa `maxHeight` (encolhe até caber o
conteúdo, até um teto) — mas um container com `maxHeight` não define um tamanho para os
filhos distribuírem via flex; sem altura concreta pra calcular contra, o `flex: 1` do
`ModernTabs` resolve para ~0px.

**Regra a seguir sempre que `ModernTabs` for usado dentro de um modal do tipo bottom-sheet**:
o container do modal precisa de `height` fixo (ex.: `height: '85%'`), nunca só `maxHeight`.
Aplicado em `ModalHistoricoParcelas.js` (comentário no próprio código apontando para esta
seção). Trade-off aceito: o modal passa a ocupar sempre esse espaço, mesmo com pouco
conteúdo — melhor que um modal que não abre.

## 20. Correções funcionais priorizadas (✅ implementadas em 2026-08-06)

Levantamento de bugs/inconsistências/melhorias pendentes (funcionais, não arquiteturais),
priorizado por impacto no usuário — ver `PROJECT_STATUS.md` seção 5 para o registro completo.
Seis itens implementados nesta rodada; `firestore.rules` não publicado ficou de fora por
decisão explícita do usuário (é uma tarefa operacional de deploy, não uma correção de código,
e o app ainda está em fase de testes).

### 20.1 Colisão de `idCompra` em compras de cartão

**Problema**: `idCompra = descricao + dataCompra`, sem nenhum componente único
(`useCartoes.js`, `addCartao`). Duas compras com a mesma descrição na mesma data (comum: mesma
loja, mesmo dia, sem cartão cadastrado) geravam o mesmo `idCompra` — as parcelas das duas
compras se misturavam no mesmo grupo, corrompendo total, exclusão e redistribuição.
`useEmprestimos.js` já não tinha esse problema (usa `Date.now()` no id).

**Correção**: acrescentado um sufixo de timestamp ao `idCompra` do cartão, mesmo critério já
usado em `useEmprestimos.js`. Só afeta compras criadas a partir de agora — compras antigas
mantêm o `idCompra` que já tinham, sem migração (é só uma chave de agrupamento interna, nunca
exibida ao usuário).

### 20.2 Ícone de excluir inerte nas linhas de Saídas

**Problema**: desde a Sprint de Saneamento (seção 19), `GastosScreen.js`/`EmprestimosScreen.js`/
`CartoesScreen.js` aceitam uma prop `onDeleteItem`, mas `SaidasScreen.js` nunca a passava — o
ícone de excluir em cada linha, ao navegar por Saídas, não fazia nada.

**Correção**: `handleExcluir` (já existente, usado por `ModalEdicao`) passou a aceitar um item
explícito por parâmetro, com `itemSelecionado` como fallback quando nenhum é passado — o
caminho já existente via `ModalEdicao` continua chamando `handleExcluir()` sem argumento (força
o fallback, nunca usa um rascunho de edição não salvo), evitando qualquer mudança de
comportamento nesse caminho. `SaidasScreen.js` passa `onDeleteItem={handleExcluir}` para as três
telas embutidas — o ícone da linha aciona agora o mesmo mecanismo único de confirmação
(`useExclusaoParcelada`, seção 17) que o caminho via Detalhes/Editar já usava.

### 20.3 Reverter antecipação de parcela de cartão não restaura a data original

**Problema**: `anteciparParcelas` (`useCartoes.js`) nunca gravava `mesOriginal`/`anoOriginal` —
só `useEmprestimos.js` gravava esses campos. A branch de reversão em `updateCartao` já sabia
preferir `atual.mesOriginal || atual.mes`, mas como o campo nunca existia, sempre caía no
fallback (`atual.mes`, o mês da antecipação, não o original).

**Correção**: `anteciparParcelas` passou a gravar `mesOriginal: atual.mes` e
`anoOriginal: atual.ano` antes de sobrescrever `mes`/`ano` com a data de antecipação — mesmo
padrão exato de `useEmprestimos.js`. A lógica de reversão não precisou mudar, só passou a
receber o dado que já esperava.

### 20.4 Movimentações de investimento sem transação atômica

**Problema**: `addTransaction`/`updateTransaction`/`deleteTransaction`/`updateInvestment`
(`useInvestimentos.js`) liam o documento inteiro (`getDoc`), calculavam o novo array de
`movimentacoes` em JS, e gravavam de volta (`updateDoc`) — um clássico read-modify-write. Duas
edições simultâneas em dois dispositivos (ex.: duas retiradas ao mesmo tempo) podiam fazer uma
sobrescrever a outra silenciosamente, cada uma vendo o saldo sem a alteração da outra.

**Correção**: as quatro funções passaram a usar `runTransaction` do Firestore — a leitura e a
escrita acontecem dentro da mesma transação; se o documento mudar entre a leitura e o commit
(por causa de outro dispositivo), o Firestore reexecuta a função automaticamente com os dados
mais atuais, em vez de um simplesmente sobrescrever o outro. Nenhuma mudança de comportamento
visível — as mesmas validações de saldo negativo continuam, só a favor de execução mudou.

### 20.5 Arredondamento residual na divisão automática de parcelas

**Problema**: `dividirValorIgualmente` (`src/utils/parcelamento.js`) dividia o valor em reais
fracionados e arredondava cada parcela de forma independente — R$100 ÷ 3 virava 3× R$33,33 =
R$99,99, um centavo a menos que o total original. Usada pela criação automática de parcelas,
pelo editor de parcelas personalizadas ("Restaurar parcelas iguais") e pela redistribuição por
exclusão (seção 17) — o mesmo desvio se propagava para os três fluxos.

**Correção**: a função passou a dividir em **centavos inteiros** (não em reais), distribuindo o
resto da divisão inteira nas **últimas parcelas** (1 centavo a mais cada) — prática comum em
parcelamento de compras no varejo. A soma das parcelas retornadas agora bate exatamente com o
total em qualquer divisão. Como é uma função pura compartilhada, corrigir aqui corrige os três
fluxos de uma vez, sem tocar em nenhum deles individualmente.

Achado à parte, não corrigido por ser um caso bem mais restrito: `GastoCartaoCard.js`/
`TelaPadrao.js` reconstroem o total como `valor × totalParcelas` só quando o documento não tem
`valorTotal` (dado legado, de antes desse campo existir) — uma aproximação que só afeta dado
antigo, não qualquer compra criada com o código atual.

### 20.6 Três cálculos de progresso de investimento — já estava corrigido

**Verificado, não precisou de código**: `SecaoInvestimentos.js`, `TelaPadrao.js` e
`DetalhesInvestimentoModal.js` já importam a mesma função compartilhada
(`calcularProgressoMeta`/`corProgressoMeta`, `src/utils/metas.js`) — a consolidação já tinha
sido feita na Sprint 4 (ver comentário no próprio `utils/metas.js`, referenciando
`SPRINT4_DISCOVERY.md`). O achado na auditoria de bugs (seção 5, `PROJECT_STATUS.md`) descrevia
um problema que já não existia — a linha na tabela de bugs nunca tinha sido riscada quando o
fix aconteceu. Só documentação foi corrigida, nenhum código.
