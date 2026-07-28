# Roadmap

> Visão de evolução do produto. As fases são sequenciais por decisão do time — não antecipar arquitetura de uma fase futura às custas da simplicidade da fase atual, mas também não fechar portas que exijam reescrever o que já existe.
>
> Objetivo de longo prazo: uma única base de código atendendo Pessoa Física, Casais, Famílias, Pequenas Empresas e Empresas.
>
> Ver `PRODUCT_DISCOVERY.md` para a análise de produto/UX/negócio (2026-07-24) que fundamenta as adições marcadas abaixo como "Product Discovery".

---

## Fase 0 — MVP Mobile (fase atual)

**Objetivo:** ter o app funcional, estável e seguro para uso pessoal (pessoa física), pronto para ser publicado nas lojas.

**Escopo:** Resumo Mensal, Entradas, Gastos, Empréstimos, Cartões, Investimentos, Modelos recorrentes, autenticação por e-mail/senha, modo privacidade, filtro de mês/ano.

**O que já existe:** todo o escopo acima está implementado e em uso (ver `PROJECT_STATUS.md`).

**Bloqueadores para fechar esta fase:**
- `firestore.rules` versionado e aplicado (hoje inexistente — risco de segurança).
- Correção dos bugs financeiros conhecidos (parse de valor, recálculo de parcelas de empréstimo, saldo de investimento).
- Onboarding finalizado e commitado.
- Decisão sobre o scaffolding de Modo Família: terminar ou remover (não deixar código morto/inconsistente atravessar para a fase de Publicação).
- **Menu do Usuário / Hub de Configurações** (planejado para a Sprint 2, ver `ARQUITETURA.md` seção 11 e `PROJECT_STATUS.md`) — hoje não existe nenhum botão de logout em lugar nenhum da interface, o que por si só já bloquearia qualquer publicação real.

---

## Fase 1 — Publicação

**Objetivo:** disponibilizar o app nas lojas (Google Play / App Store) para uso real, ainda em modo pessoa física / uso individual.

**Depende de:** Fase 0 concluída, principalmente as regras de segurança do Firestore (não publicar com banco sem regra auditável).

**Considerações:**
- Cada variante (`meu-app`/dev, `rafael`, `marina`, `christian`) usa projeto Firebase e Expo próprios — antes de publicar de verdade, definir se esse modelo de "um Firebase por pessoa" é o modelo final ou um artefato de fase de testes. Isso afeta diretamente como o Modo Família (Fase 2) vai unir esses usuários.
- Processo de build (`eas.json`) e assinatura Android (`android/app/debug.keystore`, `proguard-rules.pro`) precisam de revisão de produção (keystore de debug não deve ir para produção).

---

## Fase 2 — Modo Família

**Objetivo:** permitir que múltiplas pessoas (casal, família) compartilhem dados financeiros dentro do mesmo "grupo" (tenant), com visibilidade e permissões adequadas.

**O que já existe (parcial, hoje não funcional):**
- Conceito de `tenantId` já gravado no perfil do usuário (`useAuth.js`), embora hoje sempre igual ao próprio `uid`.
- `getBasePath(user, compartilhado)` já sabe alternar entre `users/{uid}` e `tenants/{tenantId}` — mas nunca é chamado com `compartilhado=true`.
- Telas de UI (`MembrosScreen`, `GerenciarMembrosModal`, `MembroSelect`) já existem, mas desconectadas da navegação e com referência quebrada a `membroSelecionado` (campo que `useAuth()` não expõe).

**O que falta:**
- Um contexto real de "família/tenant ativo" (mencionado em comentário no código como `ModoFamiliaContext`, nunca criado).
- Migração de dados: decidir como um usuário existente "entra" em um tenant compartilhado sem perder o histórico já gravado em `users/{uid}`.
- Regras de Firestore que garantam que membros de um tenant só acessem dados do próprio tenant.
- Modelo de permissões dentro da família (todo mundo edita tudo? existe um "admin"?) — decisão de produto, não só técnica.

**Risco de arquitetura a evitar:** implementar Modo Família como "mais um `if` espalhado pelos hooks atuais" (como já começou a acontecer em `useModelos.js`) em vez de um hook genérico de acesso a dados que abstraia o caminho `users/` vs `tenants/`. Resolver a duplicação de hooks (ver `ARQUITETURA.md`, seção de dívida técnica) **antes** desta fase reduz muito o retrabalho aqui.

---

## Fase 3 — Versão Web

**Objetivo:** o mesmo produto acessível via navegador, reaproveitando o máximo possível de lógica de negócio (hooks, contexts) já escrita para mobile.

**Facilitadores já existentes:** `react-native-web` já está no `package.json` e há um `public/index.html`/`dist/` de build web — indício de que a viabilidade técnica já foi testada.

**O que precisa estar pronto antes:**
- Lógica de negócio (hooks) desacoplada de componentes visuais React Native específicos (hoje alguns hooks têm acoplamento leve com UI, ex.: `global.alertaGlobal` chamado dentro de `useCartoes`/`useEmprestimos`).
- Componentes de layout "gordos" (`TelaPadrao.js`, `SaidasScreen.js`) separados em: lógica de tela (reaproveitável) vs. apresentação nativa (não reaproveitável em Web sem adaptação).
- `globalStyles.js` revisto — um arquivo de estilos pensado para mobile puro tende a precisar de ajustes para responsividade web.

---

## Fase 4 — Modo Empresa

**Objetivo:** atender Pequenas Empresas e Empresas — múltiplos usuários com papéis (admin, financeiro, colaborador), categorias/relatórios com cara de negócio (ex: CNPJ, notas fiscais, centro de custo).

**Depende de:** Modo Família (Fase 2) já ter resolvido o problema geral de "múltiplos usuários compartilhando um mesmo espaço de dados" — Empresa é uma extensão desse mesmo conceito de tenant, com um modelo de permissões mais granular.

**Já existe um sinal no código:** `tipoUsuario: "pessoa_fisica" | "empresa"` já é gravado no perfil desde o registro (`useAuth.js`), com `tipoDocumento` (CPF/CNPJ) — a diferenciação de tipo de conta já nasceu prevista, mesmo que ainda sem comportamento diferente no app.

---

## Fase 5 — Premium (Assinaturas)

**Objetivo:** monetização via planos pagos, com limites/recursos diferenciados por plano.

**Já existe um sinal no código:** campo `plano: "free"` já é gravado no perfil do usuário desde o registro — mas nenhum hook, tela ou regra hoje verifica esse campo. É só um dado solto.

**O que precisa existir antes de implementar:**
- Definição de produto: o que é gratuito vs. pago (nº de cartões? categorias customizadas? modo família com mais de N membros? relatórios avançados?).
- Um ponto único de verificação de plano (idealmente no mesmo hook genérico de acesso a dados sugerido na Fase 2), para não espalhar `if (profile.plano === 'premium')` pelo app inteiro.
- Integração de pagamento (não avaliada nesta análise — depende de plataforma: Google Play Billing / Apple IAP / Stripe para Web).

---

## Fase 6 — IA

**Objetivo:** recursos inteligentes sobre os dados financeiros já existentes (ex: categorização automática de gastos, previsão de saldo, alertas de padrão de consumo, assistente de planejamento).

**Por que é a última fase:** IA sobre dados financeiros só entrega valor real depois que o modelo de dados estiver estável (Modo Família e Empresa já definidos) — treinar/orientar heurísticas sobre uma estrutura de dados que ainda vai mudar (ex: `users/` vs `tenants/`) geraria retrabalho.

**Facilitador a preparar com antecedência:** manter os dados financeiros com estrutura consistente e categorização já normalizada (hoje `CategoriaSelect.js` mistura categorias hardcoded com customizadas via `AsyncStorage` local — isso precisaria migrar para Firestore antes de qualquer IA conseguir "ver" as categorias de todos os usuários de forma agregada, se esse vier a ser o caso).

---

## Princípio geral entre fases

Sempre que uma decisão técnica for tomada **na fase atual** e for apenas paliativa (não sobrevive à próxima fase), isso deve ser dito explicitamente no momento da proposta — não deixado implícito para descobrir depois.

---

## Atualização — Product Discovery (2026-07-24)

Análise de produto/UX/negócio (ver `PRODUCT_DISCOVERY.md`) sugeriu adições às fases já definidas acima. Nenhuma fase foi removida ou reordenada — estas são camadas adicionais de escopo a avaliar quando cada fase for iniciada.

| Fase | Adições sugeridas pelo Product Discovery |
|---|---|
| Fase 0 — MVP Mobile / Publicação | Lembrete local de vencimento (sem servidor, via notificação agendada no aparelho) · PIN/biometria ao abrir o app · Tela de privacidade/exclusão de conta (possível exigência de política do Google Play para apps com criação de conta) · Onboarding sem fricção desnecessária (explicar por que documento é pedido, permitir pular) |
| Fase 2 — Modo Família | Convite por link/código (também funciona como mecanismo de crescimento orgânico) · Rateio de despesas entre membros (quem deve para quem) |
| Fase 3 — Versão Web | Sem adição |
| Fase 4 — Modo Empresa | Considerar um "Modo MEI" mais simples como degrau intermediário antes do Modo Empresa completo — nicho grande e desatendido no mercado brasileiro, e o dado (`tipoUsuario`/CNPJ) já existe desde o cadastro |
| Fase 5 — Premium | Definir tiers concretos: histórico estendido, relatórios/exportação, família ampliada, MEI/Empresa |
| Fase 6 — IA | Categorização automática por regra simples (não é IA) pode entregar valor percebido parecido antes da fase de IA de verdade |
| **Nova fase a avaliar** | **Open Finance / Integração Bancária** — não estava contemplada nas fases originais. Importação automática de transações é apontada pelo discovery como a maior alavanca de retenção de longo prazo do produto, mas envolve regulação e parceria bancária — avaliar posicionamento (depois de Web, antes ou junto de Modo Empresa) quando o roadmap for revisitado |

---

## Atualização — Menu do Usuário / Hub de Configurações (2026-07-27)

Nova diretriz de arquitetura e UX: criar um hub central de conta/configurações, acessado pelo cabeçalho (ver `ARQUITETURA.md` seção 11 para o desenho técnico completo, e `PROJECT_STATUS.md` para o escopo da Sprint 2). Esse hub não é só um item de MVP — é a estrutura que várias fases futuras vão usar como ponto de encaixe, sem precisar reorganizar a interface de novo:

| Fase | Como o Hub se conecta a ela |
|---|---|
| Fase 0 — MVP Mobile | Resolve o bloqueador do logout ausente; categoria "Conta" nasce já com nome/e-mail/sair. |
| Fase 2 — Modo Família | Categoria "Membros" passa a ter um local oficial de administração (hoje só existia dentro dos seletores); consolida a lógica em `useMembros.js`, único ponto a evoluir quando o Modo Família precisar de convite/permissões reais. |
| Fase 4 — Modo Empresa | "Conta" é o lugar natural para exibir/gerenciar `tipoUsuario`/papéis quando essa fase chegar. |
| Fase 5 — Premium | "Conta" é o lugar natural para mostrar o `plano` atual e um futuro upgrade — sem precisar inventar uma tela nova. |
| Fase 6 — IA / Notificações | Categoria "Notificações" já nasce com a estrutura pronta para lembretes de vencimento, metas, alertas — só falta implementar o conteúdo. |
| Product Discovery (PIN/biometria, exclusão de conta) | "Conta" e "Aparência" são os lugares naturais para esses itens quando entrarem em escopo. |

---

## Atualização — Agenda Financeira / Central de Avisos (2026-07-28)

Nova diretriz de produto, registrada no discovery da Sprint 3 (`SPRINT3_DISCOVERY.md`) e confirmada pelo usuário: o app deve evoluir de "controle" (o que já aconteceu) para "planejamento" (o que vai acontecer, o que isso significa, o que fazer a respeito). Três camadas, entregues em sprints separadas — ver `ARQUITETURA.md` seção 12 para o desenho técnico da primeira:

1. **"O que vai acontecer?"** — Agenda Financeira (calendário + linha do tempo) e Central de Avisos. ✅ Sprint 3 (2026-07-28).
2. **"O que isso significa?"** — saldo projetado, "vou fechar o mês no positivo?", "posso antecipar essa parcela?". Candidata a Sprint 4, ainda não iniciada.
3. **"O que eu deveria fazer?"** — recomendações comparativas (investir vs. quitar dívida), alertas de padrão de gasto. Fase futura, alinhada à Fase 6 (IA) abaixo.

O hook `useEventosFinanceiros` (fonte única dos 4 domínios financeiros normalizados) é a peça que essa evolução toda usa como base — pensado desde a Sprint 3 para não precisar ser redesenhado quando as camadas 2 e 3 chegarem.

| Fase | Como a Agenda Financeira se conecta a ela |
|---|---|
| Fase 0 — MVP Mobile | Notificação local de vencimento (Product Discovery, acima) passa a ter uma sprint própria já desenhada (ver `SPRINT3_DISCOVERY.md` seção 7): reaproveita `useEventosFinanceiros` para decidir o que agendar, só falta o build nativo com `expo-notifications`. |
| Fase 2 — Modo Família | Notificação por aparelho (não por conta) é uma limitação a reavaliar quando o Modo Família tiver múltiplos usuários compartilhando o mesmo tenant — hoje cada membro precisaria configurar a própria notificação no próprio aparelho. |
| Fase 5 — Premium | Histórico estendido/relatórios (tiers já cogitados no Product Discovery) poderiam usar a mesma Linha do Tempo como base visual, olhando para trás em vez de para frente. |
| Fase 6 — IA | `useEventosFinanceiros` já separa "o que gera um evento" de "como ele é exibido/notificado" — regras de geração mais inteligentes (ex.: "gasto acima do padrão") entram nesse mesmo hook, sem mudar a camada de exibição. |
| Nova fase a considerar (Widgets) | Estudo de viabilidade feito (`SPRINT3_DISCOVERY.md` seção 8) — exige build nativo por plataforma e Swift no iOS; permanece só documentado, sem sprint definida. |
