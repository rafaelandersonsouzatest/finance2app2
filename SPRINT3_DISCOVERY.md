# Sprint 3 — Discovery: Agenda Financeira

> Registrado em 2026-07-27, antes do início da implementação da Sprint 3. Segue o mesmo
> papel do `PRODUCT_DISCOVERY.md` (2026-07-24): análise de produto + arquitetura antes de
> código. **Atualizado na mesma data, 2ª rodada** — escopo, navegação e Central de Avisos
> já confirmados pelo usuário. A seção 13 traz o escopo definitivo e a ordem de
> implementação; a partir daqui a sprint segue para código.

## Objetivo da sprint (confirmado)

Construir a primeira camada da inteligência temporal do aplicativo, permitindo que o
usuário visualize tudo o que está por acontecer financeiramente, através da **Agenda
Financeira** e da **Central de Avisos** — ambas dentro do próprio app, sem depender do
sistema operacional ainda.

## 0. Visão: as três camadas da inteligência temporal do app

Direcionamento confirmado pelo usuário — vale registrar aqui porque vai orientar não só
esta sprint, mas as próximas:

1. **"O que vai acontecer?"** — Agenda Financeira (calendário + linha do tempo) e central de
   avisos in-app. **Esta é a Sprint 3.**
2. **"O que isso significa?"** — projeções (saldo previsto, "vou fechar o mês no positivo?",
   "tenho dinheiro para antecipar essa parcela?"). Fica para uma **Sprint 4** futura, depois
   que a base de eventos estiver consolidada e validada.
3. **"O que eu deveria fazer?"** — inteligência financeira e recomendações personalizadas
   (investir vs. quitar dívida, alertas de padrão de gasto). Fase futura, alinhada com a
   Fase 6 (IA) do `ROADMAP.md`.

A arquitetura desta sprint (seção 4) é desenhada para que as camadas 2 e 3 encaixem por
cima do que for construído agora, sem precisar refazer a base — sem, no entanto, construir
nada dessas camadas hoje.

**Notificações do sistema operacional** (`expo-notifications`) também ficam fora desta
sprint, por decisão explícita do usuário (ver seção 7) — não por serem uma "camada" diferente
de inteligência, mas por causa do custo de processo que essa dependência específica traz
(build nativo obrigatório, ver seção 7.2). A Sprint 3 entrega a Agenda Financeira e a Central
de Avisos **dentro do próprio app**; uma sprint futura, dedicada, cuida de levar isso para
fora do app (notificação do SO).

## 1. O que já existe no código e sustenta essa evolução

| Peça | Onde | Reaproveitável para |
|---|---|---|
| Campo de data de vencimento por lançamento (`dataVencimento` em gastos/cartões/empréstimos, `data` em entradas) | `useGastos`, `useCartoes`, `useEmprestimos`, `useEntradas` | Fonte de eventos da Agenda Financeira |
| Status `pago`/`dataPagamento` | mesmos hooks acima | Diferenciar "vence" de "venceu e não pagou" no calendário/linha do tempo/avisos |
| Cor por cartão (`corCartao`) | `useCartoes.js` | Marcadores coloridos no calendário e na linha do tempo, por cartão |
| Cálculo previsto vs. realizado por mês | `ResumoMensal.js` | Base para "saldo projetado", quando a Sprint 4 chegar |
| Cálculo de parcela atual por data (`calculateCurrentInstallment`, `shouldShowTransaction`) | `DateFilterContext.js` | Já resolve parte da lógica de "essa parcela aparece nesse mês" — reaproveitar em vez de recriar |
| Tela `NotificacoesScreen.js` (placeholder da Sprint 2) | `src/screens/NotificacoesScreen.js` | Local natural para a futura configuração de antecedência dos avisos, quando essa sprint futura de notificações do SO chegar |
| `date-fns` já instalado | `package.json` | Matemática de datas sem precisar de nova dependência para isso |

## 2. Achado crítico de arquitetura: geração sob demanda vs. visão de futuro

Este é o ponto mais importante para calibrar o esforço da sprint.

- **Cartões e empréstimos**: quando uma compra/empréstimo é criado, **todas as parcelas já
  são gravadas de uma vez** no Firestore (`addCartao`/`useEmprestimos` fazem um `writeBatch`
  com todas as parcelas futuras). Ou seja, essas parcelas **já existem no banco** mesmo para
  meses futuros — a Agenda pode simplesmente consultá-las.
- **Gastos e entradas fixos (modelos recorrentes)**: o oposto. `gerarFixosDoMes()` só roda
  quando o usuário **abre aquela tela naquele mês** (`EntradasScreen`/`GastosScreen`/
  `SaidasScreen`, ao montar/focar). Se o usuário nunca visitou "Outubro", **não existe
  nenhum documento de gasto/entrada fixo de outubro no Firestore** — mesmo que exista um
  modelo recorrente configurado.

**Consequência prática:** tanto o calendário quanto a linha do tempo, ao mostrar "daqui a 2
meses", não podem simplesmente consultar o Firestore para gastos/entradas fixos — precisam
**projetar a partir dos modelos** (`modelosDeGasto`/`modelosDeEntrada`), sem gravar nada, só
para exibição.

Isso não é motivo para redesenhar a geração de fixos agora (fora de escopo, funciona bem
para o caso de uso atual) — é só um lembrete de que a Agenda vai precisar de uma função de
projeção separada da leitura direta do Firestore, enquanto cartões/empréstimos podem ler
direto.

## 3. Proposta central de arquitetura: um hook agregador de "eventos financeiros"

Hoje, se cada funcionalidade (calendário, linha do tempo, central de avisos in-app)
reimplementar por conta própria "pegar gastos + cartões + empréstimos + entradas e juntar
por data", criaríamos uma 6ª implementação paralela do mesmo tipo de lógica que o
`PROJECT_STATUS.md` já lista como dívida técnica (seção 6, "somas/percentuais financeiros
recalculados de forma independente em 6+ telas"). **Confirmado pelo usuário.**

**Proposta:** um novo hook, `useEventosFinanceiros(mes, ano)` (nome sujeito a ajuste),
seguindo o mesmo padrão dos hooks existentes, que:
- Consome `useGastos`, `useEntradas`, `useCartoes`, `useEmprestimos` internamente (mesmo
  padrão que `useAdiantamento.js` já usa hoje).
- Normaliza cada item num formato comum: `{ id, tipo, descricao, valor, data, pago, origem }`.
- Para meses futuros sem dados persistidos, complementa com a projeção a partir dos modelos
  (ver seção 2).
- Expõe agregações prontas: eventos por dia (calendário), lista ordenada cronologicamente
  (linha do tempo), total do dia (mapa de calor), e "próximos vencimentos" (central de
  avisos — e, no futuro, notificações do SO).

Esse hook é a **única fonte de verdade** para tudo relacionado a "o que vai acontecer" —
calendário, linha do tempo, central de avisos, e mais adiante notificações do SO e
projeções de saldo. Para essa última (Sprint 4), o formato normalizado do evento já reserva
espaço para um campo futuro de saldo acumulado (`saldoAcumuladoAteAqui`, calculado por quem
consumir o hook depois, não pelo hook em si nesta sprint) — evitando redesenhar a estrutura
de dado quando a camada de projeção chegar.

## 4. Agenda Financeira

"Agenda Financeira" é o nome da funcionalidade como um todo — **não um calendário**, mas o
lugar que, ao longo das próximas sprints, deve se tornar o principal ponto em que o usuário
entende o seu futuro financeiro (confirmado pelo usuário como visão de longo prazo). Nesta
sprint ela nasce com duas visões complementares sobre os mesmos dados
(`useEventosFinanceiros`), alternáveis por abas dentro da mesma tela — e a arquitetura já
prevê que essas visões cresçam (ex.: saldo projetado por dia, na Sprint 4) sem precisar de
uma tela nova:

### 4.1 Visão Calendário

Grade mensal com os eventos marcados por dia:
- Vencimentos de cartão (por parcela, com cor do cartão).
- Vencimentos de empréstimo (por parcela).
- Contas recorrentes (gastos fixos, incluindo os ainda não gerados em meses futuros).
- Entradas previstas.
- Indicador de "dia com maior movimentação": intensidade visual (ex.: ponto maior/mais
  escuro) proporcional à soma de valores do dia — subproduto direto do hook da seção 3, sem
  cálculo novo.
- Diferenciação visual pago/pendente/vencido (aproveitando os campos que já existem).

Ao tocar um dia, abre a lista de eventos daquele dia (reaproveitando os mesmos componentes
de item já usados em outras telas, quando possível — `ListItemGasto`, `ListItemEmprestimo`
etc. — a confirmar durante a implementação se o formato normalizado do hook permite reuso
direto ou exige um item de lista mais genérico).

### 4.2 Visão Linha do Tempo Financeira (nova, incorporada nesta sprint)

Lista cronológica dos próximos eventos financeiros (ex.: "Amanhã — Cartão Nubank R$
230,00", "Em 3 dias — Aluguel R$ 1.200,00", "Em 5 dias — Salário previsto R$ 4.500,00"),
em vez da grade de calendário. Mesma fonte de dados (`useEventosFinanceiros`), apresentação
diferente — pensada para quem quer uma leitura rápida de "o que vem por aí" sem precisar
interpretar uma grade.

**O que entra nesta sprint:** a lista cronológica em si (data, descrição, valor, tipo,
status pago/pendente).

**O que fica preparado para depois, sem implementar agora:** cada item da linha do tempo é
o lugar natural para mostrar, no futuro, o impacto acumulado no saldo previsto (ex.: "após
este evento, seu saldo projetado cai para R$ 1.800,00") — a Sprint 4 (camada "o que isso
significa?") pluga esse dado ali. Para isso não exigir redesenho depois, o componente de
item da linha do tempo já nasce com um espaço reservado (prop opcional, não usada ainda)
para esse valor futuro.

### 4.3 Biblioteca de calendário — pesquisa de maturidade e alternativas

O usuário pediu para confirmar que `react-native-calendars` é realmente madura e bem
mantida antes de adotar. Pesquisei o estado atual do projeto:

- **Ativamente publicada**: última versão (`1.1314.0`) lançada em 29/01/2026, mantida pela
  Wix ([npm](https://www.npmjs.com/package/react-native-calendars),
  [releases](https://github.com/wix/react-native-calendars/releases)).
- **Adoção grande**: é hoje a referência mais usada para calendário em React Native, citada
  no topo de praticamente toda comparação do ecossistema em 2026
  ([ReactScript, "10 Best Calendar Components", 2026](https://reactscript.com/top-10-calendar-components-react-react-native/)).
- **Ressalva honesta**: há histórico de reclamações da comunidade sobre lentidão para
  revisar issues/PRs — o mantenedor original saiu da Wix ainda em 2018 e, por um tempo,
  ninguém assumiu formalmente a manutenção, ficando por conta da comunidade
  ([issue #2319](https://github.com/wix/react-native-calendars/issues/2319)). Isso **não
  impediu** releases contínuos (inclusive um há poucos meses), mas significa não contar com
  suporte rápido se abrirmos um bug específico nosso.
- **Alternativas existentes, mas menos maduras**: `react-native-ui-datepicker` (mais focada
  em seleção de data única/intervalo, não em visão de mês com múltiplos eventos por dia) e
  `react-native-calendar-ui` (headless, mais nova, comunidade bem menor ainda).

**Avaliação:** dado que nenhuma alternativa cobre melhor o caso de uso (marcação de
múltiplos eventos por dia + mapa de calor) com mais tração de comunidade, mantenho a
recomendação por `react-native-calendars` — é JS puro (sem código nativo, sem exigir build
novo), amplamente adotada, e a ressalva é sobre velocidade de suporte da comunidade, não
sobre funcionar ou não. **Confirmado pelo usuário.**

## 5. Central de Avisos in-app (confirmado)

Tela simples, sem nenhuma configuração de usuário nesta primeira versão, organizada em três
blocos fixos:
- **Vencidos** — `dataVencimento`/`data` no passado e `pago === false`.
- **Vencem hoje**.
- **Próximos 7 dias**.

Cada bloco lista os eventos do mesmo formato normalizado do `useEventosFinanceiros` (seção
3). **Não precisa de nenhuma biblioteca nova** — é apresentação pura do hook, sem cálculo
adicional. Baixíssimo risco técnico: não depende de permissão do sistema operacional,
funciona em qualquer plataforma (inclusive Web, quando existir).

A janela de "próximos 7 dias" é fixa no código nesta versão (sem UI de configuração — a
futura configuração de antecedência, seção 7.4, é para as notificações do SO, quando essa
sprint futura chegar; a Central de Avisos in-app pode inclusive continuar simples mesmo
depois disso, já que "ver tudo" dentro do app tem menos motivo para precisar de
configuração do que uma notificação que interrompe o usuário).

## 6. Navegação: cabeçalho principal (confirmado)

Ajuste ao padrão herdado da Sprint 2. Hoje `TelaPadrao.js` (`renderHeader()`) mostra só
"👤 Olá, {nome} ▼", que abre o `UserMenu`. Isso evolui para três acessos lado a lado na
mesma linha:

```
👤 Rafael ▼   🔔   📅
```

- **👤 Rafael ▼** — continua o Menu do Usuário/Hub de Configurações (inalterado).
- **🔔** — abre a Central de Avisos (seção 5) diretamente.
- **📅** — abre a Agenda Financeira (seção 4) diretamente.

Justificativa do usuário: Agenda Financeira e Central de Avisos serão usadas com muita
frequência, então merecem atalho direto no cabeçalho, em vez de ficarem um nível abaixo,
dentro do menu de configurações.

**Observação técnica:** diferente do `UserMenu` (que é irmão do `MainStack`, fora da árvore
do `Stack.Navigator`, por isso precisa do `navigationRef` — ver `ARQUITETURA.md` seção
11.4), o `renderHeader()` do `TelaPadrao.js` roda **dentro** de uma tela de verdade (dentro
de um `Tab.Screen`, dentro do `MainStack`). Ou seja, os novos ícones de sino e calendário
podem navegar com o hook padrão `useNavigation()` do React Navigation, sem precisar do
`navigationRef` — mais simples do que o padrão do `UserMenu`. `TelaPadrao.js` precisará
passar a chamar `useNavigation()` (hoje não chama).

Um ponto a decidir durante a implementação (não bloqueia o início, mas registro para não
esquecer): se o sino deve exibir um badge de contagem (ex.: número de itens vencidos)
diretamente no cabeçalho. Não foi pedido explicitamente — vou implementar a versão sem
badge primeiro (mais simples) e você avalia se quer esse reforço visual depois.

## 7. Notificações do sistema operacional — adiadas para sprint futura dedicada

Por decisão do usuário: a Sprint 3 **não inclui** `expo-notifications`. Registro aqui o
porquê e o que fica pendente, para não perder o contexto quando essa sprint futura for
priorizada.

### 7.1 Resposta direta à pergunta do usuário: sim, seria preciso gerar build nativo

Confirmando o entendimento: `expo-notifications` tem código nativo. Isso significa que, no
momento em que essa dependência for adicionada, **não dá mais para testar só escaneando o QR
code com o app Expo Go** — seria necessário um **dev client customizado** (`expo run:android`
/ `expo run:ide` ou um build de desenvolvimento via EAS) para o próprio ciclo de
desenvolvimento, e um build completo (`eas build`, não só `eas update`) para qualquer
usuário externo receber a funcionalidade. Isso muda o ciclo de teste do dia a dia, não só a
publicação final — por isso concordo que vale isolar esse custo numa sprint própria, depois
que a Agenda estiver validada.

**Nuance que vale registrar:** esse custo de build nativo é, na prática, **só da primeira
vez** que a dependência entra no projeto (e de futuras atualizações da própria lib). Depois
que ela já estiver embutida num build publicado, ajustes puramente de lógica JS
(texto da notificação, regra de quando disparar, etc.) voltam a poder sair por `eas update`
normalmente — o processo não fica "preso" a build nativo para sempre, só na entrada.

### 7.2 O que essa sprint futura vai precisar (resumo, não detalhado agora)

- Instalar `expo-notifications` + plugin de configuração no `app.config.js` (ícone/cor) +
  canal de notificação no Android.
- Pedir permissão ao usuário em tempo de execução, associada a um contexto claro (ex.: ao
  configurar o primeiro lembrete, não genericamente no onboarding).
- Sincronizar agendamento com o CRUD existente: toda vez que um gasto/cartão/empréstimo for
  criado, editado, pago ou excluído, a notificação agendada para ele precisa ser
  cancelada/reagendada — toca `useGastos`, `useCartoes`, `useEmprestimos`.
- Notificação é por aparelho, não por conta — relevante para o Modo Família (Fase 2 do
  roadmap) mais adiante: cada membro precisaria configurar a própria notificação no próprio
  aparelho.

### 7.3 Por que isso não atrasa a Sprint 3

Se `useEventosFinanceiros` (seção 3) já for a fonte única de "o que vai vencer e quando", a
sprint futura de notificações do SO só precisa **ler** desse hook para decidir o que
agendar — não precisa recalcular nada. Ou seja, adiar não gera retrabalho, só adia o custo
de build nativo para quando fizer sentido pagá-lo.

### 7.4 Antecedência configurável (futuro, mas desenhar para caber)

Não implementar a UI de configuração agora, mas vale já prever o formato de dado para não
migrar depois: um campo simples no perfil do usuário
(`profile.notificacoes.antecedenciaDias`, ex.: `[1]` por padrão) é suficiente — mesma lógica
de "não adicionar configuração que o usuário não pediu ainda" (princípio do projeto), só
com o dado pronto para não exigir migração quando a tela `NotificacoesScreen.js` (já existe
como placeholder da Sprint 2) ganhar conteúdo real. Esse campo serve tanto para a central de
avisos in-app (que já entra nesta sprint) quanto para as notificações do SO no futuro.

### 7.5 Arquitetura pensando em notificações inteligentes futuras

Se toda notificação (in-app hoje, do SO no futuro) nascer do mesmo hook
`useEventosFinanceiros`, o caminho natural para "inteligência" futura (camada 3 da seção 0,
alinhada à Fase 6 do roadmap) é **adicionar novas regras de geração de eventos** nesse hook
(ex.: "gasto 30% acima da média do mês passado"), sem mudar a camada de exibição. A
recomendação de arquitetura é **separar "o que gera um evento/aviso" de "como um evento é
mostrado ou notificado"** desde já — mesmo que hoje só existam regras simples de vencimento.

## 8. Widgets — viabilidade (estudo, sem implementação)

Sem mudanças de direcionamento aqui — confirmado pelo usuário que permanece só documentado.

### 8.1 Realidade técnica no Expo/React Native hoje

- **Não existe suporte "de fábrica" do Expo para widgets nativos.** Não é uma limitação de
  configuração — é uma limitação de plataforma: widgets (Android App Widgets / iOS
  WidgetKit) rodam em um processo/runtime **separado da sua tela React Native**, então não
  há como "só renderizar um componente RN" dentro de um widget.
- **Android:** viável via biblioteca comunitária (`react-native-android-widget`) ou um
  provider nativo próprio (Kotlin). Mesmo com a biblioteca, o widget final é um componente
  nativo Android registrado durante o build — exige `expo prebuild`/EAS Build, não é
  compatível com Expo Go.
- **iOS:** exige uma extensão WidgetKit escrita em **SwiftUI** (Swift, não JavaScript).
  Existe um plugin de configuração comunitário (`expo-apple-targets`) que ajuda a gerar essa
  extensão durante o prebuild, mas o conteúdo visual do widget em si precisa ser código
  Swift — é uma skill diferente da que o projeto usa hoje.
- **Ambos exigem build nativo, nunca OTA** — mesmo ponto da seção 7.1, mas mais acentuado:
  qualquer mudança de layout/conteúdo do widget exige nova submissão de loja, não um
  `eas update`.
- **Ações rápidas (registrar gasto, marcar como pago) dentro do widget:**
  - Android: possível de forma limitada (o widget pode abrir o app numa tela específica via
    deep link, ou, com mais engenharia, dar um toque de "ação rápida" que dispara uma
    atualização nativa sem abrir o app — mas isso exigiria um caminho de escrita no
    Firestore fora do JS/React, duplicando lógica de negócio no lado nativo).
  - iOS: mais restrito ainda — interatividade real dentro do widget (sem abrir o app) só
    existe via "App Intents" (iOS 17+), também só em Swift.
  - **Recomendação caso isso avance no futuro:** widget só de leitura (mostrar próximos
    vencimentos/saldo) + toque abre o app direto na tela de ação (ex.: modal de "marcar como
    pago") — evita duplicar regra de negócio fora do JS.

### 8.2 Vale manter no roadmap?

Sim, como item de **fase avançada** (depois de Web/Modo Empresa, ver `ROADMAP.md`), não como
algo próximo. Razões:
- Exige build nativo por plataforma e conhecimento de Swift para iOS — investimento de
  engenharia desproporcional ao estágio atual do produto (que ainda nem foi publicado —
  Fase 1 do roadmap).
- Não compromete nada se adiado: nenhuma decisão de arquitetura de hoje impede widgets
  depois, **desde que o hook `useEventosFinanceiros` (seção 3) já centralize os dados** —
  um widget "read-only" simplesmente consome a mesma fonte de dados que Agenda e avisos vão
  usar.
- Recomendo registrar como adição ao `ROADMAP.md` (Fase 4 ou "nova fase", ver
  `PRODUCT_DISCOVERY.md` seção 7 que já cita "Widget de tela inicial (Android)" como algo
  que pode esperar) — sem comprometer sprint nenhuma agora.

## 9. Perguntas de projeção financeira — mapeadas por esforço (para a Sprint 4, não esta)

O usuário levantou 5 perguntas como "norte" da camada 2 (seção 0). Registro aqui só para
não perder o mapeamento de esforço já feito — nenhuma delas entra na Sprint 3:

| Pergunta | Esforço | Por quê |
|---|---|---|
| O que vence amanhã? | 🟢 Trivial | Já coberto pela Central de Avisos/Linha do Tempo desta sprint |
| Quanto vou gastar na próxima semana? | 🟢 Trivial | Soma de eventos futuros num intervalo, mesmo hook — boa candidata a "primeira entrega" da Sprint 4 |
| Vou fechar o mês no positivo? / Qual será meu saldo no dia 25? | 🟡 Simples, mas é feature nova | Reaproveita a matemática de "previsto vs. realizado" já existente em `ResumoMensal.js`, só precisa de um corte por data em vez de por mês inteiro |
| Tenho dinheiro para antecipar esse empréstimo? | 🟡 Simples, mas toca fluxo existente | Depende do "saldo projetado" acima existir primeiro; natural para o modal de antecipação já existente (`ModalParcelasAdiantamento.js`) |
| Vale mais investir ou quitar a dívida? | 🔴 Grande — fase futura (Premium/IA do roadmap) | O app **não tem hoje** taxa de juros do empréstimo nem rentabilidade esperada de investimento — exigiria novo campo de dado e decisão de produto (que taxa assumir?); é motor de decisão comparativo, não exibição |

## 10. Dependências e riscos técnicos consolidados (Sprint 3)

| Item | Tipo | Risco |
|---|---|---|
| `react-native-calendars` | Nova dependência (JS puro) | 🟢 Baixo — sem código nativo, sai por OTA normalmente; ressalva de suporte comunitário mais lento (seção 4.3), não de funcionamento |
| Projeção de meses futuros para gastos/entradas fixos | Lógica nova | 🟡 Médio — precisa ficar bem separada da geração real (`gerarFixosDoMes`) para não criar um 2º caminho de verdade divergente |
| `useEventosFinanceiros` consumindo 4 hooks simultaneamente | Performance | 🟢 Baixo-médio — mesma observação já registrada em `ARQUITETURA.md` (múltiplos listeners `onSnapshot` simultâneos por tela); nada novo, só mais um consumidor dos hooks existentes |
| `TelaPadrao.js` passa a chamar `useNavigation()` (seção 6) | Mudança em componente compartilhado por várias telas | 🟢 Baixo — `TelaPadrao.js` já roda dentro do `Tab.Screen`/`MainStack`, então o hook está sempre disponível; risco é só de regressão visual no cabeçalho ao adicionar os dois novos ícones |

## 11. Testes

Ainda não é hora de detalhar (aguardando confirmação final do escopo abaixo), mas adianto a
avaliação: o `useEventosFinanceiros` é uma boa candidata a **teste unitário** (é lógica pura
de agregação/data, sem depender de UI) — a normalização de tipos diferentes de lançamento em
um formato comum e a projeção de meses futuros são exatamente o tipo de lógica onde um bug
silencioso (evento "sumindo" do calendário/linha do tempo) é fácil de acontecer e difícil de
perceber manualmente. Trago a proposta de teste formal junto do primeiro incremento de
implementação (o hook em si, ver seção 13).

## 12. Documentação a atualizar ao final da sprint

Conforme o processo do projeto: ao concluir, avaliar atualização de `PROJECT_STATUS.md`
(nova funcionalidade), `ARQUITETURA.md` (novo hook e nova tela) e `ROADMAP.md` (registrar a
framing das 3 camadas da seção 0 como direção oficial das próximas sprints, similar ao que
já existe para o Menu do Usuário). Não fazendo isso agora — só ao final, como sempre.

## 13. Escopo definitivo da Sprint 3 (confirmado — pronto para implementação)

**Dentro:**
1. Hook `useEventosFinanceiros(mes, ano)` (seção 3) — peça estrutural nova, fonte única de
   dados para tudo abaixo.
2. Tela **Agenda Financeira**, com duas visões em abas:
   - Calendário mensal (seção 4.1), usando `react-native-calendars`.
   - Linha do Tempo Financeira (seção 4.2), lista cronológica dos próximos eventos, já com
     espaço reservado (não implementado) para o impacto no saldo previsto.
3. Central de Avisos in-app (seção 5) — Vencidos / Vencem hoje / Próximos 7 dias, sem
   nenhuma configuração de usuário.
4. Cabeçalho (`TelaPadrao.js`) evolui para `👤 Rafael ▼  🔔  📅` (seção 6) — sino abre a
   Central de Avisos, calendário abre a Agenda Financeira, ambos direto, sem passar pelo
   `UserMenu`.

**Fora (fica para depois, registrado para não esquecer):**
- Notificações do sistema operacional (`expo-notifications`) — sprint futura dedicada
  (seção 7).
- Configuração de antecedência dos avisos (1/3/7 dias) — só o campo de dado é preparado
  agora; UI fica para quando `NotificacoesScreen.js` ganhar conteúdo real.
- Badge de contagem no sino do cabeçalho — avaliar depois da primeira versão sem badge.
- Impacto no saldo previsto dentro da Linha do Tempo — espaço reservado no componente, sem
  cálculo ainda (depende da Sprint 4).
- Saldo projetado / "vou fechar no positivo?" / "posso antecipar?" / "investir ou quitar
  dívida?" — Sprint 4 e fases futuras (seção 9).
- Widgets — permanece só documentado (seção 8).

### Ordem de implementação proposta

Um incremento por vez, com validação sua antes do próximo (conforme o processo do
projeto):

1. **`useEventosFinanceiros`** — só o hook, sem UI. Testável isoladamente (inclusive com
   teste unitário, ver seção 11). Base de tudo que vem depois.
2. **Agenda Financeira** — tela com as duas abas (Calendário + Linha do Tempo), consumindo
   o hook do passo 1. Inclui instalar `react-native-calendars`.
3. **Central de Avisos** — tela + os três blocos, reaproveitando o mesmo hook.
4. **Cabeçalho** — ajuste do `TelaPadrao.js` para os dois novos ícones e as novas rotas no
   `MainStack`, ligando tudo.

Começo pelo passo 1 assim que você confirmar esta ordem.
