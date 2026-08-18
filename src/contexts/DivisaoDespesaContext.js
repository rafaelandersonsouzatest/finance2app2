// src/contexts/DivisaoDespesaContext.js
// Dono único do listener de divisão de despesa (Etapa 4.2, ver
// COLABORACAO_ARQUITETURA_V1.md). Mesmo padrão de UserMenuContext.js/
// DateFilterContext.js: montado uma única vez perto da raiz do app (App.js),
// para que o badge do sino (TelaPadrao.js) e a Central de Avisos
// (CentralAvisosScreen.js) leiam do mesmo estado sem cada tela abrir seu
// próprio listener no Firestore.
//
// `colaboracaoDisponivel` é uma constante fixa por sessão (não muda em
// runtime — ver src/config/featureFlags.js), então alternar entre os dois
// componentes abaixo conforme seu valor não viola as Regras de Hooks: são
// dois componentes diferentes, cada um seguindo as regras internamente. Isso
// garante que, enquanto o backend real não for publicado, nenhum app
// publicado chega a montar useDivisaoDespesa()/useConexoes() — zero listener
// aberto, mesmo cuidado já usado em ConexoesScreen.js.
import React, { createContext, useContext } from 'react';
import { useDivisaoDespesa } from '../hooks/useDivisaoDespesa';
import { useConexoes } from '../hooks/useConexoes';
import { useMembros } from '../hooks/useMembros';
import { colaboracaoDisponivel } from '../config/featureFlags';

const DivisaoDespesaContext = createContext();

const VALOR_INATIVO = {
  despesas: [],
  loadingDespesas: false,
  despesasComValorSemDestino: [],
  convites: [],
  convitesPendentes: [],
  loadingConvites: false,
  propostas: [],
  propostasPendentes: [],
  loadingPropostas: false,
  compartilhando: false,
  errorCompartilhar: null,
  compartilharGastoExistente: async () => {
    throw new Error('Divisão de despesa ainda não está disponível.');
  },
  respondendoEventoId: null,
  errorResponderConvite: null,
  aceitarConvite: async () => {},
  recusarConvite: async () => {},
  cancelandoConviteId: null,
  errorCancelarConvite: null,
  cancelarConvite: async () => {},
  resolvendoValorSemDestino: false,
  errorResolverValorSemDestino: null,
  resolverValorSemDestino: async () => {
    throw new Error('Divisão de despesa ainda não está disponível.');
  },
  encerrando: false,
  errorEncerrar: null,
  encerrarCompartilhamento: async () => {
    throw new Error('Divisão de despesa ainda não está disponível.');
  },
  adicionandoParticipante: false,
  errorAdicionarParticipante: null,
  adicionarParticipante: async () => {
    throw new Error('Divisão de despesa ainda não está disponível.');
  },
  propondo: false,
  errorPropor: null,
  proporAlteracaoCota: async () => {
    throw new Error('Divisão de despesa ainda não está disponível.');
  },
  editandoCotaMembro: false,
  errorEditarCotaMembro: null,
  editarCotaMembro: async () => {
    throw new Error('Divisão de despesa ainda não está disponível.');
  },
  removendoMembroId: null,
  errorRemoverMembro: null,
  removerParticipanteSemConta: async () => {
    throw new Error('Divisão de despesa ainda não está disponível.');
  },
  respondendoPropostaId: null,
  errorResponderProposta: null,
  responderProposta: async () => {},
  conexoesAceitas: [],
  membrosSelecionaveis: [],
};

export const useDivisaoDespesaContext = () => {
  const context = useContext(DivisaoDespesaContext);
  if (!context) {
    throw new Error(
      'useDivisaoDespesaContext deve ser usado dentro de um DivisaoDespesaProvider'
    );
  }
  return context;
};

function DivisaoDespesaProviderAtivo({ children }) {
  const divisao = useDivisaoDespesa();
  const { conexoesAceitas } = useConexoes();
  // Membro sem conta (seção 7) — exclui o proprietário (é a própria conta,
  // nunca um "participante") e membros inativos.
  const { membros } = useMembros();
  const membrosSelecionaveis = membros.filter((m) => m.ativo && !m.ehProprietario);

  const value = { ...divisao, conexoesAceitas, membrosSelecionaveis };

  return (
    <DivisaoDespesaContext.Provider value={value}>{children}</DivisaoDespesaContext.Provider>
  );
}

export const DivisaoDespesaProvider = ({ children }) => {
  if (!colaboracaoDisponivel) {
    return (
      <DivisaoDespesaContext.Provider value={VALOR_INATIVO}>
        {children}
      </DivisaoDespesaContext.Provider>
    );
  }

  return <DivisaoDespesaProviderAtivo>{children}</DivisaoDespesaProviderAtivo>;
};
