// src/hooks/useConexoes.js
// Colaboração entre Usuários (ver COLABORACAO_ARQUITETURA_V1.md seção 1).
// Etapa 2.1: código de conexão do próprio usuário. Etapa 2.2: enviar
// solicitação (solicitarConexao) + listener das próprias conexões. Responder
// (2.3), cancelar (2.4) e bloquear (2.5) entram aqui também, sem trocar de
// arquivo.
import { useState, useEffect } from 'react';
import { collection, doc, getDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../config/firebase';
import { useAuth } from '../auth/useAuth';

// Sem 0/O/1/I/L — evita confusão na hora de ler o código em voz alta ou
// copiar de cabeça (mesmo cuidado de outros apps que usam código curto).
const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const TAMANHO_CODIGO = 8;
const TENTATIVAS_MAX = 5;

function gerarCandidatoCodigo() {
  let codigo = '';
  for (let i = 0; i < TAMANHO_CODIGO; i++) {
    codigo += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return codigo;
}

export const useConexoes = () => {
  const { user, profile, atualizarPerfilLocal } = useAuth();
  const [gerando, setGerando] = useState(false);
  const [error, setError] = useState(null);
  const [conexoes, setConexoes] = useState([]);
  const [loadingConexoes, setLoadingConexoes] = useState(true);
  const [bloqueios, setBloqueios] = useState([]);
  const [loadingBloqueios, setLoadingBloqueios] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [errorSolicitacao, setErrorSolicitacao] = useState(null);

  // Listener único da própria subcoleção `conexoes` — as abas da tela (ver
  // ConexoesScreen.js) só filtram esse mesmo array por papel/status, nenhuma
  // faz sua própria busca (mesmo princípio de "um dono, vários apresentadores"
  // já usado no resto do app — ver ARQUITETURA.md seção 19).
  useEffect(() => {
    if (!user?.uid) {
      setConexoes([]);
      setLoadingConexoes(false);
      return;
    }

    const ref = collection(db, 'users', user.uid, 'conexoes');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setConexoes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingConexoes(false);
      },
      (err) => {
        console.error('Erro ao carregar conexões:', err);
        setLoadingConexoes(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Listener da própria subcoleção `bloqueios` — mesmo princípio do listener
  // de `conexoes` acima.
  useEffect(() => {
    if (!user?.uid) {
      setBloqueios([]);
      setLoadingBloqueios(false);
      return;
    }

    const ref = collection(db, 'users', user.uid, 'bloqueios');
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        setBloqueios(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingBloqueios(false);
      },
      (err) => {
        console.error('Erro ao carregar bloqueios:', err);
        setLoadingBloqueios(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  // Gera o código de conexão do próprio usuário, se ele ainda não tiver um.
  // Idempotente: se `profile.codigoConexao` já existe, só devolve o mesmo
  // valor, nunca gera de novo (o código é permanente — ver firestore.rules).
  const gerarMeuCodigoSeNecessario = async () => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    if (profile?.codigoConexao) return profile.codigoConexao;

    setGerando(true);
    setError(null);
    try {
      for (let tentativa = 0; tentativa < TENTATIVAS_MAX; tentativa++) {
        const candidato = gerarCandidatoCodigo();
        const codigoRef = doc(db, 'codigosConexao', candidato);

        // Checa colisão antes de gravar — dois usuários sorteando o mesmo
        // código é raro (8 caracteres, ~32^8 combinações), mas fácil de
        // tratar: só tenta de novo com outro candidato.
        const snap = await getDoc(codigoRef);
        if (snap.exists()) continue;

        const batch = writeBatch(db);
        batch.set(codigoRef, { uid: user.uid });
        batch.update(doc(db, 'users', user.uid), { codigoConexao: candidato });
        await batch.commit();

        // Só atualiza o estado local (sem `carregarPerfil`, que alterna
        // `profileLoading` e desmontaria a tela atual — ver useAuth.js).
        atualizarPerfilLocal({ codigoConexao: candidato });
        return candidato;
      }

      throw new Error(
        'Não foi possível gerar um código único — tente novamente em instantes.'
      );
    } catch (err) {
      console.error('Erro ao gerar código de conexão:', err);
      setError(err.message);
      throw err;
    } finally {
      setGerando(false);
    }
  };

  // Envia uma solicitação de conexão a partir do código de outra pessoa —
  // resolve o código pro uid direto no cliente (leitura simples, já coberta
  // por firestore.rules) e só então chama a Function, que faz toda a
  // validação de negócio (ver functions/conexoes.js).
  const enviarSolicitacao = async (codigoDigitado) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    const codigo = (codigoDigitado || '').trim().toUpperCase();
    if (!codigo) throw new Error('Digite um código.');

    setEnviando(true);
    setErrorSolicitacao(null);
    try {
      const codigoSnap = await getDoc(doc(db, 'codigosConexao', codigo));
      if (!codigoSnap.exists()) {
        throw new Error('Código não encontrado.');
      }

      const uidDestino = codigoSnap.data().uid;
      if (uidDestino === user.uid) {
        throw new Error('Esse é o seu próprio código.');
      }

      const solicitarConexaoFn = httpsCallable(functions, 'solicitarConexao');
      const resposta = await solicitarConexaoFn({ uidDestino });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível enviar a solicitação.';
      setErrorSolicitacao(mensagem);
      throw new Error(mensagem);
    } finally {
      setEnviando(false);
    }
  };

  // Aceita ou recusa uma solicitação recebida — `bloquear` (opcional) só faz
  // sentido junto de uma recusa (ver responderConexao). A UI de "recusar e
  // bloquear" ainda não existe (fica pra quando a Etapa 2.5 também cobrir
  // bloquear a partir de um contato já conectado); a Function já suporta.
  const [respondendoId, setRespondendoId] = useState(null);
  const [errorResposta, setErrorResposta] = useState(null);

  const responderSolicitacao = async (conexaoId, aceitar, bloquear = false) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');

    setRespondendoId(conexaoId);
    setErrorResposta(null);
    try {
      const responderConexaoFn = httpsCallable(functions, 'responderConexao');
      const resposta = await responderConexaoFn({ conexaoId, aceitar, bloquear });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível responder a solicitação.';
      setErrorResposta(mensagem);
      throw new Error(mensagem);
    } finally {
      setRespondendoId(null);
    }
  };

  // Cancela uma solicitação enviada, ainda pendente (antes do destinatário
  // responder) — ver functions/conexoes.js `cancelarConexao`.
  const [cancelandoId, setCancelandoId] = useState(null);
  const [errorCancelamento, setErrorCancelamento] = useState(null);

  const cancelarSolicitacao = async (conexaoId) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');

    setCancelandoId(conexaoId);
    setErrorCancelamento(null);
    try {
      const cancelarConexaoFn = httpsCallable(functions, 'cancelarConexao');
      const resposta = await cancelarConexaoFn({ conexaoId });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível cancelar a solicitação.';
      setErrorCancelamento(mensagem);
      throw new Error(mensagem);
    } finally {
      setCancelandoId(null);
    }
  };

  // Bloqueia um contato já conectado (o outro caminho, "recusar e bloquear",
  // é feito junto de responderSolicitacao) — ver functions/conexoes.js
  // `bloquearConexao`. A confirmação ("tem certeza?") é responsabilidade da
  // tela, não do hook.
  const [bloqueandoId, setBloqueandoId] = useState(null);
  const [errorBloqueio, setErrorBloqueio] = useState(null);

  const bloquearContato = async (uidBloqueado) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');

    setBloqueandoId(uidBloqueado);
    setErrorBloqueio(null);
    try {
      const bloquearConexaoFn = httpsCallable(functions, 'bloquearConexao');
      const resposta = await bloquearConexaoFn({ uidBloqueado });
      return resposta.data;
    } catch (err) {
      const mensagem = err.message || 'Não foi possível bloquear este usuário.';
      setErrorBloqueio(mensagem);
      throw new Error(mensagem);
    } finally {
      setBloqueandoId(null);
    }
  };

  // Desbloquear restaura a conexão automaticamente se ela estava bloqueada —
  // por isso precisa de Function (ver functions/conexoes.js `desbloquearConexao`),
  // não é mais só apagar o próprio registro (decisão revista em 2026-08-13,
  // depois do teste real mostrar que "some e não volta" confundia o fluxo).
  const desbloquear = async (uidBloqueado) => {
    if (!user?.uid) throw new Error('Usuário não autenticado.');
    const desbloquearConexaoFn = httpsCallable(functions, 'desbloquearConexao');
    const resposta = await desbloquearConexaoFn({ uidBloqueado });
    return resposta.data;
  };

  const solicitacoesEnviadas = conexoes.filter(
    (c) => c.papel === 'solicitante' && c.status === 'pendente'
  );
  const solicitacoesRecebidas = conexoes.filter(
    (c) => c.papel === 'destinatario' && c.status === 'pendente'
  );
  const conexoesAceitas = conexoes.filter((c) => c.status === 'aceita');

  return {
    meuCodigo: profile?.codigoConexao || null,
    gerando,
    error,
    gerarMeuCodigoSeNecessario,

    conexoes,
    loadingConexoes,
    solicitacoesEnviadas,
    solicitacoesRecebidas,
    conexoesAceitas,

    respondendoId,
    errorResposta,
    responderSolicitacao,

    cancelandoId,
    errorCancelamento,
    cancelarSolicitacao,

    bloqueios,
    loadingBloqueios,
    bloqueandoId,
    errorBloqueio,
    bloquearContato,
    desbloquear,

    enviando,
    errorSolicitacao,
    enviarSolicitacao,
  };
};
