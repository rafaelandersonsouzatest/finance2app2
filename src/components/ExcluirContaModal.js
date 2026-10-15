// src/components/ExcluirContaModal.js
// Exclusão de conta (Menu → Conta) — exigência do Google Play / LGPD.
// Um modal só, em etapas (no iPhone, trocar de modal no meio do fluxo trava a
// tela — ver hooks/useTrocaDeModal.js):
//   1. motivo (OPCIONAL — dá para continuar sem escolher; gravado anônimo);
//   2. aviso do que será apagado + confirmação forte (senha, ou login
//      recente para quem entra com Google);
//   3. "Excluindo..." — ao terminar, o app volta sozinho para o login.
import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useAuth } from '../auth/useAuth';
import AreaFormulario from './AreaFormulario';

const MOTIVOS = [
  { id: 'nao_uso_mais', texto: 'Não uso mais' },
  { id: 'outro_app', texto: 'Encontrei outro app que atende melhor' },
  { id: 'dificil_de_usar', texto: 'Achei difícil de usar' },
  { id: 'falta_funcionalidade', texto: 'Falta alguma funcionalidade que eu precisava' },
  { id: 'erros', texto: 'O app teve erros ou travamentos' },
  { id: 'privacidade', texto: 'Preocupação com a privacidade dos meus dados' },
  { id: 'nova_conta', texto: 'Vou criar uma conta nova' },
  { id: 'outro', texto: 'Outro motivo' },
];

const LIMITE_DETALHE = 1000;

export default function ExcluirContaModal({ visivel, onFechar }) {
  const { user, excluirConta, logout } = useAuth();
  const usaSenha = user?.providerData?.[0]?.providerId === 'password';

  const [etapa, setEtapa] = useState('motivo'); // motivo | confirmacao | excluindo
  const [motivo, setMotivo] = useState(null);
  const [detalhe, setDetalhe] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(null);
  const [precisaRelogar, setPrecisaRelogar] = useState(false);

  useEffect(() => {
    if (visivel) {
      setEtapa('motivo');
      setMotivo(null);
      setDetalhe('');
      setSenha('');
      setErro(null);
      setPrecisaRelogar(false);
    }
  }, [visivel]);

  const excluindo = etapa === 'excluindo';
  const fechar = () => {
    if (!excluindo) onFechar();
  };

  const confirmarExclusao = async () => {
    setErro(null);
    setEtapa('excluindo');
    try {
      await excluirConta({ senha, motivo, detalhe: detalhe.trim() });
      // Sucesso: a conta não existe mais e o app volta sozinho para o login.
    } catch (err) {
      setEtapa('confirmacao');
      if (err?.message === 'SENHA_INCORRETA') {
        setErro('Senha incorreta. Confira e tente de novo.');
      } else if (err?.message === 'REQUER_LOGIN_RECENTE') {
        setPrecisaRelogar(true);
        setErro(
          'Por segurança, saia e entre de novo com o Google. Depois, volte aqui e exclua a conta em seguida.'
        );
      } else {
        setErro('Não foi possível excluir agora. Verifique sua conexão e tente de novo.');
      }
    }
  };

  const renderMotivo = () => (
    <AreaFormulario
      rodape={
        <View style={globalStyles.buttonRow}>
          <View style={globalStyles.rightButtons}>
            <TouchableOpacity style={globalStyles.cancelButton} onPress={fechar}>
              <Text style={globalStyles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={globalStyles.saveButton} onPress={() => setEtapa('confirmacao')}>
              <Text style={globalStyles.saveButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      <Text style={[globalStyles.label, { fontSize: 16, color: colors.textPrimary }]}>
        Antes de ir, conta pra gente o motivo?
      </Text>
      <Text style={{ color: colors.textSecondary, marginBottom: 12 }}>
        É opcional, mas ajuda a entender o que melhorar no app. A resposta é anônima.
      </Text>

      {MOTIVOS.map((opcao) => (
        <TouchableOpacity
          key={opcao.id}
          onPress={() => setMotivo(motivo === opcao.id ? null : opcao.id)}
          style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}
        >
          <MaterialCommunityIcons
            name={motivo === opcao.id ? 'radiobox-marked' : 'radiobox-blank'}
            size={22}
            color={colors.primary}
          />
          <Text style={{ color: colors.textPrimary, marginLeft: 8, flexShrink: 1 }}>{opcao.texto}</Text>
        </TouchableOpacity>
      ))}

      <TextInput
        style={[globalStyles.input, { marginTop: 12, minHeight: 80, textAlignVertical: 'top' }]}
        placeholder="Quer contar mais? Uma dica, sugestão ou o que faltou… (opcional)"
        placeholderTextColor={colors.textSecondary}
        value={detalhe}
        onChangeText={setDetalhe}
        maxLength={LIMITE_DETALHE}
        multiline
      />
    </AreaFormulario>
  );

  const renderConfirmacao = () => (
    <AreaFormulario
      rodape={
        <View style={globalStyles.buttonRow}>
          <View style={globalStyles.rightButtons}>
            <TouchableOpacity style={globalStyles.cancelButton} onPress={() => setEtapa('motivo')}>
              <Text style={globalStyles.cancelButtonText}>Voltar</Text>
            </TouchableOpacity>
            {precisaRelogar ? (
              <TouchableOpacity style={[globalStyles.saveButton, { backgroundColor: colors.error }]} onPress={logout}>
                <Text style={globalStyles.saveButtonText}>Sair agora</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  globalStyles.saveButton,
                  { backgroundColor: colors.error },
                  usaSenha && !senha && { opacity: 0.5 },
                ]}
                onPress={confirmarExclusao}
                disabled={usaSenha && !senha}
              >
                <Text style={globalStyles.saveButtonText}>Excluir definitivamente</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      }
    >
      <View style={{ alignItems: 'center', marginBottom: 12 }}>
        <MaterialCommunityIcons name="alert-octagon-outline" size={44} color={colors.error} />
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 16, lineHeight: 22 }}>
        Isso apaga <Text style={{ fontWeight: 'bold' }}>definitivamente</Text> todos os seus
        lançamentos, cartões, empréstimos, investimentos, modelos, categorias e membros, e a sua
        conta. <Text style={{ fontWeight: 'bold' }}>Não dá para desfazer.</Text>
      </Text>

      {usaSenha && (
        <>
          <Text style={[globalStyles.label, { marginTop: 16 }]}>Para confirmar, digite sua senha</Text>
          <TextInput
            style={globalStyles.input}
            placeholder="Senha"
            placeholderTextColor={colors.textSecondary}
            value={senha}
            onChangeText={(t) => {
              setSenha(t);
              if (erro) setErro(null);
            }}
            secureTextEntry
            autoCapitalize="none"
          />
        </>
      )}

      {!!erro && <Text style={{ color: colors.error, marginTop: 12 }}>{erro}</Text>}
    </AreaFormulario>
  );

  const renderExcluindo = () => (
    <View style={{ alignItems: 'center', paddingVertical: 32 }}>
      <ActivityIndicator size="large" color={colors.error} />
      <Text style={{ color: colors.textPrimary, marginTop: 16 }}>Excluindo seus dados…</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>Não feche o app.</Text>
    </View>
  );

  return (
    <Modal statusBarTranslucent navigationBarTranslucent
      isVisible={visivel}
      onBackdropPress={fechar}
      onBackButtonPress={fechar}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[globalStyles.modalContainer, { maxHeight: '90%' }]}>
        <View style={globalStyles.modalHeader}>
          <Text style={globalStyles.modalTitle}>Excluir minha conta</Text>
          {!excluindo && (
            <TouchableOpacity onPress={fechar}>
              <MaterialCommunityIcons name="close" size={26} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {etapa === 'motivo' && renderMotivo()}
        {etapa === 'confirmacao' && renderConfirmacao()}
        {excluindo && renderExcluindo()}
      </View>
    </Modal>
  );
}
