# Status do Projeto

> Última atualização: 2026-07-28
> Este documento reflete o estado real do código no momento da análise, não intenções ou memória de conversas anteriores. Atualize-o sempre que o estado mudar de forma relevante.

## 1. Funcionalidades prontas (em uso, acessíveis pela navegação)

- **Autenticação por e-mail/senha**: login, registro (com validação de CPF/CNPJ e verificação de duplicidade), recuperação de senha (`ForgotPasswordScreen`) e redefinição (`ResetPasswordScreen`).
- **Resumo Mensal** (`ResumoMensal.js`): dashboard consolidado com totais previstos e realizados de entradas, gastos, empréstimos, cartões e investimentos.
- **Entradas** (`EntradasScreen.js` + `useEntradas`): CRUD de receitas do mês, com geração automática de entradas fixas a partir de modelos.
- **Saídas** (`SaidasScreen.js`): tela única que agrega Gastos, Empréstimos e Cartões em abas internas (não usa o arquivo `src/navigation/SaidasTabs.js`, que existe mas está órfão — ver seção 4).
  - **Gastos** (`useGastos`): CRUD de despesas fixas/variáveis, com geração automática via modelos e suporte a cálculo percentual sobre entradas selecionadas.
  - **Empréstimos** (`useEmprestimos`): controle de parcelas, com antecipação de parcelas e desconto.
  - **Cartões** (`useCartoes`): controle de compras e faturas por cartão.
- **Investimentos** (`InvestimentosScreen.js` + `useInvestimentos`): aportes, resgates e histórico de movimentações por investimento.
- **Modelos recorrentes** (`GerenciarModelosModal.js` + `useModelos`): cadastro de gastos/entradas fixos mensais, com modo de cálculo por valor fixo ou percentual.
- **Filtro de período persistente** (`DateFilterContext`): mês/ano selecionado salvo em `AsyncStorage`, com lógica de cálculo de parcela atual por data.
- **Modo privacidade** (`VisibilityContext` + `ToggleVisibilidade`): oculta/exibe valores monetários na UI, persistido localmente.
- **Multi-ambiente de build**: 4 variantes do mesmo app (dev, rafael, marina, christian), cada uma com projeto Firebase e Expo próprios, selecionadas via `APP_ENV`.
- **Menu do Usuário / Hub de Configurações** (Sprint 2, ver seção 8): acessível pelo cabeçalho (`👤 Nome ▼`), com Conta, Membros (unificado via `useMembros`), e placeholders para Financeiro/Cartões/Aparência/Notificações/Sobre.
- **Agenda Financeira e Central de Avisos** (Sprint 3, ✅ implementada e testada em 2026-07-28, ver seção 9): cabeçalho evoluiu para `👤 Nome ▼  🔔  📅` — o sino abre a Central de Avisos (Vencidos/Vencem hoje/Próximos 7 dias), o calendário abre a Agenda Financeira (Calendário mensal + Linha do Tempo). Cards de evento são totalmente interativos: reaproveitam `ModalDetalhes`/`ModalEdicao`/`ModalHistoricoParcelas` e o botão de status já existentes no resto do app.
- **Perfil do Usuário** (mini sprint, ✅ implementada em 2026-07-28, ver seção 10): `ContaScreen.js` permite editar o nome de exibição (`apelido`) diretamente; "Alterar senha" (`AlterarSenhaScreen.js`, já existia mas estava fora de navegação) agora está acessível por ali; fallback de nome melhorado (usa a parte antes do `@` do e-mail antes de cair em "Usuário" genérico); e `avatarUrl: null` já reservado no perfil para uma futura foto de usuário.

## 2. Em desenvolvimento (mudanças presentes no working tree, ainda não commitadas)

Conforme `git status` no momento desta análise:
- **Onboarding com mascote "coruja"**: `src/auth/OnboardingScreen.js`, `assets/CorujaSVG.js`, `assets/coruja-teste.png`, `assets/onboarding1-3.png`, `src/components/OwlEyeToggle.js` — todos novos, não commitados.
- **Fluxo de primeiro acesso**: `App.js` já contém a orquestração `ContaCriadaModal` → `OnboardingScreen` → app normal, controlada pelos campos `primeiroAcesso` e `jaViuOnboarding` no perfil do Firestore. `App.js` também mantém **duas versões antigas inteiras comentadas** dessa lógica no mesmo arquivo.
- **Ajustes em andamento** (arquivos modificados sem serem novos): `LoginScreen.js`, `RegisterScreen.js`, `useAuth.js`, `ContaCriadaModal.js`, `GerenciarModelosModal.js`, `MembroSelect.js`, `TelaPadrao.js`, `src/config/firebase.js` — indicando trabalho ativo no fluxo de registro/login e em ajustes de modelos/membros.

## 3. Planejadas / iniciadas mas não conectadas (scaffolding existente, não funcional)

- **Modo Família**: as telas e componentes existem (`MembrosScreen.js`, `GerenciarMembrosModal.js`, `MembroSelect.js`), mas:
  - `MembrosScreen` está **fora da navegação ativa** (`Tab.Screen` comentado em `BottomTabs.js`).
  - `useModelos.js` e `ModalHistoricoParcelas.js` leem `membroSelecionado` de `useAuth()`, mas o `AuthProvider` **nunca expõe esse campo** — o branch de "modo família" nesses hooks é código morto hoje.
  - `getBasePath(user, compartilhado)` nunca é chamado com `compartilhado=true` em nenhum lugar do app.
  - **Achado novo (2026-07-27, investigando o Menu do Usuário):** `MembrosScreen.js` usa uma coleção **global** `membros` (sem escopo de usuário!), diferente de `MembroSelect.js`/`GerenciarMembrosModal.js`, que usam corretamente `users/{uid}/membros`. Ou seja, existem **três** implementações de membros, não duas, e uma delas tem um bug de dados real (vazaria membros entre contas diferentes se fosse reativada como está). Não reaproveitar `MembrosScreen.js` sem reescrever — ver plano da Sprint 2 (seção 8) e `ARQUITETURA.md` seção 11.6.
  - **Conclusão**: o Modo Família tem UI parcial, mas nenhuma trilha de dados funcional até hoje.
- **Alterar Senha** (`AlterarSenhaScreen.js`): implementada, mas fora da navegação ativa (comentada em `BottomTabs.js`).
- **Login com Google** (`loginWithGoogle` em `useAuth.js`): implementado via `expo-auth-session` com fluxo manual de `authUrl`, mas não foi verificado nesta análise se o botão está exposto/funcional nas telas de login atuais.

## 4. Código morto identificado (candidatos a remoção, não removidos nesta análise)

- `src/navigation/SaidasTabs.js` — não é importado por nenhum outro arquivo.
- `src/screens/CartoesEmprestadosScreen.js` — não é importado por nenhum outro arquivo.
- Blocos grandes de código comentado em `App.js`, `src/components/MonthYearPicker.js` (duas versões antigas completas) e `src/screens/CartoesEmprestadosScreen.js`.
- ~~Dependências instaladas e nunca usadas~~ ✅ Removidas do `package.json` e `package-lock.json` (Sprint 1 / D1, 2026-07-24): `react-native-chart-kit`, `victory-native`, `@shopify/react-native-skia`, `d3-shape`, `react-native-vector-icons`, entrada corrompida `"undefined"`. `npm install` removeu 39 pacotes (diretos + transitivos). `npm audit` aponta 30 vulnerabilidades pré-existentes (1 baixa, 16 médias, 9 altas, 4 críticas) nas dependências restantes — não corrigidas nesta sprint (nenhuma ação de `npm audit fix` foi executada, para não trocar versões de dependência sem avaliação própria); candidato a item de segurança para revisar antes da publicação.
- Entrada corrompida no `package.json`: `"undefined": "\\"`.

## 5. Bugs conhecidos / riscos identificados

| Bug / risco | Onde | Gravidade |
|---|---|---|
| ~~Indicador de carregamento nunca aparece (`loading` fixo em `false`)~~ ✅ Corrigido (Sprint 1 / B1, 2026-07-24) | `TelaPadrao.js` + `EntradasScreen.js`/`InvestimentosScreen.js`/`SaidasScreen.js` | — `loading` agora é prop real, conectada aos hooks de dados nessas 3 telas |
| ~~Parse de valor monetário sem tratar vírgula decimal~~ ✅ Corrigido (Sprint 1 / A2, 2026-07-24) | `useGastos`, `useCartoes`, `useEmprestimos` | — agora usam `parseBRL` compartilhado |
| ~~Recalculo de `valorTotal` após antecipação de parcela incorpora valor já descontado~~ ✅ Corrigido (Sprint 1 / A3, 2026-07-24) | `useEmprestimos.js` | — `valorContratado` fixo desde a criação; `economiaTotal` (soma de descontos) derivada dele. Correção adicional em 2026-07-25 (achada na 1ª bateria de testes): "valor efetivamente pago" estava sendo calculado como `valorContratado - economiaTotal` (projeção do total final, não quanto já foi pago) — corrigido para somar só as parcelas com `pago`/`adiantada`, em `ModalDetalhes.js`/`ModalHistoricoParcelas.js` |
| ~~Barra de progresso do empréstimo nunca chegava a 100% havendo desconto~~ ✅ Corrigido (2026-07-25, 2ª bateria de testes) | `ModalDetalhes.js`, `ModalHistoricoParcelas.js` | — denominador da barra passou a ser `valorContratado - economiaTotal` (o que de fato será pago) só para empréstimo; cartão mantém o `valorReal` ao vivo (já reflete desconto). Adicionado selo "✅ Empréstimo quitado"/"Compra quitada" quando todas as parcelas estão pagas (checagem por contagem, não por dinheiro) |
| ~~Indicador "Progresso" da parcela mostrava a posição (`parcelaAtual/totalParcelas`), não quantas foram pagas~~ ✅ Corrigido (2026-07-25) | `ModalDetalhes.js` (case `emprestimo` e `cartao`) | — renomeado para "Parcelas Pagas", agora mostra `parcelasPagas/totalParcelas` |
| ~~Tela de Investimentos não tinha o toggle de ocultar valores~~ ✅ Corrigido (2026-07-25) | `TelaPadrao.js` | — o toggle estava acoplado ao mesmo bloco condicional do `MonthYearPicker` (`hideDateFilter`); como Investimentos usa `hideDateFilter={true}` (não tem filtro de mês), o toggle sumia junto sem necessidade |
| ~~Campo de valor na antecipação de parcelas com "pulo" de cursor~~ ✅ Corrigido (2026-07-25) | `ModalParcelasAdiantamento.js` | — reformatava a string a cada tecla manualmente; agora usa `useCurrencyInput`, mesmo padrão do resto do app |
| ~~Campo de valor em movimentações de investimento sem máscara monetária~~ ✅ Corrigido (2026-07-25) | `MovimentacaoInvestModal.js` | — era `TextInput` puro; agora usa `useCurrencyInput` |
| ~~Membro do modelo não copiado para a entrada gerada~~ ✅ Corrigido (2026-07-25) | `useEntradas.js` (`gerarFixosDoMes`) | — o objeto da entrada gerada nunca incluía o campo `membro` do modelo; `useGastos.js` não tem esse problema (gastos não usam o conceito de membro) |
| ~~FAB da tela de Investimentos não flutuava (ficava preso no fluxo do layout)~~ ✅ Corrigido (2026-07-25) | `TelaPadrao.js` | — `globalStyles.fabPrimary` não declara `position`/`right`/`bottom` (o `FabMenu`, usado pelas outras telas, fornece isso via seu próprio wrapper); o botão simples (usado só quando não há `fabActions`, caso de Investimentos) esquecia de declarar `position: 'absolute'` |
| Divisão de parcelas sem arredondamento de centavos | `useEmprestimos.js`, e também `ModalCriacao.js`/`GastoCartaoCard.js`/`TelaPadrao.js` (achado ampliado na varredura de 2026-07-24, ver seção 6) | Média |
| ~~`Math.max(0, ...)` mascarava saldo negativo real de investimento~~ ✅ Corrigido (Sprint 1 / A4, 2026-07-24) | `useInvestimentos.js` | — regra de negócio: saldo nunca fica negativo, validada em `addTransaction`/`updateTransaction`/`deleteTransaction`/`updateInvestment` (rejeitam a operação em vez de só clampar o valor exibido); `Math.max(0)` virou só rede de segurança visual para dados legados |
| Movimentações de investimento reescritas como array inteiro sem transação atômica | `useInvestimentos.js` | Média — risco de condição de corrida entre dispositivos |
| `idCompra` gerado sem sanitização (colisão possível) | `useCartoes.js` | Baixa/Média |
| "Fechamento estimado" de fatura hardcoded (`diaVencimento - 7`) | `useCartoes.js` | Baixa |
| ~~Validação de força de senha é só visual, não era exigida no submit~~ ✅ Corrigido (Sprint 1 / B2, 2026-07-24) | `RegisterScreen.js` | — `validarSenha()` existia mas nunca era chamada em `handleRegister` (achado durante a correção); agora é chamada, com regra rigorosa em produção e simplificada (`__DEV__`) em desenvolvimento |
| ~~Checagem de CPF/e-mail duplicado é só client-side, sem garantia atômica~~ ✅ Corrigido (Sprint 1, 2026-07-24) | `useAuth.js` register | — checagem de CPF agora via reserva `documentosCadastrados`, e-mail delegado ao Firebase Auth nativo, escrita em `writeBatch` |
| ~~Race condition entre `register()` e o listener `onAuthStateChanged`~~ ✅ Corrigido (Sprint 1, 2026-07-24) | `useAuth.js` | — descoberto durante a revisão do fluxo de cadastro; perfil podia nascer com dados incompletos dependendo de qual dos dois "ganhasse" a corrida |
| Bug de parse "vírgula sem tratar milhar" (`.replace(',','.')` sem `/g`) também presente em componentes de UI, não só nos hooks já corrigidos | `MovimentacaoInvestModal.js` (ativo hoje, campo não passa por `useCurrencyInput`), `ModalEdicao.js`, `GerenciarModelosModal.js`, `InvestimentosScreen.js` (latentes) | Alta em `MovimentacaoInvestModal.js`; Baixa nos demais |
| `firestore.rules` escrito e cobrindo `users/{uid}` + `documentosCadastrados`, mas **ainda não publicado** | projeto inteiro | 🔴 Crítica até o deploy — previsto para o final da Sprint 1, mediante autorização explícita |

## 6. Pendências técnicas (arquitetura/dívida)

Ver `ARQUITETURA.md` para o mapeamento completo de pastas/fluxos. Resumo das maiores dívidas:
- Duplicação de padrão CRUD+listener entre os hooks de dados (sem hook genérico compartilhado).
- "God components": `ModalCriacao.js` (837 linhas), `GerenciarModelosModal.js` (752), `SaidasScreen.js` (671), `TelaPadrao.js` (610), `ModalDetalhes.js` (513) — todos misturando lógica de negócio, validação e apresentação.
- `ModalCriacao.js` e `ModalEdicao.js` reimplementam os mesmos 5 tipos de formulário de formas diferentes (risco de campos divergirem entre criar e editar).
- `globalStyles.js` (1360 linhas) é dependência de 39 arquivos — qualquer mudança tem risco de efeito colateral amplo.
- `TelaPadrao.js` tem uma função inteira (`renderModalDetailsContent`) definida mas **nunca chamada** — código morto, o modal de detalhes exibido de fato é o `ModalDetalhes.js` importado. Encontrado em 2026-07-25 investigando o indicador "Progresso"; não removido (fora do escopo pedido), candidato a limpeza futura.

### Backlog arquitetural — riscos residuais aceitos conscientemente (autenticação, 2026-07-24)

Registrado durante a revisão da Sprint 1, para não implementar agora, mas não esquecer:

- **Conta órfã em caso de falha entre `createUserWithEmailAndPassword` e `batch.commit()`**: se a rede cair, o app for encerrado, ou o Firestore falhar transitoriamente nesse intervalo, a conta de autenticação existe sem perfil/reserva de CPF. Recuperação parcial e orgânica já existe (login recria um perfil mínimo via `criarUserProfileSeNaoExistir`), mas perde `documento`/`apelido`/`tipoDocumento` originais. Resolução completa exigiria uma Cloud Function com rollback — infraestrutura fora do escopo atual.
- **Ciclo de vida de `documentosCadastrados` na exclusão de conta**: hoje não existe fluxo de exclusão de conta no app. Quando existir, decidir entre: (A) apagar a reserva junto (exige mudar a regra `delete`), (B) nunca apagar (simples, mas usuário não recadastra com o mesmo CPF), (C) marcar como liberada em vez de apagar (recomendado, mas exige mecanismo confiável de "quem pode liberar o quê"), (D) delegar a uma Cloud Function. Ver `ARQUITETURA.md` para a comparação completa.

### Backlog — varredura de manipulação de valores monetários (2026-07-24, fora do escopo da Sprint 1)

Varredura completa do app em busca de parse/formatação/cálculo de dinheiro fora dos hooks já corrigidos no A2. Achados classificados (impacto/risco/prioridade), para decidir em sprints futuras:

| # | Achado | Prioridade |
|---|---|---|
| 1 | 5 implementações paralelas de parse/formatação de moeda (`formatarValor.js`, `GerenciarModelosModal.js`, `EstatisticasComponent.js`, `SaidasScreen.js`, `VisibilityContext.js` — esta última é a mais usada no app) | 🟠 Alta |
| 2 | Bug "vírgula sem tratar milhar" ativo em `MovimentacaoInvestModal.js` (campo não passa por `useCurrencyInput`) | 🔴 Alta |
| 3 | Divisão de parcelas sem arredondamento (`ModalCriacao.js`) + reconstituição inversa em 3 lugares (`GastoCartaoCard.js`, `TelaPadrao.js`) — risco de "drift" de centavos visível ao usuário | 🟠 Alta |
| 2b | Mesmo bug de vírgula, mas em código hoje inativo (`ModalEdicao.js`, `GerenciarModelosModal.js`, `InvestimentosScreen.js`) | 🟡 Média |
| 4 | Somas/percentuais financeiros recalculados de forma independente em 6+ telas/componentes (`ResumoMensal.js`, `EstatisticasComponent.js`, `SaidasScreen.js`, `SecaoEntradas.js`, `ModalDetalhes.js`, `ModalHistoricoParcelas.js`) | 🟡 Média |
| 5 | `ResumoMensal.js` soma valores sem conversão numérica defensiva (`entrada.valor \|\| 0` sem `Number()`/`parseBRL`) | 🟡 Média |
| 6 | 3 implementações independentes do mesmo cálculo de progresso de investimento (`SecaoInvestimentos.js`, `TelaPadrao.js`, `DetalhesInvestimentoModal.js`) | 🟢 Baixa |

### Backlog — Sprint de Qualidade (futura, sem data definida)

Registrado em 2026-07-28, por decisão explícita do usuário: o produto ainda está em fase de evolução rápida e vai continuar recebendo mudanças estruturais nas próximas sprints — investir em qualidade agora tende a exigir retrabalho. Quando a arquitetura e os principais fluxos estiverem mais estabilizados, dedicar uma sprint específica para:
- Infraestrutura de testes automatizados (nenhuma existe hoje — nem `jest` no `package.json`). Primeira candidata natural: `normalizarEventos()` (`src/utils/eventosFinanceiros.js`), por ser lógica pura já isolada especificamente para ser testável (ver `SPRINT3_DISCOVERY.md`).
- Revisão da dívida técnica já mapeada nesta seção (duplicação de CRUD+listener, "god components", `ModalCriacao`/`ModalEdicao` duplicando os 5 formulários, etc.).
- Limpeza de código morto já identificada (seção 4).
- Reavaliação geral dos riscos de prioridade 🟡/🟢 ainda em aberto nas seções 5 e 6.

## 7. Próximos passos sugeridos (não iniciar sem alinhar antes)

1. Decidir explicitamente o destino do Modo Família neste ciclo: terminar a integração (contexto de membro real) ou remover o scaffolding morto até a fase "Modo Família" do roadmap.
2. Versionar `firestore.rules` antes de qualquer publicação (bloqueador para a fase "Publicação" do roadmap).
3. Finalizar e commitar o fluxo de onboarding em andamento.
4. Limpar código morto e dependências não usadas (baixo risco, alto ganho de clareza).
5. Só então avançar para os itens estruturais maiores (unificação de hooks, unificação Criação/Edição) descritos em `ARQUITETURA.md`.

## 8. Sprint 2 (✅ implementada em 2026-07-27) — Menu do Usuário / Hub de Configurações

Arquitetura completa em `ARQUITETURA.md` seção 11. Todos os 7 passos da proposta foram implementados nesta sessão — pendente apenas a **validação manual do usuário** (ainda não testado num app rodando). Escopo "Agora" desta sprint vs. "Futuro" (não implementado ainda):

| Categoria | Agora (Sprint 2) | Futuro (backlog, não fazer agora) |
|---|---|---|
| 👤 Conta | Ver nome, ver e-mail, logout (com confirmação) | Alterar nome/e-mail/senha (`AlterarSenhaScreen.js` já pronta para reaproveitar), vincular Google, excluir conta, gerenciamento de plano |
| 💰 Financeiro | Só estrutura (tela placeholder) | Moeda, backup/importação/exportação |
| 👥 Membros | Tela oficial de administração, consumindo o novo `useMembros.js` (mesma lógica do seletor rápido — elimina a triplicação, ver seção 3) | Convite por link, permissões (Modo Família), **avatares por membro** (ver nota abaixo) |
| 💳 Cartões | Só estrutura (tela placeholder — hoje não existe nem o conceito de "cartão cadastrado" separado de lançamento) | Cartão padrão, ordenar, arquivar, configurações específicas |
| 🎨 Aparência | Só estrutura (tela placeholder) | Tema claro/escuro/automático, personalizações |
| 🔔 Notificações | Só estrutura (tela placeholder) | Contas vencendo, parcelas, investimentos, metas, lembretes |
| ℹ️ Sobre | Versão do app, nome do app | Changelog, política de privacidade, termos, contato |
| 🚪 Sair | Logout com confirmação | — |

**Ideia registrada para o futuro (não implementar agora): avatares por membro.** O usuário quer que cada membro cadastrado possa ter um avatar — três formas cogitadas: (1) upload de foto com geração automática de um avatar parecido, (2) montagem por seleção de base + características, (3) avatares prontos (hoje existem 4 imagens de teste hardcoded: `assets/Rafael.png`, `Kézzia.png`, `Marina.png`, `Léo.png`, usadas só em `SecaoEntradas.js` via um mapa fixo nome→imagem, não conectadas a nenhum campo do Firestore). Cogitado também "importar" avatar de outro membro quando o Modo Família existir. Preparação já feita nesta sprint: `useMembros.js` já grava um campo `avatar: null` em cada membro, para que a funcionalidade futura não exija migração de dados — nenhuma UI de avatar foi construída agora.

**Fora do escopo desta sprint** (mencionados pelo usuário como visão de longo prazo, não implementar): busca global, filtros avançados, dashboard financeiro mais completo, metas financeiras, categorias inteligentes, planejamento financeiro, IA, relatórios, backup/sincronização, preferências gerais, recursos Premium. A arquitetura da Sprint 2 (Stack de categorias + padrão de tela-placeholder) é o que permite que cada um desses itens "encaixe" numa categoria existente depois, sem reorganizar o menu.

## 9. Sprint 3 (✅ implementada e testada em 2026-07-28) — Agenda Financeira e Central de Avisos

Discovery completo em `SPRINT3_DISCOVERY.md` (arquitetura, alternativas avaliadas e escopo negociado com o usuário antes da implementação). Objetivo: primeira camada da "inteligência temporal" do app — mostrar o que vai acontecer, não só o que já aconteceu. Arquitetura detalhada em `ARQUITETURA.md` seção 12.

| Categoria | Agora (Sprint 3) | Futuro (backlog, não fazer agora) |
|---|---|---|
| 📅 Agenda Financeira | Tela com duas abas: **Calendário** (`react-native-calendars`, marcação de dia com movimentação + conta vencida + dia selecionado, com legenda) e **Linha do Tempo** (lista cronológica dos próximos 14 dias, agrupada por rótulo relativo) | Saldo projetado por dia dentro da Linha do Tempo (Sprint 4) |
| 🔔 Central de Avisos | Tela simples (sem configuração): Vencidos / Vencem hoje / Próximos 7 dias | Antecedência configurável (1/3/7 dias), notificação do sistema operacional (`expo-notifications` — sprint própria, exige build nativo) |
| 🧭 Navegação | Cabeçalho evoluiu para `👤 Nome ▼  🔔  📅` — sino e calendário abrem direto, sem passar pelo Menu do Usuário | — |
| 🔁 Interatividade | Tocar num evento abre `ModalDetalhes`/`ModalEdicao` (mesmos componentes já usados em Entradas/Saídas); botão de status reaproveita `BotaoStatusPagamento` (extraído de `TelaPadrao.js` nesta sprint — única implementação usada nas duas superfícies) | Ação rápida de "antecipar parcelas" no card (hoje só disponível nas telas de origem) |
| 🗓️ Widgets | Só documentado (viabilidade estudada no discovery) | Fica só no roadmap — exige build nativo por plataforma e Swift no iOS |

**Peça central de arquitetura**: `src/hooks/useEventosFinanceiros.js` — normaliza gastos/entradas/cartões/empréstimos num formato comum (`{ id, tipo, descricao, valor, data, pago, origem, cor, itemOriginal }`) e expõe `toggleStatus`/`editar`/`excluir`, que despacham para as mesmas funções de CRUD que as telas atuais já usam (nenhuma regra de negócio nova). É a única fonte de dados da Agenda e da Central de Avisos — pensada para também alimentar, no futuro, notificações do SO e regras de "inteligência" (Fase 6 do roadmap) sem precisar duplicar a lógica de agregação.

**Limitações conhecidas, aceitas conscientemente** (ver `SPRINT3_DISCOVERY.md` para o raciocínio completo):
- "Vencidos" só enxerga atraso dentro do mês atual + mês seguinte (janela de dados que o hook sempre busca) — um lançamento não pago esquecido há vários meses não aparece.
- Gastos/entradas fixos com modo de cálculo "porcentagem" não são projetados em meses futuros ainda não visitados (dependeriam de entradas daquele mês futuro, que ainda não existem) — só modelos em modo "valor" aparecem projetados.
- Eventos projetados (`origem: 'projetado'`, ainda não gravados no Firestore) não são interativos — sem `itemOriginal`, não há o que tocar/editar.
- `useProximosEventos` mantém 8 listeners `onSnapshot` simultâneos (2 meses × 4 hooks) quando usado — consistente com o padrão já existente no app (`ARQUITETURA.md` seção 10), não uma regressão nova.

**Nova dependência**: `react-native-calendars` (JS puro, sem código nativo — não exige rebuild). Avaliada no discovery quanto à maturidade: ativamente publicada (Wix), mas com histórico de resposta lenta da comunidade a issues/PRs — aceito conscientemente por não haver alternativa mais madura para o caso de uso.

**Ajuste pós-teste (2026-07-28)**: o mapa de calor de intensidade (3 níveis de opacidade conforme volume do dia) foi removido a pedido do usuário — não ficava claro para quem usa pela primeira vez. Hoje todo dia com movimentação usa a mesma cor/opacidade; a legenda (`LegendaCalendario.js`) foi ajustada para refletir isso.

**Testes automatizados**: proposta de `jest` + teste unitário de `normalizarEventos()` foi levantada e adiada a pedido do usuário (priorizar a validação manual da experiência primeiro) — projeto continua sem nenhuma infraestrutura de teste. Retomar essa conversa é recomendado antes de a lógica de projeção/agregação crescer mais.

## 10. Mini sprint (✅ implementada em 2026-07-28) — Perfil do Usuário

Motivada por um sintoma relatado pelo usuário durante o teste da Sprint 3: uma conta antiga mostrava "Olá, Usuário" no cabeçalho, enquanto uma conta nova mostrava o nome corretamente.

### Investigação (achado, não uma correção de dado)

Confirmado via histórico do git, não é uma inconsistência de dado a corrigir — é uma diferença real entre versões do fluxo de cadastro:
- **Até o commit `7a3b25f`** (04/11/2025): `register()` em `useAuth.js` só chamava `createUserWithEmailAndPassword` — **nenhum** documento era criado em `users/{uid}`, e o formulário de registro nem tinha campo de apelido.
- **A partir do commit `007c167`** (14/11/2025): o formulário ganhou o campo "Como você quer ser chamado(a)?" e `register()` passou a gravar `apelido` desde a criação.
- Contas criadas antes disso só ganharam um perfil no Firestore mais tarde, pelo mecanismo de recuperação `criarUserProfileSeNaoExistir` (roda a cada login/abertura do app para quem ainda não tem perfil) — que usa `firebaseUser.displayName` como fallback para `nome`/`apelido`. Como o fluxo antigo nunca definia `displayName` no Firebase Auth, esse fallback vira string vazia. Daí o "Usuário" genérico.

### O que foi implementado

- **`src/utils/perfil.js`** (novo): `getNomeExibicao(profile)` — única fonte da regra de fallback (`apelido` → `nome` → parte antes do `@` do e-mail → `"Usuário"`), usada em `TelaPadrao.js`, `UserMenu.js` e `ContaScreen.js` (antes, os 3 repetiam a mesma cadeia `apelido || nome || 'Usuário'` — agora há um só lugar).
- **`useAuth.js`**: nova função `atualizarPerfil(dados)` (grava via `updateDoc` em `users/{uid}` e atualiza o estado local); `avatarUrl: null` passou a ser gravado desde a criação do perfil (`register()` e `criarUserProfileSeNaoExistir()`), mesmo padrão do `avatar: null` já usado em `useMembros.js` — só para não exigir migração quando a foto de usuário for implementada de verdade. Nenhuma UI de avatar funcional foi construída.
- **`ContaScreen.js`**: nome de exibição agora é editável (toca no nome → campo de texto + Salvar/Cancelar → grava em `apelido` via `atualizarPerfil`); ícone de avatar ganhou um badge de câmera só decorativo (indica o espaço reservado, sem nenhuma ação); novo item "Alterar senha", linkando para `AlterarSenhaScreen.js` (já existia e já funcionava — só estava fora de navegação).
- **`MainStack.js`**: nova rota `AlterarSenha`.

### Observação encontrada durante a implementação (não corrigida, fora do pedido)

`AlterarSenhaScreen.js` foi escrita para ser usada fora de um Stack com cabeçalho nativo — ela tem seu próprio título/ícone e um link de texto "Voltar" internos. Agora que está dentro do `MainStack` (que já mostra cabeçalho nativo com título e seta de voltar), há uma pequena redundância visual (título e "voltar" aparecem duas vezes). Funciona corretamente, só não está com a aparência mais limpa possível — candidato a um ajuste cosmético pequeno numa próxima passada, não implementado agora por não ter sido pedido.

### O que ficou de fora desta mini sprint (por decisão do usuário/escopo)

- Alterar e-mail, vincular Google, excluir conta, gerenciamento de plano — candidatos a sprints futuras de Conta.
- Upload/edição de foto de verdade — só o campo de dado (`avatarUrl`) e o indicativo visual foram preparados.
