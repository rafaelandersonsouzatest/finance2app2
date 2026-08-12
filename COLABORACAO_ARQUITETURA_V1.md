# Proposta de Arquitetura — Colaboração entre Usuários (V1 mínima)

> Registrado em 2026-08-10. Este documento transforma as decisões e hipóteses já registradas em
> `COLABORACAO_DISCOVERY.md` e `DISCOVERY_COLABORACAO_VS_FAMILIA.md` numa proposta concreta,
> pronta para revisão antes de qualquer implementação. **Nenhum código foi alterado, nenhuma
> coleção foi criada.** Classificação usada em cada decisão: ✅ DECISÃO (já confirmada em
> conversas anteriores, mantida aqui), 🟢 PROPOSTA (nova, decidida nesta rodada para fechar a
> V1, mas ainda depende da sua aprovação), 🟡 ALTERNATIVA (mais de um caminho possível,
> apresento a recomendação e o porquê), 🔵 FORA DO ESCOPO (adiado explicitamente para uma
> versão futura).
>
> **Atualização (2026-08-12)** — última rodada de revisão antes da Etapa 1, ainda sem nenhuma
> implementação: (1) seção 5 mudou — a cota do criador passa a ser gravada dentro da própria
> `criarDivisaoDespesa`, atomicamente com o evento e os convites, em vez de um `writeBatch`
> client-side separado (elimina um risco real de inconsistência parcial); (2) seção 6.1 (nova)
> — decisão explícita de que um gasto origina no máximo uma `despesaCompartilhada` na V1; (3)
> seção 1 ganhou proteção mínima contra spam/abuso de solicitação de conexão; (4) seção 16.1
> (nova) — requisitos reais de Blaze/custos/Emulator/deploy, verificados antes da Etapa 1.

## 0. Princípios que orientam toda decisão abaixo (✅ já decididos)

- Cada usuário mantém sua própria conta e seus próprios dados — nenhuma "conta financeira
  compartilhada" nesse modelo (isso é o Espaço Compartilhado, um modelo diferente).
- Depois do aceite, cada participante é dono pleno da própria cópia — sem sincronização
  automática de volta.
- Não é rede social: sem feed, ranking, exposição financeira, comparação de patrimônio.
- Conexão exige autorização prévia mútua — nunca um envio direto para um `uid` desconhecido.

## 1. Fluxo de adicionar/conectar usuários

**Mecanismo de identificação (🟡 alternativa, recomendação para V1)**: código único gerado
pelo app, curto (ex. 8 caracteres alfanuméricos), somado a compartilhamento por link/deep link
que carrega o mesmo código. Alternativas descartadas para V1, não para sempre: QR Code (exige
câmera, complexidade de UI maior para o ganho — bom candidato a V1.1, é só uma representação
visual do mesmo código); busca por e-mail/telefone (descartado por decisão de privacidade já
registrada em `COLABORACAO_DISCOVERY.md` seção 13).

**Modelo de dados necessário**:
```
users/{uid}
  .codigoConexao: string          // novo campo, gerado uma vez (ver seção 3)

codigosConexao/{codigo}           // nova coleção top-level
  { uid: string }
```
`codigosConexao` existe só para permitir "dado um código conhecido, qual é o uid do dono" sem
precisar de permissão de leitura sobre o perfil de ninguém — mesmo padrão já usado por
`documentosCadastrados` (`get` permitido, `list` nunca).

**Fluxo**:
1. A abre a tela "Conexões" (nova) e vê o próprio código, com um botão "Compartilhar".
2. A digita o código que B compartilhou com ele (por fora do app — WhatsApp, verbalmente).
3. App lê `codigosConexao/{codigo}` (leitura simples, sem Function) → obtém o `uid` de B.
4. App chama a Cloud Function `solicitarConexao({ uidDestino })` — **precisa ser Function**,
   porque grava um documento na árvore de B, que A não tem permissão de escrever (ver seção 12).
5. B vê a solicitação pendente ao abrir "Conexões" e escolhe aceitar ou recusar.
6. Aceitar/recusar chama `responderConexao({ conexaoId, aceitar })` — Function, atualiza os
   dois lados (A e B) numa escrita atômica.

**Modelo de dados da conexão** (espelho, um documento por lado — mesmo `conexaoId`):
```
users/{uid}/conexoes/{conexaoId}
{
  usuarioConectadoId: string,
  nomeExibicao: string,       // snapshot, não referência viva
  avatarSnapshot: object | null,
  papel: 'solicitante' | 'destinatario',
  status: 'pendente' | 'aceita' | 'recusada',
  criadoEm, atualizadoEm
}
```

**🟢 Proteção mínima contra spam/abuso (nova, 2026-08-12)** — sem virar um sistema de bloqueio
complexo, três checagens simples dentro da própria `solicitarConexao`:
- **Idempotência**: se já existe uma conexão `pendente` ou `aceita` entre A e B, a Function
  retorna esse estado existente em vez de criar um segundo documento — evita que A consiga
  gerar N solicitações duplicadas para o mesmo B só de repetir a ação.
- **Cooldown pós-recusa**: se a conexão mais recente entre A e B está `recusada`, uma nova
  solicitação de A para o mesmo B só é aceita depois de um intervalo mínimo (proposta: 7 dias,
  comparando `atualizadoEm`) — impede reenvio imediato repetido para quem já recusou uma vez.
  B continua livre para iniciar uma conexão com A a qualquer momento, o cooldown vale só no
  mesmo sentido que já foi recusado.
- **Limite de solicitações pendentes enviadas**: a Function rejeita uma nova solicitação se A
  já tiver um número alto de conexões `pendente` como solicitante (proposta: 20) — protege
  contra um uso indevido de enviar solicitações em massa para muitos destinatários diferentes,
  sem exigir nenhuma tela ou fluxo novo de "bloquear usuário".

Nenhum "bloquear este usuário" explícito entra na V1 — as três checagens acima cobrem o abuso
mais provável (reenvio repetido/em massa) sem introduzir uma lista de bloqueio, tela de
gerenciamento de bloqueios ou qualquer estado novo para o usuário administrar. 🔵 Fora do
escopo da V1: bloqueio explícito de usuário, denúncia/reporte.

## 2. Fluxo de convite e aceite de uma despesa

1. A escolhe uma ou mais conexões **já aceitas** e define a cota de cada uma.
2. App chama `criarDivisaoDespesa({ descricao, valorTotal, cotas, origemLancamentoId? })` —
   Function valida que cada participante é, de fato, uma conexão aceita de A (nunca confia
   apenas no que o cliente afirma) e, se `origemLancamentoId` foi informado, valida que aquele
   gasto ainda não tem `compartilhamentoId` (ver seção 6.1 — um gasto só origina uma
   `despesaCompartilhada` na V1).
3. Numa única escrita atômica (`WriteBatch`/`runTransaction` do Admin SDK), a Function cria
   `users/{A}/despesasCompartilhadas/{eventoId}`, um espelho
   `users/{participante}/convitesDeDivisao/{eventoId}` para cada participante com conta e,
   quando a despesa nasce do zero (sem `origemLancamentoId`), **também** o `gasto` da cota do
   próprio A em `users/{A}/gastos/{id}` — ver seção 5 para o raciocínio de por que essa escrita
   entrou para dentro da Function.
4. Cada convidado vê o convite pendente (proposta de UI na seção 8) e aceita ou recusa
   individualmente — `aceitarConviteDivisao({ eventoId })` / `recusarConviteDivisao({ eventoId })`.
5. Ao aceitar, a Function lê `minhaCota` **do próprio documento do convite** (nunca de um valor
   enviado pelo cliente no momento do aceite) e cria um `gasto` novo na conta de quem aceitou.

## 3. Modelo de dados completo (🟢 proposta)

```
users/{uid}
  .codigoConexao: string

codigosConexao/{codigo}
  { uid }

users/{uid}/conexoes/{conexaoId}
  { usuarioConectadoId, nomeExibicao, avatarSnapshot, papel, status, criadoEm, atualizadoEm }

users/{uid}/despesasCompartilhadas/{eventoId}     // vive só na conta de quem criou
  {
    descricao: string,
    valorTotal: number,
    criadoPor: uid,
    origemLancamentoId: string | null,   // se nasceu de um gasto já existente
    cotas: [
      {
        participanteTipo: 'usuario' | 'membroSemConta',
        participanteId: string,           // uid OU membroId, conforme o tipo
        nomeExibicao: string,
        valor: number,
        status: 'pendente' | 'aceito' | 'recusado' | 'cancelado'
      }
    ],
    criadoEm
  }

users/{uid}/convitesDeDivisao/{eventoId}          // espelho, só para participantes com conta
  {
    eventoId, deUsuarioId, deNome, descricao,
    minhaCota: number,
    status: 'pendente' | 'aceito' | 'recusado' | 'cancelado',
    criadoEm
  }

users/{uid}/gastos/{id}
  .origemCompartilhamento: { eventoId, deUsuarioId } | null    // campo novo, opcional
  .compartilhamentoId: string | null   // no gasto ORIGINAL de quem criou, se ele compartilhou depois
```

Convivência, não migração: os campos novos em `gastos` são opcionais, `undefined`/`null` em
todo lançamento já existente — mesmo princípio usado em `categoriaId`/`membroId`/`cartaoId`.

## 4. Como uma despesa **existente** seria compartilhada

🟢 Proposta: novo botão "Compartilhar" em `ModalDetalhes.js` (caso `gasto`), abrindo o mesmo
seletor de conexões/cotas da seção 2, com `valorTotal` pré-preenchido a partir do gasto e
`origemLancamentoId: gasto.id`. Ao confirmar, além de criar `despesasCompartilhadas` e os
convites, o gasto original ganha `compartilhamentoId` (só para o badge visual — seção 8), sem
mais nenhuma outra mudança nele.

## 5. Como criar uma despesa **já compartilhada** (do zero)

✅ Mantido: **a cota do próprio criador também vira um `gasto` normal na hora**,
automaticamente — sem passo extra. Alternativa descartada: só os convidados recebem
lançamento e A precisaria registrar a própria parte manualmente depois — mais simples de
implementar, mas cria uma inconsistência real (fácil esquecer a própria parte).

🟢 **Revisão (2026-08-12)** — quem grava essa cota mudou. A versão anterior deste documento
propunha um `writeBatch` client-side, separado da chamada à Function, com o argumento de que
"é uma escrita dentro da própria conta de A, não precisa de Function". Isso é verdade
isoladamente, mas cria um risco real: são **duas operações independentes** (a chamada
`criarDivisaoDespesa` e o `writeBatch` do cliente) que podem ter sucesso uma sem a outra — por
exemplo, a Function cria `despesasCompartilhadas` e os convites, mas o app perde conexão antes
do `writeBatch` do próprio gasto rodar (ou o inverso, se a ordem for trocada). O resultado é
uma despesa compartilhada "fantasma" para A (os convidados recebem convite normalmente, mas A
nunca vê a própria parte lançada) ou um gasto solto sem o evento que deveria tê-lo originado.

**Decisão**: a própria `criarDivisaoDespesa` grava o gasto da cota de A, dentro do mesmo
commit atômico que já cria `despesasCompartilhadas` e os convites (seção 2, passo 3). Um
`WriteBatch` do Admin SDK não é limitado a uma única conta — grava documentos em qualquer
caminho, na mesma conta ou em contas diferentes, todos com sucesso ou nenhum. Isso elimina o
cenário de inconsistência por completo: ou a Function inteira funciona (evento + convites +
gasto do criador, todos presentes), ou nada é criado e o app mostra um erro para tentar de
novo — nunca um resultado parcial. Efeito colateral pequeno e aceitável: essa é mais uma
escrita "dentro da própria conta" que passa a acontecer via Function em vez de direto do
cliente — mas o motivo aqui é consistência transacional, não uma questão de segurança/regra
cruzada (diferente do resto da seção 12), então não amplia o raciocínio de "blast radius" das
Rules.

## 6. Despesa dividida entre 3+ usuários

Nenhuma mudança estrutural — `cotas[]` já é uma lista, não um par fixo. Cada participante tem
seu próprio convite espelho e aceita/recusa de forma independente; o array em
`despesasCompartilhadas` acumula o status de cada um. Já era a expectativa registrada em
`COLABORACAO_DISCOVERY.md` seção 6 ("viagem... mesma primitiva, N cotas").

## 6.1 Um gasto pode ser compartilhado mais de uma vez? (🟢 decisão, 2026-08-12)

**Decisão para a V1: não.** Um gasto (existente ou recém-criado) origina no máximo **uma**
`despesaCompartilhada`. Quem precisa dividir o mesmo gasto entre mais gente simplesmente
coloca todos os participantes na mesma divisão (seção 6 já cobre N cotas sem mudança de
modelo) — não existe caso de uso da V1 que exija duas divisões separadas para o mesmo gasto.

Isso já estava implícito no modelo de dados (`gastos.compartilhamentoId` é um campo único, não
uma lista — seção 3), mas não estava explícito como regra nem validado em nenhum lugar. Fica
assim, explícito:
- `criarDivisaoDespesa`, quando chamada com `origemLancamentoId`, **rejeita** a chamada se o
  gasto referenciado já tiver `compartilhamentoId` preenchido.
- Na UI, o botão "Compartilhar" em `ModalDetalhes.js` (seção 4) some ou vira algo como "Ver
  compartilhamento" assim que o gasto já tiver sido compartilhado — evita que o usuário tente
  e só descubra o bloqueio depois de preencher cotas.

🔵 Fora do escopo da V1 (candidato a versão futura, não descartado): múltiplos
compartilhamentos independentes a partir do mesmo gasto (ex.: dividir metade com um grupo e
outra parte com outro grupo). Não surgiu nenhum caso de uso concreto para isso ainda — só
entra se aparecer demanda real.

## 7. Participante sem conta

✅ Direção já registrada em `COLABORACAO_DISCOVERY.md` seção 12, agora concreta: reaproveitar
`useMembros.js`. Um Membro ganha um campo novo `usuarioVinculadoId: string | null`. Na cota,
`participanteTipo: 'membroSemConta'`, `participanteId: membroId` — **nenhum convite espelho é
criado** (não existe "outra conta" para escrever) — a cota fica só como registro informativo
("Fulano deve R$30") dentro de `despesasCompartilhadas`, sem nenhuma ação pendente. 🔵 Fora do
escopo da V1: convite formal para essa pessoa criar conta com resgate automático da cota
pendente (a ideia já registrada de "convidar para usar o app") — v1 só registra o Membro, sem
esse fluxo de vinculação futura.

## 8. Como aparece visualmente

Reaproveitando padrões já existentes, não inventando um novo:
- **Lista de gastos**: um ícone pequeno (ex. `account-group`) no card quando
  `origemCompartilhamento` ou `compartilhamentoId` existir — mesmo espaço visual onde hoje já
  aparece o ícone de categoria.
- **`ModalDetalhes.js`**: nova seção "Compartilhado" (mesmo componente `InfoRow` já usado em
  todo o modal) — para quem recebeu, mostra avatar+nome de quem enviou; para quem criou, lista
  cada participante com o status da cota (pendente/aceito/recusado), cores já estabelecidas
  (`colors.pending`/`colors.balance`).
- **Convites pendentes**: 🟡 alternativa — proponho reaproveitar a **Central de Avisos**
  já existente (`ARQUITETURA.md` seção 12) em vez de criar uma tela nova; é literalmente o
  lugar "o que precisa da sua atenção" que já existe. Alternativa seria uma aba própria dentro
  da tela de Conexões — mais isolado, mas duplica o conceito de "central de pendências".
- **Linha do Tempo**: reaproveita a infraestrutura já construída (`registrarEvento`,
  `LinhaDoTempoEventos.js`) — novas `acao`: `'compartilhado'`, `'convite_aceito'`,
  `'convite_recusado'`.
- 🔵 Fora do escopo da V1: filtro "Compartilhados" na lista de gastos.

## 9. Editar, excluir ou alterar depois de compartilhar

- **Editar o gasto original de A** (categoria, descrição): não afeta nada além da própria
  conta — vira um gasto comum com um campo de proveniência, dali em diante.
- **Editar `despesasCompartilhadas` (valor/cotas) antes de qualquer aceite**: permitido — os
  convites ainda pendentes são atualizados junto (`atualizarDivisaoDespesa`, Function).
- 🟢 Proposta de trava simples para V1: **assim que qualquer participante aceitar, a despesa
  compartilhada fica travada para edição de valor/cotas** — só é possível cancelar os convites
  ainda pendentes dos demais, nunca alterar quem já aceitou. Simples de implementar e de
  explicar ao usuário; alternativa (permitir edição parcial com re-notificação de quem já
  aceitou) é bem mais complexa e não parece necessária para uma V1.
- **Excluir a despesa compartilhada**: cancela convites pendentes; cópias já aceitas
  permanecem intocadas nas contas de quem aceitou (são propriedade delas agora).

## 10. Convite recusado ou cancelado

- **Recusado** (pelo convidado): `recusarConviteDivisao` marca `'recusado'` nos dois lados;
  nenhum gasto é criado; A vê o status refletido em `despesasCompartilhadas.cotas[]`.
- **Cancelado** (por A, antes do aceite): `cancelarConviteDivisao` marca `'cancelado'` no
  convite do lado do destinatário; depois de aceito, não é mais cancelável (seção 9).

## 11. Como a regra "cada um dono da própria cópia" é preservada

Nenhuma escrita futura em `despesasCompartilhadas` tem qualquer mecanismo de propagação para o
`gasto` já criado na conta de quem aceitou — a relação depois do aceite é só histórica
(`origemCompartilhamento`), nunca uma referência viva. Isso não é uma limitação técnica, é a
decisão de design mais importante de toda a proposta (já registrada desde a ideia original).

## 12. Rules vs. Cloud Functions — aplicando o resultado do spike

Confirmado no spike técnico (`COLABORACAO_DISCOVERY.md` seção 16.1): **tecnicamente daria para
fazer tudo só com Rules**, mas a recomendação continua sendo isolar a escrita entre contas em
Cloud Functions, para não misturar exceções no arquivo de regras que protege todo o dinheiro
do app.

**Só Firestore Rules resolvem** (sem Function):
- Ler as próprias conexões/convites/despesas compartilhadas.
- Editar/excluir um gasto próprio (já existente, sem mudança).
- Excluir uma conexão da própria lista.

🟢 **Revisão (2026-08-12)**: "criar a cota do próprio criador como gasto normal" saiu desta
lista — passou a acontecer dentro da própria `criarDivisaoDespesa` (seção 5), não mais como
escrita solta do cliente, para garantir que o gasto do criador e o evento compartilhado nascem
juntos ou não nascem, nunca um sem o outro.

**Precisam de Cloud Function** (toda escrita que cruza de uma conta para outra):
`solicitarConexao`, `responderConexao`, `criarDivisaoDespesa`, `atualizarDivisaoDespesa`,
`aceitarConviteDivisao`, `recusarConviteDivisao`, `cancelarConviteDivisao` — sete funções
pequenas, todas seguindo o mesmo formato (validar quem chama, validar o destinatário, escrever
nas duas árvores atomicamente via Admin SDK).

## 13. Offline e sincronização (aplicando a análise já feita)

Como nunca existe um documento compartilhado sendo escrito por dois lados (cada um só escreve
na própria árvore), **não há risco de colisão de escrita concorrente** — isso já era o ponto a
favor deste modelo levantado em `COLABORACAO_DISCOVERY.md` seção 17, cenário C. A parte que
**não** é offline-first por natureza: chamadas a Cloud Functions (`httpsCallable`) exigem
conexão no momento da chamada — diferente de uma escrita Firestore comum, que enfileira
offline automaticamente. 🔵 Fora do escopo da V1: fila de retry manual para chamadas de
Function feitas offline — V1 só trata isso com uma mensagem de erro clara ("sem conexão,
tente novamente").

⚠️ **Trade-off explícito introduzido pela revisão da seção 5 (2026-08-12)**: antes, a ideia de
gravar a cota do criador como uma escrita Firestore comum (fora da Function) preservava esse
lançamento específico funcionando offline, mesmo que o convite aos demais participantes
dependesse de rede. Ao mover essa escrita para dentro de `criarDivisaoDespesa`, criar uma
despesa compartilhada **do zero** passa a exigir conexão no momento da criação — inclusive
para a própria cota do criador, que antes seria só um gasto comum. Isso é uma escolha
consciente (consistência > disponibilidade offline nesse fluxo específico, ver seção 5), não
um efeito colateral esquecido. Não afeta um gasto comum criado sem compartilhamento nenhum,
nem a seção 4 (compartilhar um gasto **já existente**) além do próprio ato de compartilhar em
si — o gasto original já estava salvo antes.

## 14. Reaproveitamento futuro por Espaços Compartilhados

- O padrão "documento espelho em cada conta" (conexão, convite) é a mesma técnica que serviria
  para "A convida B para entrar no Espaço Compartilhado Família X" — só muda o que acontece no
  aceite (migrar/copiar para o tenant em vez de criar uma cópia independente).
- `codigoConexao`/`codigosConexao` é diretamente reaproveitável como mecanismo de "adicionar
  alguém a um Espaço Compartilhado".
- A infraestrutura de Cloud Functions, uma vez existente (deploy, monitoramento, padrão de
  validação), reduz o custo de tudo que o Modo Família for precisar depois.

## 15. O que reaproveitamos do código atual

`useMembros.js` (participante sem conta), avatar/membro-espelho (exibir quem é quem),
`registrarEvento`/`LinhaDoTempoEventos.js`/`buscarEventosDoItem` (histórico do
compartilhamento), `InfoRow`/padrão de `ModalDetalhes.js` (nova seção "Compartilhado"),
`AlertaModal` (confirmações), Central de Avisos (convites pendentes), `getBasePath` (nada muda
aqui — tudo continua em `users/{uid}`).

## 16. O que precisamos criar

- Coleção nova top-level: `codigosConexao`.
- Subcoleções novas: `conexoes`, `despesasCompartilhadas`, `convitesDeDivisao`.
- Campos novos: `users/{uid}.codigoConexao`; Membro `.usuarioVinculadoId`; `gastos`
  `.origemCompartilhamento`/`.compartilhamentoId`.
- **Primeira infraestrutura de backend do projeto**: 7 Cloud Functions (seção 12).
- Telas novas: "Conexões" (listar, adicionar, aceitar/recusar solicitação); seletor de
  compartilhamento (conexões + cotas), reaproveitável tanto para "despesa nova" quanto
  "compartilhar existente".
- Hooks novos: `useConexoes.js`, `useDivisaoDespesas.js` — mesmo padrão dos hooks já existentes.
- `firestore.rules`: entradas novas para as 4 coleções/subcoleções acima (a maior parte
  simples — a Function, com Admin SDK, não passa pelas Rules).

## 16.1 Requisitos reais de infraestrutura para Cloud Functions (verificado em 2026-08-12)

Levantamento feito antes da Etapa 1, como pedido — **nada foi alterado em nenhum projeto
Firebase**, isto é só o mapeamento do que a Etapa 1 vai efetivamente exigir.

**Plano Blaze é obrigatório.** Cloud Functions (1ª e 2ª geração) só roda em projetos no plano
pago "Blaze" — o plano gratuito "Spark" não habilita Functions. Isso exige anexar uma forma de
pagamento (cartão) a uma conta de faturamento do Google Cloud. Como o projeto tem **4 Firebase
projects separados** (`meu-app`/`rafael`/`marina`/`christian` — um por `APP_ENV`, ver
`CLAUDE.md`), o Blaze precisa ser habilitado **em cada um dos 4 projetos** antes de dar deploy
neles — não é uma configuração única que vale para todos. A mesma conta de faturamento (mesmo
cartão) pode ser vinculada aos 4 projetos, então não são necessariamente 4 cadastros de
pagamento diferentes, mas são 4 ativações manuais no Console do Firebase/Google Cloud.

**Custo esperado, na prática**: pelo volume de uso deste app (uso pessoal/familiar, poucos
usuários), a expectativa é ficar dentro da cota gratuita do próprio Blaze, que **continua
existindo** mesmo fora do Spark: 2 milhões de invocações/mês, 400.000 GB-segundos e 200.000
CPU-segundos de graça, por projeto, todo mês; acima disso, ~US$0,40 por milhão de invocações.
Com 4 projetos, isso equivale a até 8 milhões de invocações gratuitas combinadas. Cloud
Functions de 2ª geração também usa Cloud Build e Artifact Registry no deploy (para montar e
guardar a imagem da função) — ambos têm cota gratuita própria e tendem a ficar dentro dela
neste volume, mas valem monitoramento (imagens antigas em Artifact Registry acumulam e podem
gerar uma cobrança pequena de armazenamento se nunca forem limpas). ⚠️ Blaze não tem um teto de
gasto automático — recomendação de segurança simples, sem nenhuma complexidade extra:
configurar um alerta de orçamento (Cloud Billing Budget) de valor baixo (ex.: US$1) em cada um
dos 4 projetos assim que o Blaze for habilitado, só como rede de segurança contra uso
inesperado, não porque o custo real projetado seja alto.

**Emulator**: rodar `firebase emulators:start` (para testar Rules e Functions localmente antes
de publicar, como o plano de etapas já previa na Etapa 7) exige **Java JDK 11+** instalado na
máquina de desenvolvimento, além de Node.js 16+ e Firebase CLI 8.14+ — nenhum dos dois últimos
é problema (já usados no projeto), mas o Java **ainda não está instalado** neste ambiente,
confirmando o que `COLABORACAO_DISCOVERY.md` seção 16.1 já havia sinalizado como limitação não
resolvida. Precisa ser instalado antes da Etapa 7 (não bloqueia as etapas anteriores, que
podem ser desenvolvidas contra o emulador de Functions isoladamente ou contra um projeto de
desenvolvimento real).

**Deploy**: como as 4 variantes são 4 projetos Firebase distintos, o deploy de Functions é
**por projeto** (`firebase deploy --only functions --project <alias>`, mesmo padrão de troca de
projeto já usado pelos scripts `start:dev`/`start:rafael`/etc. em `package.json`) — o código
das Functions é compartilhado (uma pasta `functions/` só), mas publicar uma mudança precisa
rodar o comando de deploy até 4 vezes (uma por ambiente que já estiver com Blaze habilitado).
Isso é custo operacional (repetir um comando), não duplicação de código.

**O que isso muda no plano de implementação (seção final)**: nada estrutural — só confirma que
a Etapa 1 ("infraestrutura de Cloud Functions") precisa começar por habilitar o Blaze em ao
menos um projeto (sugestão: `dev`, para não expor os projetos de uso real a nada ainda) antes
de escrever a primeira função.

## 17. V1 mínima — o que fica explicitamente fora

🔵 Fora do escopo da V1 (candidatos a versões futuras, não descartados):
- Só **gastos** são compartilháveis — entradas, parcelas de cartão/empréstimo e investimentos
  ficam para depois.
- Sem "acerto de contas"/saldo líquido consolidado entre duas pessoas — só eventos soltos.
- Sem modelos recorrentes compartilhados (assinatura dividida automaticamente todo mês).
- Sem QR Code — só código digitado + link.
- Sem convite formal + resgate automático de cota para participante sem conta.
- Sem edição de despesa compartilhada após qualquer aceite (trava simples, seção 9).
- Sem notificações push — só aparece ao abrir o app.
- Sem filtro "Compartilhados" na lista.
- Sem qualquer gamificação relacionada.
- Sem múltiplos compartilhamentos a partir do mesmo gasto — um gasto origina no máximo uma
  `despesaCompartilhada` (seção 6.1).
- Sem bloqueio explícito de usuário ou denúncia — só as proteções mínimas de spam da seção 1.

## Plano de implementação por etapas (🟢 proposta)

1. **Infraestrutura de Cloud Functions** — habilitar o plano Blaze no projeto `dev` (seção
   16.1), configurar o projeto Functions, pipeline de deploy, uma função simples publicada e
   testada de ponta a ponta. De-risca a categoria de infraestrutura nova antes de escrever
   lógica de negócio em cima dela.
2. **Conexões** — código, `solicitarConexao`, `responderConexao`, tela "Conexões". Testável
   isoladamente, sem nenhum dado financeiro envolvido ainda.
3. **Modelo de dados + Functions de divisão de despesa** (`criarDivisaoDespesa`,
   `aceitarConviteDivisao`, `recusarConviteDivisao`, `cancelarConviteDivisao`,
   `atualizarDivisaoDespesa`) — sem UI ainda, testável via chamada direta/emulador.
4. **UI de compartilhar despesa** (nova e retrofit de existente) + convites pendentes na
   Central de Avisos.
5. **Indicação visual** — badge na lista, seção "Compartilhado" em `ModalDetalhes.js`, eventos
   na Linha do Tempo.
6. **Participante sem conta** — campo no Membro, seleção no seletor de cotas. Pode ser feita em
   paralelo à etapa 4, é independente.
7. **`firestore.rules` das novas coleções + testes reais** — momento de finalmente instalar
   Java e rodar `firebase emulators:start` com testes automatizados, não só leitura de código.

Cada etapa é entregável e testável isoladamente — segue o mesmo princípio já usado no projeto
("uma melhoria por vez, validar antes de seguir").
