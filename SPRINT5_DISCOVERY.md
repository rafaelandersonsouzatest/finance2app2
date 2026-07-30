# Sprint 5 — Discovery: Identidade e Perfis (Usuário, Membros e Avatar)

> Registrado em 2026-07-29, antes de qualquer implementação. Mesmo processo das Sprints 3
> e 4: pesquisa no código real + arquitetura + alternativas, para decidirmos o escopo
> juntos antes de escrever código. Seções 3.2/3.3 e 4.3 foram aprofundadas a seu pedido
> numa segunda rodada desta Discovery. **Discovery aprovada e encerrada em 2026-07-29**
> (seção 10) — seção 12 registra a regra de identidade e os identificadores permanentes,
> últimos dois pontos pedidos antes do incremento 1. Esta seção 12 deve ser incorporada a
> `ARQUITETURA.md` ao final da sprint (incremento 5), junto da documentação técnica
> resultante — mesmo fluxo já usado na Sprint 4.

## 0. Por que esta sprint deixou de ser só "Avatar dos Membros"

A pergunta original ("como fazemos avatar de membro?") não tem uma resposta boa sem
responder antes "o que é um Membro, e como ele se relaciona com um usuário autenticado?".
Hoje essas são duas entidades sem nenhuma ligação — construir avatar em cima disso sem
resolver a base seria repetir o padrão que já vimos na Sprint 4 com Categorias: construir
sobre uma fundação que sabemos que vai precisar ser refeita.

**Sobre o reenquadramento para "Identidade e Perfis":** concordo com a mudança. E vale
registrar uma consequência dela: isso **empurra "Metas Financeiras" para depois da
Sprint 5**, não para dentro dela — o `ROADMAP.md`/`PROJECT_STATUS.md` hoje dizem que Metas
seria a Sprint 5 (sequência definida ao final da Sprint 4). Confirmado por você: Metas
Financeiras passa a ser Sprint 6 — mesmo tipo de ajuste já feito quando Categorias assumiu
o lugar de Metas na rodada anterior.

## 1. Achados no código atual

Levantamento arquivo por arquivo, não por memória:

### 1.1 Três noções de "pessoa" hoje, não duas

- **Usuário autenticado**: `useAuth()` — `user` (Firebase Auth puro: `uid`, `email`) +
  `profile` (`users/{uid}`: `nome`, `apelido`, `avatarUrl: null`, `tenantId`, etc.).
- **Membro cadastrado**: `useMembros()` — `users/{uid}/membros/{id}`: só `{ nome, ativo,
  avatar: null, criadoEm }`. Sem `email`, sem `uid`, sem qualquer campo que ligue esse
  documento a uma conta real. É uma lista de nomes, não de pessoas identificáveis.
- **"Pessoa" livre**: `MembroSelect.js` tem um segundo modo (`tipo="pessoa"`), usado como
  "Comprador" em compras de cartão (`ModalCriacao.js` linha 582, `ModalEdicao.js` linha
  171) e reaproveitado (com significado diferente — ver seção 4.3) como
  "Pessoa/Instituição" em empréstimos. Esse modo **não usa `useMembros` nem Firestore** —
  é texto livre com um histórico de "recentes" salvo em `AsyncStorage`
  (`@ultimas_pessoas`). Ou seja: hoje é possível digitar qualquer nome como "Comprador" de
  uma compra, sem nenhuma relação com a lista real de Membros da família, nem validação de
  duplicidade, nem sincronização entre aparelhos.

**Por que isso importa para "Quem é quem?"**: sua pergunta pressupõe 2 entidades
(usuário × membro). O código hoje tem 3 caminhos de dado diferentes para "pessoa
associada a algo". Unificar "quem é quem" precisa decidir o que fazer com esse terceiro
caminho — aprofundado na seção 4.3, a seu pedido.

### 1.2 O dono da conta nunca é um Membro

`criarUserProfileSeNaoExistir`/`register()` (`useAuth.js`) criam o documento de perfil,
mas **nunca criam um documento em `membros`**. Consequência prática, testável hoje:
abrindo o seletor de Membro em qualquer lançamento, o próprio dono da conta não aparece
como opção — só quem ele cadastrou manualmente em "Gerenciar Membros". Isso confirma o
sintoma que você descreveu: usuário autenticado e Membro são, hoje, mundos
desconectados.

### 1.3 `membro`/`pessoa`/`comprador` são strings soltas, sem `id`

Diferente de `categoria` (que ganhou `categoriaId`/`categoriaNome` na Sprint 4), o campo
`membro` (entradas) e `pessoa`/`comprador` (cartões, empréstimos) **continuam sendo só uma
string com o nome**, normalizada na hora de salvar (`ModalCriacao.js` linhas 214-220,
`ModalEdicao.js` linhas 288-296: `if (typeof === 'object') { v.membro = v.membro.nome }`).
Isso significa: renomear um Membro não atualiza o histórico (mesmo problema que
`categoria` tinha antes da Sprint 4), e não há como agregar/filtrar lançamentos por Membro
de forma confiável (dois membros com nomes parecidos colidem).

### 1.4 Modo Família: duas tentativas mortas e incompatíveis entre si

Achado que não estava registrado em nenhum documento antes desta Discovery — aprofundado
tecnicamente na seção 3.2, a seu pedido:

- **Tentativa A** (`src/utils/firestorePaths.js`): `getBasePath(user, compartilhado)`
  retorna `tenants/{tenantId}` quando `compartilhado=true` — um espaço de dados
  compartilhado único por família, independente de qual membro está logado.
- **Tentativa B** (`useModelos.js` linhas 24-33, `ModalHistoricoParcelas.js` linhas
  219-242): lê `membroSelecionado.uid` (de `useAuth()`, que **nunca expõe esse campo** —
  confirmado lendo o Provider inteiro) e, se existir, monta o caminho como
  `users/${membroSelecionado.uid}` — um modelo de "pegar emprestado o espaço de dados de
  outro `uid`", diferente do modelo de tenant acima.

Nenhuma das duas funciona hoje (a segunda nem compila logicamente — `membroSelecionado`
é sempre `undefined`), mas são duas arquiteturas diferentes para o mesmo problema, ambas
já no código.

### 1.5 Não existe `firestore.rules` — isso limita o que a Sprint 5 pode habilitar de verdade

Já documentado como risco geral do projeto (`ARQUITETURA.md` seção 7, `ROADMAP.md` Fase
0), mas ganha um peso novo aqui: **qualquer campo que aponte para o `uid` de outra
pessoa** (membro vinculado, lançamento vinculado a outro usuário) só é seguro de verdade
quando existir uma regra que impeça um usuário de ler/escrever o espaço de outro `uid`
sem permissão. Guardar o campo agora é seguro (é só um dado); **usar** esse campo para
ler dados de outro `uid` sem regra escrita seria abrir uma falha de segurança real — este
projeto lida com dados financeiros reais.

### 1.6 Infra de avatar hoje: zero

- `src/config/firebase.js` importa só `firestore` e `auth` — **não há Storage
  inicializado** em nenhum dos 4 ambientes.
- Não há `expo-image-picker`, `expo-camera`, nem `expo-image-manipulator` no
  `package.json` — nenhuma dependência de captura/manipulação de imagem existe hoje.
- `react-native-svg` (15.12.1) **já é dependência do projeto** (usado hoje só via
  `@expo/vector-icons`, indiretamente) — é a única peça de infraestrutura relevante a
  avatar que já existe.
- Dois campos já reservados, ambos `null` sempre, sem migração retroativa:
  `profile.avatarUrl` (usuário, `useAuth.js`) e `membro.avatar` (`useMembros.js`) — os
  dois nomeados como se fossem guardar uma **URL de imagem**, o que pré-orienta (sem
  obrigar) a decisão para "foto", não para "vetorial gerado por seed". Ver seção 5.6.

## 2. Modelo proposto: Membro-espelho do dono da conta

### 2.1 Por que precisa ser um documento real (não uma entrada calculada em memória)

Alternativa descartada: em vez de gravar um documento, `useMembros` poderia "injetar" o
dono da conta como um item extra da lista, calculado a partir de `profile`, sem gravar
nada no Firestore.

| | **A. Documento real em `membros` (recomendado)** | **B. Item calculado em memória, nunca gravado** |
|---|---|---|
| **Vantagens** | Pode receber `uid` depois (vínculo com Modo Família); pode ser referenciado por `membroId` em lançamentos como qualquer outro membro; consistente com o restante do app (tudo em `membros` é um documento) | Zero escrita extra no cadastro; não existe risco de duplicar/dessincronizar nome |
| **Desvantagens** | Precisa manter nome sincronizado com `profile.apelido` (ver 2.3) | Não pode guardar `uid`/vínculo (não existe onde gravar); todo consumidor de `useMembros` precisaria saber "injetar" esse item especial — mesmo tipo de acoplamento frágil que já causou o bug do `membroSelecionado` nunca exposto |
| **Compatibilidade com "vincular a conta real" e "lançamento por membroId"** | Boa — é a mesma peça de dado para os dois casos | Ruim — bloqueia os dois de raiz |

**Recomendação: opção A.** É mais trabalho agora (um documento a mais, sincronização de
nome), mas é a única que sustenta os dois cenários futuros que você descreveu.

### 2.2 Forma do documento (`users/{uid}/membros/{id}`)

```js
{
  nome: string,
  ativo: boolean,
  avatar: <ver seção 5>,
  ehProprietario: boolean,   // true só no membro-espelho do dono da conta
  uid: string | null,        // null = membro só local; preenchido = vinculado a uma conta real
  criadoEm: timestamp,
  atualizadoEm: timestamp | null,
}
```

`uid`/`ehProprietario` são campos novos. Seguindo o mesmo princípio já usado para
`categoriaId`/`categoriaNome` na Sprint 4: **nenhuma migração em massa** — membros já
existentes ganham `uid: null`/`ehProprietario: false` só quando forem tocados
(`atualizarMembro`) ou o app já lida com a ausência do campo como "falsy" por padrão.

**Por que o membro-espelho usa `id` = o próprio `uid` do usuário** (em vez de um ID
gerado por `addDoc`): fica autoexplicativo e evita duplicação por corrida (dois
aparelhos abrindo o app ao mesmo tempo logo após o cadastro, mesmo padrão de proteção já
usado no seed de categorias padrão da Sprint 4 — `set` idempotente no mesmo ID nunca
duplica).

### 2.3 Criação: no cadastro (novas contas) + autocura (contas existentes)

- **Contas novas**: dentro do mesmo `writeBatch` que já grava perfil + reserva de
  CPF/CNPJ em `register()` (`useAuth.js`), adicionar `batch.set(doc(db,
  "users/{uid}/membros", uid), { nome: apelido, ativo: true, ehProprietario: true, uid,
  avatar: null, criadoEm: serverTimestamp() })`. Mesma atomicidade já garantida hoje.
- **Contas existentes** (login, sem esse membro ainda): mesmo princípio de autocura já
  usado em `criarUserProfileSeNaoExistir` (roda a cada login, `getDoc` primeiro, só cria
  se faltar) e no seed de categorias padrão (`useCategorias`, "se a coleção voltar vazia,
  semeia"). Aqui a checagem é "existe um membro com `id === user.uid`?" — se não, cria.
  **Nenhum script de migração separado é necessário.**

### 2.4 Nome do membro-espelho: espelhar `profile.apelido` ou ser independente?

| | **A. Sempre espelha `profile.apelido`/`getNomeExibicao(profile)`** | **B. Campo independente, editável separadamente** |
|---|---|---|
| **Vantagens** | Um único lugar para trocar o nome (`ContaScreen.js`, já existe); nunca dessincroniza | Permite ter um "nome de exibição para a família" diferente do nome de conta |
| **Desvantagens** | Precisa que `atualizarPerfil` também grave no membro (2 escritas em vez de 1) | Dois lugares para editar o próprio nome — risco de esquecer de atualizar um deles, o mesmo tipo de dessincronia que motivou `getNomeExibicao` centralizar a regra numa função só |

**Recomendação: opção A.** Simplicidade e "um único lugar para editar seu nome" pesam mais
— é a mesma filosofia que já levou a extrair `getNomeExibicao` numa função única em vez de
repetir a lógica em 3 telas.

### 2.5 Proteções necessárias no CRUD de Membros

- `excluirMembro`: bloquear exclusão se `ehProprietario === true` (o dono da conta não
  pode se excluir como membro — ele pode excluir a *conta*, fluxo que é outra coisa, já
  listado como "futuro" em `ContaScreen.js`).
- UI (`GerenciarMembrosModal.js`): esconder ou desabilitar o botão de excluir para esse
  item específico, para não depender só da validação no hook.

## 3. Vínculo de um Membro a uma conta real (Marina) e arquitetura de Modo Família

### 3.1 O que fazer agora vs. depois

A estrutura de dados para o vínculo é barata (campo `uid` já incluído em 2.2). O
**mecanismo de vínculo em si** — convite, aceite, o que acontece com o histórico de dados
que a Marina já tinha antes de ser "vinculada" — é trabalho de Modo Família (Fase 2 do
`ROADMAP.md`), que já lista isso explicitamente como pendente ("Migração de dados:
decidir como um usuário existente 'entra' em um tenant compartilhado sem perder o
histórico").

**O que a Sprint 5 deve fazer:** só reservar o campo `uid` (nullable) no membro, sem
nenhuma tela/fluxo de "vincular". **O que a Sprint 5 não deve fazer:** implementar
qualquer leitura cross-`uid` (nem uma prévia/preview) — isso exigiria `firestore.rules`
que hoje não existem, fora do tamanho desta sprint.

Como as duas tentativas mortas de "família compartilhada" já convivem no código (seção
1.4), a seguir a comparação técnica e a recomendação explícita pedidas, para o campo
`uid` novo já nascer alinhado com o modelo certo.

### 3.2 Comparação técnica das duas arquiteturas de Modo Família

| Critério | **A. `tenants/{tenantId}`** (`firestorePaths.js`) | **B. Empréstimo direto de `users/{outroUid}`** (`useModelos.js`, `ModalHistoricoParcelas.js`) |
|---|---|---|
| **Como funciona hoje (mesmo morto)** | `getBasePath(user, true)` retornaria `tenants/{tenantId}` — um espaço de dados próprio da família, separado de qualquer `users/{uid}` individual | Lê `membroSelecionado.uid` e monta `users/${uid_de_outra_pessoa}` diretamente — "pega emprestado" o espaço pessoal de outro usuário |
| **Onde "mora" o dado compartilhado** | Num espaço **independente**, que não pertence a nenhum membro específico | Dentro do espaço pessoal de **uma pessoa específica** — literalmente os dados da família vivem "dentro" da conta de alguém |
| **O que acontece se essa pessoa sair/excluir a conta** | Nada — o tenant é independente, continua existindo | Catastrófico — se os dados "compartilhados" vivem dentro do `users/{uid}` de quem saiu, a família inteira perde acesso ao próprio histórico |
| **Regras de segurança necessárias (`firestore.rules`, hoje inexistentes)** | Um padrão único: "uid pertence à lista de membros deste tenant?" — mesma regra se aplica a toda subcoleção do tenant | Precisa de concessões par-a-par ("uid X tem permissão de acesso ao espaço de uid Y?"), armazenadas e checadas em cada `users/{uid}` — mais superfície de regra, mais fácil de errar |
| **"Quem está na família" é uma pergunta com resposta única?** | Sim — é a lista de membros do tenant, um lugar só | Não — é reconstruído a partir de concessões espalhadas entre pares de contas, sem registro central |
| **Generaliza para Modo Empresa (Fase 4)?** | Sim — o próprio `ROADMAP.md` já descreve Empresa como "extensão do mesmo conceito de tenant" | Não — "pegar emprestado o espaço pessoal de um funcionário" não faz sentido para uma empresa com N funcionários e um dono |
| **Já é o padrão que o projeto documentou como intenção original?** | Sim — é a única opção que `getBasePath` foi desenhada para suportar desde o início (parâmetro `compartilhado`) | Não — foi escrito depois, direto num hook específico, sem passar pelo ponto de acoplamento único que o projeto já tinha (`getBasePath`) |
| **Alinhamento com o `ROADMAP.md`** | — | O `ROADMAP.md` (Fase 2) já cita isso como risco a evitar: *"implementar Modo Família como 'mais um `if` espalhado pelos hooks atuais' (como já começou a acontecer em `useModelos.js`)"* — a Arquitetura B é exatamente o antipadrão que o próprio roadmap já tinha identificado, antes desta Discovery confirmar que ele já existe de fato |
| **Trabalho ainda necessário para funcionar de verdade** | Resolver o gap `user.tenantId` (`ARQUITETURA.md` seção 3/10) + decidir como dados pessoais já existentes convivem/migram para o tenant + escrever `firestore.rules` | Escrever um sistema de concessões par-a-par + `firestore.rules` equivalentes — mais complexo de acertar com segurança, partindo de zero regras hoje |

### 3.3 Recomendação explícita: Arquitetura A (`tenants/{tenantId}`) é a oficial do projeto

Motivos, em ordem de peso:

1. **É a única que sobrevive ao Modo Empresa (Fase 4)** sem precisar ser refeita — o
   próprio `ROADMAP.md` já assume isso. Escolher a B agora significaria descartá-la de
   qualquer forma quando a Fase 4 chegasse.
2. **Regras de segurança mais simples e auditáveis** — dado que o projeto não tem
   nenhuma `firestore.rules` hoje, começar pelo modelo que exige um padrão de regra único
   (tenant → lista de membros) é significativamente mais seguro do que um modelo de
   concessões par-a-par.
3. **Não amarra a sobrevivência dos dados da família à conta de uma pessoa específica** —
   a Arquitetura B tem uma falha estrutural real: os dados "compartilhados" vivem dentro
   do espaço pessoal de alguém, então a saída dessa pessoa ameaça o acesso de todo mundo.
4. **É a que o projeto já desenhou para ser a oficial** — `getBasePath(user,
   compartilhado)` já existe com esse propósito desde antes desta sprint; a Arquitetura B
   surgiu depois, isolada, num hook específico.
5. **O próprio `ROADMAP.md` já sinalizava a B como o risco a evitar**, antes mesmo desta
   Discovery confirmar que ela já existe parcialmente implementada.

### 3.4 O que isso muda para a Sprint 5

- O campo `uid` novo no documento de Membro (seção 2.2) já nasce alinhado com a
  Arquitetura A: quando o Modo Família for construído de verdade, "vincular Marina" vai
  significar ajustar `profile.tenantId` dela para apontar para o tenant da família — não
  gravar um `uid` de outra pessoa dentro de um lançamento para "pegar emprestado" o
  espaço dela.
- **Recomendo remover agora** (não só isolar) o código morto da Arquitetura B —
  `membroSelecionado`/`modoFamiliaAtivo` em `useModelos.js` e a resolução de
  `usuarioDestino` em `ModalHistoricoParcelas.js` — porque, com a decisão acima
  registrada, ele deixa de ser "uma segunda opção em aberto" e passa a ser código que
  implementa a arquitetura **não escolhida**. Mantê-lo é mais arriscado do que antes
  desta análise: alguém poderia reativá-lo (bastaria passar `modoFamiliaAtivo=true`)
  achando que é um caminho válido.
- Isso é documentação + limpeza pontual, não implementação do Modo Família — nenhuma
  regra de segurança, migração ou fluxo de convite entra nesta sprint.

## 4. Lançamento vinculado a "outro usuário do app" — dois cenários diferentes

### 4.1 Cenário A — vincular a um Membro da própria família (ex.: Marina)

Convive dentro do mesmo projeto Firebase (o tenant da família, quando existir). Uma vez
que a Sprint 5 padronize `membroId`/`membroNome` nos lançamentos (seção 4.3), este
cenário já está coberto: quando a Marina for vinculada (seção 3), qualquer lançamento
antigo com `membroId` apontando para ela automaticamente "aponta" para uma conta real,
sem precisar tocar nos lançamentos de novo.

### 4.2 Cenário B — vincular a um usuário qualquer do app (seu exemplo do amigo)

Este é estruturalmente diferente: não pressupõe que a outra pessoa seja um Membro da sua
família — pressupõe que ela é uma conta **completamente independente**, possivelmente
nem conhecida previamente (ao estilo Splitwise/Venmo). Hoje isso esbarra em algo maior
que o modelo de dados de Membros: **os 4 ambientes do app (`meu-app`, `rafael`, `marina`,
`christian`/Convidado) são 4 projetos Firebase distintos** (`ARQUITETURA.md` seção 7) —
bancos de dados sem nenhuma ponte entre si. Um amigo usando o ambiente `rafael` e você
usando `meu-app` não compartilham sequer o mesmo espaço de `uid`s.

Isso não é uma limitação de código que a Sprint 5 resolve com um campo a mais — é a
mesma pergunta em aberto já registrada no `ROADMAP.md` (Fase 1): "esse modelo de um
Firebase por pessoa/ambiente é definitivo, ou um artefato de fase de testes?". Se a
resposta, olhando para este cenário B, for "eventualmente precisamos de um único projeto
Firebase compartilhado, com regras por tenant", essa é uma decisão de arquitetura maior
que qualquer sprint de perfil.

**O que proponho para a Sprint 5:** não modelar o Cenário B agora. Só desenhar o campo de
referência do lançamento (seção 4.3) de um jeito que não impeça essa evolução depois —
ex.: `membroId` podendo, no futuro, ser trocado por uma referência mais genérica
(`referenciaExterna: { tipo: 'membro' | 'usuarioApp', id }`) sem quebrar o que for
gravado agora. Não construir essa generalização hoje (seria over-engineering para um
cenário ainda sem decisão de infraestrutura) — só não fechar a porta.

### 4.3 Aprofundamento: `pessoa`/`comprador` pode virar Membro, sem criar um terceiro modelo?

#### 4.3.1 Achado: "pessoa" hoje é dois conceitos diferentes, não um só

Investigando os 3 lugares que usam o nome de campo `pessoa`, ele não representa a mesma
coisa em todo lugar:

| Tipo de lançamento | Campo real gravado no Firestore | O que representa de fato | Como é preenchido |
|---|---|---|---|
| **Cartão** (`useCartoes.js`) | `pessoa` | **Quem fez a compra** (um Membro da família) | `MembroSelect` (`tipo="pessoa"`, rótulo "Comprador") — texto livre com histórico "recentes", não vinculado a `useMembros` |
| **Empréstimo** (`useEmprestimos.js`) | `pessoa` | **De quem/onde veio o empréstimo** — banco, loja, ou pessoa física a quem se deve (placeholder "Ex: Banco XYZ") | `CampoTexto` simples, sempre texto livre |

"Cartão.pessoa" é conceitualmente o mesmo que "Entrada.membro" (quem, da família, está
associado a este lançamento) — só ganhou um nome de campo diferente por acidente de
implementação. Já "Empréstimo.pessoa" é um conceito de negócio diferente
(credor/instituição) que só coincide no nome do campo, não no significado. Forçar os dois
para dentro de "Membro" seria um erro — ninguém deveria cadastrar "Banco Itaú" como
membro da família.

**Resposta à pergunta:** sim, dá para unificar sem criar um terceiro modelo de
identidade — mas a unificação certa é **"Comprador" (cartão) ↔ "Membro"**, não
"Pessoa/Instituição" (empréstimo) ↔ "Membro". A ação correta para o empréstimo não é
unificar, é parar de chamá-lo de `pessoa` internamente (proponho renomear o campo para
`credor`, mantendo o rótulo "Pessoa/Instituição" na UI, que já está correto) — só para
não conviver com o mesmo nome de campo que o cartão vai deixar de usar.

#### 4.3.2 Achado de bug real, encontrado ao investigar esta unificação

`ModalEdicao.js` tem uma inconsistência que faz a edição de "Comprador" em compras de
cartão não funcionar de verdade:

- `useCartoes.js` lê/grava o campo `pessoa` (confirmado nas 3 funções: leitura do
  listener, `addCartao`, `updateCartao`).
- `ModalCriacao.js` (criação) também usa `pessoa` para o "Comprador" — consistente.
- **`ModalEdicao.js` (edição) usa `comprador`** para o mesmo campo (linha 171:
  `membroSelecionado={valores.comprador}`, grava em `atualizarCampo('comprador', ...)`).

Consequência prática: ao abrir uma compra de cartão para editar, o campo "Comprador"
aparece vazio (o item carregado tem `pessoa`, não `comprador`), e se o usuário selecionar
alguém ali, a escolha é salva num campo `comprador` novo e nunca lido por nenhuma tela —
o campo `pessoa` real (usado em `ModalDetalhes.js`, listas, etc.) nunca é atualizado. Ou
seja: hoje não é possível editar quem comprou algo no cartão depois de criado — parece
que funciona (a UI responde normalmente), mas o dado não muda.

Bug pré-existente, não introduzido nesta Discovery — encontrado como efeito colateral de
investigar a unificação pedida. A correção natural dele é a própria unificação abaixo (ao
consolidar tudo em `membroId`/`membroNome`, o nome de campo divergente deixa de existir).

#### 4.3.3 Recomendação: unificar via componente e mecanismo, não via obrigatoriedade de cadastro

Hoje "Comprador" aceita texto livre (digitar qualquer nome, sem precisar cadastrar a
pessoa como Membro antes) — é o que permite anotar uma compra para alguém que não é da
família (seu próprio exemplo do amigo). Se a unificação **exigir** selecionar um Membro
já cadastrado, essa flexibilidade se perde.

Recomendo unificar o mecanismo de referência (sempre gravar `membroId` + `membroNome`,
mesmo padrão de `categoriaId`/`categoriaNome`), sem obrigar que a pessoa já exista como
Membro:
- Membro já cadastrado selecionado (incluindo o próprio dono, agora que ele é um Membro
  — seção 2): grava `membroId` (referência estável) + `membroNome`.
- Nome livre digitado, sem correspondência: grava só `membroNome` (igual a hoje), com
  `membroId: null` — sem forçar cadastro prévio.

Isso resolve a unificação pedida (evitar um terceiro modelo de identidade) sem remover a
flexibilidade que o campo já tem hoje, e sem exigir migração dos dados existentes. Um
`membroNome` sem `membroId` continua totalmente utilizável para exibição — só não
participa de agregação/rateio futuro (Cenário B, seção 4.2) até ser de fato vinculado a
um Membro ou conta real, o que é esperado.

**Resumo da decisão:**
1. "Comprador" (cartão) e "Membro" (entrada) passam a ser o mesmo componente e o mesmo
   par de campos (`membroId`/`membroNome`) — um único modelo, corrigindo de quebra o bug
   da seção 4.3.2.
2. "Pessoa/Instituição" (empréstimo) **não** é unificada — é renomeada internamente para
   `credor` (mesma UI, mesmo comportamento de texto livre), só para parar de coincidir de
   nome com um conceito diferente.
3. Nenhum dos dois exige que a "pessoa" já esteja cadastrada como Membro — texto livre
   continua possível, só ganha uma referência opcional quando corresponder a um Membro
   real.

## 5. Avatar — alternativas comparadas

### 5.1 Quadro comparativo

| Critério | Foto enviada pelo usuário | Avatar gerado por IA (a partir de foto) | Avatar vetorial personalizável (seed/estilo) | Iniciais + cor |
|---|---|---|---|---|
| **Facilidade de implementação** | Média-alta — precisa de `expo-image-picker`/`expo-camera` (deps novas), compressão (`expo-image-manipulator`, dep nova), upload | Alta — tudo da coluna anterior **mais** integração com um serviço de IA externo, tratamento de falha/latência, moderação de conteúdo | Baixa-média — gerar/renderizar em cima de `react-native-svg` (já é dependência); guardar só uma seed/config string | Muito baixa — função pura (hash do nome → cor), nenhuma dependência nova |
| **Manutenção futura** | Média — gerenciar versões/tamanhos de imagem, remoção ao excluir conta/membro | Alta — depende de disponibilidade/preço/política de uso de um serviço externo | Baixa — código local, sem dependência de terceiro em tempo de execução | Muito baixa |
| **Uso de Storage** | Real — precisa habilitar Firebase Storage (não existe hoje em nenhum dos 4 ambientes) + regras de Storage | Igual ou maior que a coluna anterior | Nenhum — cabe numa string curta no próprio documento Firestore já existente | Nenhum |
| **Sincronização entre dispositivos** | Precisa baixar a imagem em cada aparelho (cache, ex. `expo-image`) | Igual | Trivial — a seed já sincroniza via Firestore normal, renderiza local sem baixar nada | Trivial (já é só texto/cor) |
| **Performance** | Depende do tamanho da imagem/rede | Igual + latência de geração (segundos) | Renderização local instantânea, sem rede | Renderização local instantânea |
| **Experiência do usuário** | Mais "pessoal" | Potencialmente o mais "bonito", mas com risco de resultado inconsistente | Boa — visual consistente, bom para diferenciar membros numa lista | A mais genérica |
| **Privacidade** | Sobe uma foto real (inclusive crianças) para a nuvem | Pior — foto enviada a um serviço de terceiro | Nenhum dado sensível | Nenhum dado sensível |
| **Escalabilidade (custo)** | Custo de Storage cresce com nº de usuários × 4 ambientes | Custo de Storage **mais** custo por geração de IA | Custo desprezível | Custo zero |
| **Exige backend próprio novo** | Não | **Sim, provavelmente** — chamar uma API de IA com chave secreta a partir do cliente expõe a chave (`ARQUITETURA.md`: "toda regra de negócio roda no cliente"); geração de IA normalmente precisa de Cloud Function/servidor | Não | Não |

### 5.2 Avaliação

Dado o estado atual do projeto (sem Storage, sem backend, foco em publicar o MVP com
simplicidade): **avatar vetorial personalizável é a opção com melhor relação
custo/qualidade/manutenção**, confirmando sua percepção inicial. "IA a partir de foto"
não é recomendado nesta fase — exigiria o primeiro backend próprio do projeto e envolve
enviar fotos de familiares (possivelmente crianças) a terceiros.

### 5.3 Vetorial: decisão final — DiceBear (`avataaars`), não desenvolvimento próprio

> **Motor atual: DiceBear** (`@dicebear/core` + `@dicebear/styles`, estilo `avataaars`).
> Registrado aqui para referência rápida futura — o campo `motor` no objeto persistido
> (seção 5.3, adiante) é o que permite trocar isso sem redesenhar a estrutura de dados,
> caso o projeto evolua para outro motor de geração no futuro.

Avaliado na implementação do incremento 2, com pesquisa e validação empírica (não só
documentação): **`@dicebear/core` + `@dicebear/styles`** (estilo `avataaars`, o mais
próximo do visual Memoji/Google Illustrations pedido — rosto, cabelo, barba, olhos, roupa,
cores). MIT (código), estilo `avataaars` livre para uso pessoal/comercial. Integração
oficial com `react-native-svg` (`SvgXml`), já dependência do projeto — sem lib nativa
nova, sem prebuild.

**Validado por teste direto (Node, fora do Metro) antes de integrar:**
- `.toJSON()` retorna `{ svg, options }` — `options` traz os atributos já resolvidos
  (cabelo, roupa, cores...), não só o seed.
- Persistir esses atributos (removendo os campos de transform computados por componente —
  `*Rotate`/`*TranslateX`/`*TranslateY`/`*Scale`, que a lib não aceita de volta como
  entrada — e o próprio `seed`) e regenerar só com eles produz o **SVG idêntico** ao
  original (confirmado com 3 seeds diferentes; a única diferença sem esse filtro eram ids
  internos de `<defs>`, cosméticos, sem efeito visual).
- Fundo transparente por padrão (sem elemento de background no SVG quando nenhuma cor de
  fundo é escolhida) — sem configuração extra.
- ~475 bytes por avatar persistido — desprezível para o Firestore.

**Arquitetura de desacoplamento** (a pedido do usuário): o objeto ganhou um campo
**`motor`** (`"dicebear"` hoje), separado de `tipo`/`versao`/`dados` — trocar o mecanismo
de geração no futuro é uma decisão isolada, sem migrar o formato do documento. Toda a
lógica de geração/renderização do DiceBear fica em `src/utils/avatar.js`
(`gerarAvatarPadrao`, `renderizarAvatarSvg`) — `src/components/Avatar.js` (com variantes
`mini`/`circle`/`profile`) nunca importa `@dicebear/*` diretamente, só consome essas duas
funções. Formato final:

```js
// membro.avatar / profile.avatarUrl
{
  tipo: "vetorial",
  motor: "dicebear",
  versao: 1,
  dados: {
    estilo: "avataaars",
    opcoes: { /* atributos resolvidos: cabelo, roupa, cores... — sem seed */ },
  },
}
```

Subconjunto implementado nesta sprint: geração automática na criação (seed =
`membroId`/`uid`), sem tela de personalização — exatamente como definido na seção 5.4.
Um editor futuro só precisa alterar campos dentro de `dados.opcoes` e regravar; nenhuma
migração de formato é necessária.

### 5.7 Editor de avatar (implementado ao final da sprint, decisão revista)

Decisão revista em relação à seção 5.4: em vez de uma tela de "escolher entre alguns
prontos", foi construída a base de um editor simples, aproveitando que o formato do
objeto já foi desenhado para isso desde o início.

**Separação editor/renderer**: `AvatarRenderer.js` (renomeado de `Avatar.js`) continua
só desenhando o que está persistido; `AvatarEditor.js` é o novo componente que altera
o objeto — nenhum dos dois importa `@dicebear/*` diretamente. Toda a lógica
motor-específica (nomes de campo do DiceBear, paletas, mecanismo de "sem barba" via
`facialHairProbability`) fica em `utils/avatar.js`, atrás de um catálogo genérico
(`listarCategoriasEditaveis`/`aplicarEdicaoAvatar`) — o editor só conhece
`{chave, label, tipo, opcoes, valorSelecionado}`, nunca um nome de campo do DiceBear.
Adicionar uma categoria nova (ou um estilo novo) é um item de array no catálogo, não uma
mudança de estrutura.

**Categorias desta primeira versão**: tom de pele, cabelo, barba, roupa, cor da roupa,
cor de fundo (paleta própria de 5 cores + transparente — o `core` do DiceBear não define
uma paleta de fundo pronta para `avataaars`). Botões: "Gerar aleatório" (seed
descartável, nunca persistido), "Restaurar avatar padrão" (regera com o seed permanente
— sempre reproduz o mesmo resultado, por ser determinístico) e "Salvar".

**Onde entra**: tocar no próprio avatar (`ContaScreen.js`) ou no avatar de qualquer
Membro (`GerenciarMembrosModal.js`, `MembrosScreen.js`) abre o editor. Edição do
proprietário sempre passa por `atualizarPerfil` (sincroniza automaticamente para o
mesmo documento de Membro — mesmo mecanismo já usado para o nome, seção 2.4); os demais
membros gravam direto via `atualizarMembro`.

**Validação feita por teste direto (Node), não só leitura da documentação**: confirmado
que `facialHairProbability: 0`/`100` controla a presença da barba de forma
determinística; que remover uma categoria (`sem_barba`) precisa excluir a chave do
objeto, não gravar `undefined` (o Firestore rejeita `undefined`); e que alternar cor de
fundo entre uma cor real e "transparente" de fato adiciona/remove o retângulo de fundo
no SVG.

**Ajuste relacionado**: corrigido o posicionamento dos avatares no gráfico de rosca de
`SecaoEntradas.js` — o overlay de avatares precisa ter o mesmo tamanho/origem do `<Svg>`
(em vez de depender do `alignItems`/`justifyContent` do wrapper), para o centro do
avatar coincidir com o ângulo central da fatia, em qualquer tamanho.

### 5.8 Avaliação de troca de estilo DiceBear (decisão: manter `avataaars`) e evolução do editor

Antes de expandir mais o editor, avaliamos formalmente se outro estilo do catálogo
DiceBear resolveria melhor as limitações reais encontradas (pouca variedade de roupa,
sem roupas femininas, cabelo e cobertura de cabeça no mesmo campo). Levantamento direto
do schema de 14 estilos "de personagem" (não só comparação visual): nenhum estilo mais
rico que `avataaars` em cabelo/rosto (`lorelei`, `big-ears`, `adventurer`) tem qualquer
componente de roupa — essas frustrações são limites do catálogo DiceBear como um todo
nesta versão, não algo específico do `avataaars`. **Decisão: manter `avataaars`** — é o
estilo com a melhor combinação de variedade de forma (103 variantes) e cor (71 tons)
entre as opções com sistema de roupa real, e trocar exigiria revalidar do zero todas as
idiossincrasias de schema já testadas aqui (equivalente ao trabalho já feito, não uma
troca de configuração).

**Editor evoluído dentro do `avataaars`** (categorias novas, todas seguindo o mesmo
padrão do catálogo — nenhuma exigiu mudar `AvatarRenderer.js`, o formato persistido, ou
adicionar condicional de estilo em componente algum):
- **Expressão** (nova seção): olhos, sobrancelhas e boca — 3 categorias `tipo: "variante"`
  independentes (o DiceBear não tem um campo único de "expressão").
- **Cor do cabelo** e **cor da barba** — mesmo padrão de "cor da roupa", usando as
  paletas (`colors.hair`, `colors.facialHair`) que o próprio estilo já define.
- **Acessórios/Óculos** (nova seção) — mesmo mecanismo de "sem barba"
  (`accessoriesProbability: 0/100` + `accessoriesVariant`), com cor própria
  (`colors.accessories`).
- **Paletas expandidas de pele e cor de roupa** — confirmado por teste direto que o
  DiceBear aceita qualquer hex livre nesses campos, não só os valores "oficiais" do
  estilo; paletas próprias substituíram as originais (mais tons de pele, mais cores de
  roupa).

**Reorganização da UX**: editor passou de uma lista vertical única (todas as categorias
sempre visíveis) para abas por seção (Pele, Cabelo, Barba, Roupa, Expressão, Acessórios,
Fundo) — só a seção ativa renderiza suas prévias, o que também reduz a quantidade de
avatares em miniatura desenhados de uma vez (antes, todas as ~62 opções de todas as
categorias renderizavam simultaneamente; agora, só as da aba aberta). Seções vêm de
`listarSecoesEditaveis(avatar)` — metadado genérico (`chave`/`label`/`ícone`/`descricao`),
nenhum componente decide "isso é avataaars" para montar a interface.

**Transparência sobre a limitação de cabelo/cobertura**: em vez de fingir que são
categorias independentes, a seção "Cabelo" ganhou uma `descricao` (dado, não código)
explicando que penteados e coberturas de cabeça compartilham o mesmo campo no
`avataaars`.

### 5.4 Seed automática vs. tela de personalização

Proponho começar pela seed automática (sem tela de escolha) — cobre 100% dos casos sem
UI nova. Tela de personalização fica como incremento posterior, se fizer sentido.

### 5.5 "Importar avatar de outro membro" (Modo Família)

Com seed, isso vira trivial (copiar a string de configuração).

### 5.6 Nome dos campos

`profile.avatarUrl`/`membro.avatar` pressupõem URL de imagem. Adotando vetorial, proponho
reaproveitar os mesmos campos (continuam string, só muda o que representam).

## 6. Impacto em funcionalidades futuras

| Funcionalidade | Como esta arquitetura ajuda |
|---|---|
| **Modo Família** (Fase 2) | Membro-espelho + `uid` nullable + tenant como arquitetura oficial (seção 3.3) é a base que faltava |
| **Rateio de despesas / reembolso** (`ROADMAP.md`, Fase 2) | `membroId` estável é a mesma chave que `categoriaId` provou ser necessária para agregação confiável |
| **Relatórios/Dashboard** | Agregação por `membroId` vira query direta, mesma lógica de `categoriaId` |
| **Modo Empresa** (Fase 4) | Mesmo conceito de identidade se estende para colaboradores, em cima do mesmo tenant |
| **Premium** (Fase 5) | Contar `membros` já é query pronta para tiers futuros |

## 7. Riscos técnicos consolidados

| Item | Risco |
|---|---|
| Sincronizar nome do membro-espelho com `profile.apelido` | 🟢 Baixo |
| Autocura do membro-espelho para contas já existentes | 🟢 Baixo — mesmo padrão já usado 2x no projeto |
| Unificar `pessoa`/`comprador` em `membroId`, mantendo texto livre (seção 4.3.3) | 🟢 Baixo — não muda comportamento visível, já preserva a flexibilidade atual |
| Renomear campo interno `pessoa`→`credor` em empréstimos | 🟢 Baixo — só o nome do campo interno muda, rótulo/UX iguais |
| Modelo de "família compartilhada" | 🟢 Resolvido nesta Discovery — Arquitetura A (`tenants`) é a oficial (seção 3.3); risco de nascer alinhado ao modelo errado eliminado |
| Ausência de `firestore.rules` | 🔴 Alto, mas não é bloqueio desta sprint — é bloqueio para **usar** o campo `uid` para qualquer leitura cross-conta depois |
| Cenário B (vincular a qualquer usuário do app) exige repensar "1 Firebase por ambiente" | 🔴 Alto, decisão de produto/infraestrutura, fora do tamanho desta sprint — só não fechar a porta (seção 4.2) |
| Avatar vetorial: sistema próprio vs. biblioteca nova | 🟢 Baixo — decisão adiável para a implementação, não trava o modelo de dado |

## 8. Oportunidades de melhoria de arquitetura (validadas nesta Discovery)

1. **Unificar `membro`/`comprador`** em `membroId` + `membroNome`, mantendo texto livre
   (seção 4.3) — parte do escopo proposto.
2. **Renomear `pessoa`→`credor`** em empréstimos (seção 4.3.1) — parte do escopo
   proposto.
3. **Arquitetura de família compartilhada oficializada como `tenants/{tenantId}`**
   (seção 3.3) — decisão tomada nesta Discovery, registrar em `ARQUITETURA.md`/
   `ROADMAP.md`.
4. **Remover o código morto da Arquitetura B** (`membroSelecionado`/`modoFamiliaAtivo`
   em `useModelos.js`, resolução de `usuarioDestino` em `ModalHistoricoParcelas.js`) —
   recomendado como parte do escopo, não mais opcional, dado que a decisão do item 3
   torna esse código a implementação de uma arquitetura descartada (seção 3.4).

## 9. Fora do escopo desta sprint

- Fluxo de convite/vínculo de fato (Marina aceitando ser vinculada) — Fase 2 (Modo
  Família), depende de `firestore.rules`.
- Qualquer leitura cross-`uid` (mesmo como prévia) — mesmo motivo.
- Cenário B completo (vincular lançamento a um usuário qualquer do app, não só da
  família) — depende de decisão de infraestrutura (1 Firebase por ambiente vs.
  compartilhado).
- Rateio/divisão de despesas em si (cálculo de "quem deve quanto") — Fase 2.
- `firestore.rules` em si — bloqueador geral do projeto (Fase 0), não específico desta
  sprint, mas citado repetidamente aqui porque várias decisões desta sprint dependem
  dele para irem além do modelo de dado.
- Tela de personalização de avatar (escolher estilo/cor manualmente) — incremento
  posterior à seed automática (seção 5.4).
- Metas Financeiras — Sprint 6 (confirmado).

## 10. Escopo definitivo da Sprint 5 (confirmado em 2026-07-29)

Todas as perguntas em aberto foram respondidas ao longo desta Discovery (seções 3.2/3.3 e
4.3) e o escopo abaixo foi aprovado integralmente.

### 10.1 Identidade unificada

1. Membro-espelho do dono da conta, criado atomicamente no `register()` e por autocura no
   login para contas existentes (seção 2.3).
2. Campos novos no documento de Membro: `ehProprietario`, `uid` (nullable) — sem migração
   em massa (seção 2.2).
3. Nome do membro-espelho sempre espelha `profile.apelido`/`getNomeExibicao` (seção 2.4).
4. Proteção contra excluir o membro-espelho (seção 2.5).

### 10.2 Referência estável em lançamentos

5. Unificar "Comprador" (cartão) com "Membro" (entrada) em `membroId` + `membroNome`,
   mantendo a possibilidade de texto livre sem `membroId` (seção 4.3.3) — corrige de
   quebra o bug `pessoa`/`comprador` da seção 4.3.2.
6. Renomear o campo interno `pessoa` de empréstimos para `credor` (mesma UI/rótulo
   "Pessoa/Instituição") — seção 4.3.1.

### 10.3 Avatar

7. Avatar vetorial gerado por seed determinística (nome/id do membro), sem tela de
   personalização nesta sprint — reaproveitando os campos `avatarUrl`/`avatar` já
   existentes (seção 5.6).
8. Decisão de implementação (sistema próprio com `react-native-svg` vs. biblioteca de
   seed) fica para o momento da implementação desse incremento, não trava o restante do
   escopo.

### 10.4 Arquitetura de Modo Família e documentação

9. Registrar `tenants/{tenantId}` como a arquitetura oficial de família compartilhada
   (seção 3.3) em `ARQUITETURA.md`/`ROADMAP.md`.
10. Remover o código morto da Arquitetura B (`membroSelecionado`, `modoFamiliaAtivo`,
    resolução de `usuarioDestino`) — seção 3.4/8.
11. Atualizar `ROADMAP.md`/`PROJECT_STATUS.md` para refletir "Identidade e Perfis" como
    Sprint 5 e Metas Financeiras como Sprint 6.

## 11. Ordem sugerida dos incrementos

Um incremento por vez, com validação sua antes do próximo — mesmo processo das Sprints 3
e 4:

1. **Membro-espelho do dono da conta** — `useAuth.js` (criação no registro) +
   `useMembros.js`/autocura (contas existentes) + proteção contra exclusão. Sem UI nova
   (o próprio `MembroSelect` já passa a listar o dono, de graça).
2. **Avatar por seed** — campo já reaproveitado (`avatarUrl`/`avatar`), função de geração
   determinística, renderização nas telas que já mostram avatar/ícone de pessoa
   (`ContaScreen.js`, `GerenciarMembrosModal.js`, `MembroSelect.js`).
3. **Unificação `membroId`/`membroNome`** em "Comprador"/"Membro" + correção do bug
   `pessoa`/`comprador` + renomeação `pessoa`→`credor` em empréstimos — toca
   `ModalCriacao.js`, `ModalEdicao.js`, os hooks de dados, mesma superfície que
   `categoriaId` tocou na Sprint 4.
4. **Registrar `tenants/{tenantId}` como arquitetura oficial** de Modo Família em
   `ARQUITETURA.md`/`ROADMAP.md` + remover o código morto da Arquitetura B — pode entrar
   em qualquer ponto da sequência.
5. **Documentação final** — `PROJECT_STATUS.md`/`ARQUITETURA.md`/`ROADMAP.md`, incluindo
   o reenquadramento de Metas Financeiras para Sprint 6.

Discovery encerrada — começo pelo incremento 1 (membro-espelho do dono da conta).

## 12. Regra de identidade e identificadores permanentes (registrado ao encerrar a Discovery)

### 12.1 Regra de identidade principal do sistema

Todo usuário autenticado (`Firebase Auth`) sempre tem, a partir do incremento 1, exatamente
três representações, cada uma com um papel diferente — nenhuma delas substitui a outra:

1. **Usuário autenticado** (`Firebase Auth` + `users/{uid}`): identidade de login e dados
   de conta (email, senha, plano, tipoUsuario, `tenantId`). É a raiz de tudo — todo o
   resto existe "dentro" ou "em nome" dela.
2. **Membro-proprietário** (`users/{uid}/membros/{uid}`, `ehProprietario: true`): a
   representação do usuário autenticado **como Membro**, dentro do próprio espaço de
   Membros. Existe para que o dono da conta possa ser referenciado por `membroId` em
   lançamentos, listado ao lado de outros Membros, e ter avatar — exatamente como
   qualquer outro Membro. **Não é uma segunda conta**, é a mesma pessoa vista pela lente
   de "Membro".
3. **Tenant** (`profile.tenantId`): o espaço de dados onde tudo vive. Hoje, **sempre igual
   ao próprio `uid`** — cada usuário é dono de um tenant de uma pessoa só. Quando o Modo
   Família existir (arquitetura oficial: `tenants/{tenantId}`, seção 3.3), `tenantId` pode
   passar a apontar para um tenant compartilhado por várias contas — sem que o `uid` de
   ninguém mude.

**Um Membro (`membros/{id}`) pode estar em um de três estados ao longo da vida da conta:**

| Estado | `uid` do membro | Quando acontece |
|---|---|---|
| Só local, não vinculado | `null` | Cadastrado manualmente (ex.: um filho pequeno, alguém sem conta própria) |
| Membro-proprietário | = uid do dono da conta onde vive | Criado automaticamente no cadastro/autocura (seção 2) |
| Vinculado a uma conta real de outra pessoa | = uid dessa outra pessoa | Fase 2 (Modo Família) — fora do escopo de implementação desta sprint, só a estrutura é reservada |

**Regra de ouro, para qualquer código futuro que referencie "quem" em um lançamento:**
sempre usar `membroId` (nunca `uid` diretamente). Um Membro pode ser referenciado antes
de ter qualquer conta vinculada (`uid: null`) e continuar sendo o mesmo `membroId` depois
de vinculado — nenhum lançamento precisa ser reescrito quando o vínculo acontece. Mesmo
princípio já validado com `categoriaId` na Sprint 4.

### 12.2 Identificadores permanentes × atributos mutáveis

| | Campo | Pode mudar depois de criado? |
|---|---|---|
| **Identificadores (permanentes)** | `uid` (Firebase Auth) | Não — gerado uma vez, nunca muda |
| | `membroId` (id do doc em `membros/{id}`) | Não — mesmo se o membro for renomeado, arquivado ou depois vinculado a uma conta |
| | `tenantId` | Estável no dia a dia; só muda de valor num evento raro e deliberado (entrar/sair de um tenant compartilhado, Fase 2) — nunca como parte de uma edição de rotina |
| | `membro.uid` (quando vinculado) | Passa de `null` para um valor **uma única vez** (o vínculo); não deve ser reatribuído a um `uid` diferente depois — relink é reconstrução do vínculo, não edição de campo |
| **Atributos (mutáveis)** | `nome`/`apelido` (perfil e membro) | Sim, livremente |
| | `avatar` (seed vetorial) | Sim, livremente |
| | `email` (Firebase Auth) | Sim (fluxo próprio do Firebase Auth) — `uid` não muda junto |
| | `ativo` (membro) | Sim — arquivar/reativar |
| | `ehProprietario` | Fixo na prática (não existe "transferir propriedade" nesta sprint), mas é um atributo descritivo, não uma referência usada por outros documentos — por isso não entra na lista de identificadores |

**Consequência prática desta regra:** qualquer tela/relatório/agregação futura deve
guardar e comparar por `membroId`/`uid`/`tenantId` (estáveis), nunca por `nome` (mutável)
— o mesmo motivo pelo qual `categoriaId` substituiu comparação por texto na Sprint 4.

### 12.3 Diretriz arquitetural: papel do membro sempre por função utilitária, nunca por comparação direta

Registrado durante o incremento 1, a pedido do usuário: nenhum código deve comparar
`membro.ehProprietario` diretamente. `src/utils/membros.js` (`isMembroProprietario`) é a
única fonte dessa decisão — quando papéis futuros existirem (administrador, dependente,
convidado, responsável, etc.), a mudança acontece nesse arquivo, não em cada lugar que
hoje pergunta "este membro é o dono?". Já centralizado nos 2 usos existentes
(`useMembros.js`, `GerenciarMembrosModal.js`) — não era mais "um uso só", então a
abstração já valia a pena no momento em que foi pedida.

## 13. Refinamento de UX pós-Sprint 5 (arquitetura já encerrada — só experiência)

Rodada de ajustes feita depois de a arquitetura de identidade/avatar já estar concluída
e validada. Nenhum item aqui mudou o formato de dado, a persistência, ou o mecanismo de
`membroId`/`membroNome` já decidido na seção 4.3.

**Correção**: o donut de `SecaoEntradas.js` ficou desalinhado horizontalmente depois do
ajuste de posicionamento dos avatares (seção 5.7) — a causa foi dar `width`/`height`
explícitos ao `donutWrapper` (necessário para os avatares baterem com as coordenadas do
`<Svg>`), o que fez o wrapper parar de esticar e se autocentralizar dentro do card
(`card` não define `alignItems`, então antes um filho sem largura própria esticava e se
centralizava por dentro). Corrigido com `alignSelf: "center"` no wrapper — mantém o
tamanho explícito (necessário) e devolve a centralização.

**`MembroSelect.js` simplificado para o caso principal**: a seção fixa "Ou digite um
nome" (sempre visível, mesmo sendo ~10% dos casos) foi removida da lista principal. A
lista agora mostra só os Membros cadastrados + uma opção final "Outra pessoa...", que
abre um modal pequeno só com um campo de nome (e o histórico de "recentes", que
continua existindo, só que dentro desse modal secundário, não na tela principal). O
comportamento de dado é o mesmo de antes: selecionar da lista grava `membroId` real;
"Outra pessoa..." grava `membroId: null` + `membroNome`. O botão "Gerenciar membros"
também saiu de dentro deste seletor — cadastrar/editar/excluir Membro passou a ser
responsabilidade exclusiva do hub "Gerenciar Membros" (menu do usuário), nunca do
seletor usado dentro de um lançamento.

**Edição de Membro unificada**: antes, só o avatar (um alvo pequeno) abria a edição, e
excluir era uma ação separada por ícone na própria linha. Agora, tocar em qualquer parte
da linha (`GerenciarMembrosModal.js`, `MembrosScreen.js`) abre `EditarMembroModal.js`
(novo), que reúne nome, avatar (delegado ao `AvatarEditor.js` já existente, aberto de
dentro deste modal) e exclusão num único fluxo. O proprietário da conta segue as mesmas
regras já estabelecidas: renomear/trocar avatar sempre passa por `atualizarPerfil`
(sincroniza para o membro-espelho automaticamente); excluir continua bloqueado para ele.

### 13.1 Ideia registrada para o futuro (não implementada): promover "Outra pessoa" recorrente a Membro

Quando o mesmo nome digitado em "Outra pessoa..." (ex.: "Carlos") aparecer em vários
lançamentos, o app poderia sugerir "Carlos aparece em vários lançamentos. Deseja
transformá-lo em um membro?". Aceitando, um Membro novo seria criado e todos os
lançamentos que hoje só têm `membroNome: "Carlos"` (sem `membroId`) passariam a
referenciar esse `membroId`, preservando o histórico.

Isso é uma extensão natural do que já existe (não exige mudar o formato de dado — é
literalmente "preencher `membroId` retroativamente em documentos que já têm
`membroNome`"), mas envolve decisões de produto não triviais: como detectar "o mesmo
Carlos" com segurança (nome exato? em qual escopo de tempo?), o que fazer se houver dois
"Carlos" diferentes, e se a sugestão aparece automaticamente ou só quando o usuário abrir
"Gerenciar Membros". Registrado aqui para uma sprint futura, não para agora.
