// ======================================================
// 👥 GerenciarMembrosModal.js — versão unificada e estilizada
// ======================================================
import React, { useState, useEffect } from "react";
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
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";
import { vibrarLeve, vibrarSucesso } from "../utils/haptics";
import AlertaModal from "./AlertaModal";

export const GerenciarMembrosModal = ({ visivel, onFechar, onAtualizarLista }) => {
  const [membros, setMembros] = useState([]);
  const [novoNome, setNovoNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [alerta, setAlerta] = useState({
    visivel: false,
    titulo: "",
    mensagem: "",
    icone: "alert-circle-outline",
    corIcone: colors.expense,
    botoes: [],
  });

  // ======================================================
  // 🔹 Carregar membros
  // ======================================================
  useEffect(() => {
    if (visivel) carregarMembros();
  }, [visivel]);

  const carregarMembros = async () => {
    try {
      const snapshot = await getDocs(collection(db, "membros"));
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || "Sem nome",
      }));
      setMembros(lista);
    } catch (e) {
      console.error("Erro ao carregar membros:", e);
    }
  };

  // ======================================================
  // 🔹 Adicionar membro
  // ======================================================
  const handleAdicionar = async () => {
    const nome = novoNome.trim();
    if (!nome) {
      vibrarLeve();
      setAlerta({
        visivel: true,
        titulo: "Campo vazio",
        mensagem: "Digite um nome antes de adicionar.",
        icone: "alert-circle-outline",
        corIcone: colors.expense,
      });
      return;
    }

    if (membros.some((m) => m.nome.toLowerCase() === nome.toLowerCase())) {
      vibrarLeve();
      setAlerta({
        visivel: true,
        titulo: "Duplicado",
        mensagem: "Já existe um membro com esse nome.",
        icone: "account-multiple-outline",
        corIcone: colors.warning,
      });
      return;
    }

    setCarregando(true);
    try {
      await addDoc(collection(db, "membros"), {
        nome,
        ativo: true,
        criadoEm: serverTimestamp(),
      });
      vibrarSucesso();
      setNovoNome("");
      await carregarMembros();
      onAtualizarLista?.();
    } catch (e) {
      console.error("Erro ao adicionar membro:", e);
      setAlerta({
        visivel: true,
        titulo: "Erro",
        mensagem: "Não foi possível adicionar o membro.",
        icone: "alert-circle-outline",
        corIcone: colors.expense,
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
              await deleteDoc(doc(db, "membros", id));
              setMembros((prev) => prev.filter((m) => m.id !== id));
              vibrarLeve();
              setAlerta((a) => ({ ...a, visivel: false }));
              onAtualizarLista?.();
            } catch (e) {
              console.error("Erro ao excluir membro:", e);
              setAlerta({
                visivel: true,
                titulo: "Erro",
                mensagem: "Não foi possível excluir o membro.",
                icone: "alert-circle-outline",
                corIcone: colors.expense,
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
          borderLeftColor: colors.income,
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
        {/* Modal de Alerta */}
        <AlertaModal
          visible={alerta.visivel}
          onClose={() => setAlerta((a) => ({ ...a, visivel: false }))}
          titulo={alerta.titulo}
          mensagem={alerta.mensagem}
          icone={alerta.icone}
          corIcone={alerta.corIcone}
          botoes={alerta.botoes}
        />

        {/* Cabeçalho */}
        <View style={[globalStyles.modalHeader, { marginBottom: 10 }]}>
          <Text style={[globalStyles.modalTitle, { textAlign: "center" }]}>
            Gerenciar Membros
          </Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Campo de novo membro */}
        <View
          style={[
            globalStyles.card,
            globalStyles.row,
            globalStyles.alignCenter,
            {
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginBottom: 20,
            },
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
              color={colors.income}
            />
          </TouchableOpacity>
        </View>

        {/* Lista de membros */}
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

        {/* Rodapé */}
      </KeyboardAvoidingView>
    </Modal>
  );
};
