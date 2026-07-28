import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { useAuth } from '../auth/useAuth';
import { getNomeExibicao } from '../utils/perfil';
import AlertaModal from '../components/AlertaModal';

export default function ContaScreen() {
  const { profile, logout, atualizarPerfil } = useAuth();
  const navigation = useNavigation();
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState(profile?.apelido || '');
  const [erroNome, setErroNome] = useState(null);
  const [salvandoNome, setSalvandoNome] = useState(false);

  const confirmarESair = async () => {
    setConfirmarSaida(false);
    await logout();
  };

  const abrirEdicaoNome = () => {
    setNovoNome(profile?.apelido || '');
    setErroNome(null);
    setEditandoNome(true);
  };

  const salvarNome = async () => {
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) {
      setErroNome('Digite um nome.');
      return;
    }
    try {
      setSalvandoNome(true);
      await atualizarPerfil({ apelido: nomeLimpo });
      setEditandoNome(false);
    } catch (err) {
      setErroNome('Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvandoNome(false);
    }
  };

  return (
    <View style={[globalStyles.container, { padding: 20 }]}>
      <View
        style={[
          globalStyles.card,
          { alignItems: 'center', paddingVertical: 24, marginBottom: 20 },
        ]}
      >
        {/* 🔹 Reservado para avatar de usuário (futuro, não implementado
            ainda — só o indicativo visual do espaço; ver PROJECT_STATUS.md).
            `profile.avatarUrl` já é gravado como `null` desde o cadastro
            para essa funcionalidade não exigir migração de dados depois.
            O carimbo "EM BREVE" deixa claro que não é clicável ainda —
            sem ele, o círculo sozinho parecia um botão quebrado. */}
        <View style={{ width: 72, height: 72 }}>
          <MaterialCommunityIcons
            name="account-circle"
            size={72}
            color={colors.primary}
          />
          <View style={styles.carimboFaixa} pointerEvents="none">
            <Text style={styles.carimboTexto}>EM BREVE</Text>
          </View>
        </View>

        {editandoNome ? (
          <View style={{ width: '100%', marginTop: 12 }}>
            <TextInput
              style={globalStyles.input}
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Como você quer ser chamado(a)?"
              placeholderTextColor={colors.textSecondary}
              autoFocus
            />
            {!!erroNome && (
              <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
                {erroNome}
              </Text>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => setEditandoNome(false)}
                disabled={salvandoNome}
                style={{ marginRight: 24 }}
              >
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={salvarNome} disabled={salvandoNome}>
                {salvandoNome ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>Salvar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={abrirEdicaoNome}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}
          >
            <Text style={[globalStyles.headerTitle, { textAlign: 'center' }]}>
              {getNomeExibicao(profile)}
            </Text>
            <MaterialCommunityIcons
              name="pencil-outline"
              size={16}
              color={colors.textSecondary}
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        )}

        {!!profile?.email && (
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
            {profile.email}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[globalStyles.listItem, { marginTop: 8 }]}
        onPress={() => navigation.navigate('AlterarSenha')}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="lock-outline"
            size={22}
            color={colors.textPrimary}
            style={{ marginRight: 12 }}
          />
          <Text style={globalStyles.listItemTitle}>Alterar senha</Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* 🔹 Futuro (ver PROJECT_STATUS.md): vincular Google, excluir conta,
          gerenciamento de plano. */}

      <TouchableOpacity
        style={[globalStyles.listItem, { marginTop: 8 }]}
        onPress={() => setConfirmarSaida(true)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name="logout"
            size={22}
            color={colors.error}
            style={{ marginRight: 12 }}
          />
          <Text style={[globalStyles.listItemTitle, { color: colors.error }]}>
            Sair
          </Text>
        </View>
      </TouchableOpacity>

      <AlertaModal
        visible={confirmarSaida}
        onClose={() => setConfirmarSaida(false)}
        titulo="Sair da conta"
        mensagem="Deseja realmente sair?"
        icone="logout"
        corIcone={colors.error}
        botoes={[
          { texto: 'Cancelar', onPress: () => setConfirmarSaida(false) },
          { texto: 'Sair', style: 'destructive', onPress: confirmarESair },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  carimboFaixa: {
    position: 'absolute',
    top: 30,
    left: -14,
    right: -14,
    paddingVertical: 2,
    alignItems: 'center',
    backgroundColor: colors.background + 'e6',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.textSecondary,
    transform: [{ rotate: '-12deg' }],
  },
  carimboTexto: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
});
