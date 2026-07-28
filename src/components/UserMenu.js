// src/components/UserMenu.js
// Hub central de conta/configurações — bottom sheet aberto a partir do
// cabeçalho (ver TelaPadrao.js). Reaproveita react-native-modal, já usado
// em vários outros modais do app (ContaCriadaModal, GerenciarMembrosModal,
// MembroSelect, ModalCriacao, ModalEdicao) — nenhuma dependência nova.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { navigate } from '../navigation/navigationRef';
import { useUserMenu } from '../contexts/UserMenuContext';
import { useAuth } from '../auth/useAuth';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { vibrarLeve } from '../utils/haptics';
import { getNomeExibicao } from '../utils/perfil';
import AlertaModal from './AlertaModal';

// 🔹 Estrutura pensada para crescer (ver ARQUITETURA.md seção 11 e
// PROJECT_STATUS.md seção 8): cada categoria já existe como rota própria,
// mesmo quando hoje só mostra "estrutura" — funcionalidades futuras entram
// no conteúdo da tela, não exigem mexer neste menu.
const CATEGORIAS = [
  { icon: 'account-outline', label: 'Conta', route: 'Conta' },
  { icon: 'cash-multiple', label: 'Financeiro', route: 'Financeiro' },
  { icon: 'account-group-outline', label: 'Membros', route: 'Membros' },
  { icon: 'credit-card-outline', label: 'Cartões', route: 'GerenciarCartoes' },
  { icon: 'palette-outline', label: 'Aparência', route: 'Aparencia' },
  { icon: 'bell-outline', label: 'Notificações', route: 'Notificacoes' },
  { icon: 'information-outline', label: 'Sobre', route: 'Sobre' },
];

export default function UserMenu() {
  const { isOpen, close } = useUserMenu();
  const { profile, logout } = useAuth();
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  const abrirCategoria = (route) => {
    close();
    navigate(route);
  };

  const confirmarESair = async () => {
    setConfirmarSaida(false);
    close();
    await logout();
  };

  return (
    <>
      <Modal
        isVisible={isOpen}
        onBackdropPress={close}
        onBackButtonPress={close}
        style={{ justifyContent: 'flex-end', margin: 0 }}
        useNativeDriver
      >
        <View style={[globalStyles.modalContainer, { paddingBottom: 24 }]}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{getNomeExibicao(profile)}</Text>
            <TouchableOpacity onPress={close}>
              <MaterialCommunityIcons
                name="close-circle"
                size={28}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {!!profile?.email && (
            <Text
              style={{
                color: colors.textSecondary,
                marginTop: -12,
                marginBottom: 16,
              }}
            >
              {profile.email}
            </Text>
          )}

          <FlatList
            data={CATEGORIAS}
            keyExtractor={(item) => item.route}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={globalStyles.listItem}
                onPress={() => {
                  vibrarLeve();
                  abrirCategoria(item.route);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <MaterialCommunityIcons
                    name={item.icon}
                    size={22}
                    color={colors.textPrimary}
                    style={{ marginRight: 12 }}
                  />
                  <Text style={globalStyles.listItemTitle}>{item.label}</Text>
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          />

          <TouchableOpacity
            style={[globalStyles.listItem, { marginTop: 4 }]}
            onPress={() => {
              vibrarLeve();
              setConfirmarSaida(true);
            }}
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
        </View>
      </Modal>

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
    </>
  );
}
