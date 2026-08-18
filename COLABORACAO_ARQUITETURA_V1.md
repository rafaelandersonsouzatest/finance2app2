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
>
> **Atualização (2026-08-14)** — revisão antes da Etapa 3 (Functions de divisão de despesa),
> ainda sem nenhum código escrito para essa etapa: (1) valores monetários passam a ser sempre
> centavos inteiros (`valorTotalCentavos`/`valorCentavos`/`minhaCotaCentavos`), nunca `float`;
> (2) explícito que as cotas **não** precisam ser iguais entre participantes; (3) cota do
> criador pode ser zero (nunca negativa) — "criador" e "cota financeira" são conceitos
> separados; (4) status de convite/cota ganha `'expirado'`; (5) seção 2.1 (nova) — desenho
> completo de como a divisão de despesa se integra à Linha do Tempo já existente (reaproveitada,
> não duplicada), incluindo a regra de que a criação de uma despesa é sempre um evento próprio,
> nunca condicionado a ela ser compartilhada.
>
> **Atualização (2026-08-14, mesmo dia)** — Etapa 3 (backend) e Etapa 4 (UI mínima) concluídas e
> testadas; primeiro teste manual real encontrou 3 bugs de cálculo/Linha do Tempo (todos
> corrigidos, 61 testes passando) e uma lacuna de ciclo de vida (excluir um gasto compartilhado
> não cancela a divisão) — seção 11.1 (nova) analisa o ciclo de vida completo (cancelar,
> encerrar, adicionar participante, alterar depois do aceite, excluir só-pra-mim vs.
> excluir-pra-todos, soft delete) e propõe um desenho, **ainda sem nenhuma implementação**,
> aguardando decisões pontuais registradas ao final da seção.
>
> **Atualização (2026-08-17)** — segunda rodada de teste manual real: resultado majoritariamente
> positivo (exclusão/cancelamento respeitando "cada um dono da própria cópia"), 1 bug encontrado
> (cancelamento não devolve o valor pro criador) e 1 pedido de UX (busca no seletor de conexões).
> Seção 11.2 (nova) analisa o bug e propõe um redesenho da UI de gerenciamento de divisão (modal
> dedicado `ModalGerenciarDivisao`, substituindo a seção que cresceu dentro de `ModalDetalhes`) —
> **nada implementado ainda**, aguardando decisão do usuário sobre as 3 perguntas ao final da
> seção.
>
> **Atualização (2026-08-17, mesmo dia)** — usuário rejeitou a absorção automática proposta na
> seção 11.2 para o valor de um cancelamento: aprovou o modal `ModalGerenciarDivisao` e pediu o
> desenho completo do modelo "valor sem destino" (criador escolhe devolver/redistribuir/atribuir,
> ou decide depois com alerta pendente) antes de qualquer código — seção 11.3 (nova). Ordem de
> implementação revisada: modelo de valor primeiro, UI depois. Ainda nada implementado.

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

🔵 **Revisitado em 2026-08-13, ao testar a Etapa 2.1/2.2**: proposta de trocar o código
aleatório por um identificador escolhido pelo usuário (`@usuario`, como Instagram) — já mapeado
como alternativa em `COLABORACAO_DISCOVERY.md` seção 13, nunca descartado, só não escolhido
para a V1. **Decisão: manter o código aleatório por agora**, registrado aqui para não
esquecer — melhoria candidata a uma rodada futura, não implementada nesta etapa. Principal
diferença de esforço se decidirmos trocar depois: exige checar disponibilidade do identificador
escolhido e decidir se pode ser alterado depois de definido (código aleatório de hoje é
permanente e nunca colide de um jeito que o usuário perceba).

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
  status: 'pendente' | 'aceita' | 'recusada' | 'expirada' | 'cancelada',
  criadoEm, atualizadoEm
}
```

**🟢 Proteção mínima contra spam/abuso (nova, 2026-08-12)** — sem virar um sistema de bloqueio
complexo, três checagens simples dentro da própria `solicitarConexao`:
- **Idempotência**: se já existe uma conexão `pendente` ou `aceita` entre A e B, a Function
  retorna esse estado existente em vez de criar um segundo documento — evita que A consiga
  gerar N solicitações duplicadas para o mesmo B só de repetir a ação.
- **Cooldown pós-recusa**: se a conexão mais recente entre A e B está `recusada` **e o próprio
  chamador foi quem a enviou** (`papel: 'solicitante'` no doc dele), uma nova solicitação de A
  para o mesmo B só é aceita depois de um intervalo mínimo (7 dias, comparando `atualizadoEm`).
  Se, em vez disso, o doc do chamador tem `papel: 'destinatario'` (ele só recusou um pedido de
  B antes, nunca enviou o próprio) — sem cooldown, ele pode iniciar uma conexão nova a qualquer
  momento (gera um `conexaoId` novo, não reaproveita o registro antigo).
- **Limite de solicitações pendentes enviadas**: a Function rejeita uma nova solicitação se A
  já tiver um número alto de conexões `pendente` como solicitante (proposta: 20) — protege
  contra um uso indevido de enviar solicitações em massa para muitos destinatários diferentes.

**🟢 Expiração de solicitação pendente (decisão, 2026-08-13)** — sem essa regra, o limite de 20
acima vira uma armadilha: um convite nunca respondido ocuparia uma vaga para sempre. Decisão:
- Prazo de **15 dias** a partir de `criadoEm`.
- **Expiração "preguiçosa" (lazy), sem infraestrutura nova**: nenhuma Cloud Function agendada
  roda sozinha em segundo plano. Em vez disso, toda vez que `solicitarConexao` ou
  `responderConexao` encontrarem um doc `pendente` com mais de 15 dias, tratam-no **na hora**
  como se já estivesse expirado (não conta pro limite de 20, não pode mais ser aceito) e
  aproveitam para gravar `status: 'expirada'` nos dois lados, como limpeza.
- ⚠️ **Limitação conhecida, aceita conscientemente para a V1**: se **ninguém nunca mais**
  interagir com um pedido pendente específico (nem o remetente tenta de novo, nem o
  destinatário responde), ele fica "logicamente expirado" mas grava `status: 'pendente'` para
  sempre no Firestore — só a próxima interação de fato grava a expiração. 🔵 **Candidato futuro,
  não implementado agora**: uma Cloud Function agendada (`onSchedule`) fazendo a limpeza de
  verdade, caso isso se mostre um problema real no uso (ex.: relatórios/contagens que dependam
  do status refletir a expiração sem esperar uma interação).
- Expiração é tratada como **neutra**, nunca como recusa — reenviar depois de expirado não
  entra no cooldown de 7 dias (esse só se aplica a uma recusa ativa de alguém).

**🟡 Reabertura de escopo (2026-08-13)** — bloqueio explícito de usuário, antes listado como
fora da V1 (seção 17), foi reaberto a pedido do usuário. Desenho ainda em definição — ver
discussão em andamento antes de qualquer implementação.

**🟢 Cancelar solicitação pendente (nova, 2026-08-13)** — função nova (`cancelarConexao`),
adicionada à Etapa 2 (não existia na lista original de 7 Functions da seção 12). Permite que
quem enviou uma solicitação `pendente` a cancele antes do destinatário responder — mesmo
princípio de `cancelarConviteDivisao` (seção 10), aplicado à conexão em si, não à divisão de
despesa.

## 2. Fluxo de convite e aceite de uma despesa

1. A escolhe uma ou mais conexões **já aceitas** e define a cota de cada uma. **As cotas não
   precisam ser iguais** (decisão explícita, 2026-08-14) — o modelo nunca assume divisão igual;
   uma despesa de R$300 pode ser R$50/R$100/R$150 entre três pessoas. Uma futura tela pode
   oferecer "dividir igualmente" como atalho de preenchimento, mas isso é só conveniência de
   UI — a regra de negócio sempre aceita valores livres por participante, validando apenas que
   a soma bate com o total (ver contrato abaixo).
2. App chama `criarDivisaoDespesa({ descricao, valorTotalCentavos, cotas, origemLancamentoId? })`
   — `cotas` é uma lista só com os **outros** participantes (`{ uidParticipante, valorCentavos }`),
   nunca a do próprio criador (ver seção 5 para o porquê). Function valida que cada participante
   é, de fato, uma conexão aceita de A (nunca confia apenas no que o cliente afirma) e, se
   `origemLancamentoId` foi informado, valida que aquele gasto ainda não tem `compartilhamentoId`
   (ver seção 6.1 — um gasto só origina uma `despesaCompartilhada` na V1).
3. Numa única escrita atômica (`WriteBatch`/`runTransaction` do Admin SDK), a Function cria
   `users/{A}/despesasCompartilhadas/{eventoId}`, um espelho
   `users/{participante}/convitesDeDivisao/{eventoId}` para cada participante com conta,
   quando a despesa nasce do zero (sem `origemLancamentoId`) **também** o `gasto` da cota do
   próprio A em `users/{A}/gastos/{id}` (ver seção 5) — **e os eventos correspondentes na Linha
   do Tempo de cada envolvido** (ver seção 2.1, nova), tudo no mesmo commit.
4. Cada convidado vê o convite pendente (proposta de UI na seção 8) e aceita ou recusa
   individualmente — `aceitarConviteDivisao({ eventoId })` / `recusarConviteDivisao({ eventoId })`.
5. Ao aceitar, a Function lê `minhaCotaCentavos` **do próprio documento do convite** (nunca de
   um valor enviado pelo cliente no momento do aceite) e cria um `gasto` novo na conta de quem
   aceitou.

**Valores sempre em centavos inteiros (decisão, 2026-08-14)**: `valorTotalCentavos`,
`valorCentavos` (por cota) e `minhaCotaCentavos` — nunca `float`. A soma de todas as cotas
(incluindo a do criador, calculada pela Function) precisa ser **exatamente igual** a
`valorTotalCentavos`, sem tolerância de arredondamento (centavos inteiros não têm esse
problema). Validado sempre no backend (Function), nunca só confiando na UI. A conversão para o
formato decimal que o resto do app usa (`gasto.valor`) só acontece no momento de criar o
`gasto` de verdade (`valorCentavos / 100`) — os documentos exclusivos da Colaboração
(`despesasCompartilhadas`, `convitesDeDivisao`) guardam sempre centavos.

## 2.1 Linha do Tempo da divisão de despesa (🟢 decisão, 2026-08-14)

🐛 **Correção (2026-08-17)** — o texto perspectivado ("Você aceitou..." vs. "Fulano aceitou...")
nunca funcionava de verdade: `montarDescricaoEvento(evento, meuUid)` sempre foi chamado sem o
segundo argumento em `LinhaDoTempoEventos.js`, então `meuUid` chegava `undefined` e todo evento
de `divisaoDespesa` caía no texto em terceira pessoa, mesmo para quem causou a ação. Corrigido
passando `meuUid` (uid de quem está vendo a tela) de `ModalHistoricoParcelas.js` (que já tem o
usuário logado disponível) para `LinhaDoTempoEventos.js`.

Reaproveita inteiramente a infraestrutura já existente (`registrarEvento.js`,
`linhaDoTempoConfig.js`, `linhaDoTempoRender.js` — ver `ARQUITETURA.md` seção 18) — **nenhum
sistema de histórico paralelo**. Como as Functions rodam em Admin SDK (não conseguem importar
o utilitário client-side, que usa o SDK do app), existe um espelho pequeno,
`functions/registrarEvento.js`, com o **mesmíssimo contrato de dados** — não é um segundo
sistema, é a mesma modelagem escrita do lado servidor.

Extensões ao schema existente (compatíveis, nunca uma mudança quebrando eventos antigos — o
campo `versao: 1` já existe exatamente para isso):
- Novo `entidade: 'divisaoDespesa'`.
- Novas `acao`: `compartilhado`, `convite_recebido`, `convite_aceito`, `convite_recusado`,
  `convite_cancelado`, `convite_expirado`.
- Novo campo opcional `participantes: [{ uid, nome }]` — quem é a "outra parte" daquele
  evento, do ponto de vista de cada timeline (sempre lista, mesmo com 1 pessoa).
- `usuarioId` mantém o significado já estabelecido no resto do app: **quem causou o evento**,
  não necessariamente o dono da timeline onde ele aparece (ex.: no evento de "João aceitou",
  gravado na timeline do criador, `usuarioId` é o uid de João).
- Expiração automática usa `origem: { agente: 'sistema', canal: 'expiracao_automatica' }` —
  campo que já existia e já previa esse caso (`agente: 'sistema'`).

**Criação da despesa é sempre um evento próprio, nunca condicionado a ela ser compartilhada**
(decisão, 2026-08-14) — mesmo quando os dois acontecem no mesmo instante (despesa criada já
compartilhada, seção 5):
- `{ acao: 'criado', entidade: 'gasto', entidadeId: gastoId }` — sempre, para qualquer gasto,
  compartilhado ou não (já é o comportamento hoje via `useGastos.js`; quando o gasto nasce
  dentro de `criarDivisaoDespesa`, a Function emite esse mesmo evento, já que não passa pelo
  hook client-side que normalmente faria isso).
- `{ acao: 'compartilhado', entidade: 'divisaoDespesa', entidadeId: eventoId, participantes }`
  — sempre um evento **separado**, mesmo que no mesmo commit/timestamp do evento acima.

Isso preserva a distinção "quando a despesa foi criada" vs. "quando foi compartilhada" mesmo
quando os dois acontecem juntos — e já fica automaticamente correto no caso de compartilhar um
gasto **já existente** (seção 4/Etapa 3.5): o gasto já tem seu próprio evento de criação, de
muito antes; só o evento `compartilhado` é novo, na data real do compartilhamento.

**Eventos por ação — sempre os dois lados da movimentação**:

| Ação | Timeline de quem faz a ação | Timeline do outro lado |
|---|---|---|
| Criar divisão | `compartilhado` (participantes = todos os convidados) | cada convidado recebe `convite_recebido` (participantes = [criador]) |
| Aceitar | quem aceita ganha `criado`/`gasto` (o novo gasto) + `convite_aceito` | criador também ganha `convite_aceito`, com `usuarioId` = quem aceitou |
| Recusar | `convite_recusado` (quem recusou) | criador ganha `convite_recusado`, `usuarioId` = quem recusou |
| Cancelar (Etapa 3.3) | `convite_cancelado` (criador) | convidado ganha `convite_cancelado`, `usuarioId` = criador |
| Expira (automático, lazy) | `convite_expirado` nos dois lados, `origem.agente: 'sistema'` | idem |

Exemplo concreto (mesmo formato do pedido original): Rafael compartilha com João → timeline do
Rafael mostra "Despesa compartilhada com João"; timeline de João mostra "Convite recebido de
Rafael". João aceita → timeline do Rafael mostra "João aceitou a divisão"; timeline de João
mostra "Você aceitou a divisão com Rafael" (mesma ação, texto perspectivado por
`linhaDoTempoRender.js`, nunca duplicando o dado gravado).

Tudo isso acontece dentro do mesmo commit atômico da Function que faz a operação principal —
nunca um evento de histórico "sobra" sem a operação de negócio correspondente, nem o contrário.
Histórico é sempre **imutável**: uma edição/cancelamento futuro nunca apaga ou reescreve um
evento já gravado, só adiciona um evento novo (mesmo princípio que já rege toda a Linha do
Tempo hoje).

🐛 **Correção (2026-08-14)** — bug encontrado no primeiro teste manual real: o evento
`compartilhado` não aparecia na Linha do Tempo do gasto. Causa raiz: a tela busca eventos de um
item filtrando por `entidadeId === item.id` (`useLinhaDoTempo.js`, `buscarEventosDoItem`), mas
os eventos de `divisaoDespesa` eram gravados com `entidadeId` igual ao id da
`despesaCompartilhada`, não ao id do gasto — nunca batiam com a busca. Regra corrigida, agora
explícita: **`entidadeId` de um evento de `divisaoDespesa` é sempre o id do GASTO de quem está
recebendo aquele evento na própria timeline, nunca o id da `despesaCompartilhada`** — só assim
ele aparece junto do histórico daquele gasto. Isso só é possível quando aquele lado já tem um
gasto:
- O **criador** sempre tem gasto próprio desde a criação da divisão — por isso a
  `despesaCompartilhada` agora grava também `gastoCriadorId` (novo campo, seção 3), lido por
  `aceitarConviteDivisao`/`recusarConviteDivisao`/`cancelarConviteDivisao`/
  `atualizarDivisaoDespesa` para gravar o evento do lado do criador com o `entidadeId` certo.
- O **convidado** só ganha gasto próprio se aceitar — `convite_recebido` e `convite_recusado`
  (do lado dele) continuam com `entidadeId` = id da `despesaCompartilhada`, porque não existe
  gasto nenhum para apontar; hoje isso não aparece em tela nenhuma (não existe uma Linha do
  Tempo global ainda), fica gravado corretamente para quando existir. `convite_aceito` do lado
  do convidado já usa o gasto novo que acabou de ganhar.

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
    valorTotalCentavos: number,          // sempre centavos inteiros, nunca float (decisão 2026-08-14)
    criadoPor: uid,
    status: 'ativa' | 'encerrada',       // soft delete (seção 11.1, decisão 2026-08-14) — nunca
                                          // apaga o documento fisicamente, só marca encerrada
    encerradaEm, encerradaPor,           // preenchidos só quando status vira 'encerrada'
    origemLancamentoId: string | null,   // se nasceu de um gasto já existente
    cotas: [
      {
        participanteTipo: 'usuario' | 'membroSemConta',
        participanteId: string,           // uid OU membroId, conforme o tipo
        nomeExibicao: string,
        valorCentavos: number,            // pode ser 0 para o criador (nunca negativo — seção 5)
        status: 'pendente' | 'aceito' | 'recusado' | 'cancelado' | 'expirado',
        gastoId: string | null            // id do GASTO deste participante — null enquanto
                                          // pendente; do criador, preenchido já na criação; de
                                          // um convidado, preenchido no aceite (seção 11.1,
                                          // decisão 2026-08-14 — substitui o antigo campo solto
                                          // `gastoCriadorId`, único mecanismo pra localizar o
                                          // gasto de qualquer lado sem query entre contas)
      }
    ],
    criadoEm
  }

users/{uid}/convitesDeDivisao/{eventoId}          // espelho, só para participantes com conta
  {
    eventoId, deUsuarioId, deNome, descricao,
    minhaCotaCentavos: number,
    status: 'pendente' | 'aceito' | 'recusado' | 'cancelado' | 'expirado',
    criadoEm, atualizadoEm
  }

users/{uid}/gastos/{id}
  .origemCompartilhamento: { eventoId, deUsuarioId } | null    // campo novo, opcional
  .compartilhamentoId: string | null   // no gasto ORIGINAL de quem criou, se ele compartilhou depois
```

Convivência, não migração: os campos novos em `gastos` são opcionais, `undefined`/`null` em
todo lançamento já existente — mesmo princípio usado em `categoriaId`/`membroId`/`cartaoId`.

## 4. Como uma despesa **existente** seria compartilhada

✅ **Backend concluído (Etapa 3.5, validada 2026-08-14)** — `criarDivisaoDespesa` aceita
`origemLancamentoId`. Quando presente: `valorTotalCentavos` é sempre derivado do próprio
`gasto.valor` (nunca confia no valor enviado pelo cliente), valida que o gasto existe e ainda
não tem `compartilhamentoId` (regra da seção 6.1 — um gasto só pode originar uma
`despesaCompartilhada`), e o gasto original só ganha `compartilhamentoId` (sem criar um segundo
gasto nem duplicar o evento `criado` da Linha do Tempo — ver seção 2.1: criação e
compartilhamento são sempre eventos separados, cada um só uma vez). Falta só a UI (Etapa 4):
novo botão "Compartilhar" em `ModalDetalhes.js` (caso `gasto`), abrindo o mesmo seletor de
conexões/cotas da seção 2, com `valorTotal` pré-preenchido a partir do gasto e
`origemLancamentoId: gasto.id`.

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

🟢 **Cota do criador pode ser zero (decisão, 2026-08-14)** — "criador da despesa" (quem
registrou/organizou) e "cota" (quanto daquela despesa pertence financeiramente a cada um) são
conceitos separados, e o modelo não deve confundi-los. Exemplo válido: uma despesa de R$300
onde o criador organizou a compra mas não ficou com nenhuma parte (`valorCentavos: 0`),
enquanto os outros dois participantes ficam com R$100 e R$200. A única regra é: a cota do
criador **nunca pode ser negativa** — ou seja, a soma das cotas dos demais participantes nunca
pode passar do `valorTotalCentavos`. Como o contrato da Function recebe só as cotas dos
**outros** (seção 2) e calcula a do criador como `valorTotalCentavos - soma(outros)`, essa
regra é, na prática, "o resultado desse cálculo precisa ser `>= 0`".

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
- **Excluir a despesa compartilhada** (🟢 formalizado 2026-08-14, seção 11.1): sempre passa por
  `encerrarCompartilhamento` antes de excluir o gasto do criador — cancela os convites ainda
  `pendente` e avisa quem já aceitou (evento na Linha do Tempo); cópias já aceitas permanecem
  intocadas nas contas de quem aceitou (são propriedade delas agora, nunca excluídas em
  cascata). **Trava**: assim que qualquer participante aceitar, "excluir só para mim" deixa de
  ser possível — a única forma de remover é encerrar/excluir para todos (mesma Function), a
  despesa nunca fica órfã.

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

🟡 **Revisão em andamento (2026-08-14)** — ver seção 11.1. O princípio central não muda ("nenhuma
escrita silenciosa na conta de outra pessoa"), mas a frase "nunca uma referência viva" fica
imprecisa: já existe uma referência hoje (`origemCompartilhamento`) e a seção 11.1 propõe
deixá-la mais consistente, exatamente para permitir localizar os gastos de uma mesma divisão —
sem isso, nunca dá pra oferecer redivisão ou qualquer visão consolidada no futuro. O que
continua valendo, agora dito de forma mais precisa: **nenhuma mudança financeira na conta de
outra pessoa acontece sem uma ação explícita dela** (aceitar um convite, concordar com uma
proposta de alteração) — ter uma referência não é o mesmo que ter propagação automática.

## 11.1 Ciclo de vida completo da despesa compartilhada — análise e proposta (🟡 análise, 2026-08-14)

Disparado por um teste manual real: o usuário excluiu o gasto original depois de compartilhar,
e os convites continuaram pendentes e aceitáveis nas outras contas — expondo que o ciclo de vida
completo (cancelar, excluir, adicionar participante, alterar depois do aceite) nunca tinha sido
desenhado, só o caminho feliz de criar → aceitar/recusar/cancelar um convite isolado. Esta seção
responde às perguntas concretas feitas e propõe um desenho — **nada disto foi implementado
ainda**, é só análise para decisão.

### Como o gasto original e os derivados estão relacionados hoje

| Lado | Campo | Formato |
|---|---|---|
| Gasto do criador | `compartilhamentoId` | `eventoId` (string direta) |
| Gasto do participante (só existe se aceitou) | `origemCompartilhamento` | `{ eventoId, deUsuarioId }` (objeto) |

Essa assimetria (nome diferente, formato diferente) é o primeiro problema: não dá pra fazer uma
única pergunta tipo "quais gastos pertencem a esta divisão?" de forma uniforme — cada lado tem
sua própria convenção.

`despesasCompartilhadas` hoje só sabe apontar para o gasto do **criador**
(`gastoCriadorId`, adicionado nesta sessão para corrigir o bug de Linha do Tempo). Não guarda
o `gastoId` de nenhum participante — só `participanteId` (uid) + `status`. Ou seja: **hoje não
dá para localizar o gasto de um participante que aceitou a partir da divisão** — seria preciso
ou (a) uma *collection group query* em `gastos` filtrando por `origemCompartilhamento.eventoId`
(tecnicamente viável, mas só via Admin SDK/Cloud Function — o cliente nunca tem permissão de ler
`gastos` de outra conta — e exige um índice novo), ou (b) guardar o `gastoId` de cada
participante na própria divisão assim que ele aceita. (b) é claramente mais simples, não depende
de índice nem de query entre contas, e é a base necessária para redivisão futura.

**Recomendação estrutural (baixo risco, baixo esforço, evita retrabalho depois):** substituir o
campo solto `gastoCriadorId` por um campo `gastoId` **dentro de cada elemento de `cotas[]`**
(criador incluído) — o mesmo mecanismo serve para localizar o gasto de qualquer participante,
não só do criador:
```
cotas: [
  { participanteId: uid, ..., gastoId: string | null }  // null enquanto pendente, preenchido no aceite
]
```
Isso deixa a base pronta para redivisão sem exigir nenhuma query entre contas — a própria
`despesaCompartilhada` já lista o gasto de todo mundo que já aceitou. Como ainda estamos em fase
de teste local (emulador, sem dado real em jogo), esta é uma boa hora para fazer essa troca antes
de construir o resto em cima do campo antigo.

### Operações do ciclo de vida — por que tratar cada uma separado

Concordo com a divisão proposta — são operações com riscos e platôs de consentimento bem
diferentes:

| Operação | Estado hoje | Proposta |
|---|---|---|
| a) Cancelar convite individual | Function pronta (`cancelarConviteDivisao`), sem UI | Só falta UI — baixo esforço |
| b) Cancelar/encerrar compartilhamento inteiro | Não existe | Nova Function: cancela todos os convites ainda `pendente` de uma vez + marca a despesa `encerrada` (ver soft delete abaixo) |
| c) Adicionar participante | Não existe | Nova Function — ver regra de valor abaixo |
| d) Alterar valores antes de qualquer aceite | Já existe (`atualizarDivisaoDespesa`), trava no primeiro aceite | Sem mudança |
| e) Alterar valores depois de algum aceite | Bloqueado (trava atual) | Nova: proposta + concordância (ver abaixo) |
| f) Excluir só para mim | Não existe | Ver análise abaixo — tem uma pergunta em aberto |
| g) Excluir para todos | Não existe (hoje é uma exclusão física sem cascata nenhuma) | Ver análise abaixo |

**c) Adicionar participante — de onde vem o valor da nova cota?** Se a nova cota for descontada
de quem já aceitou, isso é uma mudança financeira na conta de outra pessoa sem a ação dela —
viola o princípio da seção 11. Proposta: adicionar participante **só pode reduzir a cota do
próprio criador** automaticamundo (decisão unilateral sobre a própria parte, sempre permitida);
reduzir a cota de quem já aceitou para abrir espaço pro novo participante passa pelo mesmo
mecanismo do item (e) — proposta + concordância de quem seria afetado.

**e) Alterar valores depois do aceite — proposta + concordância.** Modelagem sugerida, no mesmo
padrão já usado para convites (espelho por participante, não um documento solto):
```
users/{participanteUid}/propostasDeAlteracao/{propostaId}
  { eventoId, deUsuarioId, valorAtualCentavos, valorPropostoCentavos,
    status: 'pendente' | 'aceita' | 'recusada', criadoEm, atualizadoEm }
```
🟡 **Alternativa a decidir** — quem precisa concordar quando o criador propõe mudar valores de
mais de uma pessoa ao mesmo tempo:
- **Só quem é diretamente afetado** (recomendado): cada pessoa só aprova a própria mudança de
  cota — se só a cota de João muda, só João recebe a proposta; Maria nem fica sabendo. Mais
  simples, menos atrito, consistente com o modelo atual (cada convite já é individual por
  pessoa).
- **Todo mundo do grupo**: qualquer alteração em qualquer cota exige concordância de todos os
  participantes, mesmo os que não são afetados. Mais "seguro" no sentido de transparência total,
  mas bem mais atrito e complexidade (o que acontece se um concordar e outro recusar?).
  Reutilizaria a Linha do Tempo do mesmo jeito, só muda a regra de quantas aprovações são
  necessárias para efetivar.

Até a cota do próprio participante ser aceita na proposta, o valor **oficial** dele continua o
antigo — nunca muda antes da concordância explícita.

### Excluir — "só para mim" vs. "para todos"

**g) Excluir para todos** — encerra a divisão (marca `encerrada`, cancela convites `pendente`).
A pergunta real é o que acontece com o **gasto de quem já aceitou**. Proposta: **não excluir
automaticamente** o gasto de ninguém que já aceitou — isso seria apagar um lançamento na conta de
outra pessoa sem o consentimento dela no momento da exclusão. Em vez disso, o gasto dela fica
**desvinculado** (a divisão que o originou foi encerrada, mas o lançamento continua existindo
como um gasto comum, dono dela, editável/excluível por conta própria depois) — mesmo espírito
da seção 11: a cópia continua sendo propriedade de quem aceitou.

**f) Excluir só para mim** — aqui vejo uma pergunta real ainda sem resposta clara: se ninguém
aceitou ainda, faz todo sentido (o criador desiste, cancela os convites pendentes, some com a
própria despesa). Mas se **alguém já aceitou**, "excluir só para mim" deixaria a divisão sem
"dono" original — o gasto de quem aceitou continuaria existindo, ligado a uma despesa que sumiu
da conta de quem a criou. Isso é aceitável (a divisão vira histórica, sem dono ativo, mas cada
cópia continua válida) ou "excluir só para mim" deveria só ser permitido enquanto ninguém tiver
aceitado (documentado abaixo como pergunta em aberto)?

### Soft delete — e um esclarecimento importante sobre a Linha do Tempo

Boa notícia: **a Linha do Tempo já está protegida hoje, independente de soft delete.**
`users/{uid}/linhaDoTempo` é uma coleção própria, no nível do usuário — nunca aninhada dentro do
documento do gasto nem da `despesaCompartilhada` (confirmado em `registrarEvento.js` — cliente e
servidor). Apagar um gasto ou uma despesa compartilhada **nunca apaga os eventos já gravados**
sobre eles (Firestore não faz cascade delete entre documentos/coleções distintos, e aqui não há
essa relação de aninhamento). Isso já é verdade hoje, mesmo sem soft delete.

Soft delete então resolve um problema diferente: impedir **ações futuras inválidas** sobre uma
divisão que não deveria mais aceitar respostas (exatamente o bug relatado — aceitar um convite
cujo gasto de origem já não existe mais), e permitir mostrar "esta despesa foi encerrada" em vez
de simplesmente sumir sem explicação.

🟢 Proposta de campo (reaproveitando o mesmo padrão de `status` já usado em convites/cotas, em
vez de um par solto `excluida`/`deletedAt`):
```
despesasCompartilhadas/{eventoId}
  status: 'ativa' | 'encerrada',   // novo — default 'ativa'
  encerradaEm, encerradaPor
```
`aceitarConviteDivisao`/`recusarConviteDivisao`/`atualizarDivisaoDespesa` passam a checar esse
status e rejeitar com erro claro se `encerrada` — fecha o bug relatado de vez (hoje o convite
fica pendente pra sempre; com isso, qualquer tentativa de resposta falha explicando o motivo).

### Linha do Tempo — novas ações (quando cada peça acima for implementada)

Mesma extensão de enum já usada até aqui (sem mudança estrutural no mecanismo:
`participantes`/`alteracoes`/`origem` já cobrem os casos abaixo): `participante_adicionado`,
`participante_removido`, `alteracao_proposta`, `alteracao_aceita`, `alteracao_recusada`,
`redistribuicao`, `compartilhamento_encerrado`, `despesa_excluida`.

### Classificação (impacto / dificuldade / prioridade)

| Item | Impacto | Dificuldade | Prioridade |
|---|---|---|---|
| `cotas[].gastoId` (unificar referência) | Alto — base para tudo o resto | Baixa | **Fazer antes de qualquer outra coisa desta lista** |
| Soft delete (`status: encerrada`) + travar aceite/recusa/edição numa divisão encerrada | Alto — fecha o bug relatado de forma definitiva | Média | Alta |
| UI de cancelar convite individual (Function já existe) | Médio | Baixa | Alta |
| Encerrar compartilhamento inteiro (nova Function) + modal contextual de exclusão (casos 1/2/3) | Médio-alto | Média | Alta |
| Adicionar participante | Médio | Média | Média |
| Proposta de alteração pós-aceite + concordância | Alto (valor de produto), mas maior escopo | Alta | Média — fase própria, não misturar com o resto |
| Redivisão de fato (mover valor entre participantes já aceitos) | Alto | Alta (depende de tudo acima já estar pronto) | Baixa por agora — só depois da base estar sólida |

### Decisões (2026-08-14)

1. ✅ **`cotas[].gastoId` aprovado** — substitui `gastoCriadorId` (campo solto). Cada elemento de
   `cotas[]` (criador incluído) ganha `gastoId: string | null` — `null` enquanto pendente,
   preenchido no momento em que aquele participante (ou o criador, já na criação) tem um gasto
   próprio. Único mecanismo para localizar o gasto de qualquer lado, sem query entre contas.
2. ✅ **Excluir só para mim: bloqueado depois de qualquer aceite.** Enquanto `cotas[]` não tiver
   nenhum status `'aceito'`, excluir o gasto do criador cancela os convites `pendente` (mesma
   Function de encerrar, ver abaixo) e prossegue normalmente. Depois de qualquer aceite, a única
   forma de remover é "encerrar/excluir para todos" (mesma Function, `encerrarCompartilhamento`)
   — ou a despesa permanece `ativa`. Não existe um caminho de "sumir só da minha conta" que deixe
   a divisão órfã.
3. ✅ **Alteração pós-aceite: só quem é diretamente afetado concorda.** Cada proposta de
   alteração (fase futura, item "e" acima) é individual por participante — quem não muda de
   cota nem fica sabendo.
4. ✅ **Ordem de implementação aprovada** (ver plano abaixo) — `cotas[].gastoId` →
   soft delete/`status` + bloqueios → UI de cancelar convite individual → encerrar
   compartilhamento + exclusão contextual. Adicionar participante e alteração pós-aceite ficam
   para depois (fora do escopo desta rodada).

### Impacto nas partes já existentes do documento

- **Seção 3 (Modelo de dados)**: `gastoCriadorId` (adicionado nesta sessão) é substituído por
  `gastoId` dentro de cada `cotas[]`; `despesasCompartilhadas` ganha `status: 'ativa' |
  'encerrada'`, `encerradaEm`, `encerradaPor`.
- **Seção 9 (Editar, excluir ou alterar depois de compartilhar)**: a frase "Excluir a despesa
  compartilhada: cancela convites pendentes; cópias já aceitas permanecem intocadas" continua
  verdadeira, mas passa a ser **sempre** o caminho (não um "efeito colateral" da exclusão
  simples) — formalizada como a Function `encerrarCompartilhamento`, com a trava nova da decisão
  2 acima.
- **Seção 11**: já revisada acima (referência existe e é intencional; o que nunca existe é
  propagação silenciosa).
- **Plano de implementação por etapas** (fim do documento): item 5 ("Indicação visual") passa a
  incluir a seção "Compartilhado" no `ModalDetalhes.js` como o lugar natural para
  cancelar-convite-individual e encerrar-compartilhamento, adiantado desta rodada em vez de
  ficar só como indicação passiva.

### Plano curto da próxima implementação

1. `functions/divisaoDespesa.js`: migrar `gastoCriadorId` → `cotas[].gastoId` (todas as 5
   Functions), adicionar `status`/`encerradaEm`/`encerradaPor`, bloquear
   aceitar/recusar/atualizar quando `status !== 'ativa'`, nova Function
   `encerrarCompartilhamento`.
2. `functions/divisaoDespesa.test.js`: atualizar asserções de `entidadeId`/campo para o novo
   formato, novos testes de `encerrarCompartilhamento` e das travas de `status`.
3. `src/hooks/useDivisaoDespesa.js`: novos wrappers `cancelarConvite`/`encerrarCompartilhamento`.
4. `src/components/ModalDetalhes.js` (caso `gasto`): nova seção "Compartilhado com" (lista de
   participantes + status, cancelar individual se `pendente`, encerrar compartilhamento inteiro)
   quando `item.compartilhamentoId` existir — dado vem do `DivisaoDespesaContext` (já busca
   `despesas`), passado por prop pela tela dona (`SaidasScreen.js`).
5. `src/screens/SaidasScreen.js`: `handleExcluir` passa a checar `item.compartilhamentoId` —
   sem ele, comportamento idêntico a hoje; com ele, confirmação contextual (texto varia conforme
   há ou não aceite) antes de encerrar + excluir.
6. Validar com testes automatizados (Functions) + teste manual real (mesmo fluxo que encontrou
   os bugs desta rodada).

✅ **Implementado e testado (2026-08-14)** — itens 1 a 6 acima concluídos: `cotas[].gastoId`
migrado (68 testes automatizados passando, incluindo os 7 novos de
`status`/`encerrarCompartilhamento`), `encerrarCompartilhamento` nova Function, travas de
`status: 'encerrada'` em aceitar/recusar/atualizar, `ModalDetalhes.js` ganhou a seção
"Compartilhado com" (cancelar convite individual, encerrar compartilhamento inteiro),
`SaidasScreen.js` com exclusão contextual (mensagem varia conforme já haver aceite ou não).
Adicionar participante e alteração pós-aceite continuam fora do escopo desta rodada, como
decidido.

🧪 **Validação manual real (2026-08-17)** — segunda rodada de testes, resultado predominantemente
positivo:
- ✅ Cancelar o convite de um participante ainda pendente: nada muda na conta dele, notificação
  nunca chega a existir para ele.
- ✅ Convite de outro participante chega normalmente e ele consegue aceitar pela notificação.
- ✅ Excluir o gasto original (depois de 1 ou 2 aceites): o gasto de quem já aceitou permanece
  intocado na própria conta — confirma a regra "cada um dono da própria cópia" (seção 11) na
  prática.
- ✅ Cancelar/excluir antes de qualquer aceite: convite nunca chega a ficar disponível pro
  participante.
- 🐛 **Bug encontrado**: ao cancelar o convite de um participante ainda pendente, a cota dele
  continua descontada da divisão do criador — o valor não volta a ficar disponível para ele.
  Análise e decisão de correção na seção 11.2 abaixo.
- 📝 Também identificado (não é bug, é lacuna): falta um campo de busca no seletor de conexões do
  `ModalCompartilharDespesa` — vira um problema real com muitas conexões. Ver seção 11.2.
- 📝 Feedback de UX: a seção "Compartilhado com"/"Encerrar compartilhamento" dentro de
  `ModalDetalhes.js` ficou visualmente ruim, e o plano de adicionar mais controles ali (adicionar
  participante, alterar/redividir valores) só empioraria isso. Ver proposta de redesenho na
  seção 11.2.

## 11.2 Correção do valor no cancelamento + proposta de UX para gerenciar uma divisão (🟡 análise, 2026-08-17)

Disparado pela segunda rodada de teste manual (ver acima). **Nada implementado ainda** — esta
seção só analisa e propõe, para decisão antes de qualquer código (mesmo pedido explícito do
usuário desta vez).

### Bug do valor no cancelamento — análise

Hoje, `cancelarConviteDivisao` (e o cancelamento em massa dentro de `encerrarCompartilhamento`)
só marca a cota do participante como `'cancelado'` — não recalcula a cota do criador nem
atualiza o `valor` do gasto dele. O valor que era do participante cancelado simplesmente
desaparece da divisão (nem fica com ele, que nunca teve gasto nenhum, nem volta pro criador).

🔁 **Isso refina uma decisão anterior desta mesma sessão.** Quando perguntado inicialmente "o que
acontece com o valor de quem recusa/tem convite cancelado", a resposta havia sido "fica como
está, ajuste manual" — tratando recusa e cancelamento como a mesma coisa. O teste manual agora
deixa mais claro que são situações diferentes: **cancelar é uma decisão do próprio criador**
(ele decidiu, agora mesmo, que aquela pessoa não faz mais parte da divisão) — não faz sentido
esperar um passo manual extra para algo que ele mesmo acabou de decidir. Já **recusar é uma
decisão do participante**, sobre a qual o criador pode preferir decidir o que fazer (reatribuir a
si mesmo, convidar outra pessoa, etc.) — aí sim, manual continua fazendo sentido.

🔴 **Revisto (2026-08-17) — não é absorção automática.** O usuário rejeitou a devolução automática
proposta acima: cancelar não deve decidir sozinho o destino do dinheiro. Desenho completo (modelo
de dados, Function, UI, Linha do Tempo) na seção 11.3.

### Campo de busca no seletor de conexões

Reconhecido, baixo esforço, sem ambiguidade de regra de negócio — só uma melhoria de UX num
componente que já existe. Proposta: um `TextInput` simples no topo da lista de
`ModalCompartilharDespesa.js`, filtrando por `nomeExibicao` (case-insensitive, sem acento —
mesmo tratamento simples já usado em outros campos de busca do app, se houver precedente, senão
`.toLowerCase().includes(...)` direto). Como esse mesmo seletor será reaproveitado pela proposta
de "adicionar participante" abaixo, vale extrair para um componente próprio agora
(`SeletorConexoes.js`) em vez de duplicar a lista+busca depois.

### Proposta de UX para gerenciar uma divisão já existente

**Problema**: `ModalDetalhes.js` é um componente genérico (Valor/Categoria/Data/Status/Histórico
para qualquer gasto). A seção "Compartilhado com" cresceu ali de forma improvisada e vai continuar
crescendo (adicionar participante, alterar valores, redistribuir, propor alteração pós-aceite) —
o usuário já sinalizou que não quer continuar nesse caminho.

**Alternativas avaliadas:**

1. **Reaproveitar o próprio `ModalCompartilharDespesa` como tela de gerenciamento** (sugestão do
   usuário) — o mesmo modal que hoje só cria a divisão passaria a, quando `item.compartilhamentoId`
   já existir, carregar o estado atual e permitir editar. Vantagem: um único componente, um único
   "lugar mental" pra pensar em divisão. Risco: criação (escolher pessoas + valores, uma ação só)
   e gerenciamento (estados diferentes por pessoa, ações condicionais por status, futura
   proposta+concordância pós-aceite) são fluxos bem diferentes em complexidade — misturar os dois
   num componente só tende a reproduzir o mesmo problema de "inchar" que motivou a pergunta,
   só que dentro de outro modal em vez do `ModalDetalhes`.
2. **🟢 Recomendado: modal dedicado `ModalGerenciarDivisao.js`**, novo, só para uma divisão que já
   existe — mesmo padrão que o app já usa para "criar vs. gerenciar o que já existe"
   (`ModalCriacao` vs. `ModalEdicao`; `ModalHistoricoParcelas` como modal dedicado para gerenciar
   as parcelas de uma compra em grupo). `ModalDetalhes.js` volta a ficar tão simples quanto para
   qualquer outro tipo: **uma única linha** ("Divisão · 2 pessoas · Ativa", no mesmo estilo de
   `InfoRow` já usado para "Histórico"/"Compartilhar") que abre esse modal — a seção
   "Compartilhado com"/"Encerrar compartilhamento" que existe hoje dentro do `ModalDetalhes` some
   de lá e vira o conteúdo deste modal novo. `ModalCompartilharDespesa` continua existindo,
   focado só na criação (quando `!item.compartilhamentoId`).
3. Uma tela cheia nova (navegação, como `ConexoesScreen`) — descartada: `ConexoesScreen` gerencia
   TODAS as conexões do usuário (é uma entidade de primeira classe, com aba própria); uma divisão
   de despesa é sempre escopada a UM gasto específico — abrir uma tela de navegação pra isso é
   mais peso do que o caso de uso pede. Um modal (mesma granularidade de "uma ação sobre um item")
   encaixa melhor.

**Conteúdo proposto do `ModalGerenciarDivisao`** (construído em fases, não tudo de uma vez):
- Cabeçalho: descrição, valor total, status (Ativa/Encerrada).
- Lista de participantes com status, reaproveitando o que já existe hoje — cancelar convite
  (`pendente`), sem ação ainda para `aceito` (fica reservado pra proposta+concordância, fase
  futura).
- "Encerrar compartilhamento" — a ação que hoje é um link solto dentro do `ModalDetalhes` passa a
  viver aqui.
- Reaproveita o `SeletorConexoes` (extraído acima) quando "adicionar participante" for
  implementado — mesmo componente usado na criação.

**Plano de implementação em fases — 🔴 revisto (2026-08-17), ver ordem e conteúdo definitivo na
seção 11.3.**

### Decisões (2026-08-17)

1. 🔴 Revisto — não é absorção automática, é o modelo "valor sem destino" (seção 11.3).
2. ✅ **Aprovado** — modal dedicado `ModalGerenciarDivisao`, `ModalCompartilharDespesa` ficando só
   para a criação inicial.
3. ✅ **Ordem revisada** (ver seção 11.3): (1) definir o comportamento do valor após cancelamento,
   (2) ajustar modelo de dados/backend, (3) extrair `SeletorConexoes`, (4) criar
   `ModalGerenciarDivisao`, (5) simplificar `ModalDetalhes`. Adicionar participante, alteração
   pós-aceite e redistribuição mais avançada continuam fora desta rodada.

## 11.3 Modelo de "valor sem destino" (🟡 análise, 2026-08-17 — aguardando decisão, nada implementado)

Desenho completo pedido pelo usuário antes de tocar em código: o que acontece com o valor de um
participante cancelado enquanto ainda `pendente`, sem decidir automaticamente por ele.

### Regra

Cancelar um convite `pendente` **nunca** decide sozinho o destino do valor. Ao cancelar, o
criador escolhe entre três destinos — ou deixa em aberto:
- **Devolver para a própria cota** — soma no `valorCentavos` do criador.
- **Redistribuir entre os participantes atuais** — divide em partes iguais entre as cotas ainda
  `pendente` (participantes já `aceito` nunca são tocados — decisão já registrada, seção 11).
  Redistribuição proporcional/mais sofisticada fica para uma fase futura ("redistribuição mais
  avançada", fora desta rodada).
- **Atribuir a outro participante** já existente na divisão e ainda `pendente` (soma no
  `valorCentavos` dele). **Não** é uma forma de adicionar alguém novo — isso continua sendo a
  funcionalidade "adicionar participante", fora desta rodada; aqui só redireciona valor entre
  quem já está convidado.
- **Decidir depois** — se o criador não escolher na hora, o valor fica marcado como "sem
  destino" e o sistema mantém um alerta visível até ser resolvido.

### Modelo de dados

Dinheiro é fungível — não precisamos rastrear de qual cancelamento especificamente veio cada
parte; um total acumulado é suficiente e bem mais simples do que uma lista por evento:

```
despesasCompartilhadas/{eventoId}
  ...
  valorSemDestinoCentavos: number   // novo — soma de todo valor cancelado ainda não decidido
                                     // (default 0; volta pra 0 quando o criador resolve)
```

Invariante que passa a valer sempre: `valorTotalCentavos == soma(cotas relevantes) +
valorSemDestinoCentavos`. Em qualquer lugar que hoje calcula a cota do criador a partir do total
(`atualizarDivisaoDespesa`, por exemplo), passa a precisar subtrair também
`valorSemDestinoCentavos` — sem isso o total pararia de bater sempre que houver algo pendente de
decisão.

### Backend

- **`cancelarConviteDivisao`** ganha um parâmetro opcional `destino` (mesmo formato usado abaixo).
  Se vier preenchido, resolve tudo na mesma transação (cancela + aplica o destino, atômico). Se
  não vier, cancela e soma `cota.valorCentavos` em `valorSemDestinoCentavos` — sem tocar em mais
  nada.
- **Nova Function `resolverValorSemDestino({ eventoId, destino })`** — só quem criou a divisão,
  só se `valorSemDestinoCentavos > 0`. Aplica o mesmo `destino` (reaproveita a mesma lógica
  interna usada por `cancelarConviteDivisao` quando o destino já vem na hora), zera
  `valorSemDestinoCentavos` e atualiza o(s) `gastos/*.valor` afetado(s) — do criador se
  `'criador'`, ou nada de gasto físico se for outro participante ainda `pendente` (ele só ganha
  gasto no aceite, valor fica refletido na cota/convite dele, mesmo padrão de
  `atualizarDivisaoDespesa`).
- Formato de `destino`: `{ tipo: 'criador' } | { tipo: 'redistribuir' } | { tipo: 'participante',
  participanteId }`.
- ✅ **Decidido (2026-08-17)**: `encerrarCompartilhamento` **não** gera valor "sem destino" — ao
  cancelar todos os convites ainda `pendente` de uma vez (fechando a divisão por completo), o
  valor de cada um volta automaticamente para a cota do criador, sem pergunta nenhuma (não há
  "decidir depois" possível — não vai sobrar divisão nenhuma pra reabrir e decidir). Se já havia
  algum `valorSemDestinoCentavos` pendente de um cancelamento individual anterior, ele também é
  somado à cota do criador neste momento e zerado — a divisão nunca fica "encerrada" com uma
  decisão pendente em aberto. Participantes que já aceitaram nunca são afetados por isso —
  continuam intocados, mesma regra de sempre (seção 11).

### Linha do Tempo

Reaproveita a `acao: 'redistribuido'` que já existe (ícone `swap-horizontal`, hoje usado em
exclusão de parcela de cartão/empréstimo) para `entidade: 'divisaoDespesa'` também — registra
quando o valor é finalmente resolvido (devolvido, redistribuído ou atribuído), nunca no momento
do cancelamento em si (que continua só `convite_cancelado`, sem menção a valor enquanto ele
estiver "sem destino").

### Alerta de decisão pendente

`valorSemDestinoCentavos > 0` é o próprio sinal — não precisa de um campo booleano separado.
Onde aparece:
- **`ModalGerenciarDivisao`** (seção 11.2) — banner destacado no topo: "R$ X,XX sem destino" +
  botão para decidir agora. Lugar principal, sempre visível assim que a tela é aberta.
- **Badge do sino + Central de Avisos** (mesmo mecanismo já usado para convites pendentes,
  `DivisaoDespesaContext`) — passa a contar também despesas próprias com
  `valorSemDestinoCentavos > 0`, não só `convitesPendentes`. Garante que o criador saiba que há
  uma decisão pendente sem precisar abrir cada gasto compartilhado pra descobrir.

### Como isso não compromete o futuro

- **Adicionar participante**: "atribuir a outro participante" só considera quem já está na
  divisão — não é a mesma funcionalidade, não cria atalho nem gambiarra que precise ser desfeita
  depois.
- **Alteração pós-aceite (proposta + concordância)**: o modelo de "sem destino" só move valor
  entre cotas `pendente` (nunca `aceito`) — quando a fase de proposta+concordância for construída,
  ela é uma camada adicional por cima disto, não um retrabalho do que existe aqui.
- **Redistribuição mais avançada**: a redistribuição simples (partes iguais) implementada agora
  não impede trocar por uma lógica proporcional/configurável depois — é só o corpo da função
  `resolverValorSemDestino` (caso `'redistribuir'`) que mudaria, o contrato e o modelo de dados
  continuam os mesmos.

### ✅ Implementado e testado (2026-08-17)

1. ✅ Desenho (esta seção) — decisão final: `encerrarCompartilhamento` devolve tudo
   automaticamente pro criador (nunca gera valor sem destino), justamente por não sobrar divisão
   pra reabrir e decidir depois.
2. ✅ Modelo de dados + Functions — `valorSemDestinoCentavos` (novo campo),
   `cancelarConviteDivisao` com `destino` opcional, nova `resolverValorSemDestino`,
   `atualizarDivisaoDespesa` corrigida para subtrair `valorSemDestinoCentavos` no cálculo da cota
   do criador (invariante da seção). Bug lateral encontrado e corrigido durante a implementação:
   uma cota cancelada precisa zerar o próprio `valorCentavos` (senão o valor era contado duas
   vezes ao mesmo tempo em `valorSemDestinoCentavos` e na soma de `atualizarDivisaoDespesa`). 80
   testes automatizados passando (12 novos: `destino` = criador/participante/redistribuir com
   resto de arredondamento, `resolverValorSemDestino`, invariante, eventos `redistribuido`).
3. ✅ `SeletorConexoes.js` extraído de `ModalCompartilharDespesa.js`, com campo de busca por nome
   — reaproveitado também por `ModalGerenciarDivisao.js` (futuramente, por "adicionar
   participante").
4. ✅ `ModalGerenciarDivisao.js` (novo) + `ModalDecidirDestino.js` (novo, reaproveitado tanto no
   cancelamento quanto para resolver um valor sem destino depois) — lista de participantes com
   status, cancelar individual (abrindo a escolha de destino), banner de valor sem destino,
   encerrar compartilhamento.
5. ✅ `ModalDetalhes.js` simplificado — a seção "Compartilhado com" saiu de lá; agora é uma única
   linha ("Divisão · Gerenciar participantes") que abre o modal novo, igual a qualquer outro tipo
   de gasto (Histórico, Compartilhar). Também corrigido, no mesmo lote: o botão "Compartilhar"
   não aparece mais num gasto que veio de aceitar a divisão de outra pessoa
   (`origemCompartilhamento`) — não há regra decidida ainda pra repassar/encadear uma divisão.

✅ **Implementado e testado (2026-08-17, mesmo dia)** — as três frentes que ficaram "fora do
escopo" acima foram pedidas e implementadas ainda hoje, junto com a indicação visual na lista de
gastos e o participante sem conta:

- **Indicação visual na lista** — `ListItemGasto.js` mostra um ícone pequeno quando o gasto tem
  `compartilhamentoId` OU `origemCompartilhamento` (os dois lados).
- **Participante sem conta (seção 7)** — `criarDivisaoDespesa` e `atualizarDivisaoDespesa` aceitam
  `membroId` além de `uidParticipante`; a cota nasce direto `'aceito'` (sem convite, sem
  pendência), mas segue a mesma trava de edição das cotas `pendente` (decisão do usuário:
  editável só antes do primeiro aceite real). `SeletorConexoes.js` ganhou uma segunda seção "Sem
  conta no app", reaproveitada em `ModalCompartilharDespesa.js` e `ModalAdicionarParticipante.js`.
- **`adicionarParticipante`** (Function nova, Etapa 3.8) — adiciona alguém a uma divisão já
  ativa, tirando o valor sempre da cota do criador (nunca da de quem já aceitou), mesmo depois de
  qualquer aceite. Aceita conexão (ganha convite normal) ou Membro sem conta (entra direto
  `aceito`).
- **Redistribuição proporcional** — nova opção em `aplicarDestino` (`destino.proporcional`),
  ficando ao lado da redistribuição em partes iguais (nunca substituindo), com o resto do
  arredondamento sempre voltando pro criador.
- **Alteração pós-aceite (proposta + concordância, Etapa 3.9)** — `proporAlteracaoCota` (criador)
  + `responderPropostaAlteracao` (participante). Nova subcoleção
  `users/{uid}/propostasDeAlteracao`. Reduzir a cota de quem já aceitou segue o mesmo modelo de
  "valor sem destino" (escolhido na proposta ou decidido depois); aumentar sempre sai da cota do
  criador, sem precisar de destino. `ModalProporAlteracao.js`/`ModalDecidirDestino.js` reaproveitado.
  Nova seção "Propostas de alteração" na Central de Avisos (`ItemPropostaAlteracao.js`), badge do
  sino estendido para contar propostas pendentes e despesas com valor sem destino, não só convites.

98 testes automatizados passando (80 anteriores + 18 novos: Membro sem conta, `adicionarParticipante`,
redistribuição proporcional, `proporAlteracaoCota`/`responderPropostaAlteracao`). Aguardando
validação manual do usuário — nenhuma UI foi testada num dispositivo real ainda.

⚠️ **Observação encontrada durante a implementação, não corrigida (fora do escopo pedido)**: a
expiração automática de convite pendente (`'expirado'`, seção 0/10) tem a mesma classe de bug que
motivou esta seção inteira — o valor da cota expirada também nunca é zerado nem tratado como "sem
destino", então hoje ele já quebra o invariante de `atualizarDivisaoDespesa` (contado a mais na
soma de `naoPendentes`) do mesmo jeito que o cancelamento quebrava antes desta correção. Não é
algo que o usuário pediu para resolver agora — fica registrado para uma rodada futura, quando/se
o modelo de "valor sem destino" for estendido também pra expiração.

🧪 **Ajustes de UX pós-teste manual (2026-08-17, mesmo dia)**:
- Ícone de compartilhamento também no `ModalDetalhes.js` (antes só na lista) — extraído pra um
  helper único, `src/utils/compartilhamento.js` (`deveMostrarIconeCompartilhado`), pra lista e
  modal nunca discordarem entre si.
- **Decisão**: o ícone só desaparece quando "Encerrar compartilhamento" (a divisão inteira) —
  cancelar um convite individual não, porque a divisão continua ativa com os demais. Isso exigiu
  `encerrarCompartilhamento` passar a marcar `origemCompartilhamento.encerrado: true` no gasto de
  quem já aceitou também (antes só o lado do criador saberia que a divisão acabou) — gasto dela
  continua intocado, só ganha esse sinal.
- Alerta de "valor sem destino" também no próprio item da lista (`ListItemGasto.js`) e uma nova
  seção na Central de Avisos (`ItemValorSemDestino.js`) — reaproveita `ModalDecidirDestino` com
  **todas** as opções (devolver/redistribuir/atribuir a outra pessoa), não um atalho que só
  devolve pro criador.
- "Propor alteração" (tocar num participante `aceito`) ganhou um ícone de lápis visível — antes a
  linha inteira era tocável sem nenhum sinal.
- `SeletorConexoes.js`: a seção "Sem conta no app" agora aparece sempre, mesmo com zero Membro
  cadastrado (antes só aparecia com pelo menos um, então a opção nunca era descoberta).

🧪 **Segunda rodada de ajustes de UX pós-teste manual (2026-08-17)** — feedback item a item:
- Ícone de compartilhado, na lista e no `ModalDetalhes.js`, movido para ao lado do nome/título do
  gasto (antes ficava numa posição isolada, longe do texto que ele qualifica).
- `ModalGerenciarDivisao.js`: no participante já aceito, o ícone de lápis (propor alteração) agora
  vem **antes** do texto de status ("Aceito"), não depois — mesma linha, ordem trocada.
- A informação "Ativa"/"Encerrada" da divisão saiu do `ModalGerenciarDivisao.js` e passou a
  aparecer também no `ModalDetalhes.js`, na própria linha "Divisão" (`statusDivisaoTexto`,
  calculado por quem já tem os dados — `SaidasScreen.js` — e passado por prop, nunca buscado de
  novo dentro do modal, seção 19).
- **Novo tipo de destino: `novoParticipante`** — em "Decidir agora" (tanto no cancelamento de um
  convite pendente quanto na resolução de um valor já sem destino), agora é possível escolher
  **qualquer conexão aceita ou Membro sem conta que ainda não fazia parte da divisão** e destinar
  o valor direto a essa pessoa, sem precisar devolver pro criador primeiro pra depois compartilhar
  de novo. Isso cria um convite novo (ou uma cota `aceito` direta, se for Membro sem conta) dentro
  da mesma divisão. Distinção importante, decidida explicitamente pelo usuário: isto é **diferente**
  de aumentar a cota de alguém que **já aceitou** — esse caso continua exclusivamente pelo fluxo de
  proposta + concordância (`proporAlteracaoCota`, seção 11.1), porque exige o consentimento da outra
  pessoa. `novoParticipante` nunca mexe em cota de quem já está na divisão.
  - Backend: `validarDestino` estendido, mais dois helpers novos —
    `resolverNovoParticipante` (valida a conexão/Membro, rejeita se a pessoa já tiver qualquer cota
    na divisão, roda **antes** de qualquer escrita da transação, já que precisa ler
    `conexoes`/`membros`/perfil) e `registrarNovoParticipanteDestino` (grava o convite — só se for
    conexão com conta — e os eventos de Linha do Tempo dos dois lados).
  - UI: `ModalDecidirDestino.js` ganhou uma opção "Destinar a uma pessoa nova" que abre um segundo
    passo com `SeletorConexoes` em seleção única; `ModalGerenciarDivisao.js` e
    `ItemValorSemDestino.js` (Central de Avisos) passam a fornecer as listas de conexões/Membros
    disponíveis (já filtradas para excluir quem já está na divisão) para essa opção existir nos
    dois lugares onde "Decidir agora" aparece.
- **Reabrir compartilhamento depois de encerrar** — decisão do usuário (via pergunta direta):
  "Divisão nova". `encerrarCompartilhamento` continua definitivo (nunca reabre a mesma divisão);
  em vez disso, `criarDivisaoDespesa` foi ajustada para permitir compartilhar o mesmo gasto de novo
  quando a divisão anterior já estiver com `status: 'encerrada'` (antes a regra da seção 6.1
  rejeitava sempre que `gasto.compartilhamentoId` existisse, sem checar o status). A divisão antiga
  permanece intacta no Firestore (histórico da Linha do Tempo preservado, já que os eventos são
  indexados pelo id do próprio gasto, não pelo id da despesa compartilhada) e o `compartilhamentoId`
  do gasto passa a apontar para a divisão nova. `ModalDetalhes.js`: o botão "Compartilhar" volta a
  aparecer quando `statusDivisaoTexto === 'Encerrada'`, não só quando não há `compartilhamentoId`
  nenhum.

105 testes automatizados passando em `functions/` (98 anteriores + 7 novos: `novoParticipante` nos
dois pontos de entrada, incluindo as duas rejeições — pessoa já na divisão, pessoa que não é
conexão aceita — e o compartilhamento de novo depois de `encerrada`, incluindo a rejeição enquanto
a divisão anterior ainda está `ativa`). Aguardando validação manual do usuário.

🧪 **Unificação da linha "Compartilhar"/"Divisão" em `ModalDetalhes.js` (2026-08-17, protótipo,
aguardando validação visual)**: as duas linhas chegavam a aparecer juntas ao mesmo tempo quando a
divisão estava `encerrada` (mesmo assunto, duas entradas — percebido pelo usuário). Viraram uma
única linha "Compartilhamento", cujo texto/selo e destino do toque mudam conforme o estado, sem
trocar nenhum roteamento existente: nunca compartilhado ou divisão `encerrada` → `onSharePress`
(escolher com quem, mesmo fluxo de sempre); divisão `ativa` → `onGerenciarDivisao` (mesmo
`ModalGerenciarDivisao.js` de sempre). Não é uma ação nova — nenhum evento novo de Linha do Tempo
foi criado; as ações por trás (compartilhar, gerenciar, cancelar, encerrar) já registravam eventos
antes e continuam registrando exatamente como antes.

🧪 **Terceira rodada de ajustes de UX pós-teste manual (2026-08-17)** — feedback sobre o Membro sem
conta e sobre a falta de uma ação de "excluir" separada da de "editar":
- **Selo "Sem conta no app"** — `ModalGerenciarDivisao.js` agora mostra esse selo (ícone
  `account-off-outline` + texto) abaixo do nome de todo participante `membroSemConta` já aceito;
  antes ele era indistinguível de um participante real que aceitou.
- **Editar a cota de um Membro sem conta** — `atualizarDivisaoDespesa` (Etapa 3.4) já suportava isso
  no backend (edição direta, sem consentimento, só até o primeiro aceite real de alguém com conta),
  mas não tinha nenhuma tela. Novo `ModalEditarCotaMembro.js` (pencil na linha do participante) +
  `editarCotaMembro` (hook/contexto) — sempre envia o conjunto inteiro de cotas ainda editáveis
  (exigência da própria Function), o Membro sendo editado com o valor novo.
- **Excluir um Membro sem conta** — não existia nenhuma forma de remover um Membro sem conta de uma
  divisão ativa (`atualizarDivisaoDespesa` rejeita explicitamente adicionar/remover participante).
  Nova Function `removerParticipanteSemConta` — direta, sem consentimento (mesma razão de já poder
  editar direto), reaproveitando o mesmo mecanismo de destino do cancelamento (devolver/
  redistribuir/atribuir a alguém existente ou novo/deixar sem destino). Ícone de lixeira na linha do
  participante, ao lado do lápis.
- **Excluir um participante com conta já aceito** — decisão explícita (2026-08-17): nunca remoção
  direta pelo criador, sempre via o fluxo de proposta já existente (`proporAlteracaoCota` com
  `novoValorCentavos: 0`), porque o dinheiro é do participante. Bug corrigido no aceite da proposta
  (`responderPropostaAlteracao`): antes, aceitar uma proposta de R$0 deixava a cota "zumbi" —
  `status: 'aceito'` com `valorCentavos: 0` pra sempre, sem forma de esconder ou reativar. Agora, se
  `valorNovoCentavos === 0`, a cota vira `status: 'removido'` (nova legenda na lista, mesmo
  tratamento visual de `cancelado`/`expirado`). Ícone de lixeira na linha do participante `aceito`,
  abrindo o mesmo `ModalProporAlteracao.js` num modo `modoRemover` (título/texto/botão diferentes,
  valor sempre R$0, mesmo fluxo de destino e consentimento de qualquer alteração de cota).
- Threading que faltava: `ModalDecidirDestino` usado de dentro de `ModalProporAlteracao.js` não
  recebia `conexoesAceitas`/`membrosSelecionaveis` — corrigido (mesma classe de omissão já corrigida
  nos outros dois pontos de entrada de "Decidir agora").

110 testes automatizados passando em `functions/` (105 anteriores + 5 novos: `removerParticipanteSemConta`
— sem destino, com destino `criador`, rejeição de participante com conta, rejeição de quem não é o
criador — e `responderPropostaAlteracao` marcando `status: 'removido'` ao aceitar uma proposta de
R$0). Aguardando validação manual do usuário.

🧪 **Quarta rodada de ajustes de UX pós-teste manual (2026-08-17)**:
- **Trava de edição do Membro sem conta revista** — a trava "não editar depois de qualquer aceite
  real" (seção 7/11.3) protegia contra a coisa errada: editar `descrição`/`valor total` depois que
  alguém aceitou de fato mudaria o que essa pessoa concordou, mas editar só a cota de um Membro sem
  conta nunca toca no valor de quem já aceitou (a diferença sempre fica entre o criador e o Membro).
  `atualizarDivisaoDespesa` agora só rejeita quando a chamada tenta mudar `descrição`/`valor total`
  depois de um aceite real — cotas (Membro sem conta ou participante com conta ainda `pendente`)
  continuam editáveis sempre que a divisão estiver ativa. O lápis do Membro sem conta em
  `ModalGerenciarDivisao.js` não some mais depois de um aceite real.
- **Avatar de quem tem conta** — antes só aparecia em `SeletorConexoes.js`/`ModalAdicionarParticipante.js`.
  Estendido a todo lugar da Colaboração onde uma conexão é "chamada" pelo nome: participantes em
  `ModalGerenciarDivisao.js` (Membro sem conta também ganhou avatar, já que ele também tem um),
  remetente do convite em `ItemConviteDivisao.js`, autor da proposta em `ItemPropostaAlteracao.js`
  — todos via o mesmo `avatarSnapshot` já salvo em `conexoesAceitas`, nenhum dado novo, nenhuma
  mudança de schema.

111 testes automatizados passando em `functions/` (110 anteriores; o teste que checava a trava
antiga foi substituído por dois: um confirmando que editar a cota do Membro sem conta continua
permitido depois de um aceite real, outro confirmando que editar descrição/valor total continua
rejeitado nesse cenário). Aguardando validação manual do usuário.

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
- **Primeira infraestrutura de backend do projeto**: 7 Cloud Functions (seção 12) + `cancelarConexao`
  (nova, seção 1, 2026-08-13) + o que o bloqueio de usuário exigir (desenho em definição).
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
- Sem denúncia/reporte de usuário.
- ~~Sem bloqueio explícito de usuário~~ 🟡 **Reaberto em 2026-08-13** — vai entrar na V1, desenho
  em definição (ver seção 1).

## Plano de implementação por etapas (🟢 proposta)

1. ✅ **Infraestrutura de Cloud Functions** (concluída, validada 2026-08-13) — feita **inteiramente
   local**, sem habilitar Blaze (decisão revista em relação à proposta original: em vez de
   habilitar Blaze já na Etapa 1, provamos a infraestrutura toda contra o Firebase Local
   Emulator Suite primeiro — ver `ARQUITETURA.md` seção 7.3). JDK instalado, `functions/`
   configurada, `pingDiagnostico` publicada e testada de ponta a ponta (Auth + Functions +
   Firestore, app real conectado via Wi-Fi). Habilitar Blaze de verdade continua em aberto,
   sem data definida — só quando/se formos publicar de verdade.
2. ✅ **Conexões** (concluída, validada 2026-08-14) — escopo final maior que o proposto
   originalmente aqui: código de conexão, `solicitarConexao`, `responderConexao`
   (aceitar/recusar, com opção de recusar+bloquear), **`cancelarConexao`** (nova, não estava
   nesta lista original) e **bloquear/desbloquear** (`bloquearConexao`/`desbloquearConexao`,
   reabertos — antes listados como fora da V1 na seção 17, decisão revertida em 2026-08-13).
   Expiração "preguiçosa" de solicitação pendente (15 dias) implementada junto. Tela
   "Conexões" com 3 abas (Conexões/Solicitações/Bloqueados, `ModernTabs`). 30 testes
   automatizados (`functions/conexoes.test.js`, Jest + Firestore Emulator) + validação manual
   completa via app real (Expo Go, Wi-Fi). Desbloquear restaura a conexão automaticamente para
   `aceita` (não exige reconectar do zero — decisão tomada depois de testar o fluxo contrário e
   achar confuso).
3. ✅ **Modelo de dados + Functions de divisão de despesa** (concluída, validada 2026-08-14) —
   `criarDivisaoDespesa` (do zero e a partir de um gasto já existente via `origemLancamentoId`,
   Etapa 3.5 — seção 4), `aceitarConviteDivisao`/`recusarConviteDivisao` (3.2),
   `cancelarConviteDivisao` (3.3), `atualizarDivisaoDespesa` (3.4, trava assim que algum
   participante aceita — seção 9 — sem adicionar/remover participante, só ajustar valores dos
   que ainda estão `pendente`). Todo evento relevante espelhado nos dois lados na Linha do Tempo
   (seção 2.1). 61 testes automatizados (`functions/divisaoDespesa.test.js` +
   `conexoes.test.js`, Jest + Firestore Emulator). Ainda sem UI — próxima etapa.
4. ✅ **UI de compartilhar despesa** (implementada 2026-08-14, aguardando validação manual do
   usuário) — escopo decidido com o usuário: só retrofit (compartilhar um gasto já existente a
   partir de `ModalDetalhes.js`), sem um segundo fluxo de "criar já compartilhada do zero".
   Convites pendentes reaproveitam o sino de notificações e a Central de Avisos já existentes —
   nenhuma tela nova de navegação — através de uma única fonte de estado
   (`DivisaoDespesaContext`, um só listener em `convitesDeDivisao`/`despesasCompartilhadas`,
   montado uma vez perto da raiz do app). Sem testes automatizados nesta etapa (não há
   infraestrutura de teste de componente React Native no projeto — mesmo padrão já usado na UI
   da Etapa 2/Conexões, validada manualmente via Expo Go). Detalhe técnico: o Provider só monta
   os listeners quando `colaboracaoDisponivel` é verdadeiro — em apps publicados, nenhum listener
   chega a abrir.
5. **Indicação visual** — badge na lista, seção "Compartilhado" em `ModalDetalhes.js`, eventos
   na Linha do Tempo. O badge do sino de notificações já foi antecipado na Etapa 4 (peça pequena,
   direto ligada aos convites); o que falta aqui é a indicação no próprio item da lista de gastos
   e o bloco "Compartilhado" dentro do `ModalDetalhes`.
6. **Participante sem conta** — campo no Membro, seleção no seletor de cotas. Pode ser feita em
   paralelo à etapa 4, é independente.
7. **`firestore.rules` das novas coleções + testes reais** — já em prática desde a Etapa 2 (Java
   instalado, testes automatizados rodando contra o emulador); esta etapa passa a ser sobre as
   coleções de despesa compartilhada especificamente.

Cada etapa é entregável e testável isoladamente — segue o mesmo princípio já usado no projeto
("uma melhoria por vez, validar antes de seguir").
