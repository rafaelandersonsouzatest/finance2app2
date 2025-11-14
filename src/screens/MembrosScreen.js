// ======================================================
// 👥 MembrosScreen.js — versão final unificada e estilizada
// ======================================================
import React, { useEffect, useState } from "react";
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
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../config/firebase";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";
import AlertaModal from "../components/AlertaModal";
import { vibrarLeve, vibrarSucesso } from "../utils/haptics";

export default function MembrosScreen() {
  const [membros, setMembros] = useState([]);
  const [novoNome, setNovoNome] = useState("");
  const [alerta, setAlerta] = useState({
    visivel: false,
    titulo: "",
    mensagem: "",
    icone: "alert-circle-outline",
    corIcone: colors.gasto,
    botoes: [],
  });

  // 🔹 Carrega membros em tempo real
  useEffect(() => {
    const q = query(collection(db, "membros"), orderBy("criadoEm", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const lista = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMembros(lista);
    });
    return unsubscribe;
  }, []);

  // 🔹 Adiciona novo membro
  const adicionarMembro = async () => {
    const nomeTrim = novoNome.trim();
    if (!nomeTrim) {
      vibrarLeve();
      setAlerta({
        visivel: true,
        titulo: "Campo vazio",
        mensagem: "Digite um nome antes de adicionar.",
        icone: "alert-circle-outline",
        corIcone: colors.gasto,
      });
      return;
    }

    // Evita duplicidade
    const nomeExistente = membros.find(
      (m) => m.nome.toLowerCase() === nomeTrim.toLowerCase()
    );
    if (nomeExistente) {
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

    try {
      await addDoc(collection(db, "membros"), {
        nome: nomeTrim,
        ativo: true,
        criadoEm: new Date(),
      });
      vibrarSucesso();
      setNovoNome("");
    } catch (e) {
      console.error("Erro ao adicionar membro:", e);
      setAlerta({
        visivel: true,
        titulo: "Erro",
        mensagem: "Não foi possível adicionar o membro.",
        icone: "alert-circle-outline",
        corIcone: colors.gasto,
      });
    }
  };

  // 🔹 Exclui membro (com modal personalizado)
  const excluirMembro = (id, nome) => {
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
              vibrarLeve();
              setAlerta((a) => ({ ...a, visivel: false }));
            } catch (e) {
              console.error("Erro ao excluir membro:", e);
              setAlerta({
                visivel: true,
                titulo: "Erro",
                mensagem: "Não foi possível excluir o membro.",
                icone: "alert-circle-outline",
                corIcone: colors.gasto,
              });
            }
          },
        },
      ],
    });
  };

  // 🔹 Renderiza cada membro
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
        onPress={() => excluirMembro(item.id, item.nome)}
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
      {/* 🔹 Modal de Alerta */}
      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta((a) => ({ ...a, visivel: false }))}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        icone={alerta.icone}
        corIcone={alerta.corIcone}
        botoes={alerta.botoes}
      />

      <Text style={[globalStyles.headerTitle, { textAlign: "center" }]}>
        Membros da Casa
      </Text>

      {/* Campo de cadastro */}
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
          placeholder="Nome do membro"
          value={novoNome}
          onChangeText={setNovoNome}
          onSubmitEditing={adicionarMembro}
          placeholderTextColor={colors.textSecondary}
          style={[globalStyles.input, { flex: 1, borderWidth: 0 }]}
        />
        <TouchableOpacity onPress={adicionarMembro} style={{ marginLeft: 8 }}>
          <MaterialCommunityIcons
            name="plus-circle"
            size={28}
            color={colors.entrada}
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
    </KeyboardAvoidingView>
  );
}
