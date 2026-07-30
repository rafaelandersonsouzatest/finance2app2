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
import { useAuth } from "../auth/useAuth";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";
import { vibrarLeve, vibrarSucesso } from "../utils/haptics";
import { isMembroProprietario } from "../utils/membros";
import AlertaModal from "./AlertaModal";
import AvatarRenderer from "./AvatarRenderer";
import EditarMembroModal from "./EditarMembroModal";

export const GerenciarMembrosModal = ({ visivel, onFechar }) => {
  // 🔹 Fonte única de membros (mesma usada pelo MembroSelect e pela tela de
  // administração) — este modal não acessa o Firestore diretamente.
  const { membros, adicionarMembro, atualizarMembro, excluirMembro } = useMembros();
  const { atualizarPerfil } = useAuth();
  const [novoNome, setNovoNome] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [membroEditandoId, setMembroEditandoId] = useState(null);
  const membroEditando = membros.find((m) => m.id === membroEditandoId) || null;
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
  // 🔹 Render item da lista — tocar em qualquer parte da linha abre a
  // edição (nome + avatar + exclusão); o avatar deixou de ser o único
  // ponto clicável.
  // ======================================================
  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => setMembroEditandoId(item.id)}
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
        <AvatarRenderer avatar={item.avatar} nome={item.nome} variante="mini" />
        <Text style={[globalStyles.listItemTitle, { marginLeft: 8 }]}>
          {item.nome}{isMembroProprietario(item) ? " (você)" : ""}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textSecondary} />
    </TouchableOpacity>
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

      {/* 🔹 O proprietário edita nome/avatar via atualizarPerfil (sincroniza
          automaticamente para este mesmo documento de membro — ver
          useAuth.js) — mantém "um único lugar" para editar a própria
          identidade. Os demais membros gravam direto via useMembros. */}
      <EditarMembroModal
        visivel={!!membroEditando}
        onFechar={() => setMembroEditandoId(null)}
        membro={membroEditando}
        seedPadraoAvatar={membroEditando?.id}
        aoRenomear={(novoNome) =>
          isMembroProprietario(membroEditando)
            ? atualizarPerfil({ apelido: novoNome })
            : atualizarMembro(membroEditando.id, { nome: novoNome })
        }
        aoSalvarAvatar={(novoAvatar) =>
          isMembroProprietario(membroEditando)
            ? atualizarPerfil({ avatarUrl: novoAvatar })
            : atualizarMembro(membroEditando.id, { avatar: novoAvatar })
        }
        aoExcluir={() => excluirMembro(membroEditando.id)}
      />
    </Modal>
  );
};
