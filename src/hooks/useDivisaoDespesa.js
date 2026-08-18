// src/hooks/useDivisaoDespesa.js
// Colaboração entre Usuários — Divisão de despesa, UI (Etapa 4, ver
// COLABORACAO_ARQUITETURA_V1.md seções 2, 2.1, 4). Backend já concluído e
// testado na Etapa 3 (functions/divisaoDespesa.js). Mesmo padrão de
// useConexoes.js: listener único por coleção, "um dono, vários
// apresentadores" (ver ARQUITETURA.md seção 19).
import { useState, useEffect } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { colaboracaoDisponivel } from '../config/featureFlags';

export const useDivisaoDespesa = () => {
  const { user } = useAuth();
  const [despesas, setDespesas] = useState([]);
  const [loadingDespesas, setLoadingDespesas] = useState(true);
  const [convites, setConvites] = useState([]);
  const [loadingConvites, setLoadingConvites] = useState(true);

  // Listener das despesas que EU criei (`despesasCompartilhadas`) — só liga
  // se a Colaboração já estiver disponível (ver src/config/featureFlags.js):
  // enquanto o backend real não for publicado, nenhum app publicado deve
  // sequer tentar abrir esse listener (mesmo cuidado de ConexoesScreen.js).
  useEffect(() => {
    if (!user?.uid || !colaboracaoDisponivel) {
      setDespesas([]);
      setLoadingDespesas(false);
      return;
    }

    const ref = collection(db, 'users', user.uid, 'despesasCompartilhadas');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setDespesas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingDespesas(false);
      },
      (err) => {
        console.error('Erro ao carregar despesas compartilhadas:', err);
        setLoadingDespesas(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Listener dos convites que EU recebi (`convitesDeDivisao`) — mesmo
  // cuidado acima. É a única fonte de pendência de divisão de despesa: o
  // badge do sino (TelaPadrao.js) e a Central de Avisos (CentralAvisosScreen.js)
  // consomem este mesmo array via DivisaoDespesaContext, nunca uma cópia à parte.
  useEffect(() => {
    if (!user?.uid || !colaboracaoDisponivel) {
      setConvites([]);
      setLoadingConvites(false);
      return;
    }

    const ref = collection(db, 'users', user.uid, 'convitesDeDivisao');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setConvites(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingConvites(false);
      },
      (err) => {
        console.error('Erro ao carregar convites de divisão:', err);
        setLoadingConvites(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Listener das propostas de alteração pós-aceite que EU recebi (seção
  // 11.1/11.3, 2026-08-17) — mesmo padrão dos convites: única fonte, badge
  // do sino/Central de Avisos consomem daqui, nunca uma cópia própria.
  const [propostas, setPropostas] = useState([]);
  const [loadingPropostas, setLoadingPropostas] = useState(true);

  useEffect(() => {
    if (!user?.uid || !colaboracaoDisponivel) {
      setPropostas([]);
      setLoadingPropostas(false);
      return;
    }

    const ref = collection(db, 'users', user.uid, 'propostasDeAlteracao');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setPropostas(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingPropostas(false);
      },
      (err) => {
        console.error('Erro ao carregar propostas de alteração:', err);
        setLoadingPropostas(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const convitesPendentes = convites.filter((c) => c.status === 'pendente');
  const propostasPendentes = propostas.filter((p) => p.status === 'pendente');
  // Despesas próprias com uma decisão de valor ainda em aberto (seção 11.3)
  // — conta pro mesmo badge de "coisa que precisa da sua atenção".
  const despesasComValorSemDestino = despesas.filter((d) => (d.valorSemDestinoCentavos || 0) > 0);

  // Compartilha um gasto já existente (Etapa 3.5/4.6) — `descricao` vem do
  // próprio gasto, nunca digitada de novo pelo usuário (o valor total também
  // é sempre derivado do gasto no servidor, nunca enviado por aqui — ver
  // functions/divisaoDespesa.js).
  const [compartilhando, setCompartilhando] = useState(false);
  const [errorCompartilhar, setErrorCompartilhar] = useState(null);

  const compartilharGastoExistente = async ({ origemLancamentoId, descricao, cotas }) => {
    setCompartilhando(true);
    setErrorCompartilhar(null);
    try {
      const criarDivisaoDespesaFn = httpsCallable(functions, 'criarDivisaoDespesa');
      const resposta = await criarDivisaoDespesaFn({ origemLancamentoId, descricao, cotas });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível compartilhar esta despesa.';
      setErrorCompartilhar(mensagem);
      throw new Error(mensagem);
    } finally {
      setCompartilhando(false);
    }
  };

  const [respondendoEventoId, setRespondendoEventoId] = useState(null);
  const [errorResponderConvite, setErrorResponderConvite] = useState(null);

  const aceitarConvite = async (eventoId) => {
    setRespondendoEventoId(eventoId);
    setErrorResponderConvite(null);
    try {
      const fn = httpsCallable(functions, 'aceitarConviteDivisao');
      const resposta = await fn({ eventoId });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível aceitar o convite.';
      setErrorResponderConvite(mensagem);
      throw new Error(mensagem);
    } finally {
      setRespondendoEventoId(null);
    }
  };

  const recusarConvite = async (eventoId) => {
    setRespondendoEventoId(eventoId);
    setErrorResponderConvite(null);
    try {
      const fn = httpsCallable(functions, 'recusarConviteDivisao');
      const resposta = await fn({ eventoId });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível recusar o convite.';
      setErrorResponderConvite(mensagem);
      throw new Error(mensagem);
    } finally {
      setRespondendoEventoId(null);
    }
  };

  // Cancela um convite individual ainda pendente (Etapa 3.3/seção 11.1) — só
  // quem criou a divisão pode chamar. `cancelandoConviteId` guarda o
  // `eventoId` da divisão sendo cancelada (não o uidParticipante — cada
  // divisão só tem uma ação de cancelamento em andamento por vez na UI).
  const [cancelandoConviteId, setCancelandoConviteId] = useState(null);
  const [errorCancelarConvite, setErrorCancelarConvite] = useState(null);

  // `destino` (seção 11.3) é opcional — sem ele, o valor da cota cancelada
  // fica "sem destino" até uma decisão posterior (ver resolverValorSemDestino
  // abaixo). Nunca decide sozinho: devolver/redistribuir/atribuir é sempre
  // uma escolha explícita de quem chama.
  const cancelarConvite = async (eventoId, uidParticipante, destino) => {
    setCancelandoConviteId(eventoId);
    setErrorCancelarConvite(null);
    try {
      const fn = httpsCallable(functions, 'cancelarConviteDivisao');
      const resposta = await fn({ eventoId, uidParticipante, destino });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível cancelar o convite.';
      setErrorCancelarConvite(mensagem);
      throw new Error(mensagem);
    } finally {
      setCancelandoConviteId(null);
    }
  };

  // Decide o destino de um valor que ficou "sem destino" de um cancelamento
  // anterior (seção 11.3) — mesmo `destino` aceito por cancelarConvite.
  const [resolvendoValorSemDestino, setResolvendoValorSemDestino] = useState(false);
  const [errorResolverValorSemDestino, setErrorResolverValorSemDestino] = useState(null);

  const resolverValorSemDestino = async (eventoId, destino) => {
    setResolvendoValorSemDestino(true);
    setErrorResolverValorSemDestino(null);
    try {
      const fn = httpsCallable(functions, 'resolverValorSemDestino');
      const resposta = await fn({ eventoId, destino });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível decidir o destino do valor.';
      setErrorResolverValorSemDestino(mensagem);
      throw new Error(mensagem);
    } finally {
      setResolvendoValorSemDestino(false);
    }
  };

  // Encerra a divisão inteira — único caminho para excluir/remover um gasto
  // já compartilhado (Etapa 3.6/seção 11.1). Cancela convites ainda
  // pendentes e avisa quem já aceitou; o gasto de quem aceitou nunca é
  // tocado (seção 11).
  const [encerrando, setEncerrando] = useState(false);
  const [errorEncerrar, setErrorEncerrar] = useState(null);

  const encerrarCompartilhamento = async (eventoId) => {
    setEncerrando(true);
    setErrorEncerrar(null);
    try {
      const fn = httpsCallable(functions, 'encerrarCompartilhamento');
      const resposta = await fn({ eventoId });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível encerrar o compartilhamento.';
      setErrorEncerrar(mensagem);
      throw new Error(mensagem);
    } finally {
      setEncerrando(false);
    }
  };

  // Adiciona um participante a uma divisão já ativa (Etapa 3.8, seção
  // 11.1/11.3) — o valor sempre sai da própria cota do criador. Aceita
  // `{uidParticipante}` (conexão com conta) OU `{membroId}` (Membro sem
  // conta, seção 7), nunca os dois.
  const [adicionandoParticipante, setAdicionandoParticipante] = useState(false);
  const [errorAdicionarParticipante, setErrorAdicionarParticipante] = useState(null);

  const adicionarParticipante = async ({ eventoId, uidParticipante, membroId, valorCentavos }) => {
    setAdicionandoParticipante(true);
    setErrorAdicionarParticipante(null);
    try {
      const fn = httpsCallable(functions, 'adicionarParticipante');
      const resposta = await fn({ eventoId, uidParticipante, membroId, valorCentavos });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível adicionar este participante.';
      setErrorAdicionarParticipante(mensagem);
      throw new Error(mensagem);
    } finally {
      setAdicionandoParticipante(false);
    }
  };

  // Propõe alterar a cota de quem já aceitou (Etapa 3.9, seção 11.1/11.3) —
  // nada muda até a pessoa concordar via responderProposta abaixo.
  const [propondo, setPropondo] = useState(false);
  const [errorPropor, setErrorPropor] = useState(null);

  const proporAlteracaoCota = async ({ eventoId, participanteId, novoValorCentavos, destino }) => {
    setPropondo(true);
    setErrorPropor(null);
    try {
      const fn = httpsCallable(functions, 'proporAlteracaoCota');
      const resposta = await fn({ eventoId, participanteId, novoValorCentavos, destino });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível propor esta alteração.';
      setErrorPropor(mensagem);
      throw new Error(mensagem);
    } finally {
      setPropondo(false);
    }
  };

  // Edita a cota de um Membro sem conta (seção 7) — direto, sem
  // consentimento, via a Function já existente (Etapa 3.4). Precisa enviar o
  // conjunto inteiro de cotas ainda editáveis (quem chama monta esse array).
  const [editandoCotaMembro, setEditandoCotaMembro] = useState(false);
  const [errorEditarCotaMembro, setErrorEditarCotaMembro] = useState(null);

  const editarCotaMembro = async ({ eventoId, cotas }) => {
    setEditandoCotaMembro(true);
    setErrorEditarCotaMembro(null);
    try {
      const fn = httpsCallable(functions, 'atualizarDivisaoDespesa');
      const resposta = await fn({ eventoId, cotas });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível editar esta cota.';
      setErrorEditarCotaMembro(mensagem);
      throw new Error(mensagem);
    } finally {
      setEditandoCotaMembro(false);
    }
  };

  // Remove um Membro sem conta de uma divisão ativa (seção 7/11.3) — direto,
  // sem consentimento (participante com conta segue exigindo proposta, ver
  // proporAlteracaoCota acima). `destino` opcional, mesmo modelo do
  // cancelamento de convite.
  const [removendoMembroId, setRemovendoMembroId] = useState(null);
  const [errorRemoverMembro, setErrorRemoverMembro] = useState(null);

  const removerParticipanteSemConta = async (eventoId, participanteId, destino) => {
    setRemovendoMembroId(participanteId);
    setErrorRemoverMembro(null);
    try {
      const fn = httpsCallable(functions, 'removerParticipanteSemConta');
      const resposta = await fn({ eventoId, participanteId, destino });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível remover este participante.';
      setErrorRemoverMembro(mensagem);
      throw new Error(mensagem);
    } finally {
      setRemovendoMembroId(null);
    }
  };

  const [respondendoPropostaId, setRespondendoPropostaId] = useState(null);
  const [errorResponderProposta, setErrorResponderProposta] = useState(null);

  const responderProposta = async (propostaId, aceitar) => {
    setRespondendoPropostaId(propostaId);
    setErrorResponderProposta(null);
    try {
      const fn = httpsCallable(functions, 'responderPropostaAlteracao');
      const resposta = await fn({ propostaId, aceitar });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível responder a esta proposta.';
      setErrorResponderProposta(mensagem);
      throw new Error(mensagem);
    } finally {
      setRespondendoPropostaId(null);
    }
  };

  return {
    despesas,
    loadingDespesas,
    despesasComValorSemDestino,
    convites,
    convitesPendentes,
    loadingConvites,
    propostas,
    propostasPendentes,
    loadingPropostas,

    compartilhando,
    errorCompartilhar,
    compartilharGastoExistente,

    respondendoEventoId,
    errorResponderConvite,
    aceitarConvite,
    recusarConvite,

    cancelandoConviteId,
    errorCancelarConvite,
    cancelarConvite,

    resolvendoValorSemDestino,
    errorResolverValorSemDestino,
    resolverValorSemDestino,

    encerrando,
    errorEncerrar,
    encerrarCompartilhamento,

    adicionandoParticipante,
    errorAdicionarParticipante,
    adicionarParticipante,

    propondo,
    errorPropor,
    proporAlteracaoCota,

    editandoCotaMembro,
    errorEditarCotaMembro,
    editarCotaMembro,

    removendoMembroId,
    errorRemoverMembro,
    removerParticipanteSemConta,

    respondendoPropostaId,
    errorResponderProposta,
    responderProposta,
  };
};
