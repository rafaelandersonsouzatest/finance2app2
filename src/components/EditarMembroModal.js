// src/components/EditarMembroModal.js
// Hub de edição de um Membro — nome, avatar e exclusão no mesmo fluxo (ver
// SPRINT5_DISCOVERY.md, refinamento de UX pós-Sprint 5: "tocar em qualquer
// membro da lista abre a edição", em vez de o avatar ser o único ponto
// clicável). Quem decide *para onde* cada alteração é gravada (perfil do
// proprietário vs. documento de Membro) é sempre quem chama este
// componente — ele só sabe "renomear"/"salvar avatar"/"excluir", nunca
// Firestore diretamente.
import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { MaterialIcons } from "@expo/vector-icons";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";
import { isMembroProprietario } from "../utils/membros";
import AvatarRenderer from "./AvatarRenderer";
import AvatarEditor from "./AvatarEditor";
import AlertaModal from "./AlertaModal";

export default function EditarMembroModal({
  visivel,
  onFechar,
  membro,
  seedPadraoAvatar,
  aoRenomear,
  aoSalvarAvatar,
  aoExcluir,
}) {
  const [novoNome, setNovoNome] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [erroNome, setErroNome] = useState(null);
  const [editorAvatarVisivel, setEditorAvatarVisivel] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState(null);

  // 🔹 Só recarrega ao abrir — mesmo princípio já usado em ModalEdicao.js e
  // AvatarEditor.js ("atualiza só ao abrir, não a cada re-render").
  useEffect(() => {
    if (!visivel) return;
    setNovoNome(membro?.nome || "");
    setErroNome(null);
    setErroExclusao(null);
  }, [visivel]);

  if (!membro) return null;

  const proprietario = isMembroProprietario(membro);

  const salvarNome = async () => {
    const nomeLimpo = novoNome.trim();
    if (!nomeLimpo) {
      setErroNome("Digite um nome.");
      return;
    }
    if (nomeLimpo === membro.nome) return;
    try {
      setSalvandoNome(true);
      await aoRenomear(nomeLimpo);
    } catch (err) {
      setErroNome(err?.message || "Não foi possível salvar. Tente novamente.");
    } finally {
      setSalvandoNome(false);
    }
  };

  return (
    <Modal
      isVisible={visivel}
      onBackdropPress={onFechar}
      onBackButtonPress={onFechar}
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View style={globalStyles.modalContainer}>
        <View style={globalStyles.modalHeader}>
          <Text style={globalStyles.modalTitle}>Editar membro</Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{ alignItems: "center", marginBottom: 20 }}
          onPress={() => setEditorAvatarVisivel(true)}
        >
          <AvatarRenderer avatar={membro.avatar} nome={membro.nome} tamanho={96} />
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6 }}>
            Tocar para editar o avatar
          </Text>
        </TouchableOpacity>

        <Text style={[globalStyles.label, { marginBottom: 6 }]}>Nome</Text>
        <TextInput
          style={globalStyles.input}
          value={novoNome}
          onChangeText={(t) => {
            setNovoNome(t);
            if (erroNome) setErroNome(null);
          }}
          placeholderTextColor={colors.textSecondary}
        />
        {!!erroNome && (
          <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>{erroNome}</Text>
        )}
        <TouchableOpacity
          style={[globalStyles.modalBotaoAdd, { marginTop: 12 }]}
          onPress={salvarNome}
          disabled={salvandoNome}
        >
          {salvandoNome ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <MaterialIcons name="check" size={20} color="#fff" />
              <Text style={globalStyles.modalBotaoAddTexto}>Salvar nome</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 🔹 O proprietário da conta não pode ser excluído aqui — excluir
            a conta em si é um fluxo à parte (ver ContaScreen.js). */}
        {!proprietario && (
          <TouchableOpacity
            style={[globalStyles.modalBotaoAdd, { marginTop: 24, backgroundColor: colors.error }]}
            onPress={() => setConfirmarExclusao(true)}
          >
            <MaterialIcons name="delete-outline" size={20} color="#fff" />
            <Text style={globalStyles.modalBotaoAddTexto}>Excluir membro</Text>
          </TouchableOpacity>
        )}

        <AlertaModal
          visible={confirmarExclusao}
          onClose={() => setConfirmarExclusao(false)}
          titulo="Excluir membro"
          mensagem={`Deseja realmente excluir "${membro.nome}"?`}
          icone="trash-can-outline"
          corIcone={colors.error}
          botoes={[
            { texto: "Cancelar", onPress: () => setConfirmarExclusao(false) },
            {
              texto: "Excluir",
              style: "destructive",
              onPress: async () => {
                if (excluindo) return;
                try {
                  setExcluindo(true);
                  await aoExcluir();
                  setConfirmarExclusao(false);
                  onFechar();
                } catch (err) {
                  setConfirmarExclusao(false);
                  setErroExclusao(err?.message || "Não foi possível excluir. Tente novamente.");
                } finally {
                  setExcluindo(false);
                }
              },
            },
          ]}
        />

        <AlertaModal
          visible={!!erroExclusao}
          onClose={() => setErroExclusao(null)}
          titulo="Não foi possível excluir"
          mensagem={erroExclusao || ""}
          icone="alert-circle-outline"
          corIcone={colors.error}
        />

        <AvatarEditor
          visivel={editorAvatarVisivel}
          onFechar={() => setEditorAvatarVisivel(false)}
          avatarAtual={membro.avatar}
          seedPadrao={seedPadraoAvatar}
          nome={membro.nome}
          aoSalvar={aoSalvarAvatar}
        />
      </View>
    </Modal>
  );
}
