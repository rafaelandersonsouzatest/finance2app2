// ======================================================
// 👥 MembrosScreen.js — administração oficial de membros
// ======================================================
// Reescrita em 2026-07-27 (Sprint 2 — Menu do Usuário). A versão anterior
// deste arquivo usava uma coleção Firestore GLOBAL ("membros", sem escopo de
// usuário) — um bug de dados real, não só uma implementação duplicada: se
// reativada como estava, misturaria membros de contas diferentes. Esta tela
// agora consome o mesmo hook (`useMembros`) usado pelo seletor rápido
// (`MembroSelect.js`) e pelo `GerenciarMembrosModal.js` — fonte única,
// nenhuma lógica de Firestore própria.
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";
import AlertaModal from "../components/AlertaModal";
import { vibrarLeve, vibrarSucesso } from "../utils/haptics";
import { useMembros } from "../hooks/useMembros";

export default function MembrosScreen() {
  const { membros, loading, adicionarMembro, excluirMembro } = useMembros();
  const [novoNome, setNovoNome] = useState("");
  const [alerta, setAlerta] = useState({
    visivel: false,
    titulo: "",
    mensagem: "",
    icone: "alert-circle-outline",
    corIcone: colors.gasto,
    botoes: [],
  });

  const handleAdicionar = async () => {
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
    }
  };

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
        {/* 🔹 Avatar por membro é recurso futuro (ver PROJECT_STATUS.md) —
            por enquanto, ícone genérico para todos. */}
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[globalStyles.container, { padding: 20 }]}
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

      <View
        style={[
          globalStyles.card,
          globalStyles.row,
          globalStyles.alignCenter,
          { paddingVertical: 8, paddingHorizontal: 12, marginBottom: 20, marginTop: 16 },
        ]}
      >
        <TextInput
          placeholder="Nome do membro"
          value={novoNome}
          onChangeText={setNovoNome}
          onSubmitEditing={handleAdicionar}
          placeholderTextColor={colors.textSecondary}
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
          !loading && (
            <View style={globalStyles.emptyContainer}>
              <Text style={globalStyles.noDataText}>
                Nenhum membro cadastrado.
              </Text>
            </View>
          )
        }
        contentContainerStyle={{ paddingTop: 10 }}
      />
    </KeyboardAvoidingView>
  );
}
