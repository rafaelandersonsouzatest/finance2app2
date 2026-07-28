// ======================================================
// 👥 GerenciarMembrosModal.js — versão com subcoleção por usuário
// ======================================================
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Modal from "react-native-modal";
import { MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { useMembros } from "../hooks/useMembros";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";
import { vibrarLeve, vibrarSucesso } from "../utils/haptics";
import AlertaModal from "./AlertaModal";

export const GerenciarMembrosModal = ({ visivel, onFechar }) => {
  // 🔹 Fonte única de membros (mesma usada pelo MembroSelect e pela tela de
  // administração) — este modal não acessa o Firestore diretamente.
  const { membros, adicionarMembro, excluirMembro } = useMembros();
  const [novoNome, setNovoNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [alerta, setAlerta] = useState({
    visivel: false,
    titulo: "",
    mensagem: "",
    icone: "alert-circle-outline",
    corIcone: colors.gasto,
    botoes: [],
  });

  // ======================================================
  // 🔹 Adicionar membro
  // ======================================================
  const handleAdicionar = async () => {
    setCarregando(true);
    try {
      await adicionarMembro(novoNome);
      vibrarSucesso();
      setNovoNome("");
    } catch (e) {
      vibrarLeve();
      setAlerta({
        visivel: true,
        titulo: "Não foi possível adicionar",
        mensagem: e?.message || "Não foi possível adicionar o membro.",
        icone: "alert-circle-outline",
        corIcone: colors.gasto,
      });
    } finally {
      setCarregando(false);
    }
  };

  // ======================================================
  // 🔹 Excluir membro
  // ======================================================
  const handleExcluir = (id, nome) => {
    setAlerta({
      visivel: true,
      titulo: "Excluir membro",
      mensagem: `Deseja realmente excluir "${nome}"?`,
      icone: "trash-can-outline",
      corIcone: colors.error,
      botoes: [
        {
          texto: "Cancelar",
          onPress: () => setAlerta((a) => ({ ...a, visivel: false })),
        },
        {
          texto: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await excluirMembro(id);
              vibrarLeve();
              setAlerta((a) => ({ ...a, visivel: false }));
            } catch (e) {
              setAlerta({
                visivel: true,
                titulo: "Erro",
                mensagem: e?.message || "Não foi possível excluir o membro.",
                icone: "alert-circle-outline",
                corIcone: colors.gasto,
              });
            }
          },
        },
      ],
    });
  };

  // ======================================================
  // 🔹 Render item da lista
  // ======================================================
  const renderItem = ({ item }) => (
    <View
      style={[
        globalStyles.listItem,
        {
          borderLeftColor: colors.entrada,
          borderLeftWidth: 4,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={22}
          color={colors.textPrimary}
          style={{ marginRight: 8 }}
        />
        <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
      </View>

      <TouchableOpacity
        onPress={() => handleExcluir(item.id, item.nome)}
        style={[globalStyles.iconButton, { backgroundColor: "#ff444420" }]}
      >
        <MaterialCommunityIcons
          name="trash-can-outline"
          size={18}
          color={colors.error}
        />
      </TouchableOpacity>
    </View>
  );

  // ======================================================
  // 🔹 Render principal
  // ======================================================
  return (
    <Modal
      isVisible={visivel}
      onBackdropPress={onFechar}
      onBackButtonPress={onFechar}
      backdropOpacity={0.5}
      style={{ justifyContent: "flex-end", margin: 0 }}
      useNativeDriver
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[globalStyles.modalContainer, { padding: 20 }]}
      >
        <AlertaModal
          visible={alerta.visivel}
          onClose={() => setAlerta((a) => ({ ...a, visivel: false }))}
          titulo={alerta.titulo}
          mensagem={alerta.mensagem}
          icone={alerta.icone}
          corIcone={alerta.corIcone}
          botoes={alerta.botoes}
        />

        <View style={[globalStyles.modalHeader, { marginBottom: 10 }]}>
          <Text style={[globalStyles.modalTitle, { textAlign: "center" }]}>
            Gerenciar Membros
          </Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View
          style={[
            globalStyles.card,
            globalStyles.row,
            globalStyles.alignCenter,
            { paddingVertical: 8, paddingHorizontal: 12, marginBottom: 20 },
          ]}
        >
          <TextInput
            placeholder="Nome do novo membro"
            placeholderTextColor={colors.textSecondary}
            value={novoNome}
            onChangeText={setNovoNome}
            onSubmitEditing={handleAdicionar}
            style={[globalStyles.input, { flex: 1, borderWidth: 0 }]}
          />
          <TouchableOpacity onPress={handleAdicionar} style={{ marginLeft: 8 }}>
            <MaterialCommunityIcons
              name="plus-circle"
              size={28}
              color={colors.entrada}
            />
          </TouchableOpacity>
        </View>

        <FlatList
          data={membros}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={globalStyles.emptyContainer}>
              <Text style={globalStyles.noDataText}>
                Nenhum membro cadastrado.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingTop: 10 }}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
};
