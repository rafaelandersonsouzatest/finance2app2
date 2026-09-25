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
- `firestore.rules` existe e está versionado (cobre `users/{uid}` + `documentosCadastrados`),
  mas **ainda não foi publicado** no Firebase — não assumir que o banco está protegido em
  produção até a publicação acontecer.
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
- A pasta `android/` está commitada por engano (Sprint 6) e faz o Expo tratar o projeto como
  *bare workflow* — por isso `runtimeVersion` no `app.json` não pode usar
  `{"policy": "sdkVersion"}` (o Expo recusa), tem que ser um valor fixo no formato
  `exposdk:X.Y.Z`, atualizado manualmente a cada upgrade de SDK do Expo. Se esquecer de
  atualizar depois de um upgrade de SDK, o Expo Go mostra "not compatible" mesmo com o
  bundle certo (ver `PROJECT_STATUS.md` seção 19.1).
