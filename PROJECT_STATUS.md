# Status do Projeto

> Última atualização: 2026-09-19
> Este documento reflete o estado real do código no momento da análise, não intenções ou memória de conversas anteriores. Atualize-o sempre que o estado mudar de forma relevante.

## 0. Releases publicadas (EAS Update / OTA)

| Release | Data | Commit | Apps | Branch |
|---|---|---|---|---|
| **0.2.0** — Hub do Usuário, Agenda Financeira e Perfil | 2026-07-28 | `63b5375` | `meu-app`, `rafael`, `christian` | `main` |
| **0.3.0** — Sprint 4: Categorias e Subcategorias (base do Planejamento Financeiro) | 2026-07-29 | `b6c1715` | `meu-app`, `rafael`, `christian` | `main` |
| **0.3.1** — chore: owner do Expo do ambiente Convidado renomeado para `finance-app-convidado` | 2026-07-29 | `e48014e` | `meu-app`, `rafael`, `christian` | `main` |
| **0.4.0** — Sprint 5: Sistema de Identidade e Avatares | 2026-07-30 | `47cd7a7` | `meu-app`, `rafael`, `christian` | `main` |
| **0.5.0** — Linha do Tempo estendida (Gastos/Entradas/Investimentos), fix de login Google e infraestrutura local de Colaboração entre Usuários | 2026-08-14 | `bd824c6` | `meu-app`, `rafael`, `christian` | `main` |
| **0.6.0** — Migração Expo SDK 54→57 (ver seção 19). Como não havia publicação desde a 0.5.0 (14/08), esta release também levou junto todo o acumulado no meio tempo: Sprint 6 (Cartões, seção 14), refactor de carregamento em `SaidasScreen` (seção 17), e as Etapas 3–4 de Colaboração entre Usuários (divisão de despesa, seção 18) — permanece **atrás de flag**, não fica visível para o usuário. | 2026-09-19 | `5315841` | `meu-app`, `rafael`, `christian` | `main` |
| **0.6.1** — Corrige `runtimeVersion` (era `"1.0.0"`, um texto fixo sem relação com o SDK; passou a `"exposdk:57.0.0"`) que impedia o Expo Go de abrir a atualização publicada em 0.6.0 mesmo com o SDK certo — ver seção 19.1. Aproveitada para remover 2 warnings: chamada legada de `LayoutAnimation` (no-op na New Architecture, `EstatisticasComponent.js`) e Firebase Auth sem persistência configurada para React Native (`src/config/firebase.js`, usuário era deslogado a cada reabertura do app). | 2026-09-19 | *(pendente de commit)* | `meu-app`, `rafael`, `christian` | `main` |

Publicada com o script `publish-all.ps1` (novo, raiz do projeto — ver seção 11). Antes desta release, corrigido um bug de configuração que impedia publicar para `christian`: `app.config.js` tinha um `owner` fixo (`rafael.anderson.souza`) para todos os ambientes, mas o projeto `christian` (hoje o ambiente de distribuição para convidados/testadores externos) pertence a uma organização Expo diferente (`finance-app-convidado`) — `owner` agora varia por `APP_ENV`, mesmo padrão já usado para `name`/`slug`/`projectId` (ver `ARQUITETURA.md` seção 7).

### Como usar `publish-all.ps1` nas próximas releases

1. Garanta que o repositório está limpo e que o commit que você quer publicar já foi commitado (`git status`, `git rev-parse --short HEAD`).
2. Rode `.\publish-all.ps1` na raiz do projeto (PowerShell).
3. Quando pedir, digite a mensagem da release (ex.: `Release 0.2.1 - ...`).
4. O script publica automaticamente para `meu-app`, `rafael` e `christian`, sempre na branch `main`, definindo e depois limpando `APP_ENV`.
5. Ao final, ele mostra um relatório com o resultado (OK/ERRO) de cada app — se algum falhar, revise a mensagem de erro antes de tentar de novo (os demais já publicados não precisam ser repetidos).

O script **não** publica para `marina` — se um dia isso for necessário, é só adicionar `"marina"` à lista `$apps` no início do arquivo.

## 1. Funcionalidades prontas (em uso, acessíveis pela navegação)

- **Autenticação por e-mail/senha**: login, registro (com validação de CPF/CNPJ e verificação de duplicidade), recuperação de senha (`ForgotPasswordScreen`) e redefinição (`ResetPasswordScreen`).
- **Login com Google** (`loginWithGoogle` em `useAuth.js`, via `expo-auth-session`): botão exposto e conectado em `LoginScreen.js` (`handleLoginGoogle` → `loginWithGoogle()`). Verificado em 2026-08-06 — não é scaffolding desconectado. O que não foi testado é o fluxo OAuth ponta a ponta (depende de configuração externa no provedor Google).
- **Resumo Mensal** (`ResumoMensal.js`): dashboard consolidado com totais previstos e realizados de entradas, gastos, empréstimos, cartões e investimentos.
- **Entradas** (`EntradasScreen.js` + `useEntradas`): CRUD de receitas do mês, com geração automática de entradas fixas a partir de modelos.
- **Saídas** (`SaidasScreen.js`): tela única que agrega Gastos, Empréstimos e Cartões em abas internas — única dona dos dados/hooks; `GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js` são componentes de apresentação pura, sem hook próprio (ver `ARQUITETURA.md` seção 19).
  - **Gastos** (`useGastos`): CRUD de despesas fixas/variáveis, com geração automática via modelos e suporte a cálculo percentual sobre entradas selecionadas.
  - **Empréstimos** (`useEmprestimos`): controle de parcelas, com antecipação de parcelas e desconto.
  - **Cartões** (`useCartoes`): controle de compras e faturas por cartão.
- **Investimentos** (`InvestimentosScreen.js` + `useInvestimentos`): aportes, resgates e histórico de movimentações por investimento.
- **Modelos recorrentes** (`GerenciarModelosModal.js` + `useModelos`): cadastro de gastos/entradas fixos mensais, com modo de cálculo por valor fixo ou percentual.
- **Filtro de período persistente** (`DateFilterContext`): mês/ano selecionado salvo em `AsyncStorage`, com lógica de cálculo de parcela atual por data.
- **Modo privacidade** (`VisibilityContext` + `ToggleVisibilidade`): oculta/exibe valores monetários na UI, persistido localmente.
- **Multi-ambiente de build**: 4 variantes do mesmo app (dev, rafael, marina, christian), cada uma com projeto Firebase e Expo próprios, selecionadas via `APP_ENV`. A variante `christian` deixou de representar uma pessoa específica e passou a ser usada como ambiente de distribuição para convidados/testadores externos (nome exibido no app: "Financeiro - Convidado"); a infraestrutura técnica (Firebase, Expo, EAS, `APP_ENV`, `owner`, `slug`) foi mantida por compatibilidade.
- **Menu do Usuário / Hub de Configurações** (Sprint 2, ver seção 8): acessível pelo cabeçalho (`👤 Nome ▼`), com Conta, Membros (unificado via `useMembros`), e placeholders para Financeiro/Cartões/Aparência/Notificações/Sobre.
- **Agenda Financeira e Central de Avisos** (Sprint 3, ✅ implementada e testada em 2026-07-28, ver seção 9): cabeçalho evoluiu para `👤 Nome ▼  🔔  📅` — o sino abre a Central de Avisos (Vencidos/Vencem hoje/Próximos 7 dias), o calendário abre a Agenda Financeira (Calendário mensal + Linha do Tempo). Cards de evento são totalmente interativos: reaproveitam `ModalDetalhes`/`ModalEdicao`/`ModalHistoricoParcelas` e o botão de status já existentes no resto do app.
- **Perfil do Usuário** (mini sprint, ✅ implementada em 2026-07-28, ver seção 10): `ContaScreen.js` permite editar o nome de exibição (`apelido`) diretamente; "Alterar senha" (`AlterarSenhaScreen.js`, já existia mas estava fora de navegação) agora está acessível por ali; fallback de nome melhorado (usa a parte antes do `@` do e-mail antes de cair em "Usuário" genérico); e `avatarUrl: null` já reservado no perfil para uma futura foto de usuário.
- **Categorias e Subcategorias / módulo Planejamento Financeiro** (Sprint 4, ✅ implementada em 2026-07-28, ver seção 11): categorias deixaram de ser texto solto no aparelho e viraram entidade sincronizada do Firestore, com hierarquia (categoria → subcategoria), gerenciável em Menu do Usuário → Planejamento Financeiro → Categorias. Primeira funcionalidade do novo módulo Planejamento Financeiro, que vai abrigar Metas Financeiras (Sprint 6), Orçamentos, Limites e Relatórios.
- **Identidade e Avatares** (Sprint 5, ✅ implementada em 2026-07-30, ver seção 12): "usuário autenticado" e "Membro" deixaram de ser dois conceitos paralelos — todo usuário ganha um membro-espelho automaticamente (`ehProprietario: true`), e "Comprador" (cartão) e "Membro" (entrada) foram unificados num único seletor (`membroId`/`membroNome`). Todo Membro (cadastrado ou "Outra pessoa..." informal) tem um avatar vetorial gerado automaticamente (DiceBear/`avataaars`), com editor completo por seções (rosto, cabelo, barba, roupa, expressão, acessórios, fundo).
- **Parcelas personalizadas no cartão** (✅ implementada em 2026-08-03, ver seção 13): uma compra parcelada no cartão pode ter parcelas com valores diferentes entre si (ex.: taxa de emissão só na 1ª parcela) via a opção opcional "Editar valores das parcelas", tanto na criação quanto na edição de uma compra já existente. O comportamento automático (parcelas iguais) continua sendo o padrão em 100% dos casos que não usarem essa opção.
- **Entidade Cartões / Carteira** (✅ implementada em 2026-08-05, ver seção 14): "Cartão" deixou de ser uma string livre digitada em cada compra e virou uma entidade própria (`useCarteira.js`, coleção `users/{uid}/carteira`), no mesmo padrão de Categorias e Membros — cadastro com nome, banco, últimos 4 dígitos, cor, dia de vencimento e de fechamento, gerenciável em Menu do Usuário → Cartões (deixou de ser placeholder), com um seletor próprio (`CartaoSelect`) substituindo o campo de texto livre em `ModalCriacao`/`ModalEdicao`. Compras antigas (só o nome em texto, sem cartão cadastrado) continuam funcionando sem qualquer migração.

## 2. Em desenvolvimento (mudanças presentes no working tree, ainda não commitadas)

Conforme `git status` no momento desta análise:
- **Onboarding com mascote "coruja"**: `src/auth/OnboardingScreen.js`, `assets/CorujaSVG.js`, `assets/coruja-teste.png`, `assets/onboarding1-3.png`, `src/components/OwlEyeToggle.js` — todos novos, não commitados.
- **Fluxo de primeiro acesso**: `App.js` já contém a orquestração `ContaCriadaModal` → `OnboardingScreen` → app normal, controlada pelos campos `primeiroAcesso` e `jaViuOnboarding` no perfil do Firestore. `App.js` também mantém **duas versões antigas inteiras comentadas** dessa lógica no mesmo arquivo.
- **Ajustes em andamento** (arquivos modificados sem serem novos): `LoginScreen.js`, `RegisterScreen.js`, `useAuth.js`, `ContaCriadaModal.js`, `GerenciarModelosModal.js`, `MembroSelect.js`, `TelaPadrao.js`, `src/config/firebase.js` — indicando trabalho ativo no fluxo de registro/login e em ajustes de modelos/membros.

## 3. Planejadas / iniciadas mas não conectadas (scaffolding existente, não funcional)

- **Modo Família**: as telas e componentes existem (`MembrosScreen.js`, `GerenciarMembrosModal.js`, `MembroSelect.js`), mas:
  - `MembrosScreen` está **fora da navegação ativa** (`Tab.Screen` comentado em `BottomTabs.js`).
  - **Arquitetura oficial decidida na Sprint 5** (ver `SPRINT5_DISCOVERY.md`): quando o Modo Família for implementado de verdade, o dado compartilhado vive em `tenants/{tenantId}` (via `getBasePath(user, compartilhado)`), não em `users/{outroUid}`. A arquitetura concorrente que existia antes — `useModelos.js` e `ModalHistoricoParcelas.js` lendo `membroSelecionado` de `useAuth()` (campo nunca exposto pelo `AuthProvider`, logo sempre código morto) e o campo `compartilhadoCom` (nunca gravado em lugar nenhum) — foi **removida** nesta sprint, para não deixar duas arquiteturas concorrentes no código.
  - `getBasePath(user, compartilhado)` nunca é chamado com `compartilhado=true` em nenhum lugar do app.
  - **✅ Corrigido — achado de 2026-07-27 estava desatualizado**: `MembrosScreen.js` foi reescrita em 2026-07-27 e hoje usa `useMembros()`, exatamente como `MembroSelect.js`/`GerenciarMembrosModal.js` (todos em `users/{uid}/membros`, com escopo por usuário). Não existe mais coleção global nem risco de vazamento entre contas — as três telas convergem para a mesma fonte de dados. Reverificado nesta rodada (2026-08-07) lendo o arquivo atual, não apenas esta documentação.
  - **Conclusão**: o Modo Família tem UI parcial (sem `tenantId`/compartilhamento), mas a infraestrutura de Membros por usuário (`useMembros.js` + as três telas) está funcional e é uma base reaproveitável quando o modo família for implementado de verdade — não é código morto.
- **Alterar Senha** (`AlterarSenhaScreen.js`): implementada, mas fora da navegação ativa (comentada em `BottomTabs.js`).

## 4. Código morto identificado (candidatos a remoção, não removidos nesta análise)

- ~~`src/navigation/SaidasTabs.js`~~ ✅ Removido (Sprint de Saneamento, 2026-08-06, ver `ARQUITETURA.md` seção 19).
- ~~`src/screens/CartoesEmprestadosScreen.js`~~ ✅ Removido (Sprint de Saneamento, 2026-08-06).
- Blocos grandes de código comentado em `App.js` e `src/components/MonthYearPicker.js` (duas versões antigas completas).
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
| ~~Divisão de parcelas sem arredondamento de centavos~~ ✅ Corrigido (2026-08-06) | `src/utils/parcelamento.js` (`dividirValorIgualmente`) | — dividia em reais fracionados e arredondava cada parcela de forma independente (R$100 ÷ 3 = 3× R$33,33 = R$99,99, um centavo a menos que o total). Agora divide em centavos inteiros e distribui o resto da divisão nas últimas parcelas — a soma bate exatamente com o total em qualquer divisão. Corrige de uma vez a criação automática, o editor de parcelas personalizadas e a redistribuição por exclusão, que reaproveitam a mesma função — ver `ARQUITETURA.md` seção 20 |
| ~~`Math.max(0, ...)` mascarava saldo negativo real de investimento~~ ✅ Corrigido (Sprint 1 / A4, 2026-07-24) | `useInvestimentos.js` | — regra de negócio: saldo nunca fica negativo, validada em `addTransaction`/`updateTransaction`/`deleteTransaction`/`updateInvestment` (rejeitam a operação em vez de só clampar o valor exibido); `Math.max(0)` virou só rede de segurança visual para dados legados |
| ~~Movimentações de investimento reescritas como array inteiro sem transação atômica~~ ✅ Corrigido (2026-08-06) | `useInvestimentos.js` (`addTransaction`/`updateTransaction`/`deleteTransaction`/`updateInvestment`) | — trocado `getDoc`+`updateDoc` por `runTransaction`: se dois dispositivos editarem o mesmo investimento ao mesmo tempo, o Firestore reexecuta a função automaticamente com os dados mais recentes em vez de um sobrescrever o outro |
| ~~`idCompra` gerado sem sanitização (colisão possível)~~ ✅ Corrigido (2026-08-06) | `useCartoes.js` (`addCartao`) | — duas compras com a mesma descrição na mesma data (comum: mesma loja, mesmo dia, sem cartão cadastrado) geravam o mesmo `idCompra` e misturavam as parcelas das duas compras no mesmo grupo. Acrescentado sufixo de timestamp, mesmo critério já usado em `useEmprestimos.js`. Só afeta compras novas — sem migração |
| ~~"Fechamento estimado" de fatura hardcoded (`diaVencimento - 7`)~~ ✅ Resolvido para cartões cadastrados (2026-08-05, Sprint 6) | `useCartoes.js` | — `diaFechamento` real vem do cadastro do cartão (`useCarteira.js`) quando o lançamento referencia um; a estimativa continua só para cartão informal/lançamento antigo, sem cadastro — ver seção 14 |
| ~~Reverter antecipação de parcela do cartão não restaura a data original~~ ✅ Corrigido (2026-08-06) | `useCartoes.js` (`anteciparParcelas`) | — `anteciparParcelas` nunca gravava `mesOriginal`/`anoOriginal` (só `useEmprestimos.js` gravava), então reverter sempre caía no fallback `atual.mes`/`atual.ano` (o mês da antecipação, não o original). Agora grava os dois campos, mesmo critério de `useEmprestimos.js` — a branch de reversão em `updateCartao` já sabia usá-los, só faltava alguém gravar |
| ~~`typeof x === 'object'` sem excluir `null` produzia `membro`/`categoria: undefined` (Firestore rejeita em qualquer escrita futura)~~ ✅ Corrigido (2026-08-04) | Varredura completa em todos os hooks/listeners — `useCartoes.js`, `useEntradas.js` (os 2 com o padrão em si), e o mesmo risco de campo sem fallback também em `useGastos.js`/`useEmprestimos.js` (`gerarFixosDoMes`/`addEmprestimo`) | — ver seção 13 para o detalhe completo; `useInvestimentos.js`/`useMembros.js`/`useCategorias.js`/`useModelos.js` auditados e já estavam seguros |
| ~~Validação de força de senha é só visual, não era exigida no submit~~ ✅ Corrigido (Sprint 1 / B2, 2026-07-24) | `RegisterScreen.js` | — `validarSenha()` existia mas nunca era chamada em `handleRegister` (achado durante a correção); agora é chamada, com regra rigorosa em produção e simplificada (`__DEV__`) em desenvolvimento |
| ~~Checagem de CPF/e-mail duplicado é só client-side, sem garantia atômica~~ ✅ Corrigido (Sprint 1, 2026-07-24) | `useAuth.js` register | — checagem de CPF agora via reserva `documentosCadastrados`, e-mail delegado ao Firebase Auth nativo, escrita em `writeBatch` |
| ~~Race condition entre `register()` e o listener `onAuthStateChanged`~~ ✅ Corrigido (Sprint 1, 2026-07-24) | `useAuth.js` | — descoberto durante a revisão do fluxo de cadastro; perfil podia nascer com dados incompletos dependendo de qual dos dois "ganhasse" a corrida |
| ~~Bug de parse "vírgula sem tratar milhar" também presente em componentes de UI, não só nos hooks~~ ✅ Reverificado em 2026-08-06 — já não existe | `MovimentacaoInvestModal.js`, `ModalEdicao.js`, `GerenciarModelosModal.js`, `InvestimentosScreen.js` | — os quatro arquivos hoje passam o campo de valor por `CampoMonetario`/`useCurrencyInput`, que sempre entrega um número já limpo (nunca uma string com vírgula) para quem consome o valor. `ModalEdicao.js`/`InvestimentosScreen.js` ainda têm uma linha de fallback `.replace(',','.')` para o caso de o valor chegar como string — código morto hoje (nunca mais é exercitado), não removido por não fazer parte do pedido, mas não representa mais um risco |
| `firestore.rules` escrito e cobrindo `users/{uid}` + `documentosCadastrados`, mas **ainda não publicado** | projeto inteiro | 🔴 Crítica até o deploy — segue sem publicar desde a Sprint 1. **Auditoria confirmada em 2026-08-10** (checkpoint pré-Colaboração): comparado contra todo `collection(db, ...)`/`doc(db, ...)` do código atual — toda leitura/escrita do app hoje vive sob `users/{uid}/**` ou `documentosCadastrados`, ambos já cobertos; publicar exatamente como está **não deveria quebrar nenhuma funcionalidade existente**. Uma lacuna real encontrada: `documentosCadastrados` permite `create` para qualquer usuário autenticado, sem checar se o `docId` corresponde ao próprio cadastro dele — um usuário autenticado poderia, em teoria, "reservar" o CPF/CNPJ de outra pessoa antes dela se cadastrar (bloqueio malicioso, não vazamento de dado). Impacto baixo hoje (poucos usuários, sem motivação de ataque conhecida), mas vale decidir corrigir antes ou logo depois da publicação — ver `ARQUITETURA.md` seção 7.2 para o detalhe completo do diagnóstico. |
| ~~Aba "Linha do Tempo" do Histórico da Compra abria mostrando só ~1,5cm de tela~~ ✅ Corrigido (2026-08-06) | `ModalHistoricoParcelas.js` | — `ModernTabs` precisa de um container pai com `height` concreto para seu `flex:1` funcionar; o container usava `maxHeight` (padrão de todo outro modal do app), que não define espaço pra distribuir. Ver `ARQUITETURA.md` seção 19.8 — armadilha registrada para não reintroduzir em outro modal que venha a usar `ModernTabs` |

## 6. Pendências técnicas (arquitetura/dívida)

Ver `ARQUITETURA.md` para o mapeamento completo de pastas/fluxos. Resumo das maiores dívidas:
- Duplicação de padrão CRUD+listener entre os hooks de dados (sem hook genérico compartilhado).
- "God components": `ModalCriacao.js` (837 linhas), `GerenciarModelosModal.js` (752), `SaidasScreen.js` (671), `TelaPadrao.js` (610), `ModalDetalhes.js` (513) — todos misturando lógica de negócio, validação e apresentação.
- `ModalCriacao.js` e `ModalEdicao.js` reimplementam os mesmos 5 tipos de formulário de formas diferentes (risco de campos divergirem entre criar e editar).
- `globalStyles.js` (1360 linhas) é dependência de 39 arquivos — qualquer mudança tem risco de efeito colateral amplo.
- `TelaPadrao.js` tem uma função inteira (`renderModalDetailsContent`) definida mas **nunca chamada** — código morto, o modal de detalhes exibido de fato é o `ModalDetalhes.js` importado. Encontrado em 2026-07-25 investigando o indicador "Progresso"; não removido (fora do escopo pedido), candidato a limpeza futura.
- **Pasta `android/` (projeto nativo) commitada por engano no Sprint 6** (`b456b11`, 2026-08-04) e nunca removida. Isso faz as ferramentas do Expo tratarem o projeto como *bare workflow*, o que bloqueia usar `runtimeVersion: {"policy": "sdkVersion"}` no `app.json` — teve que virar um valor fixo (`"exposdk:57.0.0"`, ver seção 19.1), que precisa ser lembrado manualmente em cada upgrade futuro de SDK. Não removida agora porque apagar uma pasta versionada é uma decisão maior (confirmar que ninguém depende de código nativo customizado ali dentro antes) — mas resolveria a causa raiz do problema do `runtimeVersion`.

### Backlog arquitetural — riscos residuais aceitos conscientemente (autenticação, 2026-07-24)

Registrado durante a revisão da Sprint 1, para não implementar agora, mas não esquecer:

- **Conta órfã em caso de falha entre `createUserWithEmailAndPassword` e `batch.commit()`**: se a rede cair, o app for encerrado, ou o Firestore falhar transitoriamente nesse intervalo, a conta de autenticação existe sem perfil/reserva de CPF. Recuperação parcial e orgânica já existe (login recria um perfil mínimo via `criarUserProfileSeNaoExistir`), mas perde `documento`/`apelido`/`tipoDocumento` originais. Resolução completa exigiria uma Cloud Function com rollback — infraestrutura fora do escopo atual.
- **Ciclo de vida de `documentosCadastrados` na exclusão de conta**: hoje não existe fluxo de exclusão de conta no app. Quando existir, decidir entre: (A) apagar a reserva junto (exige mudar a regra `delete`), (B) nunca apagar (simples, mas usuário não recadastra com o mesmo CPF), (C) marcar como liberada em vez de apagar (recomendado, mas exige mecanismo confiável de "quem pode liberar o quê"), (D) delegar a uma Cloud Function. Ver `ARQUITETURA.md` para a comparação completa.

### Backlog — varredura de manipulação de valores monetários (2026-07-24, fora do escopo da Sprint 1)

Varredura completa do app em busca de parse/formatação/cálculo de dinheiro fora dos hooks já corrigidos no A2. Achados classificados (impacto/risco/prioridade), para decidir em sprints futuras:

| # | Achado | Prioridade |
|---|---|---|
| 1 | ~~5 implementações paralelas de parse/formatação de moeda~~ — a de `GerenciarModelosModal.js` (`formatarMoeda`/`desformatarMoeda`, usada na *edição* do campo "Valor") foi eliminada em 2026-08-05 (ver seção 13, `CampoMonetario.js`). Seguem de pé, fora do escopo dessa correção (formatação de *exibição*, não de edição): `formatarValor.js`, `EstatisticasComponent.js`, `SaidasScreen.js`, `VisibilityContext.js` (esta última a mais usada no app) | 🟠 Alta → Média |
| 2 | ~~Bug "vírgula sem tratar milhar" ativo em `MovimentacaoInvestModal.js`~~ ✅ Já estava corrigido desde 2026-07-25 (ver seção 5) — esta linha só não tinha sido riscada quando o fix aconteceu | — |
| 3 | ~~Divisão de parcelas sem arredondamento (`dividirValorIgualmente`)~~ ✅ Corrigido (2026-08-06, ver seção 5 e `ARQUITETURA.md` seção 20). Segue de pé, à parte, um caso bem mais restrito: `GastoCartaoCard.js`/`TelaPadrao.js` reconstroem o total como `valor × totalParcelas` só quando `valorTotal` não existe no documento (dado legado, de antes desse campo existir) — aproximação, não afeta nenhuma compra criada com o código atual | 🟢 Baixa (só dado legado) |
| 2b | ~~Mesmo bug de vírgula, em código hoje inativo~~ ✅ Reverificado em 2026-08-06 — `GerenciarModelosModal.js` migrou por completo para `CampoMonetario` (nenhum resquício); `ModalEdicao.js`/`InvestimentosScreen.js` ainda têm a linha de fallback, mas confirmada código morto (ver seção 5) | — |
| 4 | Somas/percentuais financeiros recalculados de forma independente em 6+ telas/componentes (`ResumoMensal.js`, `EstatisticasComponent.js`, `SaidasScreen.js`, `SecaoEntradas.js`, `ModalDetalhes.js`, `ModalHistoricoParcelas.js`) | 🟡 Média |
| 5 | `ResumoMensal.js` soma valores sem conversão numérica defensiva (`entrada.valor \|\| 0` sem `Number()`/`parseBRL`) | 🟡 Média |
| 6 | ~~3 implementações independentes do mesmo cálculo de progresso de investimento~~ ✅ Já estava corrigido desde a Sprint 4 (`src/utils/metas.js`, `calcularProgressoMeta`/`corProgressoMeta`) — reverificado em 2026-08-06: `SecaoInvestimentos.js`, `TelaPadrao.js` e `DetalhesInvestimentoModal.js` já importam a mesma função; esta linha só nunca tinha sido riscada | — |

### Backlog — achados da auditoria de composição de telas não resolvidos (2026-08-06)

Da auditoria que originou a Sprint de Saneamento (seção 17) — três achados registrados como
dívida técnica estruturada (problema, motivo da decisão, impacto, gatilho de revisão) em
`ARQUITETURA.md` seção 19.7, não apenas citados aqui:

| # | Achado | Impacto | Revisitar quando |
|---|---|---|---|
| P5 | Convenção de callback inconsistente entre modais (`aoFechar`/`aoSalvar` vs `onClose`, misturados na mesma lista de props em `EditarMembroModal`/`AvatarEditor`) | 🟢 Baixo | Ao criar um padrão de modal novo (Modo Família, Empresa, Web) |
| P6 | 4 famílias de composição de tela coexistindo sem critério documentado de quando usar qual | 🟢 Baixo, crescente | Antes da primeira tela nova do Modo Família ou da versão Web |
| P7 | `TelaPadrao.js` acumulando casca visual + posse dos 3 modais de CRUD + props mortas (`renderCustomItem`, `refreshing`) | 🟡 Médio | Quando uma tela de transação precisar de um comportamento de modal genuinamente diferente do que `TelaPadrao` força hoje |

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
| 👥 Membros | Tela oficial de administração, consumindo o novo `useMembros.js` (mesma lógica do seletor rápido — elimina a triplicação, ver seção 3); **avatares por membro** implementados na Sprint 5 (ver seção 12) | Convite por link, permissões (Modo Família) |
| 💳 Cartões | ✅ Funcional desde a Sprint 6 (2026-08-05, ver seção 14) — listar/criar/editar/arquivar cartões cadastrados, visual próprio | Cartão padrão, ordenar, limite/bandeira/cashback/anuidade/programa de pontos |
| 🎨 Aparência | Só estrutura (tela placeholder) | Tema claro/escuro/automático, personalizações |
| 🔔 Notificações | Só estrutura (tela placeholder) | Contas vencendo, parcelas, investimentos, metas, lembretes |
| ℹ️ Sobre | Versão do app, nome do app | Changelog, política de privacidade, termos, contato |
| 🚪 Sair | Logout com confirmação | — |

**Avatares por membro — implementado na Sprint 5** (ver seção 12 para o detalhamento completo). Cada Membro (incluindo o dono da conta, via membro-espelho) ganha um avatar vetorial gerado automaticamente por seed (`membroId`/`uid`), renderizado pelo componente `AvatarRenderer.js` (motor DiceBear/`avataaars`, ver `SPRINT5_DISCOVERY.md` seção 5), com editor completo (`AvatarEditor.js`). Isso substituiu o mapa hardcoded de 4 imagens de teste (`assets/Rafael.png`, `Kézzia.png`, `Marina.png`, `Léo.png`) que existia só em `SecaoEntradas.js`, sem nenhuma conexão com o Firestore — removido junto com os arquivos de imagem, agora órfãos.

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
- **`useAuth.js`**: nova função `atualizarPerfil(dados)` (grava via `updateDoc` em `users/{uid}` e atualiza o estado local); `avatarUrl: null` passou a ser gravado desde a criação do perfil (`register()` e `criarUserProfileSeNaoExistir()`), mesmo padrão do `avatar: null` já usado em `useMembros.js` na época — ambos os campos ganharam avatar vetorial funcional na Sprint 5 (ver seção 12).
- **`ContaScreen.js`**: nome de exibição agora é editável (toca no nome → campo de texto + Salvar/Cancelar → grava em `apelido` via `atualizarPerfil`); ícone de avatar ganhou um badge de câmera só decorativo (indica o espaço reservado, sem nenhuma ação); novo item "Alterar senha", linkando para `AlterarSenhaScreen.js` (já existia e já funcionava — só estava fora de navegação).
- **`MainStack.js`**: nova rota `AlterarSenha`.

### Observação encontrada durante a implementação (não corrigida, fora do pedido)

`AlterarSenhaScreen.js` foi escrita para ser usada fora de um Stack com cabeçalho nativo — ela tem seu próprio título/ícone e um link de texto "Voltar" internos. Agora que está dentro do `MainStack` (que já mostra cabeçalho nativo com título e seta de voltar), há uma pequena redundância visual (título e "voltar" aparecem duas vezes). Funciona corretamente, só não está com a aparência mais limpa possível — candidato a um ajuste cosmético pequeno numa próxima passada, não implementado agora por não ter sido pedido.

### O que ficou de fora desta mini sprint (por decisão do usuário/escopo)

- Alterar e-mail, vincular Google, excluir conta, gerenciamento de plano — candidatos a sprints futuras de Conta.
- Upload de foto real (câmera/galeria) — a Sprint 5 implementou o avatar vetorial (DiceBear) com editor completo, mas não upload de imagem própria; o badge de câmera em `ContaScreen.js` hoje abre o editor de avatar vetorial, não a câmera do aparelho.

## 11. Sprint 4 (✅ implementada em 2026-07-28) — Categorias e Subcategorias: a fundação do Planejamento Financeiro

Discovery completo em `SPRINT4_DISCOVERY.md` (arquitetura, alternativas avaliadas, decisões
de escopo negociadas incrementalmente com o usuário). Arquitetura técnica detalhada em
`ARQUITETURA.md` seção 13.

**Por que esta seção existe e não é só "adicionamos uma tela de Categorias":** o que essa
sprint entregou é uma mudança estrutural na base de dados do app, não uma alteração de
interface. Vale registrar com clareza, para não subestimar o alcance disso ao revisitar
este documento no futuro:

- **Categorias deixaram de ser um dado local** (`AsyncStorage`, por aparelho, sem
  sincronia) **e passaram a ser uma entidade real do Firestore**, sincronizada entre
  dispositivos, com hierarquia (categoria → subcategoria) e CRUD completo
  (criar/editar/arquivar/excluir — inclusive as categorias padrão do app, não só as
  personalizadas pelo usuário).
- **`categoriaId` passou a ser a referência estável** usada por gastos, entradas, cartões,
  empréstimos e modelos recorrentes — em vez de comparar por texto (frágil a renomeações e
  a diferenças de digitação), o app agora tem uma chave confiável para agregar dados por
  categoria. A migração foi feita **sem perda de dados e sem migração em massa**:
  lançamentos novos gravam `categoria` (string, legado) + `categoriaId` + `categoriaNome`
  juntos; lançamentos antigos continuam funcionando exatamente como antes.
- **Esta é a fundação de que várias funcionalidades futuras vão depender diretamente**:
  Metas Financeiras (Sprint 6, a próxima), Orçamentos e Limites, Relatórios, Dashboard, a
  Agenda Financeira (Sprint 3, já pode mostrar cor/ícone de categoria no card de evento sem
  mudança de arquitetura, só um ajuste visual futuro), recomendações de IA/Coruja (uma
  chave estável é o que esse tipo de funcionalidade precisa para reconhecer padrão ao longo
  do tempo) e, mais adiante, o Modo Família (categorias já nascem em cima de
  `getBasePath(user)`, mesmo padrão de `useMembros.js` — prontas para virarem compartilhadas
  quando o gap de `tenantId` documentado em `ARQUITETURA.md` seção 3 for resolvido).
- **De brinde, eliminamos mais uma duplicação de lógica já conhecida**: os 3 cálculos de
  progresso de meta de investimento (`SecaoInvestimentos.js`, `TelaPadrao.js`,
  `DetalhesInvestimentoModal.js`) viraram um só (`src/utils/metas.js`), corrigindo de
  passagem um bug real (a barra de progresso podia passar de 100%).

| Categoria | Agora (Sprint 4) | Futuro (backlog, não fazer agora) |
|---|---|---|
| 🗂️ Categorias | CRUD completo (criar/editar/arquivar/excluir), hierarquia de 2 níveis, ícone/cor/tipo de transação, sincronizadas via Firestore | Hierarquia com mais de 2 níveis (modelo de dados já suporta, falta só UI recursiva — ver seção 14 do discovery) |
| 🧭 Navegação | Novo hub "Planejamento Financeiro" no Menu do Usuário, com Categorias como primeira funcionalidade | Metas Financeiras (Sprint 6), Orçamentos e Limites, Relatórios entram no mesmo hub depois |
| 🧩 `CategoriaSelect` | Componente genérico, desacoplado de formulário — já usado por Entradas/Gastos/Cartões/Empréstimos/Modelos | Modo de seleção múltipla (filtros de Relatórios/Dashboard/Agenda) — arquitetura já preparada, não implementada |
| 🔗 Referência nas transações | `categoriaId` + `categoriaNome` gravados desde a criação, convivendo com a string `categoria` legada | Nenhuma migração em massa dos dados antigos — decisão consciente |
| 📈 Meta de Investimento | Cálculo de progresso unificado (`src/utils/metas.js`) | Nenhuma funcionalidade nova de meta — só consolidação, por pedido do usuário |

**Bugs encontrados e corrigidos durante a sprint** (auditoria pedida pelo usuário antes do
incremento 5, ver `SPRINT4_DISCOVERY.md` seção 15):
- `useCartoes.js` (`addCartao`) descartava a categoria inteira ao criar uma compra nova
  (bug pré-existente, não introduzido nesta sprint).
- `useEmprestimos.js` (`addEmprestimo`) descartava `categoriaId`/`categoriaNome` na criação.
- `ModalEdicao.js` não expunha o campo categoria para empréstimos (só existia na criação).
- `TelaPadrao.js`: barra de progresso de meta de investimento podia ultrapassar 100%.

**O que ficou para depois**: "Metas Financeiras" deixou de ser a Sprint 5 — o usuário
decidiu priorizar identidade/avatares primeiro (ver seção 12) — e passou a ser a Sprint 6.
Continua podendo ser construída em cima de `categoriaId` sem precisar de nenhum trabalho de
fundação adicional.

## 12. Sprint 5 (✅ implementada em 2026-07-30) — Identidade e Avatares

Discovery completo em `SPRINT5_DISCOVERY.md` (arquitetura, alternativas avaliadas — inclusive
pesquisa técnica comparativa de estilos DiceBear — e decisões negociadas incrementalmente
com o usuário, em vários incrementos). Auditoria final de fechamento classificou os achados
em bloqueante/importante/melhoria futura; todos os itens bloqueantes e importantes foram
corrigidos antes do fechamento (ver lista abaixo).

**Por que esta sprint existe**: antes dela, "usuário autenticado" (`users/{uid}`) e "Membro"
(`users/{uid}/membros/{id}`) eram dois conceitos paralelos sem ligação — e "Comprador"
(campo `pessoa` em compras de cartão) e "Membro" (campo `membro` em entradas) eram também
dois conceitos textuais paralelos entre si, sem `id` estável. Isso bloqueava tanto o Modo
Família (não há como vincular um Membro a uma conta real sem essa unificação) quanto a ideia
futura de lançamento vinculado a outro usuário (reembolso/despesa compartilhada).

- **Membro-espelho**: todo usuário ganha automaticamente um documento em
  `users/{uid}/membros/{uid}` representando a si mesmo (`ehProprietario: true`), criado no
  registro e por autocura (`criarMembroProprietarioSeNaoExistir`, em `useAuth.js`) para
  contas já existentes. Não pode ser excluído — `isMembroProprietario(membro)` (em
  `src/utils/membros.js`) é a única checagem de "é o dono da conta" usada no código; nenhum
  outro lugar compara `ehProprietario` diretamente.
- **Unificação Comprador/Membro**: cartões e entradas usam o mesmo componente
  (`MembroSelect.js`) e o mesmo par de campos, `membroId` (referência estável, quando a
  pessoa é um Membro cadastrado) e `membroNome` (sempre preenchido, inclusive para "Outra
  pessoa..." informal, caso em que `membroId` fica `null`) — mesmo padrão de convivência já
  usado por `categoriaId`/`categoriaNome` na Sprint 4, sem migração em massa dos dados
  antigos. "Credor/Instituição" do empréstimo (campo renomeado `pessoa` → `credor`) foi
  mantido como conceito separado — não é uma pessoa da família.
- **Modo Família — arquitetura oficial decidida**: `tenants/{tenantId}` (via
  `getBasePath(user, compartilhado)`) é a arquitetura escolhida para quando o dado
  compartilhado for implementado. A arquitetura concorrente que existia como scaffolding
  morto (`membroSelecionado`/`modoFamiliaAtivo` em `useModelos.js`, `compartilhadoCom` em
  `ModalHistoricoParcelas.js` — nenhum dos dois nunca era de fato acionado) foi removida
  nesta sprint, para não deixar duas arquiteturas concorrentes documentadas ao mesmo tempo
  (ver seção 3).
- **Avatares vetoriais**: todo Membro (cadastrado ou "Outra pessoa...") e o perfil do usuário
  (`avatarUrl`) têm um avatar gerado automaticamente por seed, formato persistido
  `{ tipo, motor, versao, dados: { estilo, opcoes } }` — o campo `motor` existe para permitir
  trocar o motor de geração no futuro sem migração; hoje só `dicebear` é suportado. Avaliação
  técnica comparativa concluiu manter o estilo `avataaars` (estilos alternativos do DiceBear
  sacrificam a categoria de roupa inteira). `src/utils/avatar.js` concentra toda a lógica
  específica do motor/estilo (catálogo de categorias editáveis, geração, sanitização de
  opções); `AvatarRenderer.js` e `AvatarEditor.js` nunca importam `@dicebear/*` diretamente,
  para não espalhar condicionais específicas de Avataaars pelo projeto.
- **Editor de avatar** (`AvatarEditor.js`): editor completo, seccionado por categoria — pele,
  cabelo (com cor), barba (com cor), roupa (com cor), expressão (olhos/sobrancelha/boca),
  acessórios (óculos/chapéus), fundo. Acessível tocando no avatar em `ContaScreen.js` (perfil
  do próprio usuário) e em `EditarMembroModal.js` (demais Membros).
- **`EditarMembroModal.js`**: novo componente que unifica nome, avatar e exclusão de um
  Membro num único fluxo, acionado tocando em qualquer parte da linha do Membro (não só no
  avatar) em `GerenciarMembrosModal.js` e `MembrosScreen.js`.
- **`MembroSelect.js` simplificado**: lista de Membros + uma única opção "Outra pessoa..."
  ao final (modal pequeno, só pede o nome) — antes havia uma seção "Ou digite um nome"
  sempre visível, redundante com a lista. Atalho discreto para "Gerenciar membros" mantido
  como link de texto pequeno (não uma ação em destaque — essa responsabilidade continua
  sendo do hub de Membros).

**Bugs encontrados e corrigidos durante a auditoria final da sprint** (itens bloqueante/
importante da auditoria de fechamento):
- Esta seção da documentação (`PROJECT_STATUS.md`/`ROADMAP.md`/`ARQUITETURA.md`) não tinha
  sido atualizada com o estado real do avatar/identidade — bloqueante, corrigido agora.
- `useMembros.js` (`adicionarMembro`): criava o Membro sempre com `avatar: null`, nunca
  chamava `gerarAvatarPadrao` — só ganhava avatar de fato na próxima renderização por
  coincidência de nenhum outro mecanismo cobrir esse caminho. Corrigido gerando o `id` do
  documento antes de gravar (`doc()` + `setDoc()`, em vez de `addDoc()`) e usando-o como seed.
- `GerenciarMembrosModal.js`/`MembrosScreen.js`: guardavam o Membro sendo editado como um
  objeto (snapshot) em vez do `id` — uma alteração salva no `EditarMembroModal.js` não
  aparecia imediatamente, pois o modal continuava exibindo o snapshot antigo até fechar e
  reabrir. Corrigido para guardar só o `id` e derivar o Membro atual de `membros.find(...)`
  a cada render.
- `EditarMembroModal.js`: a exclusão (`aoExcluir()`) não tinha tratamento de erro — uma
  falha (ex.: rede) fechava o modal silenciosamente sem avisar o usuário. Corrigido com
  `try/catch` e um alerta de erro dedicado.
- Código morto da arquitetura concorrente do Modo Família (ver acima) removido de
  `useModelos.js` e `ModalHistoricoParcelas.js`.
- Comentário desatualizado em `useMembros.js` ("reservado para... recurso futuro") no campo
  `avatar`, que já é funcional desde esta sprint — atualizado.

**Itens registrados como melhoria futura (não bloqueiam o fechamento da sprint)**: ver
`SPRINT5_DISCOVERY.md` para a lista completa, incluindo a ideia de detectar nomes repetidos
de "Outra pessoa..." entre lançamentos e oferecer a conversão retroativa para um Membro real.

## 13. Parcelas personalizadas no cartão (✅ implementada em 2026-08-03)

Discovery completo (análise da arquitetura de parcelamento existente, problemas encontrados,
opções avaliadas) registrado na conversa que antecedeu esta implementação — resumo técnico
em `ARQUITETURA.md` seção 15. Motivação: uma compra parcelada podia ter uma taxa (emissão,
IOF etc.) só na 1ª parcela, cenário que a arquitetura anterior não suportava sem quebrar a
consistência do total exibido em outras telas.

- **Correção de base (antes de qualquer tela nova)**: `valorTotal` de uma compra no cartão
  deixou de poder ficar diferente da soma das parcelas. `useCartoes.js` ganhou
  `recalcularValorTotalCompra` (mesmo padrão já usado por `recalcularEconomiaTotal` em
  `useEmprestimos.js`), chamada sempre que o valor de uma parcela é editado — mesmo fora do
  novo editor, por um edição direta do campo "Valor" já existente. Isso corrige uma
  inconsistência que já existia antes desta sprint: `GastoCartaoCard.js` lê o campo
  `valorTotal` diretamente (não resoma as parcelas como `ModalDetalhes.js`/
  `ModalHistoricoParcelas.js` já faziam), então uma edição pontual de parcela deixava esse
  card com o total errado.
- **Interface inalterada para o caso comum**: os dois modos de lançamento existentes ("Valor
  Total" / "Valor da Parcela") continuam exatamente iguais. Uma única opção nova, "Editar
  valores das parcelas" (`OpcaoPersonalizarParcelas.js`), aparece só quando há mais de 1
  parcela, tanto em `ModalCriacao.js` quanto em `ModalEdicao.js`.
- **Editor** (`ModalEditorParcelas.js`): nasce preenchido com o cálculo automático de sempre
  (ou com os valores já gravados, se a compra já tinha parcelas diferentes entre si);
  mostra o total somado em tempo real; editar uma parcela nunca recalcula as demais
  (comportamento explicitamente pedido — redistribuição automática fica registrada como
  possível melhoria futura, não implementada); botão "Restaurar parcelas iguais" reparte o
  total atual (o que está sendo mostrado no momento, não o valor original antes de abrir o
  editor) igualmente entre as parcelas.
- **Sem migração**: nenhum campo novo obrigatório foi criado. Cada parcela continua sendo um
  documento próprio na subcoleção `cartoes`, só com o `valor` correspondente — a
  personalização não é um "modo" gravado no banco, é só uma consequência de as parcelas do
  mesmo `idCompra` não serem todas iguais. Compras antigas continuam funcionando sem
  qualquer alteração de leitura.
- **Regra de negócio (decidida em 2026-08-03): parcela paga/antecipada não pode ter o valor
  alterado.** Avaliadas duas opções (bloquear só as pagas vs. permitir editar qualquer uma) —
  optamos por bloquear, para não permitir reescrever quanto já foi efetivamente pago (mesmo
  princípio já usado para `valorContratado` do empréstimo). Aplicado em duas camadas: UI
  (`ModalEditorParcelas.js` mostra a linha com cadeado, sem campo editável; "Restaurar
  parcelas iguais" nunca redistribui sobre elas; `ModalEdicao.js` também bloqueia o campo
  "Valor" comum quando a própria parcela aberta já está paga/antecipada) e dados
  (`updateCartao`/`salvarParcelasPersonalizadas`, em `useCartoes.js`, ignoram qualquer
  mudança de valor numa parcela bloqueada, mesmo que a UI tentasse enviar outra coisa —
  defesa em profundidade). Metadados (descrição, comprador, data, categoria) continuam
  editáveis numa parcela paga; só o valor é imutável. Detalhe técnico completo em
  `ARQUITETURA.md` seção 15.9, incluindo uma lacuna preexistente encontrada e corrigida no
  caminho: `anteciparParcelas` nunca recalculava o `valorTotal` do grupo (nem gravava
  `valorOriginal`), então tanto antecipar quanto reverter uma antecipação deixavam o total
  dessincronizado — corrigido junto, por ser a mesma inconsistência que esta sprint já existia
  para eliminar.
- **Destaque no histórico** (`ModalHistoricoParcelas.js`): além de Pendente/Antecipada/Paga
  (que já existiam, iguais para empréstimo e cartão), parcelas de cartão com valor
  personalizado agora ganham o selo "✏️ Valor personalizado" — calculado a cada abertura do
  histórico (não é um campo gravado), comparando o valor original de cada parcela contra uma
  divisão igual do total do grupo.
- **Bug real corrigido (2026-08-04): `Unsupported field value: undefined` ao salvar compra de
  "Outra pessoa..." personalizada.** Duas causas raiz em `useCartoes.js`, nenhuma introduzida
  por esta sprint (só exposta por ela): (1) o listener de `cartoes` declarava um campo
  `membro` vestigial (cartão nunca grava isso — usa `pessoa`/`membroId`/`membroNome`), sempre
  `undefined`; removido. (2) `typeof x === 'object'` sem excluir `null` fazia `categoria`
  virar `undefined` (em vez de continuar `null`) em toda compra sem categoria selecionada.
  Corrigido nos dois pontos, e `useCartoes.js` ganhou `removerIndefinidos()` aplicada a toda
  escrita que parte de dado vindo de UI — defesa em profundidade para qualquer campo
  parecido que apareça depois. A função foi extraída para `src/utils/firestoreSanitize.js`
  (compartilhada) no dia seguinte, quando o mesmo padrão sem guard foi encontrado e corrigido
  em `useEntradas.js` também — ver linha correspondente na seção 5 e detalhe completo em
  `ARQUITETURA.md` seção 15.11.
- **Varredura completa do bug em todos os hooks (2026-08-04)**, a pedido do usuário, para
  eliminar a classe inteira (não só os dois casos já corrigidos): confirmado que só
  `useCartoes.js`/`useEntradas.js` tinham o padrão `typeof === 'object'` sem excluir `null`
  nos seus listeners (ambos já corrigidos); encontrados e corrigidos dois gêmeos do mesmo
  risco em formato de campo opcional sem `|| null` — `useGastos.js` (`gerarFixosDoMes`) e
  `useEmprestimos.js` (`addEmprestimo`), nenhum alcançável pelo fluxo atual do app, mas
  protegidos contra dados legados. `useInvestimentos.js`, `useMembros.js`, `useCategorias.js`
  e `useModelos.js` auditados e já estavam seguros — não alterados. `removerIndefinidos()`
  agora também protege as escritas de `useGastos.js` e `useEmprestimos.js`. Também corrigidos
  dois casos do mesmo padrão sem guard em telas de exibição pura (`GastoCartaoCard.js`,
  `GerenciarModelosModal.js`) — sem risco de crash (não escrevem no Firestore), corrigidos por
  completude. Nenhum outro campo vestigial (como o `membro` de cartão) foi encontrado.
- **Confirmado (2026-08-04): `removerIndefinidos` remove só `undefined`.** Verificado por
  leitura e teste empírico — `null`, `""`, `NaN`, `0`, `false` e objetos/arrays vazios nunca
  são removidos. Comentário no arquivo atualizado para deixar esse contrato explícito.
- **Bug real corrigido (2026-08-04): total do card ficava obsoleto depois de personalizar
  parcelas.** Causa raiz: `updateCartao` recebia `valorTotal` como parte do objeto de edição
  (vindo de `item`, cacheado de quando o modal abriu) e nunca o descartava — então qualquer
  "Salvar" (mesmo o do próprio editor de parcelas, ou uma edição sem relação nenhuma como só a
  descrição) reescrevia o `valorTotal` correto de volta para o valor antigo, só na parcela que
  estava aberta no momento. `GastoCartaoCard.js` (única tela que ainda lê esse campo direto)
  mostrava o valor poluído; `ModalDetalhes.js`/`ModalHistoricoParcelas.js` sempre resomam as
  parcelas, por isso mostravam o valor certo e mascaravam o bug. Corrigido removendo
  `valorTotal` do objeto recebido por `updateCartao` antes de qualquer escrita — só as
  funções dedicadas (`recalcularValorTotalCompra`/`salvarParcelasPersonalizadas`) podem
  defini-lo agora, por construção. Mesma causa raiz corrigida por precaução em
  `useEmprestimos.js` (`economiaTotal`, que pode mudar depois da criação — diferente de
  `valorContratado`, que nunca muda). Detalhe completo em `ARQUITETURA.md` seção 15.13.
- **Bug corrigido (2026-08-04): valores no histórico de parcelas com ponto em vez de
  vírgula.** `ParcelaItem`, em `ModalHistoricoParcelas.js`, usava `.toFixed(2)`/`.toFixed(1)`
  (sempre ponto, independente de localidade) em vez de `.toLocaleString('pt-BR', ...)` — o
  padrão que o componente vizinho no mesmo arquivo (`ResumoFinanceiro`) já usava
  corretamente. Corrigidas as 4 ocorrências. Detalhe em `ARQUITETURA.md` seção 15.14.
- **Auditoria de campos monetários (2026-08-05), a pedido do usuário**: confirmado que
  `ModalEditorParcelas.js` já usava a mesma máscara (`useCurrencyInput`) do resto do app — a
  edição de parcela nunca teve um parse diferente. Duas diferenças reais encontradas, nenhuma
  na máscara em si: `GerenciarModelosModal.js` tinha sua própria implementação paralela
  (`formatarMoeda`/`desformatarMoeda`, sem o debounce que `useCurrencyInput` tem); e
  `LinhaParcela` (dentro do editor de parcelas) não era `memo`izada, então digitar numa linha
  re-renderizava a lista inteira. Extraído `src/components/CampoMonetario.js` (único
  componente de entrada monetária do app, exportado) e migrados os dois pontos para ele —
  `ModalEdicao.js` também passou a importar de lá (era onde o componente já existia, só não
  compartilhado). `ModalCriacao.js` ficou de fora por decisão explícita: já usa o mesmo
  `useCurrencyInput` por baixo, migrar seria só estética num arquivo grande e frágil, sem
  reduzir bug nenhum. Detalhe completo em `ARQUITETURA.md` seção 15.15.
- **Arquivos**: `src/utils/parcelamento.js` (novo, `dividirValorIgualmente`/`somarParcelas`),
  `src/components/ModalEditorParcelas.js` (novo), `src/components/OpcaoPersonalizarParcelas.js`
  (novo), `src/hooks/useCartoes.js` (`recalcularValorTotalCompra`,
  `salvarParcelasPersonalizadas`, `buscarParcelasDaCompra`, e `addCartao`/`updateCartao`/
  `anteciparParcelas` ajustados), `src/components/ModalCriacao.js`, `src/components/ModalEdicao.js`
  (opção nova + campos automáticos desabilitados enquanto personalizado ou já pago) e
  `src/components/ModalHistoricoParcelas.js` (selo de valor personalizado).
- **Fora do escopo desta sprint, por decisão explícita**: o mesmo recurso para
  `useEmprestimos.js` (arquitetura de âncora diferente — `valorContratado` fixo — precisaria
  de uma proposta própria) e qualquer redistribuição automática entre parcelas ao editar uma
  delas.

## 14. Entidade Cartões / Carteira (✅ implementada em 2026-08-05, Sprint 6)

Quarta entidade própria do sistema (depois de Categorias, Membros e Modelos), não só uma
tela de cadastro nova — ver `ARQUITETURA.md` seção 16 para o desenho técnico completo. Motivação:
"Cartão" era uma string livre digitada em cada compra, com vencimento/cor resolvidos por três
lookups hardcoded independentes (`vencimentoCartaoPorNome`, `colors.byInstitution`, uma
heurística de ícone por `.includes()`) — só previa 3 bancos (Nubank/Inter/C6), não escalava
para usuários diferentes com cartões diferentes.

- **Decisão de nome de coleção**: a entidade nova vive em `users/{uid}/carteira`, não
  `cartoes` — esse nome já era usado pelos lançamentos (parcelas de compra) desde antes desta
  sprint. Renomear a coleção de lançamentos para liberar "cartoes" foi avaliado e descartado
  em conversa com o usuário (exigiria migração só por causa do nome, sem ganho real).
- **Modelo de dados** (`users/{uid}/carteira/{id}`): `nome`, `banco`, `ultimos4Digitos`
  (opcional), `cor`, `diaVencimento`, `diaFechamento`, `ativo`, `criadoEm`, `atualizadoEm` —
  nada além disso nesta sprint; `limite`/`bandeira`/`cashback`/`anuidade`/`programa de pontos`
  ficam para uma sprint futura, por decisão explícita.
- **`useCarteira.js`**: mesmo padrão de `useMembros.js`/`useCategorias.js` — listener +
  CRUD + validação de nome duplicado + arquivar/reativar (reversível) + exclusão bloqueada se
  o cartão já foi usado em algum lançamento (mesma guarda de `excluirCategoria`).
- **Convivência sem migração**: cada lançamento no cartão grava `cartaoId` (referência
  estável, `null` para cartão informal) + `cartao` (nome, sempre preenchido) — mesmo padrão já
  usado para categoria e membro. Compras antigas (só `cartao`, sem `cartaoId`) continuam
  funcionando exatamente como antes.
- **`CartaoSelect.js`**: substitui o `TextInput` livre em `ModalCriacao.js` e passa a existir
  também em `ModalEdicao.js` — antes desta sprint não havia como editar o cartão de uma
  compra já lançada. Mesmo padrão de `MembroSelect.js`: lista de cartões cadastrados (mostrados
  com o cartão visual, não texto), "Outro cartão..." para o caso informal (decisão tomada
  antes de implementar: continuar permitindo, não exigir cadastro obrigatório) e "Gerenciar
  cartões" — sem botão de criação rápida dentro do seletor.
- **`CartaoVisual.js`**: cartão bancário genérico (gradiente com a cor cadastrada, nome,
  banco, últimos 4 dígitos mascarados, vencimento) inspirado em Apple Wallet/Google Wallet,
  sem copiar identidade visual de nenhuma instituição — usa `expo-linear-gradient`, dependência
  já instalada (nenhuma nova adicionada). Único componente visual, reaproveitado em três
  lugares: Gerenciar Cartões, seletor e resumo por cartão.
- **Gestão de cartões**: `GerenciarCartoesScreen.js` deixou de ser `PlaceholderMenuScreen` (a
  rota já existia desde a Sprint 2) e ganhou CRUD completo via `CartoesManager.js`,
  compartilhado com o atalho "Gerenciar cartões" do seletor (`GerenciarCarteiraModal.js`) —
  mesmo padrão de `CategoriasManager.js`/`CategoriasScreen.js`/`GerenciarCategoriasModal.js`.
- **Remoção de hardcodes**: `useCartoes.js` passa a resolver cor/vencimento/fechamento do
  cartão cadastrado quando o lançamento referencia um; os hardcodes antigos
  (`vencimentoCartaoPorNome`/`colors.byInstitution`) continuam existindo só como fallback para
  cartão informal ou lançamento antigo — decisão consciente, não um resquício esquecido. A
  heurística de ícone por nome em `GastoCartaoCard.js` foi removida (ícone genérico agora).
- **Dia de fechamento real**: resolve um achado de baixa severidade já catalogado (seção 5) —
  a estimativa "diaVencimento - 7" só continua valendo para cartão informal/lançamento antigo.
- **Resumo por cartão enriquecido** (`CartoesScreen.js`, aba "Por Cartão"): deixou de ser um
  filtro simples (total + lista) e virou um resumo de verdade — cartão visual no topo,
  indicadores (saldo utilizado, total de compras, quantidade, parcelas futuras/pagas/pendentes,
  maior compra, próximo vencimento) calculados sobre o histórico completo do cartão (nova
  função `buscarParcelasDoCartao`, sem filtro de mês/ano — o listener escopado por mês do
  `useCartoes.js` não tem como fornecer "parcelas futuras"), e lista de compras enriquecida
  (descrição, valor total, parcela atual, comprador, categoria, status). Nenhuma informação
  removida.
- **Arquivos**: `src/hooks/useCarteira.js` (novo), `src/components/CartaoVisual.js` (novo),
  `src/components/CartaoSelect.js` (novo), `src/components/carteira/` (novo: `FormularioCartaoModal.js`,
  `CartoesManager.js`, `GerenciarCarteiraModal.js`), `src/screens/GerenciarCartoesScreen.js`
  (deixou de ser placeholder), `src/hooks/useCartoes.js` (`buscarParcelasDoCartao`,
  `addCartao`/`updateCartao` ajustados), `src/components/ModalCriacao.js`/`ModalEdicao.js`
  (`CartaoSelect` no lugar do texto livre), `src/components/GastoCartaoCard.js` (heurística de
  ícone removida), `src/components/CartaoCard.js` (reescrito — resumo em vez de filtro),
  `src/screens/CartoesScreen.js` (agrupamento por `cartaoId`).
- **Fora do escopo desta sprint, por decisão explícita**: `limite`, `bandeira`, `cashback`,
  `anuidade`, `programa de pontos` — preparados no modelo de dados, não implementados. Nenhuma
  migração retroativa de lançamentos antigos para vincular a um cartão cadastrado.

### 14.1 Ajustes pós-teste (2026-08-06)

Achados do usuário testando a Sprint 6 em dispositivo — ver `ARQUITETURA.md` seção 16.11 para
o detalhamento técnico de cada um:

- Paleta de cores do cartão ampliada para 15 cores reais de mercado (incluindo preto), deixou
  de compartilhar a paleta decorativa de categorias.
- O resumo do mês ("X compras este mês") voltou a aparecer no desenho do cartão dentro do
  filtro "Por Cartão" — tinha ficado só dentro do modal na reescrita da Sprint 6.
- **Bug real corrigido**: o modal de resumo por cartão mostrava uma linha por parcela, não por
  compra (uma compra de 10x virava 10 linhas quase idênticas). Agora agrupa por `idCompra`.
- **Inconsistência real corrigida**: editar o cartão de uma parcela não atualizava as demais
  parcelas da mesma compra. `updateCartao` agora propaga `cartaoId`/`cartao`/`corCartao` para
  todo o grupo (`propagarCartaoParaGrupo`, mesmo padrão de batch já usado para `valorTotal`).
- Miniatura do `CartaoSelect` trocou de bolinha colorida para um retângulo no formato de
  cartão.
- **Categoria e comprador tinham o mesmo problema do cartão** (editar numa parcela não
  propagava para as demais da compra) — o usuário formalizou como regra de negócio (ver
  `ARQUITETURA.md` seção 16.12) e pediu implementação: campos que descrevem a COMPRA inteira
  (descrição, categoria, cartão, comprador, cartão, data da compra, e para empréstimos também
  credor) agora sempre propagam para todas as parcelas do mesmo `idCompra`; campos que
  descrevem a PARCELA (valor, pago, data de pagamento, vencimento, mês/ano) continuam
  individuais. Implementado com um mecanismo único e reaproveitável
  (`src/utils/propagacaoCompra.js`), usado tanto por `useCartoes.js` quanto por
  `useEmprestimos.js` — incluir um novo campo de compra no futuro não exige lógica nova, só
  adicionar o nome numa lista.
- **Corrigido de passagem**: `useEmprestimos.js` não bloqueava a edição do `valor` de uma
  parcela já paga/antecipada, ao contrário de `useCartoes.js` (que já tinha essa trava desde a
  seção 13). As duas entidades ficam consistentes agora.
- Auditoria feita antes de implementar (pedido do usuário): confirmado que só `useCartoes.js` e
  `useEmprestimos.js` escrevem campos de compra/parcela nessas coleções — nenhum outro ponto do
  código faz isso isoladamente numa única parcela.

## 15. Exclusão parcelada padronizada (✅ implementada em 2026-08-06)

Motivação: perguntar sobre exclusão de empréstimo ("só esta parcela ou tudo?") levou a mapear
como exclusão funcionava em todo o app — achado: 4+ implementações de "handleExcluir"
copiadas e inconsistentes (só a aba Empréstimos de `SaidasScreen.js` oferecia a escolha;
cartão nunca oferecia e nunca recalculava o total; o botão "Excluir" de `ModalEdicao.js`,
usado pela Agenda Financeira/Calendário e Central de Avisos, excluía **sem confirmação
nenhuma**, para qualquer tipo de lançamento). Ver `ARQUITETURA.md` seção 17 para o desenho
técnico completo.

- **Todo ponto de exclusão do app agora usa o mesmo mecanismo**
  (`src/hooks/useExclusaoParcelada.js`): `SaidasScreen.js`, `GastosScreen.js`,
  `EmprestimosScreen.js`, `CartoesScreen.js`, e — via `useEventosFinanceiros.js` — o Calendário,
  a Linha do Tempo e a Central de Avisos. Gasto/entrada, que nesses últimos caminhos excluíam
  sem perguntar nada, agora pedem confirmação simples.
- **Cartão e empréstimo com mais de 1 parcela** ganharam a mesma escolha: excluir só a parcela
  ou o grupo inteiro; se só a parcela, o que fazer com o valor dela — remover do total,
  redistribuir igualmente entre as demais parcelas em aberto, ou redistribuir manualmente
  (reaproveita o `ModalEditorParcelas` já existente, aberto **antes** de qualquer exclusão —
  cancelar não apaga nada, tudo é gravado de uma vez só ao confirmar).
- **Regra de negócio explícita**: a redistribuição sempre reparte só o valor da parcela
  excluída, nunca o valor total da compra.
- **`src/utils/reestruturarParcelamento.js`**: único ponto que remove parcela(s) e renumera as
  restantes (`parcelaAtual`/`totalParcelas`) — nunca toca no estado financeiro
  (`pago`/`adiantada`/`dataPagamento` etc.). Reaproveitado também por `salvarParcelasPersonalizadas`
  (editor de parcelas, seção 13), que não tinha essa lógica centralizada antes.
- **Achado corrigido de passagem**: excluir uma parcela de cartão nunca recalculava
  `valorTotal` das parcelas restantes — corrigido junto (`recalcularValorTotalCompra` roda
  depois de toda exclusão/redistribuição de cartão).
- **Arquivos**: `src/utils/reestruturarParcelamento.js` (novo), `src/hooks/useExclusaoParcelada.js`
  (novo), `useCartoes.js`/`useEmprestimos.js` (`deleteCartao`/`deleteEmprestimo` substituídos por
  `excluirParcela`/`excluirParcelaComValoresPersonalizados`/`excluirGrupoInteiro`),
  `useEventosFinanceiros.js` (`excluir` substituído por `confirmarExcluir` + estado dos modais),
  `SaidasScreen.js`, `GastosScreen.js`, `EmprestimosScreen.js`, `CartoesScreen.js`,
  `LinhaDoTempoFinanceira.js`, `CalendarioFinanceiro.js`, `CentralAvisosScreen.js`.

## 16. Linha do Tempo (Histórico de Eventos) (✅ implementada em 2026-08-06 para Cartões e Empréstimos; ✅ estendida em 2026-08-07 para Gastos, Entradas e Investimentos)

Arquitetura fechada previamente (ver `ARQUITETURA.md` seção 18). Motivação: registrar eventos
relevantes (compra criada, parcela paga, categoria alterada etc.) sem virar uma auditoria
técnica completa.

- **Coleção nova** `users/{uid}/linhaDoTempo` — um documento por ação do usuário (nunca por
  documento alterado internamente por propagação automática ou recálculo).
- **Todas as funções de mutação de `useCartoes.js`/`useEmprestimos.js`/`useGastos.js`/
  `useEntradas.js`/`useInvestimentos.js`** (criar, editar, marcar como pago/recebido,
  **desmarcar como pago/recebido**, antecipar, reverter antecipação, excluir parcela/
  grupo/item, redistribuir, personalizar valores) passam a registrar um evento, incluindo
  `toggleCartaoStatus` — um caminho de mutação separado de `updateCartao` que também
  precisava do próprio registro.
- **Ajuste feito após feedback de uso (2026-08-07)**: a primeira versão só registrava marcar
  como pago; desmarcar não deixava rastro na Linha do Tempo, dando a impressão de que o item
  nunca tinha sido desfeito. Agora desmarcar gera `acao: 'reaberto'`, nos cinco módulos.
- **Nova aba "Linha do Tempo"** dentro de `ModalHistoricoParcelas.js`, ao lado da aba
  "Parcelas" já existente (que não mudou nada) — mesmo `ModernTabs.js` usado em
  `CartoesScreen.js`/`SaidasScreen.js`. Gasto/entrada/investimento não têm parcelas, então o
  modal detecta isso (ausência de `idCompra`) e mostra só a Linha do Tempo, sem as abas.
- **Novos pontos de entrada para Gasto/Entrada/Investimento**: botão "Histórico" dentro de
  `ModalDetalhes.js` (casos `gasto`/`entrada`, mesmo padrão do cartão/empréstimo) e ícone de
  histórico no cabeçalho de `DetalhesInvestimentoModal.js` (diferente do "Histórico de
  Movimentações" já existente ali, que é sobre aportes/resgates, não sobre edições do
  investimento em si). `EntradasScreen.js` ganhou o mesmo estado/modal que `SaidasScreen.js`
  já tinha para gasto/empréstimo/cartão.
- **Achado corrigido durante a implementação (2026-08-06)**: a consulta inicial usava
  `orderBy('criadoEm')` do Firestore junto com o filtro por `idCompra` — isso exige um índice
  composto configurado manualmente no console do Firebase, em cada um dos 4 projetos do app.
  Corrigido para ordenar no cliente (mesmo critério já usado em `buscarParcelasDaCompra`),
  evitando uma dependência de infraestrutura fora do código.
- **Achado corrigido durante a extensão (2026-08-07)**: `linhaDoTempoRender.js` tinha textos
  fixos ("Parcela excluída", "Parcela paga") que fariam sentido só para cartão/empréstimo —
  sem ajuste, excluir um gasto teria mostrado "Parcela excluída" na Linha do Tempo. Corrigido
  para usar o texto certo por entidade (`NOME_ENTIDADE`), distinguindo entidades agrupadas
  (cartão/empréstimo, com conceito de parcela) das avulsas (gasto/entrada/investimento).
- **Arquivos**: `src/utils/linhaDoTempoConfig.js`, `src/utils/registrarEvento.js`,
  `src/utils/linhaDoTempoRender.js`, `src/hooks/useLinhaDoTempo.js`,
  `src/components/LinhaDoTempoEventos.js` (novos); `src/components/ModalHistoricoParcelas.js`,
  `src/components/ModalDetalhes.js`, `src/components/DetalhesInvestimentoModal.js`,
  `src/hooks/useCartoes.js`, `src/hooks/useEmprestimos.js`, `src/hooks/useGastos.js`,
  `src/hooks/useEntradas.js`, `src/hooks/useInvestimentos.js`, `src/screens/SaidasScreen.js`,
  `src/screens/EntradasScreen.js` (modificados).

## 17. Sprint de Saneamento Arquitetural (✅ implementada em 2026-08-06)

Escopo controlado (auditoria prévia de navegação/composição de telas → plano → aprovação):
resolver a duplicação de hooks/listeners entre `SaidasScreen.js` e as telas que ela embute,
eliminar o código morto resultante, e remover arquivos órfãos confirmados. **Princípio
registrado para telas futuras** (ver `ARQUITETURA.md` seção 19, quadro "Princípio
arquitetural"): quando uma tela renderiza outra como parte da própria interface, só a de fora
busca dados — as de dentro recebem tudo por prop e nunca chamam `useX(...)` por conta própria.
Ver `ARQUITETURA.md`
seção 19 para o desenho técnico completo.

- **Causa raiz corrigida**: `useAdiantamento.js` sempre instanciava `useCartoes`+`useEmprestimos`
  por dentro, não importa quem chamasse — passou a receber essas funções prontas por
  parâmetro. Achado só durante o planejamento: `CartaoCard.js` (um por cartão cadastrado na
  aba "Por Cartão") chamava esse hook por conta própria, multiplicando listeners por cartão.
- **Ganho medido** (contagem estática contra o código antes da sprint, ver `ARQUITETURA.md`
  seção 19.0.1): dependendo da aba, existiam de 2 a 4 instâncias simultâneas do mesmo hook com
  listener ativo (`useGastos`/`useEmprestimos`/`useCartoes`); na aba "Por Cartão" o número
  ainda crescia com a quantidade de cartões cadastrados (3+N e 4+N). Depois da sprint, é sempre
  exatamente 1 instância de cada hook, em qualquer aba, independente do cadastro do usuário.
- **`SaidasScreen.js` é agora a única fonte de dados/ações** quando navegando por Saídas —
  `GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js`/`CartaoCard.js` deixaram de
  chamar `useGastos`/`useEmprestimos`/`useCartoes`/`useAdiantamento`/`useExclusaoParcelada`
  por conta própria; tudo vem por prop.
- **Código morto real removido**: a prop `isEmbedded` e tudo que só existia pro modo
  standalone dessas telas (nunca alcançável — sem rota própria) — modais de criação/edição
  duplicados, `handleExcluir` inalcançável, estatísticas calculadas e nunca renderizadas,
  prop `onEditItem` nunca usada.
- **Arquivos removidos**: `src/navigation/SaidasTabs.js` (órfão, confirmado por busca em todo
  o projeto) e `src/screens/CartoesEmprestadosScreen.js` (já catalogado como morto).
- **Achado corrigido de passagem**: a instância de `useAdiantamento` que `SaidasScreen.js` já
  tinha estava morta (nada a chamava) — ao consolidar, se `alerta`/`setAlerta` dessa instância
  não fossem também capturados, a mensagem de sucesso/erro ao antecipar parcela teria
  desaparecido silenciosamente. Corrigido antes de terminar a sprint.
- ~~**Ícone de excluir inerte nas linhas individuais**~~ ✅ Corrigido (2026-08-06, ver seção 20)
  — deixou de ser dívida técnica, agora aciona o mesmo mecanismo único de exclusão do
  `ModalEdicao`.
- **Fora do escopo, registrado como dívida técnica**: `extractDate` duplicada entre 3
  arquivos, nomes de callback inconsistentes (`onAdiantar` vs `onAdiantarParcelas`), possível
  rename futuro de `GastosScreen.js`/`EmprestimosScreen.js`/`CartoesScreen.js` (não são mais
  "Screens" de fato), responsabilidades do `TelaPadrao.js`.

## 18. Colaboração entre Usuários (🟡 backend + UI implementados e testados manualmente em 2026-08-18; ainda não publicado)

Feature grande, com documentação própria e muito mais detalhada em
`COLABORACAO_ARQUITETURA_V1.md` (seções 2–11.3 e "Plano de implementação por etapas") — esta
entrada é só um resumo de estado, não repete o conteúdo de lá.

- **O que é**: conexão entre duas contas (`ConexoesScreen.js` + `useConexoes.js`, solicitar/
  aceitar/recusar/desconectar) e, a partir de uma conexão aceita, divisão de despesa
  (`functions/divisaoDespesa.js`) — compartilhar um gasto existente ou criar um já compartilhado,
  com cotas por participante (conexão com conta ou "Membro sem conta", seção 7), aceite/recusa/
  cancelamento individual, edição antes do primeiro aceite real, adicionar participante depois,
  propor alteração de cota de quem já aceitou (com consentimento), excluir participante (Membro
  sem conta direto; com conta só via proposta), encerrar a divisão inteira, e um modelo de "valor
  sem destino" (seção 11.3) para todo valor liberado que ainda não tem um destino decidido (pode
  virar um novo convite, inclusive pra alguém que não fazia parte da divisão original).
- **Testado com**: 111 testes automatizados em `functions/` (Jest + Firestore Emulator, sem
  `firebase-functions-test` — chama `.run({data, auth})` direto) + validação manual do usuário no
  app (Expo + emuladores Auth/Firestore/Functions), rodada mais recente em 2026-08-18.
- **Não publicado em produção**: mesmo bloqueio já registrado na seção 5 (`firestore.rules` não
  publicado) + Cloud Functions exigem o plano Blaze (pay-as-you-go) nos 4 projetos Firebase, ainda
  não confirmado/ativado. Até isso acontecer, a feature só existe nos emuladores locais.
- **Estado do Git no momento desta atualização**: `functions/` (backend inteiro), `src/hooks/useConexoes.js`
  e `src/screens/ConexoesScreen.js` aparecem como **não rastreados** (`??` no `git status`) — nada
  desta feature foi commitado ainda. Vale decidir quando comitar (provavelmente depois de decidir
  Blaze + publicação das rules, pra comitar tudo relacionado à publicação junto).

## 19. Migração Expo SDK 54 → 57 (✅ implementada, testada em dispositivo real e publicada via EAS Update em 2026-09-19 — releases 0.6.0/0.6.1)

- **Motivo**: o Expo Go da loja (Play Store/App Store) só roda a versão de SDK mais recente por
  vez; testadores externos com o Expo Go já atualizado não conseguiam mais abrir o build em SDK 54.
- **O que mudou**: `react-native`, `reanimated`, `worklets` e demais dependências nativas realinhadas
  para as versões compatíveis com SDK 57; `@expo/vector-icons` e `expo-font` passaram a ser
  dependências diretas (antes vinham implícitas via `expo`); `app.config.js` migrado para o novo
  formato de plugins exigido pelo schema do SDK 57 (splash screen como plugin, `expo-font` e
  `expo-status-bar` explícitos).
- **Testado com**: bundle limpo nos 4 ambientes (`meu-app`, `rafael`, `marina`, `christian`) e
  teste em dispositivo real (dono do projeto e testador externo via ambiente `christian`).
- **Commits**: `e5923ae` (upgrade) + merge `5315841`.
- **Publicação**: feita em 2026-09-19 via `.\publish-all.ps1` (branch `main`, ambientes `meu-app`,
  `rafael`, `christian`) — testadores já conseguem abrir pelo Expo Go sem rodar `npm run start:*`
  localmente. Ambiente `marina` não faz parte do `publish-all.ps1` e não foi publicado nesta
  rodada.
- **Atenção**: como não havia publicação desde a 0.5.0 (14/08/2026), esta publicação também
  entregou todos os commits acumulados desde então (ver release 0.6.0 na seção 0), não só o
  upgrade de SDK.

### 19.1 Correção pós-publicação: `runtimeVersion` incompatível com Expo Go (✅ corrigida em 2026-09-19)

A primeira publicação (0.6.0) subiu com `sdkVersion: 57.0.0` correto, mas o Expo Go mostrava
"not compatible with this version of Expo Go" mesmo assim. Causa raiz: `app.json` tinha
`"runtimeVersion": "1.0.0"` — um texto fixo qualquer, sem relação com o SDK, provavelmente
esquecido desde o início do projeto. O Expo Go só reconhece um update como compatível quando o
`runtimeVersion` está no formato especial `exposdk:X.Y.Z`; um valor arbitrário como `"1.0.0"` faz
o Expo Go tratar o update como destinado a um build nativo customizado, não a ele.

- **Por que rodar pelo `npm run start:dev` funcionava mesmo com o bug**: o dev server usa outro
  mecanismo de negociação de versão, que não depende do `runtimeVersion` do EAS Update.
- **Complicador descoberto durante a investigação**: a pasta `android/` (projeto nativo) foi
  commitada sem querer no Sprint 6 (`b456b11`, 2026-08-04) e nunca foi removida — isso faz as
  ferramentas do Expo tratarem o projeto como **bare workflow**. Nesse modo, a policy
  `{"policy": "sdkVersion"}` (que recalcularia o `runtimeVersion` sozinha a cada upgrade futuro de
  SDK) **não é suportada** (`npx expo-updates runtimeversion:resolve` recusa com erro explícito) —
  por isso a correção usou um valor fixo (`"exposdk:57.0.0"`) em vez da policy. Ver seção 6 para o
  registro dessa pendência (pasta `android/` commitada por engano).
- **Correção**: `app.json` → `"runtimeVersion": "exposdk:57.0.0"`. Em qualquer upgrade futuro de
  SDK, esse valor precisa ser atualizado manualmente junto (não há como automatizar enquanto a
  pasta `android/` continuar versionada).
- **Aproveitado na mesma publicação (0.6.1)**: removidos 2 warnings — chamada legada
  `UIManager.setLayoutAnimationEnabledExperimental` em `EstatisticasComponent.js` (vira no-op na
  New Architecture, que já é obrigatória aqui por causa do `react-native-reanimated` 4.x); e
  `src/config/firebase.js` trocou `getAuth(app)` por `initializeAuth(app, { persistence:
  getReactNativePersistence(AsyncStorage) })` — sem isso, a sessão do usuário não persistia entre
  reaberturas do app (auth caía para memória, deslogando a cada restart). Esse segundo ponto era um
  bug funcional real, não só um warning cosmético.

#### 19.1.1 Depois da correção: Android continuou "not compatible" — causa externa, não é bug nosso

Depois de publicar com `runtimeVersion: "exposdk:57.0.0"`, o iPhone (Expo Go 57.0.9) abriu a
branch `main` normalmente. Um Android com o mesmo Expo Go 57.0.9 instalado continuou recusando
como "not compatible", mesmo depois de limpar cache, limpar dados e reinstalar o Expo Go — ou
seja, não é cache local.

**Verificação feita para descartar problema nosso**: requisição manual ao manifesto (mesmo
protocolo que o Expo Go usa, `curl` com headers `Expo-Platform: android` e
`Expo-Runtime-Version: exposdk:57.0.0` direto no `manifestPermalink` do update) devolveu
`200 OK` com `"runtimeVersion":"exposdk:57.0.0"` corretamente — o servidor da Expo entrega o
manifesto certo para Android. **Conclusão: o problema é do próprio app Expo Go Android**, não
algo corrigível editando o projeto.

**Causa raiz confirmada (pesquisa em 2026-09-19)**: é um bug documentado do cliente Expo Go
Android, registrado em
[expo/expo#46846](https://github.com/expo/expo/issues/46846). A checagem de compatibilidade do
Android faz `runtimeVersion.split(".").firstOrNull()` pra extrair a versão do SDK — só que pra um
valor no formato correto `exposdk:57.0.0` isso resulta em `"exposdk:57"`, que nunca é igual a
`"57"`. Ou seja: **qualquer projeto usando o formato `exposdk:X.Y.Z` recomendado pela própria
Expo é marcado como "Not compatible" no Android**, mesmo estando certo (por isso o iPhone abre
normal e o Android não, com o mesmo `runtimeVersion`). Já existe correção mesclada no código-fonte
do Expo (PR #49703, mesclada em 2026-09-03), mas **nenhuma versão publicada do Expo Go Android
ainda contém o fix** (nem a 56.0.1 nem a 57.0.9, testada aqui). Ver também
[expo/expo#50139](https://github.com/expo/expo/issues/50139) (update de SDK 57 falhando ao baixar
no Android com `IOException`, ainda sem resposta da equipe).
- **Não há workaround oficial** além de aguardar uma versão nova do Expo Go Android com o fix.
- **Contorno enquanto isso não sai**: usar `npm run start:dev` (ou `start:rafael`/
  `start:christian`) nesse aparelho — não depende do EAS Update, então não é afetado pelo bug.
- **SDK 58** entrou em beta em 2026-09-15 (React Native 0.88 RC) — não resolveria esse bug (é do
  parser do `runtimeVersion`, independente da versão) e ainda não é estável o suficiente pra
  migrar agora.
