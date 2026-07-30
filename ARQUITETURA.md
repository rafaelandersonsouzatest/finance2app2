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
 ├─ navigation/  → BottomTabs (raiz) e SaidasTabs (não usado, ver seção 4)
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
- **`SaidasTabs.js`** (material-top-tabs) existe mas **não é importado por nenhum arquivo** — `SaidasScreen.js` implementa sua própria navegação por abas internamente, sem usar este arquivo. É código órfão.
- Dentro de `SaidasScreen.js`, a navegação entre Gastos/Empréstimos/Cartões é feita por estado local + renderização condicional, não pelo React Navigation.

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
