# Discovery — Colaboração entre Usuários

> Registrado em 2026-08-07, antes de qualquer implementação. **Esta é uma arquitetura em
> estudo, não uma decisão definitiva.** O objetivo deste documento é registrar a ideia e a
> análise enquanto estão frescas, com espaço explícito para mudar de direção conforme o
> projeto amadurecer e conforme os itens abertos (seção 9) forem respondidos. Nenhum código
> foi escrito para esta funcionalidade até o momento deste registro.

## 0. Origem da ideia

Surgiu durante uma conversa sobre o projeto, não de um pedido de produto já fechado. A
motivação: até hoje o app foi pensado para um único usuário isolado (`users/{uid}`), com o
Modo Família (`ROADMAP.md`, Fase 2) planejado como a única forma futura de dois usuários se
relacionarem dentro do produto. A pergunta que deu origem a este discovery foi: **existe uma
infraestrutura mais simples e mais ampla — uma "conexão" entre usuários — que resolveria
casos de uso reais (dividir uma despesa) sem precisar da arquitetura pesada de tenant
compartilhado do Modo Família, e que talvez até sirva de base para ele?**

**Restrição de produto, explícita desde o início:** isto não é uma rede social financeira.
Sem comparação de gastos entre usuários, sem exposição de renda/patrimônio/hábitos de
consumo de ninguém. Qualquer decisão de arquitetura ou de gamificação (seção 8) que viole
essa restrição deve ser descartada, não adaptada.

## 1. Ideia principal

- Cada usuário tem um identificador único (mecanismo concreto ainda em aberto — seção 9).
- Dois usuários podem estabelecer uma **conexão voluntária** ("contato"), que não dá acesso
  a dados financeiros nenhum — só autoriza que interações específicas aconteçam entre as
  duas contas.
- A partir de uma conexão aceita, um usuário pode propor uma **divisão de despesa**: cria a
  despesa normalmente, divide em cotas, e "envia" a cota de cada participante conectado.
- Cada participante aceita (ou não) sua própria cota. Ao aceitar, nasce um lançamento
  **novo e independente** na conta dele — não uma referência viva ao lançamento original.
  Os dois lados guardam uma referência ao mesmo evento (para saber a proveniência), mas daí
  em diante cada um é dono pleno da própria movimentação: editável, categorizável, sem
  sincronização automática de volta.

Exemplo de referência (do pedido original): João paga um jantar de R$120, divide em 4 partes
de R$30 (João, Maria, Pedro, Ana). Se Maria usa o app e aceita, surge um gasto de R$30 na
conta dela, com o registro de que veio de uma divisão criada por João.

## 2. Análise crítica

### Pontos positivos

- Resolve uma dor real (dividir contas hoje é manual/mental) sem expor a vida financeira de
  ninguém — a restrição "sem rede social financeira" foi mantida na arquitetura, não só na
  intenção.
- O modelo "conexão + evento com cotas independentes" é um padrão maduro, não uma invenção
  do zero — é essencialmente como o Splitwise resolve o mesmo problema, testado em produção
  por mais de uma década em outros produtos.
- "Cada um dono da própria movimentação" (decisão do próprio pedido original) é a escolha de
  design mais importante de toda a proposta — evita a maior parte dos problemas de
  sincronização, permissão e consistência que uma "conta compartilhada de verdade"
  precisaria resolver.
- Já havia um sinal disso no roadmap antes desta conversa: `PRODUCT_DISCOVERY.md` já listava
  "rateio de despesas entre membros" como item da Fase 2, e a atualização da Sprint 5 em
  `ROADMAP.md` já deixava a porta aberta para "lançamento vinculado a outro usuário
  (reembolso/despesa compartilhada)... sem migração de dados". Esta ideia formaliza algo que
  já estava latente no projeto, não introduz um desvio.

### Pontos negativos / limitações a assumir conscientemente

- É a **primeira funcionalidade do projeto em que dois usuários diferentes precisam se
  enxergar**. Hoje todo o app é isolado por `uid` — isso é uma mudança de categoria
  arquitetural, não um incremento sobre o que já existe.
- Sem sincronização automática pós-aceite, uma correção feita por quem criou a despesa
  (valor errado, por exemplo) não chega para quem já aceitou a própria cota — consequência
  direta e consciente de "cada um é dono", não um bug a corrigir depois.
- O mecanismo de conexão introduz uma superfície de abuso que o app nunca teve: pedido de
  divisão de despesa indesejado é, na prática, uma forma de spam ou de engenharia social
  financeira ("divida R$500 comigo" vindo de um estranho).

## 3. Riscos

| Risco | Por que importa |
|---|---|
| **Exige lógica server-side** | O projeto não tem backend próprio hoje (`CLAUDE.md`: toda regra de negócio roda no cliente). Um handshake entre dois usuários — A convida B, B aceita, nasce um lançamento na conta de B — é exatamente o tipo de operação que regras de segurança do Firestore, isoladas, resolvem mal. Provavelmente exige ao menos uma Cloud Function. É uma dependência de infraestrutura nova, não só uma feature nova. |
| **Superfície de abuso/golpe** | Pedidos de divisão de estranhos são um vetor real de engenharia social. Mitigação mínima: só permitir divisão entre conexões já aceitas (nunca direto a um uid desconhecido), limite de convites de conexão pendentes, e possivelmente confirmação extra para valores altos. |
| **Mecanismo de identificação do usuário** | Buscar por e-mail/telefone permite descobrir se alguém usa o app sem consentimento dela; um código gerado pelo próprio app (como um "@usuário" ou código de amigo) é mais seguro mas exige que a outra pessoa compartilhe o código ativamente. Trade-off de privacidade vs. praticidade a decidir, não uma resposta óbvia. |
| **Falta de "acerto de contas"** | Sem uma noção de saldo líquido (quem deve quanto pra quem, ao longo de várias divisões), um grupo que compartilha despesas com frequência (república, casal) acumula eventos soltos sem visão consolidada. Decidir se isso entra na v1 ou fica para uma evolução. |
| **Convite nunca respondido** | Precisa de uma decisão de produto: o convite de divisão fica pendente para sempre? Expira? Quem criou a despesa precisa saber se a outra pessoa nunca vai ver aquilo. |

## 4. Arquitetura proposta

Duas camadas, cada uma com responsabilidade própria:

**Camada 1 — Conexão ("contato")**: relação bidirecional, opt-in, sem nenhum dado financeiro
embutido. Só autoriza que uma interação específica (como "propor divisão de despesa") seja
possível entre duas contas. Não faz nada por conta própria — é só o pré-requisito.

**Camada 2 — Evento de compartilhamento ("divisão")**: um evento específico (despesa, e no
futuro outros tipos — seção 6), com cotas por participante, cada cota com seu próprio ciclo
de aceite. Ao aceitar, gera um lançamento novo e independente na conta de quem aceitou — não
uma referência viva, uma cópia com proveniência registrada.

Operações sensíveis (criar convite de conexão, aceitar cota, revogar conexão) provavelmente
precisam passar por uma Cloud Function em vez de um `write` direto do cliente — é a forma
mais robusta de garantir, por exemplo, que só o próprio usuário-alvo pode confirmar seu
próprio aceite, ou que o lançamento gerado corresponde exatamente ao que foi proposto (evitar
um cliente malicioso forjando um aceite ou alterando o valor combinado no caminho).

## 5. Modelo de dados (proposta inicial, não implementada)

```
users/{uid}/conexoes/{conexaoId}
{
  usuarioConectadoId: string,        // uid do outro usuário
  nomeExibicao: string,              // snapshot do nome, não referência viva
  status: 'pendente' | 'aceita' | 'recusada' | 'bloqueada',
  criadoEm, atualizadoEm
}

users/{uid}/despesasCompartilhadas/{eventoId}   // vive na conta de quem criou
{
  descricao: 'Jantar em grupo',
  valorTotal: 120,
  criadoPor: uid,
  origemLancamentoId: string | null,  // se nasceu de um gasto já existente
  cotas: [
    { usuarioId, valor: 30, status: 'aceita' | 'pendente' | 'recusada' }
  ],
  criadoEm
}

users/{uid}/convitesDeDivisao/{eventoId}        // espelho, na conta de cada convidado
{
  eventoId, deUsuarioId, descricao, minhaCota: 30, status: 'pendente'
}
```

Ao aceitar, nasce um `gasto` comum na conta de quem aceitou, com
`origemCompartilhamento: { eventoId, deUsuarioId }` — a partir daí é um gasto normal,
editável, categorizável, sem nenhum vínculo funcional de volta (só histórico de
proveniência).

Este modelo é um ponto de partida para discussão, não um schema fechado — decisões como
nomes de campo, onde vive o "convite" (subcoleção do usuário vs. coleção top-level) e o
mecanismo exato do handshake dependem das respostas da seção 9.

## 6. Até onde essa infraestrutura cresce (outros cenários possíveis)

A maioria dos cenários levantados é a **mesma primitiva** (evento com cotas + aceite
independente por participante), variando só o que gera o evento:

- **Compras, parcelas de cartão**: o evento referencia um `idCompra` inteiro ou uma parcela
  específica em vez de um valor solto — mais complexo (decidir se divide o total ou parcela
  a parcela), mas mesma primitiva.
- **Aluguel, contas recorrentes, assinaturas**: o app já tem "Modelos recorrentes"
  (`useModelos`) para lançamentos que se repetem todo mês. A evolução natural é um modelo
  recorrente compartilhado que, uma vez aceito, se repete automaticamente sem pedir aceite
  de novo todo mês (autorização recorrente, não pontual).
- **Viagens, eventos, presentes em grupo**: mesma primitiva, com N cotas em vez de uma
  divisão fixa 1-para-1. "Presentes em grupo" pode ganhar uma variação de meta de
  arrecadação em vez de valor fixo conhecido de antemão.
- **Despesas de casal, república**: não é uma primitiva nova — é um **padrão de uso
  intenso** da mesma infraestrutura (duas ou mais pessoas que dividem quase tudo, sempre).
  Reforça a discussão da seção 7: talvez não precise de arquitetura própria.
- **Investimentos conjuntos**: este é o único item da lista que **não** se encaixa bem no
  modelo "cada um dono da própria cópia" — investimento conjunto de verdade implica ver o
  mesmo saldo ao vivo, não duas cópias independentes que podem divergir. É estruturalmente
  mais parecido com o modelo de tenant do Modo Família do que com conexão/compartilhamento —
  ver seção 7.

## 7. Relação com o Modo Família

Diverge, com fundamento, da hipótese original de um gradiente único
(Usuário comum → Contato → Relacionamento compartilhado → Modo Família).

Do ponto de vista de **dado**, "Conexão/Compartilhamento" e "Modo Família" (`tenants/{tenantId}`,
já decidido em `ROADMAP.md` Fase 2 e confirmado na Sprint 5) não são pontos na mesma régua —
são dois modelos estruturalmente diferentes:

- **Conexão/Compartilhamento**: N usuários, cada um com sua própria coleção
  `users/{uid}/...`, trocando cópias independentes de lançamentos. Nenhuma migração,
  nenhuma regra de acesso cruzado a resolver.
- **Modo Família (tenant)**: todos os membros leem/escrevem a mesma coleção
  `tenants/{tenantId}/...` — uma fonte única de verdade. Migrar de "N usuários
  independentes trocando cópias" para "todos escrevendo no mesmo tenant" é uma migração de
  dados real, não uma evolução gradual — não existe meio-caminho estrutural entre os dois.

**Onde a intuição original pode estar certa, por um caminho diferente**: talvez o Modo
Família, no sentido de "casal"/uso cotidiano em dupla, não precise do modelo de tenant. Se a
Camada 2 (compartilhamento) ganhar auto-aceite entre contatos de confiança e divisão
recorrente automática, o caso "casal que divide quase tudo" pode ser coberto inteiramente
pela infraestrutura de conexão, sem tenant nenhum — cada um continua dono dos próprios
dados, só com muito mais automação na troca. O modelo de tenant ficaria reservado para quando
alguém realmente quiser um painel único consolidado (ex.: pais controlando mesada dos
filhos, ou uma família que quer ver "quanto a família gastou" como uma coisa só, não a soma
de N contas).

**Isto é uma recomendação para discutir quando a Fase 2 for priorizada, não uma decisão** —
pode revisar o desenho do Modo Família tal como está hoje em `ROADMAP.md`, ou pode confirmar
que as duas arquiteturas devem coexistir como estão descritas hoje.

## 8. Gamificação

✅ **DECISÃO** (reafirmada em 2026-08-07): gamificar o **comportamento** (constância, uso do
app, colaboração), nunca o **resultado financeiro** (quanto o usuário tem, quanto gasta). É
essa linha que separa "o app me ajuda a ter um hábito melhor" de "o app me faz sentir mal
comparado a alguém". Nada de ranking de patrimônio, ranking de gastos, comparação de renda,
"quem economizou mais" ou qualquer forma de pressão social baseada em número financeiro.

✅ **DECISÃO**: Gamificação continua sendo uma **iniciativa separada** de Colaboração entre
Usuários — a existência de conexões entre pessoas (seção 13) não implica que gamificação deva
nascer junto. Se houver gamificação social (ex.: visibilidade de pontos entre conexões, seção
"Visibilidade para conexões" abaixo), ela usa a mesma infraestrutura de conexão como
pré-requisito técnico, mas é decidida e priorizada à parte.

Direções que parecem coerentes com a restrição (🟡 hipóteses, mecânica não decidida):
metas, conquistas, hábitos, desafios pessoais e coletivos, evolução visual/elementos de
progresso — ver também o raciocínio original abaixo.

Referências: o padrão de gamificação do Duolingo (streak, pontos, constância) e a categoria
de apps de finanças com metáfora de crescimento/jardim (ex.: Focus Plant, Mindbloom,
CultiveApp).

⚠️ **Correção registrada (2026-08-07, ajustada depois do feedback do usuário)**: o app deste
projeto **não se chama CultiveApp**. CultiveApp é um app de referência de mercado, usado numa
conversa anterior como inspiração para pensar a ideia de gamificação por metáfora de
jardim/crescimento — **é uma referência real, não uma referência não confirmada** (correção
da versão anterior deste documento, que hedgeava a existência dele por engano). O que
permanece verdadeiro: **CultiveApp nunca foi e não é o nome, um módulo, ou qualquer conceito
pertencente a este aplicativo** — é só uma inspiração externa citada, não deve aparecer em
nenhuma documentação, código, ou conversa futura como se fosse parte do produto.

Direções que parecem coerentes com a restrição:
- **Streak de uso** (dias seguidos registrando gastos/entradas) — mecânica central do
  Duolingo: recompensa constância, não valor.
- **Pontos por ações de organização**: categorizar gastos, quitar uma parcela em dia, fechar
  o mês com o planejamento em dia, aceitar/quitar uma divisão de despesa rapidamente — tudo
  comportamento, nunca "quanto foi economizado" (isso vazaria informação financeira via
  ranking).
- **Visibilidade para conexões, sem o motivo**: "Maria ganhou 50 pontos essa semana" aparece
  para os contatos; o que ela fez para ganhar não aparece. Cria estímulo social sem expor
  comportamento financeiro específico.
- **Metáfora de crescimento** (jardim/árvore que cresce com pontos): coerente com "sem
  número de dinheiro visível" — uma metáfora assim não tem como ser lida como "rico" ou
  "pobre", diferente de uma barra de progresso ou nível numérico cru.

Direção a evitar: qualquer ranking direto entre conexões, mesmo sem valores — tende a
recriar pressão social ("por que ele tem mais pontos que eu" já é meio caminho para a
comparação que a ideia original quer evitar). Se houver interesse em competição, prefira
desafios coletivos (grupo atinge uma meta junto) a ranking individual entre contatos.

## 9. Itens abertos (perguntas sem resposta ainda)

Registrados para não serem esquecidos, sem bloquear o registro desta ideia. Atualizado em
2026-08-07 com o aprofundamento das seções 11-17.

1. Mecanismo concreto de identificação/busca de usuário — aprofundado na seção 13 (conexões:
   código único, `@username`, QR, link, e-mail, telefone) e seção 14 (descoberta de
   contatos) — continua sem escolha feita, agora com o comparativo completo já registrado.
2. Handshake de conexão e de aceite de cota: aprofundado na seção 16 — conclusão preliminar
   (não decisão) é que o convite em si provavelmente não precisa de Cloud Function, mas a
   criação coordenada da cópia no momento do aceite provavelmente precisa. Ainda em aberto.
3. Existe "acerto de contas" (saldo líquido entre duas pessoas) na v1, ou só eventos soltos?
4. O que acontece com um convite (de conexão ou de divisão) nunca respondido — expira?
5. O Modo Família (Fase 2 do roadmap) deveria ser revisado à luz da seção 7, ou as duas
   arquiteturas (conexão e tenant) devem coexistir como hoje descritas? Ver também
   `DISCOVERY_COLABORACAO_VS_FAMILIA.md` para o conceito de "Modo"/"Espaços Compartilhados",
   que dá um caminho para as duas coexistirem sob uma mesma metáfora de interface.
6. ~~Gamificação entra como parte desta mesma iniciativa ou como uma iniciativa própria?~~
   ✅ Respondido na seção 8: é uma iniciativa própria, separada de Colaboração.
7. **Novo** — Como representar exatamente um "participante sem conta" no modelo de dados
   (seção 12): reaproveitar `useMembros.js` com um campo novo de vinculação parece a direção
   certa, mas o desenho exato do campo e do fluxo de vinculação futura não foi especificado.
8. **Novo** — Qual alternativa (ou combinação) de indicação visual de lançamento
   compartilhado (seção 11) entra na v1 — nenhuma foi escolhida, só mapeada.
9. **Novo** — O convite para usar o app (seção 15) deveria carregar contexto de uma despesa
   específica, ou ser sempre genérico? Afeta como o "participante sem conta" da seção 12
   seria modelado.
10. **Novo** — Confirmar por teste real (não só leitura de código) se a sessão de Auth
    sobrevive ao app ser fechado e reaberto offline hoje — ver `ARQUITETURA.md` seção 7.1.
    Isso muda a gravidade do cenário A da seção 17 (usuário offline logo na abertura do app).

## 10. Recomendação de posicionamento no roadmap

Não é Fase 0/1 (depende de conexão entre usuários, conceito novo — entra depois da
Publicação). Proposta: posicionar **antes** da Fase 2 (Modo Família) como hoje desenhada,
não depois — é mais simples (sem migração de tenant), resolve uma dor mais ampla (funciona
entre quaisquer dois usuários, não só família), e o aprendizado de uso real informa se o
Modo Família "peso pesado" (tenant) é de fato necessário ou se a maioria dos casos (casal,
república) fica bem resolvida só com a infraestrutura de conexão.

Antes de qualquer implementação, recomenda-se um discovery técnico específico sobre
infraestrutura server-side (item 2 da seção 9) — é o primeiro recurso do projeto que
provavelmente exige Cloud Functions, o que muda uma premissa atual do projeto ("sem backend
próprio").

**Status desta seção**: proposta inicial registrada, em estudo. Nenhuma decisão de
arquitetura, modelo de dados ou posicionamento no roadmap foi tomada como definitiva nesta
seção. Revisar e atualizar conforme o projeto e a conversa evoluírem.

---

> **A partir daqui**: aprofundamento registrado em 2026-08-07, respondendo pontos específicos
> levantados numa rodada de consolidação de documentação. Mantém a mesma regra da seção
> anterior — nada aqui é decisão de implementação, e cada conclusão é classificada
> explicitamente como ✅ DECISÃO, 🟡 HIPÓTESE/DIREÇÃO, 🔵 QUESTÃO EM ABERTO ou ⚠️ RISCO/ATENÇÃO.

## 11. Identificação visual de um lançamento compartilhado (UX)

🔵 **QUESTÃO EM ABERTO** — nenhuma das alternativas abaixo foi escolhida, é um mapeamento de
opções para decidir quando a implementação for priorizada.

O pedido original é claro sobre o objetivo: quando um usuário recebe ou cria uma despesa
compartilhada, precisa ser **muito fácil perceber que aquele lançamento não é um gasto
comum** — sem transformar o app numa rede social (o compartilhamento é uma característica do
lançamento, não o centro da experiência).

**Alternativas de indicação visual (não mutuamente exclusivas):**

| Alternativa | Onde funciona bem | Cuidado |
|---|---|---|
| Badge/selo no card do lançamento (ex.: ícone de duas pessoas) | Lista de gastos — precisa ser reconhecível em miniatura | Não pode competir visualmente com o ícone de categoria já existente |
| Avatar da outra pessoa | Lista e detalhes — já existe infraestrutura de avatar (`useMembros.js`/Sprint 5) reaproveitável mesmo para conexões que não são Membros da família | Só funciona bem se a pessoa já tiver avatar/nome cadastrado — precisa de fallback (inicial do nome, ícone genérico) |
| Texto direto ("Compartilhado com João" / "Recebido de João" / "Minha parte: R$ 30") | Detalhes do lançamento — remove ambiguidade sem exigir aprender um ícone novo | Ocupa mais espaço; não cabe bem num card compacto de lista |
| Status explícito (`pendente`/`aceito`/`recusado`) | Detalhes, e possivelmente um badge de cor na lista (mesma linguagem de `colors.pending`/`colors.balance` já usada no app para pago/pendente) | Reaproveitar as cores já estabelecidas evita inventar uma paleta nova só para isso |
| Seção "Origem" nos detalhes, com histórico do compartilhamento | Detalhes — reaproveita exatamente o padrão já existente da Linha do Tempo (`LinhaDoTempoEventos.js`) para mostrar quando foi proposto/aceito | Menor prioridade de visibilidade (não é a primeira coisa que o usuário vê) — completude, não descoberta |

**Onde isso deveria aparecer, por tela (mapeamento inicial, não decisão):**
- **Lista de gastos**: indicação discreta (badge ou avatar pequeno) — não pode pesar visualmente numa lista que já tem ícone de categoria, valor e status de pago.
- **Detalhes do lançamento**: texto completo + status + link para "Origem"/histórico — mesmo padrão do botão "Histórico" já adicionado em `ModalDetalhes.js` para gasto/entrada (ver `ARQUITETURA.md` seção 18).
- **Filtros**: um filtro "Compartilhados" (ou "Meus" vs. "Compartilhados") na tela de gastos/entradas é uma extensão natural do padrão de filtro que já existe hoje (mês/ano) — não decidido se entra na v1.
- **Linha do Tempo**: um evento de "compartilhamento aceito/recusado" se encaixaria na mesma
  infraestrutura de `acao`/`entidade` já construída (ver `ARQUITETURA.md` seção 18) — não uma
  arquitetura nova, uma nova `acao` quando a feature existir.
- **Relatórios/resumos**: em aberto — depende se o produto quer, por exemplo, separar "quanto
  eu gastei" de "quanto eu gastei que na verdade rateei com alguém" no Resumo Mensal. Não
  analisado a fundo aqui; fica para quando a feature entrar em discovery de implementação.

## 12. Colaboração com pessoa que não possui conta

🔵 **QUESTÃO EM ABERTO**, com uma direção que parece natural (🟡 HIPÓTESE).

Cenário: "Dividi uma despesa com alguém que não usa o app" (ex.: R$200 no restaurante, minha
parte R$100, a pessoa que me deve R$100 não tem conta).

- **Como representar esse participante — 🟡 direção que parece natural**: reaproveitar a
  infraestrutura de **Membros** (`useMembros.js`, já existente e funcional — ver auditoria de
  scaffolding de Modo Família feita nesta mesma rodada de trabalho) em vez de criar uma
  entidade nova. Um Membro hoje já representa "uma pessoa, com ou sem conta própria" dentro da
  conta de quem cadastrou — é exatamente o conceito que falta aqui. A diferença é que hoje
  `useMembros.js` não tem noção de "este Membro pode um dia virar um usuário real do app" —
  isso seria uma extensão, não uma reescrita.
- **Como diferenciar "usuário do app" de "pessoa externa"**: o Membro ganharia um campo
  opcional (ex.: `usuarioVinculadoId: string | null`) — `null` enquanto a pessoa é só um nome
  registrado; preenchido com o `uid` real no momento em que a vinculação acontece. Convivência
  com o padrão já usado no projeto (guardar referência estável + nome, nunca migrar em massa —
  mesmo princípio de `categoriaId`/`membroId`/`cartaoId`).
- **Migração/vinculação futura**: quando a pessoa externa cria uma conta e os dois usuários se
  conectam (seção 13, Conexões), o vínculo poderia ser oferecido como uma ação explícita
  ("Este é o João que você já tinha cadastrado como Membro? Vincular") — nunca automático
  por coincidência de nome, para não vincular a pessoa errada silenciosamente. 🔵 mecanismo
  exato de correspondência (nome, e-mail informado no cadastro do Membro, código de conexão)
  não decidido.
- **Riscos de privacidade** (⚠️ atenção): um Membro "pessoa externa" hoje é só um nome dentro
  da conta de quem cadastrou — ela não sabe que foi cadastrada, não consentiu com nada, e não
  tem controle sobre esse dado. Isso já é verdade hoje para Membros em geral (ex.: cadastrar
  o nome de um filho), mas fica mais sensível quando o "Membro" representa uma dívida
  financeira de uma pessoa real fora do app ("Fulano me deve R$100") — vale considerar, quando
  a feature for desenhada de verdade, se cadastrar uma pessoa externa com valor associado
  exige algum aviso ou limite (ex.: não expor esse nome/valor em nenhum lugar acessível pela
  própria pessoa até que ela aceite uma conexão).
- **O que acontece se a pessoa nunca criar conta**: nada quebra — o modelo de "cada um dono da
  própria cópia" (seção 1) já assume que a cota da outra pessoa pode nunca ser "aceita" de
  volta; um Membro sem conta vinculada simplesmente continua para sempre como um registro
  dentro da conta de quem cadastrou, do jeito que Membros já funcionam hoje para dependentes
  sem conta própria.

## 13. Conexões entre usuários

✅ **DECISÃO** (o formato geral): não deve ser possível para qualquer usuário enviar uma
despesa compartilhada para qualquer outro usuário sem relação prévia. Deve existir uma conexão
voluntária, aceita por ambos os lados, antes de qualquer compartilhamento — mais parecido com
uma lista de contatos do que com uma rede social. Isso já estava registrado na seção 1 desta
mesma proposta ("conexão voluntária, que não dá acesso a dados financeiros nenhum") — a
diferença agora é que fica explícito como decisão, não só como um detalhe de modelo de dados.

✅ **DECISÃO** (o que não vamos construir, independente do mecanismo escolhido): feed,
curtidas, ranking, exposição financeira, comparação de patrimônio/gastos, perfil financeiro
público. Nenhuma alternativa de identificação abaixo deve, por si só, introduzir esses
elementos.

🔵 **QUESTÃO EM ABERTO** — mecanismo de identificação para iniciar uma conexão:

| Alternativa | Privacidade | Praticidade | Observação |
|---|---|---|---|
| Código único do usuário (ex.: um ID curto gerado pelo app) | Alta — não expõe nenhum dado pessoal real | Média — a pessoa precisa compartilhar o código ativamente por fora do app (mensagem, verbalmente) | Mais parecido com um "código de amigo" de outros apps; simples de implementar (é só um campo indexado) |
| `@username` escolhido pelo usuário | Alta, se o username não for o nome real nem permitir busca livre por qualquer termo | Média-alta — mais memorável que um código aleatório | Precisa de unicidade garantida (checagem de disponibilidade) e de decidir se é buscável por qualquer um ou só usado para digitar exatamente |
| QR Code | Alta — só funciona com proximidade física, não expõe nada à distância | Alta, mas só quando as duas pessoas estão juntas fisicamente | Ótimo para o caso "amigo do lado", ruim para conectar com alguém à distância |
| Convite por link | Média — o link em si pode ser encaminhado adiante, ampliando quem pode usá-lo | Alta — funciona por qualquer canal (WhatsApp, SMS) já usado no dia a dia | Precisa de expiração/uso único para não virar um link permanente reaproveitável por qualquer um que o receba de terceiros |
| E-mail | Baixa-média — permite descobrir se um e-mail específico já está cadastrado no app (vazamento de informação, mesmo que pequeno) | Alta — dado que a pessoa já sabe de cor | Mesma categoria de risco já registrada na seção 3 originalmente |
| Telefone | Baixa-média — mesmo risco do e-mail, e telefone é um dado mais sensível/pessoal ainda | Alta | Exige verificação (SMS) para não permitir busca em massa por números aleatórios |

Nenhuma decidida. Uma combinação (ex.: código único como forma primária + convite por link
como forma de compartilhar esse código mais facilmente) é plausível e não foi descartada.

⚠️ **Risco já registrado na seção 3 original, reforçado aqui**: qualquer mecanismo de busca
direta por e-mail/telefone permite a alguém descobrir se uma pessoa específica usa o app sem
o consentimento dela — isso deve pesar mais que a conveniência ao decidir.

## 14. Descoberta de contatos / "adicionar amigos"

🔵 **QUESTÃO EM ABERTO** — investigação conceitual, sem escolha feita. Não assumir que
"importar contatos do telefone" é o caminho certo só porque é comum em outros apps.

| Mecanismo | Privacidade | Facilidade | Risco de spam | Segurança | Complexidade | Backend? |
|---|---|---|---|---|---|---|
| Busca por `@username` | Alta (se busca exigir o texto exato, não sugestão automática) | Média | Baixo | Alta | Baixa | Não — uma query Firestore com índice, respeitando regras de quem pode ler o quê |
| Código único | Alta | Média (a pessoa precisa saber o código) | Baixo | Alta | Baixa | Não |
| QR Code | Alta | Alta (com proximidade física) | Muito baixo | Alta | Baixa-média (leitura de câmera, já existe `expo-camera`/similar no ecossistema Expo, não confirmado como dependência atual) | Não |
| Convite por link | Média | Alta | Médio (link pode circular além do destinatário original) | Média (precisa expirar/uso único) | Baixa-média | Provavelmente sim para validar o link com segurança (ver seção 16) |
| Contatos do telefone | Baixa — exige permissão sensível do sistema operacional e comparar a agenda inteira da pessoa contra a base de usuários do app | Alta, quando aceito | Alto (é o mecanismo mais associado a spam/notificação indesejada em outros apps) | Média | Alta — cruzar contatos com usuários exige hashing dos números/e-mails no servidor para não expor a lista de usuários do app | Sim, praticamente exige backend para não vazar a base de usuários |
| E-mail/telefone diretos | Baixa-média | Alta | Médio | Média | Baixa-média | Depende do fluxo (ver seção 13) |

**Leitura geral, não uma escolha**: os mecanismos mais alinhados com "não virar rede social"
são exatamente os mais discretos (username/código/QR) — não coincidentemente, são também os
que menos dependem de backend novo. "Contatos do telefone" é o mais parecido com o que apps
sociais fazem, mas é o que mais contradiz a intenção explícita do produto (evitar
descoberta/exposição não consentida) e o que introduz mais complexidade/backend. Não precisa
copiar o Duolingo — o objetivo aqui é permitir que duas pessoas **que já se conhecem e
combinaram isso por fora do app** se encontrem dentro dele, não descobrir pessoas novas.

## 15. Convite para usar o app (pessoa sem conta)

🟡 **HIPÓTESE/DIREÇÃO** — registrado a partir de uma observação feita após a análise
principal; conecta as seções 12 e 14.

A ideia: quando uma pessoa envolvida numa divisão de despesa **não tem conta no app**, o
próprio app sugere convidá-la a criar uma — em vez de deixar o participante-sem-conta (seção
12) como único destino possível. Dois pontos de entrada plausíveis:
- **No menu** (convite genérico, "convide alguém para usar o app") — já existe um sinal disso
  registrado antes desta conversa: `PRODUCT_DISCOVERY.md` já lista "Convite por link/código
  para família — também vira mecanismo de crescimento orgânico" como ideia não implementada,
  e o `ROADMAP.md` já incorporou isso à Fase 2 (ver tabela "Atualização — Product Discovery").
  Este documento generaliza a mesma ideia para além do Modo Família: o convite genérico serve
  tanto para trazer alguém para um Espaço Compartilhado (seção "Modo"/"Espaços Compartilhados"
  em `DISCOVERY_COLABORACAO_VS_FAMILIA.md`) quanto para Colaboração pontual.
- **No fluxo de compartilhar uma despesa**, quando a pessoa escolhida não tem conta: em vez de
  só criar um Membro "pessoa externa" (seção 12) silenciosamente, o app poderia oferecer os
  dois caminhos lado a lado — "registrar como pessoa sem conta" ou "convidar para usar o app".

Reaproveitaria o mesmo mecanismo de convite por link já cogitado na seção 13/14 — não é uma
terceira infraestrutura, é um segundo uso do mesmo link/código (um para "conectar comigo", um
para "venha usar o app"; possivelmente o mesmo link resolve os dois casos dependendo se quem
abre já tem conta ou não). 🔵 **Questão em aberto**: se esse convite deveria já vir com o
contexto da despesa específica anexado (ex.: "Rafael te convidou e já separou sua parte de
R$30 do jantar") ou ser sempre genérico — a primeira opção é mais forte para conversão, mas
implica que a cota fica "pendente de conta" antes mesmo da pessoa existir como usuário, o que
teria que ser modelado (provavelmente como parte do próprio Membro "pessoa externa" da seção
12, não uma estrutura nova).

## 16. Cloud Functions / backend — por que apareceu e se é realmente necessário

Explicando do zero, como pedido, sem assumir conhecimento prévio do termo.

**O que é uma Cloud Function**: um pedaço de código que roda no servidor do Google (não no
celular do usuário), acionado por um evento (uma chamada HTTP do app, uma escrita no
Firestore, etc.). Diferente de todo o código deste projeto hoje, que roda inteiramente no
aparelho do usuário e fala direto com o Firestore.

**Por que o app funciona hoje sem isso**: porque, até agora, toda operação é sobre os
**próprios dados do próprio usuário** — `users/{uid}/...`. As Regras de Segurança do Firestore
(`firestore.rules`, já versionado — ver `PROJECT_STATUS.md`) conseguem expressar essa regra
inteira sozinhas: "só o dono do `uid` pode ler/escrever dentro de `users/{uid}`". Não existe
hoje nenhum caso em que o Firestore precise decidir algo que dependa de **duas contas
diferentes ao mesmo tempo**.

**Qual problema aparece quando dois usuários precisam interagir**: no exemplo do próprio
pedido — A envia convite para B, B aceita — existem verificações que dependem de **confiar em
quem está fazendo a escrita**, e regras de segurança do Firestore só enxergam "quem está
escrevendo agora", não "o que deveria ter acontecido antes":

| O que precisa ser garantido | Dá para garantir só com Firestore Rules? | Por quê |
|---|---|---|
| A realmente criou o convite | ✅ Sim | É uma escrita na própria conta de A — rule normal de "só o dono escreve no próprio documento" resolve. |
| B é realmente o destinatário | ✅ Sim, com desenho cuidadoso | Se o convite for gravado com o `uid` de B como campo, uma rule pode checar `request.auth.uid == resource.data.destinatarioId` antes de permitir que B leia/altere aquele documento específico. |
| Ninguém consegue forjar um aceite | 🟡 Parcialmente | Uma rule consegue impedir que **outra pessoa** (C) aceite em nome de B (checando `request.auth.uid`). O que ela não resolve sozinha é garantir que o aceite gera exatamente a cópia certa do lançamento — isso é lógica de negócio, não checagem de identidade. |
| Ninguém consegue alterar a cota/valor combinado no caminho | ⚠️ Difícil só com Rules | Regras conseguem validar formato (“o campo valor é number, positivo”), mas não conseguem, sozinhas, garantir que o valor no documento de B bate exatamente com o que A originalmente propôs, sem duplicar toda a lógica de comparação dentro da regra (frágil e difícil de manter). |
| A cópia criada na conta de quem aceitou é legítima (não fabricada por B mesmo) | ⚠️ Difícil só com Rules | O ponto mais sensível: nada impede, só com Rules, que B escreva diretamente um "gasto" na própria conta fingindo que veio de uma divisão aceita — Rules não têm como validar uma "transação" que só existe de fato quando dois documentos, em duas contas diferentes, mudam de forma coordenada. |

### 16.1 Spike técnico (2026-08-10) — resultado confirmado, não mais hipótese

> **Correção em relação à seção acima**: a análise original subestimou o que Firestore Rules
> conseguem fazer sozinhas. Registrado aqui porque é exatamente o tipo de correção de rota que
> vale deixar explícita, não silenciada — a tabela acima (seção 16) está tecnicamente
> incompleta na linha "A cópia criada na conta de quem aceitou é legítima".

**Método**: desenho de um rascunho concreto de regras para o fluxo de convite/aceite (modelo
de dados da seção 5) e checagem, linha a linha, de cada garantia da tabela da seção 16 contra
esse rascunho. **Limitação honesta**: não foi possível rodar isso contra o emulador real do
Firestore (`firebase emulators:start` exige Java, não disponível no ambiente usado nesta
análise) — é uma verificação de desenho rigorosa, não um teste automatizado executado. Rodar
de fato contra o emulador (`@firebase/rules-unit-testing`) continua sendo recomendado antes de
qualquer decisão final.

**Resposta objetiva à pergunta principal — dá para fazer convite/aceite com segurança só com
Firestore + Rules?** **Sim, é tecnicamente possível.** Firestore Rules podem referenciar
**outros documentos** durante a validação de uma escrita (via `get()`/`exists()`), não só o
documento sendo escrito — isso permite, por exemplo, uma regra em `users/{B}/gastos/{id}` que
exige `create` checar se existe um convite em `users/{B}/convitesDeDivisao/{eventoId}` com
`status: 'pendente'` e `minhaCota` **igual** ao `valor` que está sendo gravado, rejeitando a
escrita se não bater. O mesmo mecanismo resolve a escrita cruzada (A criando um documento
dentro da árvore de B) com uma regra de `create` estreita e específica, validando
rigorosamente cada campo — não é preciso abrir `users/{userId}` de forma geral para outros
usuários, só uma exceção estreita numa subcoleção dedicada.

**Se pura Rules resolve, por que ainda recomendo Cloud Function para a V1?** Não por
incapacidade técnica das Rules — por **risco de blast radius** no arquivo de regras que já
protege todo o dinheiro do app:
- Hoje, `firestore.rules` tem uma garantia simples e auditável à primeira vista: "cada uid só
  mexe na própria árvore" (uma linha, seção 7). Introduzir uma exceção de escrita cruzada
  nesse mesmo arquivo, por mais estreita que seja, torna a regra que protege `gastos`,
  `entradas`, `investimentos` etc. mais difícil de ler e de auditar como um todo — mesmo que a
  exceção em si seja para uma subcoleção nova e isolada, ela deixa de ser um bloco
  independente.
- Uma Cloud Function com privilégio de administrador (Admin SDK, que ignora Rules) mantém as
  Rules atuais **inteiramente intocadas** — a lógica de confiança do aceite fica isolada num
  arquivo novo, sem tocar no que já protege o resto do app. Mais fácil de testar
  isoladamente (testes de unidade normais, não sintaxe de Rules), mais fácil de auditar sem
  precisar reler as regras de `gastos`/`entradas` para garantir que a exceção nova não abriu
  uma brecha ali.
- `get()` dentro de Rules conta como leitura cobrada e tem limite de chamadas por avaliação
  (20 por requisição, hoje) — não é um problema no fluxo simples de hoje, mas cresce com
  qualquer refinamento futuro (ex.: checar também se a conexão entre A e B ainda está ativa).

**Como ficaria o fluxo em cada alternativa:**
- **Só Rules**: A cria `despesaCompartilhada` (própria conta) → A cria `convite` na árvore de
  B (regra de `create` estreita, validando remetente/formato) → B lê seus convites → B aceita
  com um `writeBatch` (2 escritas atômicas do lado do cliente: `status: 'aceito'` no convite +
  `create` do gasto, cross-checado pela regra do `get()`) — tudo client-side, sem servidor.
- **Cloud Function no aceite**: A cria a despesa e o convite (Rules simples, sem exceção
  cruzada — pode ser feito com uma Function também, para manter tudo num só lugar, ou
  continuar client-side já que essa parte não tem o mesmo risco) → B chama uma função
  `aceitarConvite(eventoId)` → a função (Admin SDK) valida tudo em código normal e grava os
  dois documentos atomicamente, sem depender de nenhuma regra especial.

**Custos e impactos de cada uma:**
- **Só Rules**: sem infraestrutura nova, mas a lógica de segurança mais crítica do app fica
  escrita numa DSL difícil de testar unitariamente e cresce em complexidade junto do arquivo
  que hoje é simples.
- **Cloud Function**: mudança de categoria já registrada na seção original — deploy próprio,
  custo por execução (dentro da faixa gratuita para volume pequeno), observabilidade própria,
  primeira vez que o projeto tem "produção" fora do celular do usuário.

**Recomendação para a V1**: Cloud Function só no momento do aceite (e, por consistência, também
na criação do convite — mesma exceção de escrita cruzada, mesmo raciocínio de blast radius) —
não porque Rules puras sejam incapazes, mas porque isolar a nova fronteira de confiança em
código novo, deixando as Rules atuais exatamente como estão, é a opção que menos arrisca
reintroduzir um erro na proteção que já existe para todo o dinheiro do app. Reavaliar se, no
uso real, o custo/complexidade de manter uma Function pesar mais do que esse risco parece
hoje.

## 17. Offline + Colaboração + Modo Família — cenários combinados

Base factual usada aqui: `ARQUITETURA.md` seção 7.1 (persistência offline, estado atual —
registrada nesta mesma rodada). Resumo: dentro de uma sessão viva do app, o Firestore já
funciona offline (cache em memória + fila de escrita); nada disso sobrevive o processo do app
ser encerrado, porque não há cache persistente configurado hoje.

**A) Usuário pessoal offline** — ✅ o que já é simples hoje: usar o app numa sessão contínua
com internet instável (viagem de metrô, sinal fraco) já funciona sem nenhuma mudança —
comportamento nativo da SDK. ⚠️ o que é difícil: abrir o app já offline, depois de ele ter
sido fechado — sem cache persistente, não há dado nenhum disponível até reconectar. O
Firestore não resolve isso sozinho hoje (precisaria da mudança de SDK descrita em
`ARQUITETURA.md` 7.1); é algo a controlar manualmente (ou aceitar como limitação) se
"abrir o app no avião, sem ter usado antes de decolar" for um cenário que importa.

**B) Família usando dois celulares offline, depois conectando** — pressupõe o Modo Família
(`tenants/{tenantId}`) existir, o que não é o caso hoje. 🟡 Hipótese sobre o que aconteceria:
cada celular enfileira as próprias escritas offline (o Firestore resolve isso automaticamente,
mesmo com tenant compartilhado); o que o Firestore **não resolve sozinho** é o que acontece
quando os dois editam o **mesmo documento** enquanto ambos offline — a regra é "a última
escrita a chegar ao servidor vence o documento inteiro", não uma mesclagem inteligente campo a
campo. ⚠️ Risco a controlar manualmente: se os dois editarem o mesmo lançamento
simultaneamente offline, um dos dois edita "no vácuo" e perde a própria alteração sem aviso
quando reconectar (o cache local dele é sobrescrito pela versão do servidor). Documentos
menores e mais granulares (um por lançamento, não um grande documento agregado) reduzem a
chance de colisão, mas não eliminam.

**C) Duas pessoas compartilhando uma despesa enquanto uma está offline (modelo de Colaboração,
não Modo Família)** — ✅ o que é simples: como o modelo de Colaboração (seção 1) nunca cria um
documento compartilhado entre as duas contas — cada lado tem sua própria cópia independente —
não existe o risco de colisão do cenário B. A pessoa offline simplesmente não vê o convite até
reconectar; quando abrir o app de novo, o convite está lá esperando (num documento que já
existia, só não sincronizado ainda). Este é um ponto a favor arquitetural do modelo de
Colaboração que não estava explícito nas seções anteriores: ele é estruturalmente mais
tolerante a offline do que o modelo de tenant, porque nunca há dois lados escrevendo o mesmo
documento.

**D) Usuário cria uma despesa compartilhada offline, depois fica online** — ✅ simples: o
lançamento em si, na conta de quem criou, enfileira e sincroniza normalmente, como qualquer
gasto hoje. ⚠️ Atenção, ligando direto com a seção 16: **se a criação do convite depender de
uma Cloud Function** (chamada HTTPS, não uma escrita comum no Firestore), ela **não enfileira
offline automaticamente** — chamadas de Function exigem conexão no momento da chamada; ficar
offline nesse ponto do fluxo quebra a experiência, a menos que o app construa sua própria fila
de retry manual (esforço extra, não vem de graça como as escritas do Firestore vêm). Isso é um
argumento a favor de manter a **criação** do convite como uma escrita Firestore comum (rule
cuidando da validação, ver seção 16) e reservar Function só para o momento do aceite, se
realmente for necessário — maximiza o que continua funcionando offline.

**E) Dois usuários alterando a mesma informação em Modo Família** — mesmo risco fundamental do
cenário B, mas vale nomear explicitamente: "o Firestore resolve automaticamente" só cobre não
perder a escrita (ela sempre chega ao servidor); não cobre "as duas escritas coexistirem" —
"último a escrever vence o documento inteiro" é a regra real. ⚠️ **Achado colateral,
descoberto ao analisar este cenário, sem relação direta com Colaboração/Família**: o próprio
app já tem hoje um caso estruturalmente idêntico a este risco, **mesmo sem nenhum
compartilhamento entre contas** — `useInvestimentos.js` guarda `movimentacoes` como um array
dentro de um único documento de investimento; dois lançamentos de movimentação feitos quase ao
mesmo tempo em dois dispositivos do **mesmo usuário** (ex.: celular e tablet) já correm o
mesmo risco de "o último grava por cima do array inteiro do primeiro" — mitigado hoje pelo uso
de `runTransaction` (ver `ARQUITETURA.md` seção 8), que resolve o caso online (o Firestore
rejeita e tenta de novo com o dado mais fresco), mas uma transação não tem como recuperar uma
escrita feita offline por outro dispositivo antes de sincronizar. Não é um bug a corrigir
agora — é um lembrete de que o "problema de dois escritores" não é exclusivo de Modo Família,
já existe em miniatura no código atual, e a mesma disciplina de documentos pequenos/
`runTransaction` que já se aplica lá se aplicaria ao Modo Família.
