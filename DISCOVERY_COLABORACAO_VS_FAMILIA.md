# Discovery — Colaboração entre Usuários vs. Modo Família

> Registrado em 2026-08-07. Responde diretamente às perguntas feitas para comparar os dois
> modelos lado a lado. Não substitui `COLABORACAO_DISCOVERY.md` (análise completa do modelo A,
> incluindo riscos, modelo de dados proposto e itens abertos) — este documento assume aquele
> como referência e foca na comparação pedida. Nenhuma decisão de arquitetura foi tomada;
> é insumo para decidir o que priorizar.

> **Atualização (2026-08-07)**: seção "Confirmação da distinção" abaixo eleva a comparação
> original a ✅ decisão explícita, e duas novas seções ("O conceito de 'Modo'" e "Espaços
> Compartilhados e outros modos futuros") registram a direção de interface pensada para os
> dois modelos coexistirem sem virar dois aplicativos.

## Confirmação da distinção (✅ DECISÃO)

A distinção A/B abaixo está correta e deve ser preservada — **não tratar como dois níveis da
mesma coisa, e sim como dois modelos diferentes para problemas diferentes**:

**A — Colaboração entre Usuários**: cada usuário continua com conta e dados próprios; uma
despesa pode ser compartilhada com outro usuário; depois do aceite, cada um tem sua própria
cópia do lançamento; não existe "conta financeira compartilhada". Adequado para: amigos,
viagens, dividir restaurantes, presentes, despesas pontuais, despesas recorrentes entre
pessoas, e eventualmente casais que preferem manter finanças separadas. Objetivo: compartilhar
**eventos/despesas**, não a vida financeira inteira.

**B — Modo Família**: representa uma unidade financeira compartilhada, com uma fonte única de
dados; os membros visualizam e trabalham sobre os mesmos dados. Adequado para: casal com
finanças realmente compartilhadas, família, pais e dependentes, orçamento familiar, metas
compartilhadas, categorias/cartões/modelos compartilhados, e eventualmente investimentos
conjuntos. Objetivo: compartilhar a **conta/unidade financeira**, não só despesas isoladas.

## Os dois modelos, em uma frase cada

- **A — Colaboração entre Usuários** (`COLABORACAO_DISCOVERY.md`): N contas independentes
  (`users/{uid}/...`) trocando **cópias** de lançamentos entre si, cada uma dona da própria
  cópia depois do aceite. Nenhuma fonte de dado compartilhada.
- **B — Modo Família** (`tenants/{tenantId}/...`, decidido em `ROADMAP.md` Fase 2): várias
  pessoas lendo/escrevendo a **mesma** coleção de dados — uma fonte única de verdade, sem
  cópias.

## Qual problema cada um resolve

| | A — Colaboração | B — Modo Família |
|---|---|---|
| Problema central | "Eu paguei algo por várias pessoas, cada uma deveria ter isso registrado na própria conta" | "Nós somos, na prática, uma única unidade financeira e queremos ver/gerenciar isso como uma coisa só" |
| Unidade de análise | O evento (uma despesa, uma cota) | A conta (o orçamento inteiro) |
| Pergunta que responde | "Quanto eu devo/me devem?" | "Quanto **nós** gastamos/temos, no total?" |
| Quem continua dono do quê | Cada pessoa, sempre, da própria cópia | O tenant é o dono; pessoas são membros com acesso |

Não são a mesma necessidade em intensidades diferentes — são dois problemas diferentes que
hoje o projeto trata como se fossem pontos da mesma régua (ver seção 7 do
`COLABORACAO_DISCOVERY.md`, que já registra essa correção de rota).

## Quais funcionalidades seriam possíveis em cada modelo

**A — Colaboração habilita:**
- Dividir uma despesa pontual entre pessoas que não compartilham conta.
- Cobrar/registrar reembolsos ("Fulano me deve").
- Convites de divisão para recorrências (aluguel, assinatura) — mesma primitiva, aceite automático depois da primeira vez.
- Funciona entre **qualquer par de usuários do app**, sem relação prévia de família.

**B — Modo Família habilita:**
- Painel consolidado único: "quanto a família gastou este mês", sem somar N contas manualmente.
- Orçamento e metas compartilhados de verdade (uma meta, vista e afetada por todos).
- Mesada/controle parental: pai/mãe vê e eventualmente aprova o que um dependente lança.
- Categorias, cartões e modelos recorrentes compartilhados sem duplicar cadastro em cada conta.

**O que nenhum dos dois resolve sozinho:** investimento conjunto de verdade (mesmo saldo ao
vivo) — ver `COLABORACAO_DISCOVERY.md` seção 6, é estruturalmente mais parecido com B mesmo
quando o resto do relacionamento é do tipo A.

## O que pode ser compartilhado

| Dado | A — Colaboração | B — Modo Família |
|---|---|---|
| Lançamento individual (gasto/entrada) | Cópia independente após aceite | Mesmo documento, visível a todos os membros |
| Saldo/orçamento do mês | Nunca — cada um vê só o próprio | Único, do tenant |
| Categorias/cartões/modelos | Não — cada um mantém os seus | Compartilhados, cadastrados uma vez |
| Investimento | Não suportado bem por nenhum dos dois hoje (ver acima) | Suportado nativamente (mesma coleção) |
| Metas | Não — cada um tem a própria | Compartilhada, contribuição de todos conta |

## Como funciona cada relação

- **Casal**: é o caso mais ambíguo dos quatro — cabe nos dois modelos, dependendo do quanto o
  casal já mistura finanças de fato. `COLABORACAO_DISCOVERY.md` seção 7 já registra essa
  hipótese: com auto-aceite entre contatos de confiança e divisão recorrente automática, A
  pode cobrir "casal que divide quase tudo" sem tenant nenhum — cada um continua dono dos
  próprios dados, só que com bem mais automação na troca. B faria sentido se o casal quer um
  orçamento único de verdade (ex.: conta conjunta), não dois orçamentos que trocam cópias.
- **Filho**: encaixa em B, não em A. A relação não é entre iguais — é controle/visibilidade de
  cima para baixo (responsável vendo/gerenciando o que o dependente lança), não duas contas
  independentes dividindo uma despesa pontual. É também o caso de uso mais próximo da intenção
  original do `useMembros.js`/mecanismo de membro-espelho já existente no código (ver seção
  "Arquitetura reaproveitável" abaixo) — hoje um "Membro" já pode representar alguém sem conta
  própria no app, atribuído a gastos/entradas.
- **Amigo**: é o caso puro de A — conexão pontual, sem nenhuma mistura de orçamento, usada
  para dividir uma despesa específica (jantar, viagem) e depois seguir cada um com sua conta
  isolada como sempre foi. B não faz sentido aqui — ninguém quer um tenant compartilhado
  permanente com um amigo por causa de um jantar.
- **Viagem**: é A, mas com N cotas em vez de 1-para-1 — mesma primitiva de "evento com cotas e
  aceite independente por participante" (`COLABORACAO_DISCOVERY.md` seção 6), só que o grupo
  é temporário e maior que 2. Não precisa de nenhuma arquitetura nova além da já proposta em A;
  é um caso de uso, não um terceiro modelo.

**Padrão que emerge:** A cobre relações **entre iguais, pontuais ou recorrentes, mas sempre
com cada lado dono da própria cópia** (amigo, viagem, e possivelmente casal). B cobre relações
**hierárquicas ou de unidade financeira única de verdade** (filho/dependente, e casal que
já opera como conta única).

## Qual modelo é mais simples

**A é mais simples de construir hoje, mas não é simples em termos absolutos.** Ela não exige
migração de dados nem uma segunda árvore de coleções paralela (`tenants/`) — cada conta
continua exatamente como está, só ganha uma nova subcoleção de conexões/convites. Em
contrapartida, A introduz algo que o projeto nunca teve: **dois usuários diferentes
precisando se enxergar**, o que provavelmente exige ao menos uma Cloud Function para o
handshake (convite/aceite) — o projeto não tem backend próprio hoje (`CLAUDE.md`), então isso
é a primeira vez que essa premissa seria quebrada.

B é conceitualmente mais simples de descrever ("todos leem/escrevem o mesmo lugar"), mas mais
pesado de implementar direito: regras de acesso do Firestore por papel dentro do tenant,
migração de uma conta existente para dentro de um tenant sem perder histórico, e nenhuma forma
de "desfazer" parcialmente (uma vez dentro do tenant, não há cópia individual para recuperar).

**Resumo:** A tem menor custo de entrada (nenhuma migração), mas exige infraestrutura nova
(backend). B não exige mudar a premissa de "sem backend" no mesmo grau, mas tem maior custo de
entrada (migração de dados, controle de acesso por papel).

## Qual arquitetura podemos reaproveitar

Isto é o achado mais concreto desta comparação, direto da auditoria de scaffolding de Modo
Família feita nesta mesma rodada:

- **`useMembros.js` + `MembrosScreen.js` + `GerenciarMembrosModal.js` + `MembroSelect.js`**:
  toda essa infraestrutura já existe, está funcional e **já resolve uma fatia do problema do
  "filho"** — um Membro hoje já pode representar uma pessoa sem conta própria, atribuída a
  gastos/entradas dentro da conta do responsável. Isso não é nem A nem B — é uma terceira via
  mais simples que já está pronta para o caso "dependente sem conta própria", sem precisar de
  handshake entre dois usuários nem de tenant.
- **Mecanismo de membro-espelho** (`ehProprietario`, `criarMembroProprietarioSeNaoExistir` em
  `useAuth.js`, `isMembroProprietario()` em `src/utils/membros.js`): já distingue "o dono da
  conta" de "um Membro qualquer" — peça que qualquer um dos dois modelos (A ou B) vai
  precisar para saber quem tem permissão de fazer o quê.
- **`getBasePath(user, compartilhado)`**: já tem o branch para `tenants/{tenantId}` pronto
  (nunca invocado, mas também nunca chamado incorretamente) — é o ponto de entrada natural
  para B, sem precisar tocar em nenhum hook de dados hoje.
- **Padrão "convivência" já usado no projeto** (persistir referência estável + valor
  denormalizado, nunca migração em massa — ver `ARQUITETURA.md`): é exatamente o padrão que A
  precisaria para a cópia independente com proveniência (`origemCompartilhamento: { eventoId,
  deUsuarioId }`, já proposto em `COLABORACAO_DISCOVERY.md` seção 5).
- **Nada do que existe hoje serve de base para o handshake de conexão em si** (convite,
  aceite, Cloud Function) — essa parte de A é, de fato, nova para o projeto.

## Qual devemos construir primeiro

Não é uma escolha binária — as evidências acima apontam para uma ordem, não para "A **ou**
B":

1. **Nada, no sentido de A/B, precisa ser construído já** para cobrir o caso "filho" — a
   infraestrutura de Membros já existente resolve a fatia mais simples desse caso hoje
   (atribuir um lançamento a um dependente sem conta própria). Vale validar se isso já é
   suficiente antes de investir em qualquer coisa nova.
2. **A (Colaboração) antes de B (Modo Família)**, quando chegar a hora de investir em algo
   novo — é a recomendação já registrada em `COLABORACAO_DISCOVERY.md` seção 10: menor custo
   de entrada (sem migração), resolve uma dor mais ampla (amigo, viagem — funciona entre
   quaisquer dois usuários, não só família), e o aprendizado de uso real informa se o modelo
   B "peso pesado" chega a ser necessário ou se casal/república ficam bem resolvidos só com A.
3. **B fica reservado para quando alguém pedir, de fato, um painel único consolidado** (a
   razão de ser do tenant) — não antes disso, porque hoje não há evidência de demanda real
   além da intuição original de roadmap.

**Pré-requisito antes de qualquer um dos dois**: um discovery técnico específico sobre
infraestrutura server-side (`COLABORACAO_DISCOVERY.md` seção 9, item 2) — é o primeiro recurso
do projeto que provavelmente exige Cloud Functions, mudando a premissa atual de "sem backend
próprio" citada em `CLAUDE.md`.

**Status desta seção**: comparação registrada para apoiar priorização, não uma decisão de
roadmap. Revisar junto com `COLABORACAO_DISCOVERY.md` quando a Fase 2 for de fato priorizada.

---

## O conceito de "Modo" (não é um app separado)

🟡 **HIPÓTESE/DIREÇÃO** — registrada como direção conceitual preferida para o futuro, não como
decisão de implementação. Nenhum mecanismo técnico de seletor foi definido.

O Modo Família **provavelmente não deveria ser uma tela ou aplicativo separado**. A direção
que melhor resolve isso: o app continua com essencialmente as mesmas telas e funcionalidades,
mas o usuário pode alternar o **contexto de dados** que está vendo.

```
[ Modo Pessoal ]                    [ Modo Família ]
→ Gastos pessoais                   → Gastos compartilhados da família
→ Entradas pessoais                 → Entradas compartilhadas
→ Cartões pessoais                  → Cartões compartilhados
→ Investimentos pessoais            → Investimentos compartilhados
→ etc.                              → Metas/orçamentos da família, etc.
```

A troca poderia acontecer por um controle no menu, um seletor de contexto, ou mecanismo
semelhante — **a implementação técnica não está definida nesta rodada**, só o princípio:

> "O usuário não deveria precisar aprender um segundo aplicativo para administrar suas
> finanças compartilhadas. O mesmo conjunto de telas pode funcionar em diferentes contextos
> de dados."

**Identidade visual do contexto ativo** — também 🟡 direção, não decisão: a interface pode ter
pequenas mudanças para deixar claro qual contexto está ativo (cor, ícone, ilustração,
cabeçalho, identificação visual, microanimação, outros elementos sutis). A intenção
**não é** criar uma interface completamente diferente — é dar ao usuário a percepção imediata
de "estou vendo meus dados pessoais" vs. "estou vendo os dados da família", sem exigir reduzir
a familiaridade com o app que ele já conhece.

**Como isso se encaixa no que já existe tecnicamente**: `getBasePath(user, compartilhado)`
(`ARQUITETURA.md` seção 7) já é, estruturalmente, exatamente esse interruptor de contexto no
nível de dados — hoje só falta o "Modo" no nível de interface decidir, por tela, se
`compartilhado` é `true` ou `false`. Isso não é uma decisão de arquitetura nova, é uma
constatação: a peça de dados para o conceito de "Modo" já foi implantada há duas sprints
(Sprint 5), sem ligação nenhuma na interface ainda.

## Espaços Compartilhados e outros modos futuros

🟡 **HIPÓTESE/DIREÇÃO** — hipótese de longo prazo, explicitamente **não** uma decisão de quais
modos implementar. Nenhuma arquitetura nova foi criada para os itens abaixo.

**Nomenclatura sugerida** (🟡, ainda não adotada no código): em vez de "Modo Família" ser o
único nome para o conceito de contexto compartilhado, a ideia é ter uma seção/hub chamada
**"Espaços Compartilhados"** — o lugar onde o usuário vê e gerencia todos os grupos
compartilhados de que participa (um espaço "Família", um "República", um "Viagem — Praia
2027" etc., cada um sua própria instância). Selecionar um Espaço Compartilhado é o que ativa o
"Modo" correspondente (seção acima) — "Modo" continua sendo o **interruptor de contexto na
interface** (Pessoal ⇄ este Espaço); "Espaço Compartilhado" é o **nome do grupo/tenant** por
trás de cada modo não-pessoal. Isso resolve uma ambiguidade de nome: "Modo Família" hoje soa
como se só existisse um tipo de grupo compartilhado possível; "Espaço Compartilhado" deixa
claro que família é **um tipo entre vários possíveis**, não o próprio conceito.

**Ideia central**: "Modo"/"Espaço" representaria um **contexto financeiro**, não um tipo
específico e fixo de relacionamento. Exemplos levantados como hipótese, não como lista de
funcionalidades a construir:

| Espaço | O que seria | Melhor atendido por | Observação |
|---|---|---|---|
| Pessoal | Cada usuário administra os próprios dados | (já existe — `users/{uid}`) | Não é um "espaço compartilhado", é o padrão de hoje |
| Família | Unidade financeira compartilhada de verdade | **B — Modo Família** (`tenants/{tenantId}`) | O caso que já fundamentou a Fase 2 do `ROADMAP.md` |
| República | Grupo dividindo despesas de uma residência | 🔵 Em aberto — depende do grau de mistura financeira do grupo | Uma república que realmente funciona como "uma conta só" (aluguel, contas fixas, tudo dividido igual todo mês) se parece com B; uma que só divide despesas pontuais se parece com A |
| Amigos | Divisão pontual de despesas | **A — Colaboração** | Não precisa de um "espaço" persistente — é a própria Conexão (`COLABORACAO_DISCOVERY.md` seção 13) já resolvendo isso, sem necessidade de um terceiro modelo |
| Viagem | Grupo temporário compartilhando despesas | **A — Colaboração**, com N cotas (`COLABORACAO_DISCOVERY.md` seção 6) | Mesma primitiva de Amigos, só que temporária e com mais participantes — não é um modelo novo |
| Empresa/CNPJ | Contexto financeiro de uma empresa, possivelmente com permissões diferentes por usuário | Provavelmente um **terceiro modelo** (workspace/tenant com papéis — admin/financeiro/colaborador) | Já é a Fase 4 do `ROADMAP.md` ("Modo Empresa"), que já assume depender de B estar resolvido primeiro — não uma ideia nova, só reencaixada aqui na mesma linguagem de "Espaço" |

**Leitura que emerge da tabela** (não uma conclusão fechada): a maioria dos "modos" propostos
já cai em A ou B sem precisar de arquitetura nova — só República fica genuinamente ambíguo
(depende de como cada grupo real usa o app, não do conceito em si), e só Empresa parece
realmente exigir um terceiro modelo (papéis/permissões, não coberto nem por cópias
independentes nem por um tenant "todo mundo igual"). **Não concluir daqui que República e
Viagem devem virar um "Espaço" com tela própria** — a hipótese registrada é que a
infraestrutura de Colaboração (A) já os atende sem precisar disso.
