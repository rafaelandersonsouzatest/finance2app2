# Sprint 4 — Discovery: Categorias e Subcategorias (fundação para Planejamento Financeiro)

> Registrado em 2026-07-28, antes de qualquer implementação. Mesmo processo da Sprint 3:
> pesquisa no código real + arquitetura + alternativas, para decidirmos o escopo juntos
> antes de escrever código. Este documento não fecha escopo sozinho — a seção 13 traz a
> proposta, mas nada começa a ser implementado até você confirmar.

## 0. Por que esta sprint existe antes de "Metas Financeiras"

Ao planejar Metas Financeiras, identificamos que **Categoria hoje não é uma entidade** — é
uma string livre, guardada só no aparelho (`AsyncStorage`), sem sincronia entre
dispositivos e sem preparo para o Modo Família. Construir Metas em cima disso seria
construir sobre uma fundação que sabemos que vai precisar ser refeita. Por isso, esta
sprint constrói Categorias e Subcategorias como infraestrutura de primeira classe —
pensada não só para Metas, mas para tudo que você listou: Orçamentos, Relatórios, Agenda
Financeira, IA, Dashboard, Modo Família.

**Sobre o nome da iniciativa maior:** concordo com sua avaliação. Sugiro que a partir de
agora tratemos isso como um módulo **"Planejamento Financeiro"**, do qual "Metas
Financeiras" é a primeira funcionalidade (Sprint 5, ainda não iniciada) — com Orçamentos,
limites por categoria e outros recursos de acompanhamento entrando depois, sob o mesmo
guarda-chuva. Isso se encaixa bem na progressão de 3 camadas já registrada no `ROADMAP.md`
desde a Sprint 3 ("o que vai acontecer" → "o que isso significa" → "o que eu deveria
fazer") — Planejamento Financeiro vive nas camadas 2 e 3. Recomendo atualizar o
`ROADMAP.md` com esse reenquadramento ao final desta sprint, junto da documentação de
costume.

## 1. Achados no código atual

Levantamento completo feito antes de desenhar qualquer solução (arquivo por arquivo, não
por memória):

- **`CategoriaSelect.js` é 100% local**: categorias padrão são uma constante hardcoded no
  JS (`CATEGORIAS_PADRAO`, 10 itens fixos incluindo "Renda", que é income, misturada com
  "Lazer"/"Transporte", que são despesa — o modelo atual não distingue tipo de transação).
  Categorias customizadas vivem só em `AsyncStorage` (`@categorias_personalizadas`) — sem
  `useAuth`, sem Firestore, sem escopo de usuário. **Não sincroniza entre aparelhos nem
  entre membros da família.** O componente só manipula strings simples, nunca objetos.
- **`categoria` nas transações é uma string livre, opcional em todo lugar**: não é campo
  obrigatório em nenhum dos 5 tipos de lançamento (`ModalCriacao.js`, lista de campos
  obrigatórios por tipo — `categoria` nunca aparece nela). Empréstimos podem receber
  categoria na criação, mas **`ModalEdicao.js` não expõe esse campo para editar
  empréstimos** — inconsistência já existente, não corrigida agora (fora do pedido, mas
  registrada).
- **Normalização objeto↔string inconsistente entre hooks**: `useEntradas.js` e
  `useCartoes.js` já tratam `categoria` como podendo chegar em formato `{id, nome}` (mesmo
  tratamento dado a `membro`/`pessoa`), mas `useGastos.js`, `useEmprestimos.js` e
  `useModelos.js` não fazem esse tratamento. Hoje isso não quebra nada porque
  `CategoriaSelect` só emite string — mas mostra que o código já foi escrito prevendo essa
  evolução em alguns lugares e esquecendo em outros.
- **Não existe nenhuma agregação por categoria hoje.** Vasculhei `EstatisticasComponent.js`
  (o único componente de estatísticas do app) e ele agrega só por status
  pago/pendente — nunca por categoria. Ou seja, "Relatório por categoria" e "gasto por
  categoria" para Metas serão **funcionalidade nova**, não um refactor de algo existente.
- **`meta` (investimento) já existe, com 3 cálculos de progresso divergentes** —
  confirmando o que já era dívida técnica conhecida (`PROJECT_STATUS.md`, seção 6):

  | Arquivo | Escala | Trava em 100%? |
  |---|---|---|
  | `SecaoInvestimentos.js` | 0–100 | Sim |
  | `TelaPadrao.js` (case `investimento`) | 0–100 | **Não** — pode passar de 100% |
  | `DetalhesInvestimentoModal.js` | 0–1 (fração) | Sim, e trava de novo depois de multiplicar por 100 |

  Nenhum dos três importa de um lugar comum — cada um tem sua própria conta.
- **`useMembros.js` é o precedente exato do que precisamos construir**: hook único,
  Firestore via `getBasePath(user)`, `onSnapshot` ao vivo, CRUD simples
  (`adicionarMembro`/`atualizarMembro`/`excluirMembro`), validação de nome duplicado
  (comparação case-insensitive em memória), e um campo reservado para o futuro
  (`avatar: null`) sem UI ainda. É o modelo a seguir para `useCategorias`.
- **`getBasePath(user, compartilhado)` já existe e já sabe alternar para
  `tenants/{tenantId}`** — mas **nenhum lugar do código chama com `compartilhado=true`
  hoje**, e o `ARQUITETURA.md` (seção 10) já registra um gap conhecido: `getBasePath`
  recebe o `user` do Firebase Auth puro, que **não tem `tenantId`** — só o `profile`
  (Firestore) tem. Ou seja: **construir Categorias em cima de `getBasePath` deixa tudo
  pronto para o Modo Família, mas não resolve sozinho** esse gap de encanamento — que só
  precisa ser resolvido quando o Modo Família em si for implementado (Fase 2 do roadmap),
  não nesta sprint.
- **8 subcoleções existem hoje sob `users/{uid}/`**: `gastos`, `entradas`, `emprestimos`,
  `cartoes`, `investimentos`, `modelosDeGasto`, `modelosDeEntrada`, `membros`. Nenhuma
  chamada `categorias` — sem risco de colisão de nome.

## 2. Modelo de dados proposto: Categorias e Subcategorias

### 2.1 Estrutura: coleção plana com `parentId`, ou array embutido?

| | **A. Coleção plana `categorias/{id}` com `parentId`** | **B. Array de subcategorias embutido no doc da categoria** |
|---|---|---|
| **Vantagens** | Cada subcategoria é um documento independente — pode ser referenciada por `categoriaId` direto de uma transação/meta sem precisar "abrir" o pai; consultas simples (`where('parentId','==',x)`); segue o padrão que o projeto já usa (coleções planas, não arrays grandes) | Ler "categoria + subcategorias" é uma leitura só, sem query extra |
| **Desvantagens** | Uma leitura a mais para listar subcategorias de uma categoria (barato, é uma query indexada) | Editar/excluir **uma** subcategoria exige reescrever o array inteiro do documento pai — exatamente o mesmo padrão que `useInvestimentos.js` já tem hoje com `movimentacoes` (`PROJECT_STATUS.md` já lista isso como risco: "reescritas como array inteiro sem transação atômica"); referenciar uma subcategoria por ID a partir de uma Meta/transação fica ambíguo (precisa do par categoriaId+subcategoriaId, ou varrer todos os arrays) |
| **Dificuldade** | Baixa | Baixa agora, dívida técnica depois |
| **Compatibilidade com o pedido de "Meta por categoria com rollup de subcategorias"** | Boa — soma por `parentId` é uma query direta | Ruim — exigiria abrir cada categoria para achar suas subcategorias |

**Recomendação:** opção A. Uma subcategoria é só uma categoria com `parentId` preenchido —
mesma coleção, mesmo hook, mesmo CRUD, sem duplicar lógica. Evita repetir um padrão que o
próprio projeto já sabe que dói (array reescrito por inteiro).

### 2.2 Forma do documento (`users/{uid}/categorias/{id}`)

```js
{
  nome: "Alimentação",
  parentId: null,           // null = categoria de topo; preenchido = subcategoria
  tipoOrigem: "padrao",     // "padrao" | "personalizada" — só informativo, não muda o CRUD
  tipoTransacao: "gasto",   // "gasto" | "entrada" | "ambos" — ver observação abaixo
  cor: "#FF8A65",
  icone: "food-outline",
  ativa: true,              // false = "oculta" (ver seção 10)
  ordem: 3,
  criadoEm: <timestamp>,
}
```

**Observação/pergunta em aberto:** hoje a lista padrão mistura categorias de despesa
("Lazer", "Transporte") com uma de receita ("Renda"), e o mesmo seletor é usado para
gastos, entradas, cartões e empréstimos. Proponho adicionar `tipoTransacao` para o
seletor filtrar corretamente (não faz sentido oferecer "Renda" ao categorizar um gasto).
É uma pequena mudança de comportamento do que existe hoje (o seletor atual mostra tudo
para todo mundo) — trago como recomendação, não decisão automática.

## 3. Categorias padrão × personalizadas — unificação num único modelo

Você quer que o usuário edite/oculte/exclua **inclusive as categorias padrão** — isso só é
possível se elas também forem documentos reais no Firestore do usuário (uma constante
hardcoded no app não pode ser "editada" por um usuário individualmente).

| | **A. Semear as padrão no Firestore do usuário (recomendado)** | **B. Manter padrão só no código, guardar apenas "sobrescritas" por usuário** |
|---|---|---|
| **Como funciona** | Na primeira vez que `useCategorias` roda e encontra a coleção vazia, grava as categorias padrão como documentos reais (`tipoOrigem: "padrao"`) — depois disso, editar/ocultar/excluir uma padrão é exatamente igual a editar uma personalizada, mesmo CRUD, sem caso especial | Padrão continua uma constante no app; Firestore guarda só `{ oculta: true }` ou `{ nomeCustomizado: "..." }` por categoria padrão que o usuário alterou |
| **Vantagens** | Modelo único, sem duplicar lógica de leitura (mesclar 2 fontes toda vez); subcategorias de categorias padrão funcionam igual às de categorias personalizadas, sem caso especial | Se a próxima versão do app adicionar uma nova categoria padrão, todo usuário já existente "ganha" ela de graça, sem precisar de nada extra |
| **Desvantagens** | Se a próxima versão do app adicionar uma categoria padrão nova, usuários antigos não a recebem automaticamente (mitigável depois, com uma sincronização incremental opcional — não construída agora) | Toda leitura precisa mesclar hardcoded + overrides + personalizadas — mais lógica espalhada, e subcategoria de uma padrão vira um caso à parte |
| **Dificuldade** | Baixa | Média |

**Recomendação:** opção A. Simplicidade e modelo único pesam mais do que o ganho de "nova
categoria padrão automática" — que é um cenário raro (mudar o catálogo padrão do app não é
algo que deva acontecer com frequência).

**Migração sem perda de dados, para contas já existentes:** a mesma lógica de "semear se
a coleção estiver vazia" resolve isso sozinha — não precisa de um script de migração
separado. Usar **IDs determinísticos** para as categorias padrão (ex.: `padrao-alimentacao`
em vez de um ID aleatório do `addDoc`) evita duplicar o catálogo se dois aparelhos abrirem
o app ao mesmo tempo logo após um login e ambos tentarem semear — o segundo `set` com o
mesmo ID só sobrescreve o primeiro, não duplica.

## 4. Como as transações referenciam a categoria: string ou `categoriaId`?

Esta é a decisão de maior impacto em retrabalho futuro.

| | **A. Trocar tudo para `categoriaId` (referência)** | **B. Manter `categoria` como string, catálogo só alimenta o seletor** |
|---|---|---|
| **Vantagens** | Renomear uma categoria não quebra o histórico; Metas/Relatórios agregam com segurança (comparar por ID, não por texto); funciona corretamente entre membros do Modo Família (não depende de todos digitarem o nome idêntico) | Zero mudança nos 6 hooks de dados e nos 3 modais que hoje escrevem `categoria` como string — risco quase zero, nada quebra |
| **Desvantagens** | Toca `useGastos`, `useEntradas`, `useCartoes`, `useEmprestimos`, `useModelos`, `ModalCriacao.js`, `ModalEdicao.js`, `GerenciarModelosModal.js` — superfície grande | Renomear uma categoria "solta" o histórico (transações antigas continuam com o nome antigo, mesmo que a categoria tenha sido renomeada); agregação por categoria em Relatórios/Metas fica sujeita a diferenças de grafia |
| **Compatibilidade com o pedido** ("sustentar Metas, Orçamentos, Relatórios, Agenda, IA, Dashboard, Família") | Boa — é a base que essas funcionalidades vão precisar de qualquer forma | Ruim a médio prazo — cedo ou tarde alguém vai precisar reimplementar isso do jeito A, e aí sim gera retrabalho de verdade |

**Recomendação (a que mais importa desta sprint): opção A, mas com convivência, não
substituição forçada:**
- Lançamentos **novos**, feitos pelo seletor novo, gravam `categoriaId` **e** um
  `categoriaNome` denormalizado (para exibir em listas sem precisar buscar a categoria toda
  vez — padrão comum no Firestore para evitar N+1 leituras).
- Lançamentos **antigos**, que só têm `categoria` (string), continuam funcionando sem
  qualquer migração em lote — a lógica de exibição usa `categoriaId` quando existe, cai
  para a string antiga quando não existe.
- **Nenhum dado é reescrito em massa.** Isso seria arriscado (6 coleções, potencialmente
  muitos documentos) e vai contra o princípio do projeto de nunca migrar à força.

Essa é a decisão de maior escopo desta sprint — se preferir a opção B para reduzir o
tamanho da entrega agora e revisitar isso depois, é uma escolha legítima, só que com o
retrabalho futuro que a tabela acima descreve.

## 5. Sincronização entre dispositivos

Resolvida como efeito colateral de sair do `AsyncStorage` e ir para o Firestore: uma vez
que `useCategorias` siga o padrão do `useMembros` (listener `onSnapshot` em
`getBasePath(user)/categorias`), qualquer edição aparece em tempo real em todos os
aparelhos logados na mesma conta — sem lógica extra de sincronização manual.

## 6. Compatibilidade futura com Modo Família

Construir sobre `getBasePath(user)` (sem passar `compartilhado`) deixa a porta aberta:
quando o Modo Família for implementado de verdade, a mudança para categorias
compartilhadas é trocar a chamada para `getBasePath(user, true)` — **desde que** o gap já
conhecido (`user.tenantId` não existe no objeto do Firebase Auth, só no `profile` do
Firestore — `ARQUITETURA.md` seção 10) seja resolvido nessa hora. Não é um bloqueio para
esta sprint — é só importante deixar registrado que "pronto para Modo Família" aqui
significa "não vai exigir redesenho", não "já funciona compartilhado hoje".

## 7. Unificação do cálculo de Meta de Investimento

Por pedido seu: só consolidar a lógica existente numa única fonte, sem nenhuma
funcionalidade nova de meta de investimento.

Proposta: `src/utils/metas.js` (novo), com uma função pura:
```js
export function calcularProgressoMeta(valorAtual, valorMeta) {
  const meta = Number(valorMeta) || 0;
  if (meta <= 0) return 0;
  return Math.min((Number(valorAtual) || 0) / meta, 1) * 100; // sempre 0–100, sempre travado em 100
}
```
`SecaoInvestimentos.js`, `TelaPadrao.js` e `DetalhesInvestimentoModal.js` passam a chamar
essa única função, removendo suas 3 implementações locais. Baixo risco — é refatoração
pura, sem mudança de comportamento visível (exceto corrigir o bug real do `TelaPadrao.js`
que hoje deixa passar de 100%).

## 8. Impacto em funcionalidades futuras

| Funcionalidade | Como esta arquitetura ajuda |
|---|---|
| **Metas Financeiras** (Sprint 5) | "Meta por categoria" vira `{ categoriaId, valorLimite, periodo }` — referência estável, sem depender de texto igual |
| **Orçamentos** | Mesma base de categorias/subcategorias — um orçamento é essencialmente várias metas de gasto por categoria agrupadas |
| **Relatórios** | Agregação por `categoriaId` (e rollup por `parentId` para ver o total de uma categoria-pai) é uma query direta — hoje isso não existe no app, seria construído do zero de qualquer forma, mas em cima de uma base sólida |
| **Agenda Financeira** | `useEventosFinanceiros` já carrega `itemOriginal` (o documento cru) — mostrar cor/ícone da categoria no card de evento vira um ajuste visual pequeno depois, não uma mudança de arquitetura |
| **IA / recomendações** | Depende de chaves estáveis para reconhecer padrão ("esse usuário sempre estoura em Lazer") — `categoriaId` estável é exatamente o que isso precisa; string solta não |
| **Dashboard** | Gráficos por categoria (pizza/barra) usam a mesma agregação por `categoriaId` de Relatórios |
| **Modo Família** | Ver seção 6 — pronto para compartilhar assim que o gap de `tenantId` for resolvido |

## 9. Onde isso aparece na navegação

Sugestão: uma tela "Categorias" dentro do Menu do Usuário, mesmo padrão que "Membros"
ganhou na Sprint 2 (`UserMenu.js` → nova entrada → nova rota no `MainStack.js` → tela
própria consumindo `useCategorias`). O seletor de categoria nos formulários
(`CategoriaSelect.js`) passa a ser alimentado por esse mesmo hook, com uma segunda camada
de UI para escolher a subcategoria (ex.: expandir a categoria escolhida e mostrar as
subcategorias dela, ou um seletor em duas etapas) — o desenho exato da UI fica para a fase
de implementação, não é uma decisão de arquitetura.

## 10. Ocultar vs. excluir

Recomendo que "ocultar" e "excluir" **não sejam operações totalmente separadas**:
- **Ocultar** (`ativa: false`): a categoria some do seletor para novos lançamentos, mas
  continua existindo — transações antigas que a usam continuam exibindo/agregando
  normalmente. Essa é a operação seguramente reversível.
- **Excluir de verdade**: só permitir se a categoria não tiver nenhuma subcategoria nem
  nenhuma transação vinculada (evita `categoriaId` órfão apontando para um documento que
  não existe mais). Se tiver vínculos, a UI oferece "ocultar" no lugar.

Isso evita perda de integridade referencial sem precisar de nenhuma lógica de "exclusão em
cascata" complexa.

## 11. Riscos técnicos e dependências consolidados

| Item | Risco |
|---|---|
| Convivência `categoriaId` (novo) + `categoria` string (legado) em 6 coleções diferentes | 🟡 Médio — toda tela que exibe categoria precisa de uma função só (`resolverCategoria(item, catalogo)`) para não duplicar a lógica de fallback em cada lugar |
| Seed de categorias padrão na primeira leitura vazia | 🟢 Baixo, se usar IDs determinísticos (evita duplicação por corrida entre aparelhos) |
| `ModalEdicao.js` não expõe categoria para empréstimos (achado, não desta sprint) | 🟢 Baixo — inconsistência preexistente, candidata a correção junto desta sprint já que vamos mexer nesses arquivos mesmo, ou depois — a definir |
| Novo campo `tipoTransacao` muda o comportamento do seletor hoje (mostra tudo, passaria a filtrar) | 🟡 Médio — é uma melhoria de qualidade de dado, mas é uma mudança de comportamento visível, não passiva |
| Modo Família / `tenantId` | 🟢 Não é risco desta sprint — só não tratar como "já funciona compartilhado" |

## 12. Fora do escopo desta sprint

- Metas Financeiras em si (Sprint 5).
- Orçamentos, Relatórios, Dashboard, IA — tudo isso só passa a ser possível depois, não é
  construído agora.
- Resolver o gap `user.tenantId`/Modo Família de verdade.
- Migração em massa de `categoria` (string) para `categoriaId` em documentos já existentes.
- Sincronização automática de novos itens do catálogo padrão para usuários antigos (opção A
  da seção 3 aceita esse trade-off conscientemente).

## 13. Escopo definitivo da Sprint 4 (confirmado em 2026-07-28)

Todas as perguntas da rodada anterior foram respondidas — a sprint deixou de se chamar
apenas "Categorias" e passou a ser entendida como **a fundação do módulo Planejamento
Financeiro**, do qual a tela de Categorias é a primeira peça visível.

### Decisões confirmadas

1. **`categoriaId` como referência principal**, convivendo com a string antiga —
   **sem nenhuma migração em massa** dos lançamentos existentes (seção 4, opção A).
2. **Categorias e subcategorias na mesma coleção, via `parentId`** (seção 2.1, opção A).
3. **Categorias saem do `AsyncStorage` e viram entidades reais no Firestore**,
   sincronizadas entre aparelhos (seção 5).
4. **Seed automático das categorias padrão por usuário** — cada usuário recebe sua própria
   cópia, editável/renomeável/arquivável/excluível como qualquer categoria (seção 3, opção
   A).
5. **Arquivar (`ativa: false`) é distinto de excluir de verdade** — excluir só é permitido
   sem categoria/transação vinculada (seção 10), exatamente como proposto.
6. **`tipoTransacao` filtra o seletor** por tipo de lançamento (Receita/Despesa/Ambos) —
   confirmado, é mudança de comportamento visível assumida conscientemente.
7. **Corrigir nesta sprint**: `ModalEdicao.js` passa a expor `categoria` também para
   empréstimos (achado da seção 1, hoje só `ModalCriacao.js` permite definir na criação).
8. **Todos os seletores de categoria do app passam a usar `useCategorias` exclusivamente**
   — `ModalCriacao.js`, `ModalEdicao.js`, `GerenciarModelosModal.js` — nenhum caminho
   antigo baseado em `AsyncStorage` sobrevive.

### Modelo de dados final (`users/{uid}/categorias/{id}`)

Campo por campo, todos já fazem parte do CRUD desta sprint (nenhum campo "reservado para
o futuro sem uso" foi adicionado por precaução — no Firestore, adicionar um campo novo
depois não exige migração, então só entram campos que a Sprint 4 já usa de verdade):

```js
{
  nome: string,
  parentId: string | null,       // null = categoria de topo; preenchido = subcategoria
  tipoOrigem: "padrao" | "personalizada",
  tipoTransacao: "despesa" | "receita" | "ambos",
  icone: string,                  // nome de ícone (MaterialCommunityIcons) OU um emoji literal — a UI decide como renderizar
  cor: string,                    // hex
  ordem: number,
  ativa: boolean,                 // false = arquivada
  criadoEm: timestamp,
  atualizadoEm: timestamp | null,
}
```

### Navegação: novo módulo "Planejamento Financeiro" no Menu do Usuário

Diferente das categorias existentes no `UserMenu.js` (Conta, Membros, etc., que navegam
direto para uma tela final), "Planejamento Financeiro" é um **hub próprio** — uma tela
nova (`PlanejamentoFinanceiroScreen.js`) que hoje só lista "Categorias", mas nasce pronta
para ganhar Metas Financeiras, Orçamentos, Limites e Relatórios depois, sem reorganizar o
menu principal de novo (mesmo princípio do padrão de tela-placeholder da Sprint 2):

```
UserMenu
 └─ Planejamento Financeiro (novo item, novo hub)
     └─ Categorias (nova tela — CRUD completo: ver, criar, editar, arquivar, excluir; categorias e subcategorias)
     └─ (futuro) Metas Financeiras
     └─ (futuro) Orçamentos / Limites / Relatórios
```

### Ordem de implementação proposta

Um incremento por vez, com validação sua antes do próximo — mesmo processo da Sprint 3:

1. **`useCategorias`** — hook + modelo de dados + seed automático. Sem UI ainda.
2. **`CategoriaSelect.js`** reescrito (Firestore, hierárquico, filtrado por
   `tipoTransacao`) — ainda sem trocar quem o consome.
3. **Tela de Categorias** dentro do novo hub "Planejamento Financeiro".
4. **Rewire dos consumidores**: `ModalCriacao.js`, `ModalEdicao.js` (incluindo a correção
   de empréstimos), `GerenciarModelosModal.js` — todos passam a gravar `categoriaId` +
   `categoriaNome`, mantendo fallback para a string antiga na exibição.
5. **Unificação do cálculo de Meta de Investimento** (seção 7) — independente do resto,
   pode entrar em qualquer ponto da sequência.
6. **Documentação** — `PROJECT_STATUS.md`/`ARQUITETURA.md`/`ROADMAP.md`, incluindo o
   reenquadramento para "Planejamento Financeiro".

Começo pelo passo 1 assim que você confirmar esta ordem — e, como combinado, qualquer
oportunidade de melhorar a arquitetura sem aumentar muito a complexidade que eu encontrar
no caminho, trago para validação antes de implementar, em vez de decidir sozinho.

## 14. Nota registrada em 2026-07-28 (durante o incremento 4): profundidade da hierarquia

Verificado a pedido do usuário, sem implementar nada: o modelo de dados e `useCategorias.js`
já suportam mais de 2 níveis nativamente — `parentId` é uma referência genérica, sem
nenhuma trava de profundidade no hook (adicionar, validar duplicidade, checar filhos antes
de excluir — tudo já é recursivo por natureza, opera em cima de qualquer `parentId`, não
assume que é sempre de topo). A limitação de "só Categoria → Subcategoria" existe **apenas
na UI** (`CategoriaSelect.js`/`CategoriasManager.js` renderizam um único nível de filhos,
via `.map()` não recursivo; o breadcrumb da busca em `CategoriaSelect.js` só sobe um
ancestral). Se um dia N níveis forem necessários, é trabalho de UI (tornar a renderização
recursiva), não de dado — nenhuma migração seria exigida.

## 15. Auditoria pós-incremento 4 (2026-07-28): 2 lacunas encontradas e corrigidas

A pedido do usuário, antes de seguir para o incremento 5, revisão completa de todos os
pontos de criação/edição de categoria e de todos os tipos de lançamento:

- **Nenhum caminho antigo restante**: `AsyncStorage`/`CATEGORIAS_PADRAO` não existem mais
  em lugar nenhum do código; todo consumidor de `CategoriaSelect` usa o contrato novo
  (`categoria`/`onSelecionar`) — confirmado por busca no repositório inteiro.
- **Gastos e Entradas**: `addGasto`/`adicionarEntrada` (e suas edições) espalham o objeto
  inteiro (`...gasto`/`...entrada`) — `categoria`/`categoriaId`/`categoriaNome` já
  passavam corretamente, sem precisar de ajuste.
- **🔴 Achado 1 — `useCartoes.js` (`addCartao`)**: a função desestruturava só um
  subconjunto fixo de campos e **descartava a categoria inteira na criação** (bug
  pré-existente, não introduzido nesta sprint — a edição via `updateCartao` sempre
  funcionou, só a criação de uma compra nova nunca salvava categoria). Corrigido.
- **🔴 Achado 2 — `useEmprestimos.js` (`addEmprestimo`)**: mantinha a string `categoria`
  na criação, mas descartava `categoriaId`/`categoriaNome`. Corrigido.
- **Modelos recorrentes**: `useModelos.js` espalha o objeto inteiro — sem ajuste
  necessário; a geração de lançamentos a partir de modelo (`gerarFixosDoMes`, em
  `useGastos.js`/`useEntradas.js`) já foi corrigida no incremento 4 para propagar
  `categoriaId`/`categoriaNome` do modelo.

Conclusão: com as 2 correções acima, todos os 5 tipos de lançamento (Entradas, Gastos,
Cartões, Empréstimos, Modelos) e a geração de recorrentes gravam `categoria` +
`categoriaId` + `categoriaNome` de forma consistente, tanto na criação quanto na edição.
