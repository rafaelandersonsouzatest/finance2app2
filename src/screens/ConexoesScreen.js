// src/screens/ConexoesScreen.js
// Colaboração entre Usuários — hub com abas (Conexões / Solicitações /
// Bloqueados), reaproveitando ModernTabs (mesmo padrão de SaidasScreen.js).
// Etapas 2.1 a 2.5 completas: código, enviar/aceitar/recusar/cancelar
// solicitação, bloquear (a partir de um contato conectado) e desbloquear.
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Share, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useConexoes } from '../hooks/useConexoes';
import { vibrarLeve } from '../utils/haptics';
import ModernTabs from '../components/ModernTabs';
import AvatarRenderer from '../components/AvatarRenderer';
import AlertaModal from '../components/AlertaModal';
import { colaboracaoDisponivel } from '../config/featureFlags';

function CardConexao({ nome, status, avatar, bloqueando, onBloquear }) {
  // 🔹 Mesmas cores já usadas no resto do app pra status positivo/pendente
  // (colors.balance/colors.pending — ver ARQUITETURA.md seção 18) — cinza
  // aqui parecia "informação inativa", não uma conexão de verdade.
  const legenda = {
    pendente: { texto: 'Pendente', cor: colors.pending },
    aceita: { texto: 'Conectado', cor: colors.balance },
  }[status];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <AvatarRenderer avatar={avatar} nome={nome} variante="mini" />
        <Text
          style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginLeft: 10 }}
        >
          {nome || 'Usuário'}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {!!legenda && (
          <Text style={{ color: legenda.cor, fontSize: 12, fontWeight: '600', marginRight: 10 }}>
            {legenda.texto}
          </Text>
        )}
        {!!onBloquear &&
          (bloqueando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <TouchableOpacity onPress={onBloquear}>
              <MaterialCommunityIcons name="cancel" size={20} color={colors.error} />
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
}

// 🔹 "Recusar e bloquear" ainda não tem botão próprio aqui — a Function já
// suporta o parâmetro (ver responderSolicitacao em useConexoes.js), só falta
// decidir a UI (ex.: opção dentro do próprio "Recusar", em vez de um terceiro
// botão) — candidato a melhoria futura, não bloqueia a V1.
function CardSolicitacaoRecebida({ conexao, respondendo, onResponder }) {
  return (
    <View
      style={{
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <AvatarRenderer avatar={conexao.avatarSnapshot} nome={conexao.nomeExibicao} variante="mini" />
        <Text
          style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginLeft: 10 }}
        >
          {conexao.nomeExibicao || 'Usuário'}
        </Text>
      </View>

      {/* 🔹 minHeight fixo — sem isso, o card encolhe enquanto `respondendo`
          mostra só o spinner, e a lista "pula" de tamanho durante a espera. */}
      <View style={{ minHeight: 36, justifyContent: 'center' }}>
        {respondendo ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <TouchableOpacity
              style={{
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
                marginRight: 8,
              }}
              onPress={() => onResponder(conexao.id, false)}
            >
              <Text style={{ color: colors.error, fontWeight: '600' }}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 8,
                paddingHorizontal: 14,
                borderRadius: 8,
              }}
              onPress={() => onResponder(conexao.id, true)}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Aceitar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function CardSolicitacaoEnviada({ conexao, cancelando, onCancelar }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <AvatarRenderer avatar={conexao.avatarSnapshot} nome={conexao.nomeExibicao} variante="mini" />
        <Text
          style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginLeft: 10 }}
        >
          {conexao.nomeExibicao || 'Usuário'}
        </Text>
      </View>

      {cancelando ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <TouchableOpacity onPress={() => onCancelar(conexao.id)}>
          <Text style={{ color: colors.error, fontWeight: '600', fontSize: 12 }}>Cancelar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AbaConexoes({
  meuCodigo,
  gerando,
  error,
  conexoesAceitas,
  loadingConexoes,
  bloqueandoId,
  errorBloqueio,
  bloquearContato,
}) {
  const [contatoParaBloquear, setContatoParaBloquear] = useState(null);

  const compartilharCodigo = () => {
    if (!meuCodigo) return;
    vibrarLeve();
    Share.share({
      message: `Use este código para se conectar comigo no Financeiro: ${meuCodigo}`,
    });
  };

  const confirmarBloqueio = async () => {
    const contato = contatoParaBloquear;
    setContatoParaBloquear(null);
    vibrarLeve();
    try {
      await bloquearContato(contato.usuarioConectadoId);
    } catch (err) {
      // erro já fica em errorBloqueio, exibido abaixo
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={globalStyles.headerTitle}>Seu código de conexão</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 20 }}>
        Compartilhe este código com alguém para conectar as contas — nenhum dado
        financeiro é visto por ninguém só por causa da conexão.
      </Text>

      <View
        style={{
          backgroundColor: colors.cardBackground,
          borderRadius: 12,
          padding: 24,
          alignItems: 'center',
        }}
      >
        {gerando || !meuCodigo ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Text
            style={{ fontSize: 28, fontWeight: '700', letterSpacing: 4, color: colors.textPrimary }}
          >
            {meuCodigo}
          </Text>
        )}
      </View>

      {!!error && <Text style={{ color: colors.error, marginTop: 12 }}>{error}</Text>}

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.primary,
          paddingVertical: 12,
          borderRadius: 8,
          marginTop: 16,
          opacity: meuCodigo ? 1 : 0.5,
        }}
        onPress={compartilharCodigo}
        disabled={!meuCodigo}
      >
        <MaterialCommunityIcons
          name="share-variant-outline"
          size={20}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
          Compartilhar código
        </Text>
      </TouchableOpacity>

      <Text style={[globalStyles.headerTitle, { fontSize: 18, marginTop: 28, marginBottom: 12 }]}>
        Suas conexões
      </Text>
      {!!errorBloqueio && (
        <Text style={{ color: colors.error, marginBottom: 8 }}>{errorBloqueio}</Text>
      )}
      {loadingConexoes ? (
        <ActivityIndicator color={colors.primary} />
      ) : conexoesAceitas.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>
          Você ainda não tem nenhuma conexão aceita.
        </Text>
      ) : (
        conexoesAceitas.map((c) => (
          <CardConexao
            key={c.id}
            nome={c.nomeExibicao}
            status={c.status}
            avatar={c.avatarSnapshot}
            bloqueando={bloqueandoId === c.usuarioConectadoId}
            onBloquear={() => setContatoParaBloquear(c)}
          />
        ))
      )}

      <AlertaModal
        visible={!!contatoParaBloquear}
        onClose={() => setContatoParaBloquear(null)}
        titulo="Bloquear conexão"
        mensagem={`Bloquear ${
          contatoParaBloquear?.nomeExibicao || 'este usuário'
        }? Você pode desbloquear e se conectar de novo quando quiser.`}
        icone="cancel"
        corIcone={colors.error}
        botoes={[
          { texto: 'Cancelar', onPress: () => setContatoParaBloquear(null) },
          { texto: 'Bloquear', style: 'destructive', onPress: confirmarBloqueio },
        ]}
      />
    </ScrollView>
  );
}

function AbaSolicitacoes({
  enviando,
  errorSolicitacao,
  enviarSolicitacao,
  solicitacoesEnviadas,
  solicitacoesRecebidas,
  loadingConexoes,
  respondendoId,
  errorResposta,
  responderSolicitacao,
  cancelandoId,
  errorCancelamento,
  cancelarSolicitacao,
}) {
  const [codigo, setCodigo] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState(null);

  const handleEnviar = async () => {
    vibrarLeve();
    setMensagemSucesso(null);
    try {
      await enviarSolicitacao(codigo);
      setCodigo('');
      setMensagemSucesso('Solicitação enviada!');
    } catch (err) {
      // erro já fica em errorSolicitacao, exibido abaixo
    }
  };

  const handleResponder = async (conexaoId, aceitar) => {
    vibrarLeve();
    try {
      await responderSolicitacao(conexaoId, aceitar);
    } catch (err) {
      // erro já fica em errorResposta, exibido abaixo
    }
  };

  const handleCancelar = async (conexaoId) => {
    vibrarLeve();
    try {
      await cancelarSolicitacao(conexaoId);
    } catch (err) {
      // erro já fica em errorCancelamento, exibido abaixo
    }
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={globalStyles.headerTitle}>Conectar com alguém</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 16 }}>
        Digite o código que a pessoa compartilhou com você.
      </Text>

      <TextInput
        value={codigo}
        onChangeText={setCodigo}
        placeholder="Ex.: AB3D9FGH"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="characters"
        style={{
          backgroundColor: colors.cardBackground,
          color: colors.textPrimary,
          fontSize: 16,
          padding: 14,
          borderRadius: 8,
          letterSpacing: 2,
        }}
      />

      {!!errorSolicitacao && (
        <Text style={{ color: colors.error, marginTop: 8 }}>{errorSolicitacao}</Text>
      )}
      {!!mensagemSucesso && (
        <Text style={{ color: colors.primary, marginTop: 8 }}>{mensagemSucesso}</Text>
      )}

      <TouchableOpacity
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.primary,
          paddingVertical: 12,
          borderRadius: 8,
          marginTop: 16,
          opacity: codigo.trim() && !enviando ? 1 : 0.5,
        }}
        onPress={handleEnviar}
        disabled={!codigo.trim() || enviando}
      >
        {enviando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Solicitar conexão</Text>
        )}
      </TouchableOpacity>

      <Text style={[globalStyles.headerTitle, { fontSize: 18, marginTop: 28, marginBottom: 12 }]}>
        Enviadas, aguardando resposta
      </Text>
      {!!errorCancelamento && (
        <Text style={{ color: colors.error, marginBottom: 8 }}>{errorCancelamento}</Text>
      )}
      {loadingConexoes ? (
        <ActivityIndicator color={colors.primary} />
      ) : solicitacoesEnviadas.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>Nenhuma solicitação enviada.</Text>
      ) : (
        solicitacoesEnviadas.map((c) => (
          <CardSolicitacaoEnviada
            key={c.id}
            conexao={c}
            cancelando={cancelandoId === c.id}
            onCancelar={handleCancelar}
          />
        ))
      )}

      <Text style={[globalStyles.headerTitle, { fontSize: 18, marginTop: 24, marginBottom: 12 }]}>
        Recebidas
      </Text>
      {!!errorResposta && (
        <Text style={{ color: colors.error, marginBottom: 8 }}>{errorResposta}</Text>
      )}
      {solicitacoesRecebidas.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>Nenhuma solicitação recebida.</Text>
      ) : (
        solicitacoesRecebidas.map((c) => (
          <CardSolicitacaoRecebida
            key={c.id}
            conexao={c}
            respondendo={respondendoId === c.id}
            onResponder={handleResponder}
          />
        ))
      )}
    </ScrollView>
  );
}

function CardBloqueado({ bloqueio, onDesbloquear }) {
  const [desbloqueando, setDesbloqueando] = useState(false);

  const handleDesbloquear = async () => {
    vibrarLeve();
    setDesbloqueando(true);
    try {
      await onDesbloquear(bloqueio.id);
    } finally {
      setDesbloqueando(false);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.cardBackground,
        borderRadius: 10,
        padding: 14,
        marginBottom: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <AvatarRenderer avatar={bloqueio.avatarSnapshot} nome={bloqueio.nomeExibicao} variante="mini" />
        <Text
          style={{ color: colors.textPrimary, fontSize: 15, fontWeight: '600', marginLeft: 10 }}
        >
          {bloqueio.nomeExibicao || 'Usuário'}
        </Text>
      </View>

      {desbloqueando ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <TouchableOpacity onPress={handleDesbloquear}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
            Desbloquear
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function AbaBloqueados({ bloqueios, loadingBloqueios, desbloquear }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 24 }}>
      <Text style={globalStyles.headerTitle}>Bloqueados</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 16 }}>
        Quem você bloquear não consegue mais enviar solicitação de conexão nem compartilhar
        despesas com você.
      </Text>

      {loadingBloqueios ? (
        <ActivityIndicator color={colors.primary} />
      ) : bloqueios.length === 0 ? (
        <Text style={{ color: colors.textSecondary }}>Ainda não há ninguém bloqueado.</Text>
      ) : (
        bloqueios.map((b) => (
          <CardBloqueado key={b.id} bloqueio={b} onDesbloquear={desbloquear} />
        ))
      )}
    </ScrollView>
  );
}

export default function ConexoesScreen() {
  const [abaAtiva, setAbaAtiva] = useState('conexoes');
  const {
    meuCodigo,
    gerando,
    error,
    gerarMeuCodigoSeNecessario,
    loadingConexoes,
    solicitacoesEnviadas,
    solicitacoesRecebidas,
    conexoesAceitas,
    enviando,
    errorSolicitacao,
    enviarSolicitacao,
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
  } = useConexoes();

  useEffect(() => {
    if (!colaboracaoDisponivel) return;
    gerarMeuCodigoSeNecessario().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔹 Segunda camada de proteção — a mesma flag que desabilita o item no
  // Menu (ver UserMenu.js) também bloqueia aqui, caso a tela seja alcançada
  // por outro caminho no futuro. Nenhuma chamada de rede acontece nesse caso
  // (o useEffect acima já não dispara).
  if (!colaboracaoDisponivel) {
    return (
      <View
        style={[
          globalStyles.container,
          { alignItems: 'center', justifyContent: 'center', padding: 24 },
        ]}
      >
        <MaterialCommunityIcons
          name="account-multiple-plus-outline"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={[globalStyles.headerTitle, { marginTop: 16, textAlign: 'center' }]}>
          Conexões — em breve
        </Text>
        <Text style={{ color: colors.textSecondary, marginTop: 8, textAlign: 'center' }}>
          Estamos preparando essa funcionalidade. Volte mais tarde!
        </Text>
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      <ModernTabs
        tabs={[
          { key: 'conexoes', label: 'Conexões', icon: 'account-group-outline' },
          { key: 'solicitacoes', label: 'Solicitações', icon: 'account-clock-outline' },
          { key: 'bloqueados', label: 'Bloqueados', icon: 'account-cancel-outline' },
        ]}
        activeTab={abaAtiva}
        setActiveTab={setAbaAtiva}
      >
        <AbaConexoes
          tabKey="conexoes"
          meuCodigo={meuCodigo}
          gerando={gerando}
          error={error}
          conexoesAceitas={conexoesAceitas}
          loadingConexoes={loadingConexoes}
          bloqueandoId={bloqueandoId}
          errorBloqueio={errorBloqueio}
          bloquearContato={bloquearContato}
        />
        <AbaSolicitacoes
          tabKey="solicitacoes"
          enviando={enviando}
          errorSolicitacao={errorSolicitacao}
          enviarSolicitacao={enviarSolicitacao}
          solicitacoesEnviadas={solicitacoesEnviadas}
          solicitacoesRecebidas={solicitacoesRecebidas}
          loadingConexoes={loadingConexoes}
          respondendoId={respondendoId}
          errorResposta={errorResposta}
          responderSolicitacao={responderSolicitacao}
          cancelandoId={cancelandoId}
          errorCancelamento={errorCancelamento}
          cancelarSolicitacao={cancelarSolicitacao}
        />
        <AbaBloqueados
          tabKey="bloqueados"
          bloqueios={bloqueios}
          loadingBloqueios={loadingBloqueios}
          desbloquear={desbloquear}
        />
      </ModernTabs>
    </View>
  );
}
