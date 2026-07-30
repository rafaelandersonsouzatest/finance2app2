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
import { useAuth } from "../auth/useAuth";
import { isMembroProprietario } from "../utils/membros";
import AvatarRenderer from "../components/AvatarRenderer";
import EditarMembroModal from "../components/EditarMembroModal";

export default function MembrosScreen() {
  const { membros, loading, adicionarMembro, atualizarMembro, excluirMembro } = useMembros();
  const { atualizarPerfil } = useAuth();
  const [novoNome, setNovoNome] = useState("");
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

  // 🔹 Tocar em qualquer parte da linha abre a edição (nome + avatar +
  // exclusão) — o avatar deixou de ser o único ponto clicável, mesmo
  // tratamento de GerenciarMembrosModal.js para a experiência ficar
  // consistente entre as duas telas de administração de Membros.
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

      {/* 🔹 O proprietário edita nome/avatar via atualizarPerfil (sincroniza
          automaticamente para este mesmo documento de membro — ver
          useAuth.js). Os demais membros gravam direto via useMembros. */}
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
    </KeyboardAvoidingView>
  );
}
