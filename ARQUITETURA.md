# Arquitetura

> Documentação técnica do estado atual do código (2026-07-23). Este documento descreve **o que existe**, não o que deveria existir — para a visão de evolução, ver `ROADMAP.md`; para pendências e bugs, ver `PROJECT_STATUS.md`.

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

**Estado exposto:** `user` (objeto bruto do Firebase Auth), `profile` (documento `users/{uid}` do Firestore), `loading`, `profileLoading`, e as ações `login`, `register`, `logout`, `loginWithGoogle`, `carregarPerfil`.

**Fluxo:**
1. `onAuthStateChanged` (Firebase Auth) dispara ao carregar o app.
2. Se há usuário autenticado, `criarUserProfileSeNaoExistir` cria o documento `users/{uid}` na primeira vez (com `primeiroAcesso: true`, `jaViuOnboarding: false`, `tenantId: uid`, `plano: "free"`, `tipoUsuario`, `documento`, etc.), depois `carregarPerfil` busca o documento completo.
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

**`useModelos.js`** é o hook de "lançamentos recorrentes" (gastos e entradas fixas), parametrizado por `tipo` (`'gasto' | 'entrada'`) e usado por `GerenciarModelosModal.js`. Contém a única tentativa (hoje quebrada) de suportar "modo família" via `membroSelecionado` — ver seção 6.

**`useAdiantamento.js`** não tem listener próprio: instancia `useCartoes`/`useEmprestimos` internamente para reaproveitar uma função de antecipação de parcela — isso duplica os listeners `onSnapshot` desses hooks quando a tela que usa `useAdiantamento` também já usa `useCartoes`/`useEmprestimos` diretamente.

**`useCurrencyInput.js`** é o único ponto do app que converte texto digitado em número monetário de forma consistente (trata centavos via regex, formata em BRL). Os hooks de dados, por outro lado, fazem `parseFloat(valor)` cru ao salvar — funcionam hoje porque o valor já chega numérico de `useCurrencyInput`, mas não há garantia de que todo formulário sempre passe por ele.

`src/hooks/useFirestore.js` é apenas um barrel file (`export { useEntradas } from './useEntradas'` etc.), não contém lógica.

## 6. Contexts (`src/contexts/`)

- **`DateFilterContext`**: mês/ano selecionado globalmente, persistido em `AsyncStorage` (`@dateFilter`). Também concentra a lógica de **cálculo de parcelamento** (`calculateCurrentInstallment`, `shouldShowTransaction`) — ou seja, regra de negócio de parcelas mora num contexto de UI, não num hook de domínio.
- **`VisibilityContext`**: booleano de "mostrar/ocultar valores", persistido em `AsyncStorage` (`@app_visibility_state`).
- **Modo Família não tem contexto próprio.** Há uma referência em comentário (`useModelos.js`) a um `ModoFamiliaContext` que nunca foi criado. O único lugar que tenta ler um "membro selecionado" é via `useAuth()`, que não expõe esse campo — logo, toda lógica condicional a `membroSelecionado` (em `useModelos.js` e `ModalHistoricoParcelas.js`) está inativa.

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

**Documento de perfil** (`users/{uid}`, raiz — não subcoleção): `uid`, `email`, `nome`, `apelido`, `tipoUsuario` (`pessoa_fisica`/`empresa`), `plano` (`free`, sem verificação ativa hoje), `tenantId` (hoje sempre igual ao `uid`), `documento`, `tipoDocumento`, `primeiroAcesso`, `jaViuOnboarding`.

**Regras de segurança:** não existe `firestore.rules` neste repositório. `firebase.json` só configura `hosting` (deploy web estático). Não há como auditar via código se o acesso ao banco está restrito.

**Múltiplos ambientes:** `app.config.js` seleciona configuração (nome do app, `projectId` do Expo, ícone) por `APP_ENV` (`meu-app` | `rafael` | `marina` | `christian`); `src/config/firebase.js` seleciona a configuração do Firebase (cada ambiente aponta para um **projeto Firebase distinto**, não apenas uma coleção diferente dentro do mesmo projeto). Ou seja, hoje "múltiplos usuários" = "múltiplos apps/builds", não múltiplos usuários dentro do mesmo backend.

## 8. Principais regras de negócio implementadas

- **Lançamentos fixos via modelos**: `gerarFixosDoMes()` (presente em `useGastos` e `useEntradas`) verifica se já existem lançamentos com `origemModelo: true` no mês; se não, lê os modelos ativos (`modelosDeGasto`/`modelosDeEntrada`) e gera lançamentos em lote (`writeBatch`). Suporta modo de cálculo `valor` (fixo) ou `porcentagem` (calculado sobre entradas selecionadas).
- **Gastos dinâmicos recalculados automaticamente**: `useEntradas.js` mantém um segundo listener que, sempre que as entradas do mês mudam, recalcula e sobrescreve (via `writeBatch`) os gastos com `fixacao: "dinamico"` e `modoCalculo: "porcentagem"`.
- **Parcelamento e antecipação de empréstimos** (regra oficializada em 2026-07-24, Sprint 1 / A3): `useEmprestimos.js` gera parcelas dividindo o valor total. Cada parcela grava `valorContratado` (o valor total original — **fixo desde a criação, nunca recalculado depois**) e `economiaTotal` (soma dos descontos de todas as antecipações do empréstimo, denormalizada em todas as parcelas do mesmo `idCompra`, recalculada via `recalcularEconomiaTotal` só quando uma antecipação ou reversão de antecipação realmente muda um desconto). "Valor efetivamente pago" é sempre derivado (`valorContratado - economiaTotal`), nunca persistido. Exibido em `ModalDetalhes.js`/`ModalHistoricoParcelas.js` (com fallback por soma para empréstimos criados antes dessa mudança, sem esses campos). Cartões (`useCartoes.js`) não seguem essa regra — continuam com o cálculo por soma de parcelas, escopo do A3 foi só empréstimos.

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
