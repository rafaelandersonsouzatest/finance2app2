# CLAUDE.md

Este arquivo orienta o Claude Code ao trabalhar neste repositório.

## Visão do produto

Este projeto **não é apenas um aplicativo de controle financeiro**. O objetivo de
longo prazo é construir uma plataforma financeira usando a mesma base de código para
Pessoa Física, Casais, Famílias, Pequenas Empresas e Empresas.

Toda decisão técnica deve considerar essa visão — **mas sem sacrificar a simplicidade
do MVP atual**. Ver `ROADMAP.md` para as fases (MVP Mobile → Publicação → Modo Família
→ Web → Modo Empresa → Premium → IA) e `PROJECT_STATUS.md` para o estado atual.

## Antes de qualquer coisa

Leia os arquivos (não resuma de memória):
- `PROJECT_STATUS.md` — o que está pronto, em desenvolvimento, bugs conhecidos.
- `ARQUITETURA.md` — como o código está organizado hoje.
- `ROADMAP.md` — para onde o produto vai, para avaliar se uma solução sobrevive às
  próximas fases.

## Princípios do projeto

- Priorizar sempre a simplicidade para o usuário.
- A experiência do usuário tem prioridade sobre pequenas otimizações técnicas.
- Sempre preferir soluções simples, legíveis e fáceis de manter.
- Evitar over engineering e complexidade antecipada.
- Evitar adicionar configurações desnecessárias ao usuário — o app deve continuar
  simples de usar mesmo quando ganhar recursos novos.
- Se uma solução for apenas temporária/paliativa, isso deve ser dito explicitamente,
  nunca deixado implícito.

## Processo de desenvolvimento

- **Antes de implementar mudanças estruturais ou funcionalidades grandes** (novos
  contextos, mudança no modelo de dados do Firestore, novos hooks, alteração de
  navegação): apresentar uma proposta de arquitetura, explicar os impactos e esperar
  aprovação antes de agir.
- Quando existir mais de uma solução possível, **apresentar alternativas** com
  vantagens, desvantagens, impacto, dificuldade e compatibilidade com o roadmap. Não
  escolher automaticamente uma abordagem quando houver alternativas relevantes.
- Quando o pedido for de análise ("encontre problemas", "revise", "liste dívida
  técnica"): não escrever nem alterar código, só relatar. Ao propor melhorias,
  classificar por **impacto, dificuldade e prioridade**.
- Bugs em cálculos financeiros (valores, parcelas, juros, saldo) são sempre prioridade
  alta — este é um app que lida com dinheiro real do usuário.

## Refatorações

- Não realizar grandes refatorações apenas por organização ou estética.
- Refatorações devem ser propostas somente quando: reduzirem bugs, facilitarem
  funcionalidades previstas no roadmap, melhorarem desempenho, ou eliminarem
  duplicações significativas.

## Reutilização

- Antes de criar novos componentes, hooks ou utilitários, verificar se já existe algo
  semelhante que possa ser reaproveitado (ex: os hooks em `src/hooks/` seguem um
  padrão comum de listener + CRUD — ver `ARQUITETURA.md`).
- Evitar duplicação de código.

## Estilos e cores

Cores e estilos são centralizados em `src/styles/` — base para os temas claro/escuro previstos
(Menu → Aparência). Em código novo ou alterado:
- **Nunca escrever cor à mão** (`'#FF8A65'`, `rgba(...)`) num componente: usar `colors.*`
  (`src/styles/colors.js`). Se a cor não existir, criar o nome lá, **em inglês** e com significado
  (`colors.expense`, não `colors.orange`). Exceção: paletas que são dado (cores escolhíveis de cartão/categoria,
  avatares).
- **Estilo que se repete** em mais de um lugar vai para `globalStyles`; reaproveitar o que já
  existe (`modalContainer`, `modalHeader`, `saveButton`, `input`...) antes de criar.
- **Estilo direto no componente** (`style={{...}}`) só para ajuste pontual de layout (uma margem,
  um `flex`), sempre com cores vindas de `colors`.
- A regra de cores é **verificada pelo `npm test`** (`src/__tests__/coresCentralizadas.test.js`):
  falha com cor escrita à mão fora de `colors.js`, com `colors.` usado sem import e com
  `colors.<nome>` que não existe (vira `undefined` sem aviso — já escondeu 3 bugs).
- Hoje `colors` é fixo e `globalStyles` congela as cores ao abrir o app — trocar de tema com o
  app aberto vai exigir um provedor de tema (`useTheme()`). Essa refatoração está no backlog
  (`PROJECT_STATUS.md` seção 6); não antecipar sem alinhar.

## Dependências

- Antes de sugerir uma nova biblioteca, verificar se alguma dependência já instalada
  resolve o problema.
- Explicar o motivo da nova dependência e seu impacto no projeto (tamanho, manutenção,
  sobreposição com o que já existe).

## Documentação

- Após concluir funcionalidades relevantes, avaliar se `PROJECT_STATUS.md`,
  `ROADMAP.md` e `ARQUITETURA.md` precisam ser atualizados.
- Caso precisem, atualizá-los e informar o que mudou.

## Fluxo após alterações

Implementar uma melhoria por vez. Ao concluir cada uma, entregar obrigatoriamente:
1. O que foi alterado.
2. Por que foi alterado.
3. Quais arquivos foram modificados.
4. Possíveis riscos.
5. Como testar manualmente.
6. Qual o resultado esperado.
7. Observações: melhorias relacionadas encontradas durante o trabalho, mas não implementadas (para decidir depois).

Depois de entregar isso, aguardar a validação/teste do usuário antes de iniciar a próxima melhoria — nunca emendar direto na seguinte.

## Testes

Antes de implementar qualquer alteração, avaliar se ela deve ser acompanhada por testes automatizados (unitários, integração ou E2E):
- Se concluir que não é necessário, explicar brevemente o motivo.
- Se concluir que é necessário, apresentar a proposta dos testes **antes** de implementar, e esperar aprovação.

## Regras de negócio

- Nunca assumir requisitos que não foram especificados.
- Sempre perguntar quando houver dúvida sobre regra de negócio antes de implementar.

## Foco atual

- Prioridade absoluta agora: **concluir e publicar a versão mobile** (Fase MVP Mobile
  / Publicação do `ROADMAP.md`).
- Melhorias estruturais são bem-vindas quando agregarem valor imediato ou prepararem o
  projeto para as próximas fases sem gerar complexidade desnecessária.
- A versão Web será desenvolvida depois, reaproveitando a mesma base de código —
  evitar decisões atuais que dificultem essa evolução (ver `ROADMAP.md`, Fase 3).

## Stack

- React Native + Expo (SDK 57), React 19, React Navigation (bottom-tabs + native-stack).
- Firebase (Auth + Firestore) — sem backend próprio; toda regra de negócio roda no
  cliente hoje.
- 4 variantes de build a partir do mesmo código
  (`APP_ENV=meu-app|rafael|marina|christian`), cada uma com projeto Firebase e Expo
  próprios — ver `app.config.js` e `src/config/firebase.js`.
- A variante `christian` não representa mais um usuário específico. Ela é utilizada
  como ambiente de distribuição para convidados e testadores externos (nome exibido
  no app: "Financeiro - Convidado"). Os identificadores técnicos (`APP_ENV`,
  `projectId`, `owner`, branch EAS, Firebase etc.) foram mantidos para evitar impacto
  na infraestrutura existente.

## Comandos úteis

- `npm run start:dev` / `start:rafael` / `start:marina` / `start:christian` — roda o
  Expo com o ambiente correspondente.
- `npm run android` / `npm run ios` / `npm run web` — build nativo local.
- `npm run publish:dev` / `publish:rafael` / `publish:marina` / `publish:christian` —
  EAS Update para o branch correspondente.

## Armadilhas conhecidas neste código

Ver `PROJECT_STATUS.md` para a lista completa e `ARQUITETURA.md` para o porquê de cada uma.
Resumo rápido — regras práticas para não reintroduzir um bug já corrigido:
- `firestore.rules` está **publicado nos 4 projetos Firebase** (desde 2026-10-14/15). Toda coleção
  nova precisa de regra correspondente — senão o app recebe "sem permissão" em produção. Testes
  das regras: `cd functions && npm run test:regras` (emulador local, nunca o banco real); publicar:
  `firebase deploy --only firestore:rules --project <id> --account rafael.anderson42@gmail.com`.
- O "Modo Família" (`tenants/{tenantId}`) não está conectado a nenhuma tela — não tratar como
  funcional. A infraestrutura de Membros (`useMembros.js` e as telas que a usam) é diferente:
  está funcional hoje, com escopo correto por usuário (não é o mesmo scaffolding morto do
  Modo Família). Ver `COLABORACAO_DISCOVERY.md`/`DISCOVERY_COLABORACAO_VS_FAMILIA.md` antes de
  propor algo em Colaboração entre Usuários ou Modo Família — são dois modelos diferentes, não
  tratar como o mesmo recurso em graus diferentes.
- `App.js` e alguns componentes têm blocos grandes de código comentado (versões
  antigas) — não copiar esse padrão em código novo.
- Toda entrada/exibição de valor monetário deve usar `useCurrencyInput`/`parseBRL`
  (`src/utils/formatarValor.js`) — nunca `parseFloat`/regex própria num campo novo.
- `ModernTabs` dentro de um modal (bottom-sheet) precisa que o container pai tenha
  `height` fixo, nunca só `maxHeight` — sem altura concreta, a área de conteúdo das abas
  renderiza com ~0px (ver `ARQUITETURA.md` seção 19.8).
- Nunca combine `where(campo, '==', valor)` com `orderBy(outroCampo)` numa query do
  Firestore — exige índice composto criado manualmente em cada um dos 4 projetos Firebase.
  Ordenar no cliente depois do `getDocs` (padrão já usado em `buscarParcelasDaCompra`/
  `useLinhaDoTempo.js`).
- Um componente que só existe para ser renderizado dentro de outro (sem rota própria) não
  deve chamar `useGastos`/`useEntradas`/`useCartoes`/`useEmprestimos`/`useInvestimentos`
  (nem hooks que os chamem por dentro, como `useAdiantamento`) por conta própria — os
  dados devem vir por prop de quem já os busca (ver `ARQUITETURA.md` seção 19, princípio
  "um dono, vários apresentadores").
- Modal com campo de digitação deve envolver o conteúdo em `AreaFormulario`
  (`src/components/AreaFormulario.js`) e o `<Modal>` precisa de `statusBarTranslucent
  navigationBarTranslucent` — nunca `KeyboardAvoidingView`/`avoidKeyboard` próprios nem
  `ScrollView` solta. Conteúdo que já é `FlatList` usa `rolavel={false}`.
- **Nunca abrir um modal enquanto outro está aberto ou fechando, a não ser que o segundo seja
  desenhado DENTRO do primeiro** (filho na árvore). No iPhone isso deixa uma camada invisível que
  trava todos os toques (o app continua vivo, só não responde). Para trocar de modal (formulário →
  "Sucesso!", detalhes → edição/histórico, edição → confirmar exclusão) usar
  `useTrocaDeModal` (`src/hooks/useTrocaDeModal.js`): fecha o atual, `abrirDepoisDeFechar(...)` e
  `onDismiss={aoTerminarDeFechar}` no modal que fecha. Android não tem o problema — testar no iPhone.
- **Teste de teclado/modal no Expo Go não garante o APK** — já enganou uma vez (ver
  `PROJECT_STATUS.md` seção 24). Mudança de layout com teclado se valida no APK.
- **Número de versão:** o que o usuário vê no Sobre é o `versao` da primeira entrada de
  `src/config/changelog.js` (MAIOR.MENOR.CORREÇÃO) — a cada publicação, entrada nova com o número
  seguinte. **Não mudar `version` no `app.json`** fora de um build novo: ela entra na etiqueta
  automática do `meu-app` e o APK instalado para de receber atualizações.
- O ambiente `meu-app` (APK) usa `runtimeVersion: {policy: "fingerprint"}` (`app.config.js`); os
  demais usam `sdkVersion` (exigido pelo Expo Go). Entrou biblioteca com parte nativa → a
  etiqueta do `meu-app` muda sozinha → **gerar APK novo antes de publicar**; o APK antigo para de
  receber atualização (não quebra).
- As pastas `android/` e `ios/` **não** são versionadas (estão no `.gitignore` desde a remoção
  em `PROJECT_STATUS.md` seção 20) — o projeto é *managed workflow* e o `runtimeVersion` usa
  política automática. Não commitar essas pastas de novo (gerar build nativo local as cria): com
  elas o Expo volta a tratar o projeto como *bare* e recusa `{"policy": "sdkVersion"}`.
