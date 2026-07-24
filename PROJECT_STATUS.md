# Status do Projeto

> Última atualização: 2026-07-23
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
| ~~Recalculo de `valorTotal` após antecipação de parcela incorpora valor já descontado~~ ✅ Corrigido (Sprint 1 / A3, 2026-07-24) | `useEmprestimos.js` | — `valorContratado` agora é fixo desde a criação; `economiaTotal` (soma de descontos) e "valor efetivamente pago" (`valorContratado - economiaTotal`) são independentes, exibidos em `ModalDetalhes.js`/`ModalHistoricoParcelas.js` |
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

## 7. Próximos passos sugeridos (não iniciar sem alinhar antes)

1. Decidir explicitamente o destino do Modo Família neste ciclo: terminar a integração (contexto de membro real) ou remover o scaffolding morto até a fase "Modo Família" do roadmap.
2. Versionar `firestore.rules` antes de qualquer publicação (bloqueador para a fase "Publicação" do roadmap).
3. Finalizar e commitar o fluxo de onboarding em andamento.
4. Limpar código morto e dependências não usadas (baixo risco, alto ganho de clareza).
5. Só então avançar para os itens estruturais maiores (unificação de hooks, unificação Criação/Edição) descritos em `ARQUITETURA.md`.
