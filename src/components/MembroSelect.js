import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import Modal from "react-native-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useMembros } from "../hooks/useMembros";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";
import AvatarRenderer from "./AvatarRenderer";
import { GerenciarMembrosModal } from "./GerenciarMembrosModal";

const STORAGE_KEY_RECENTES = "@ultimas_pessoas";

// =========================================================
// 🔹 Seletor único de "quem" está associado a um lançamento.
//
// Antes da Sprint 5, "Membro" (entradas) e "Comprador" (cartões) eram dois
// modos diferentes deste mesmo componente, com fontes de dado distintas —
// ver SPRINT5_DISCOVERY.md seção 4.3. Unificado num único modo desde então;
// esta rodada simplifica a interface para o caso principal (selecionar um
// Membro cadastrado — o caso raro de "pessoa fora da família" vira uma
// única opção "Outra pessoa..." ao final da lista, não uma seção fixa
// sempre visível). O comportamento de dado não muda: quem seleciona da
// lista ganha `id` (referência estável, `membroId`); "Outra pessoa..."
// devolve `id: null`.
//
// Cadastrar/editar/excluir Membro não é responsabilidade deste componente
// — isso é só em "Gerenciar Membros" (menu do usuário). Este seletor só
// seleciona quem participa do lançamento; o atalho para "Gerenciar
// membros" continua existindo aqui só como um link discreto (texto
// pequeno), não como uma ação em destaque — a responsabilidade continua
// sendo do hub, não deste seletor.
// =========================================================
export const MembroSelect = ({
  membroSelecionado,
  onSelecionar,
  label = "Membro",
  mostrarLabel = true,
  onBloquearFechamento,
}) => {
  // 🔹 Fonte única de membros (mesma usada pela tela de administração) —
  // MembroSelect não acessa o Firestore diretamente.
  const { membros } = useMembros();

  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalOutraPessoaVisivel, setModalOutraPessoaVisivel] = useState(false);
  const [modalGerenciarVisivel, setModalGerenciarVisivel] = useState(false);
  const [nomeOutraPessoa, setNomeOutraPessoa] = useState("");
  const [recentes, setRecentes] = useState([]);

  useEffect(() => {
    carregarRecentes();
  }, []);

  // =========================================================
  // 🔹 Recentes — só usados dentro de "Outra pessoa...", o caso raro
  // (~10% dos lançamentos). O fluxo principal (lista de Membros) não
  // precisa disso.
  // =========================================================
  const carregarRecentes = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY_RECENTES);
      if (json) setRecentes(JSON.parse(json));
    } catch (erro) {
      console.error("Erro ao carregar recentes:", erro);
    }
  };

  const salvarRecentes = async (nome) => {
    try {
      const novos = [nome, ...recentes.filter((r) => r !== nome)].slice(0, 5);
      setRecentes(novos);
      await AsyncStorage.setItem(STORAGE_KEY_RECENTES, JSON.stringify(novos));
    } catch (erro) {
      console.error("Erro ao salvar recentes:", erro);
    }
  };

  const fecharModal = () => {
    setModalVisivel(false);
    onBloquearFechamento?.(false);
  };

  // =========================================================
  // 🔹 Selecionar
  // =========================================================
  const handleSelecionarMembro = (membro) => {
    onSelecionar({ id: membro.id, nome: membro.nome });
    fecharModal();
  };

  const handleSelecionarOutraPessoa = (nome) => {
    onSelecionar({ id: null, nome });
    salvarRecentes(nome);
    setModalOutraPessoaVisivel(false);
    setNomeOutraPessoa("");
    fecharModal();
  };

  const abrirOutraPessoa = () => {
    onBloquearFechamento?.(true);
    setModalOutraPessoaVisivel(true);
  };

  const fecharOutraPessoa = () => {
    setModalOutraPessoaVisivel(false);
    setNomeOutraPessoa("");
    onBloquearFechamento?.(false);
  };

  const confirmarOutraPessoa = () => {
    const nomeFinal = nomeOutraPessoa.trim();
    if (!nomeFinal) return;
    handleSelecionarOutraPessoa(nomeFinal);
  };

  const abrirGerenciar = () => {
    onBloquearFechamento?.(true);
    setModalGerenciarVisivel(true);
  };

  const fecharGerenciar = () => {
    setModalGerenciarVisivel(false);
    onBloquearFechamento?.(false);
  };

  // =========================================================
  // 🔹 Render
  // =========================================================
  return (
    <View style={{ marginBottom: -2 }}>
      {mostrarLabel && <Text style={globalStyles.label}>{label}</Text>}

      <TouchableOpacity
        onPress={() => {
          onBloquearFechamento?.(true);
          setModalVisivel(true);
        }}
        style={[
          globalStyles.input,
          { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 1 }}>
          {!!membroSelecionado && (
            <AvatarRenderer
              avatar={membroSelecionado?.avatar}
              nome={membroSelecionado?.nome || membroSelecionado}
              variante="mini"
            />
          )}
          <Text style={[globalStyles.text, !!membroSelecionado && { marginLeft: 8 }]}>
            {membroSelecionado
              ? membroSelecionado?.nome || membroSelecionado
              : `Selecionar ${label.toLowerCase()}`}
          </Text>
        </View>
        <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Modal principal — só a lista de Membros + "Outra pessoa..." */}
      <Modal
        isVisible={modalVisivel}
        onBackdropPress={fecharModal}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={fecharModal}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={membros}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleSelecionarMembro(item)}
                style={[
                  globalStyles.listItem,
                  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <AvatarRenderer avatar={item.avatar} nome={item.nome} variante="mini" />
                  <Text style={[globalStyles.listItemTitle, { marginLeft: 8 }]}>{item.nome}</Text>
                </View>
                {(membroSelecionado?.id || membroSelecionado) === item.id && (
                  <MaterialIcons name="check" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={globalStyles.emptyContainer}>
                <Text style={globalStyles.noDataText}>Nenhum membro cadastrado ainda</Text>
              </View>
            }
            ListFooterComponent={
              <View>
                <TouchableOpacity
                  style={[globalStyles.listItem, { flexDirection: "row", alignItems: "center" }]}
                  onPress={abrirOutraPessoa}
                >
                  <MaterialIcons name="person-outline" size={22} color={colors.textSecondary} />
                  <Text style={[globalStyles.listItemTitle, { marginLeft: 8, color: colors.textSecondary }]}>
                    Outra pessoa...
                  </Text>
                </TouchableOpacity>

                {/* 🔹 Atalho discreto — a responsabilidade de cadastrar/
                    editar/excluir Membro continua sendo só do hub
                    "Gerenciar Membros" (ver comentário no topo do arquivo);
                    aqui é só um link pequeno, não uma ação em destaque. */}
                <TouchableOpacity
                  onPress={() => {
                    setModalVisivel(false);
                    abrirGerenciar();
                  }}
                  style={{ alignItems: "center", paddingVertical: 14 }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Gerenciar membros
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Modal pequeno — só pede o nome, para o caso raro de alguém fora
          da família (~10% dos lançamentos, ver decisão registrada em
          SPRINT5_DISCOVERY.md). */}
      <Modal
        isVisible={modalOutraPessoaVisivel}
        onBackdropPress={fecharOutraPessoa}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>Outra pessoa</Text>
            <TouchableOpacity onPress={fecharOutraPessoa}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[globalStyles.input, { marginBottom: 12 }]}
            placeholder="Nome"
            placeholderTextColor={colors.textSecondary}
            value={nomeOutraPessoa}
            onChangeText={setNomeOutraPessoa}
            onSubmitEditing={confirmarOutraPessoa}
            autoFocus
          />
          <TouchableOpacity style={globalStyles.modalBotaoAdd} onPress={confirmarOutraPessoa}>
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={globalStyles.modalBotaoAddTexto}>Confirmar</Text>
          </TouchableOpacity>

          {recentes.length > 0 && (
            <View style={{ marginTop: 20 }}>
              <Text style={[globalStyles.label, { marginBottom: 6 }]}>Recentes</Text>
              {recentes.map((nome) => (
                <TouchableOpacity
                  key={nome}
                  style={globalStyles.listItem}
                  onPress={() => handleSelecionarOutraPessoa(nome)}
                >
                  <Text style={globalStyles.listItemTitle}>{nome}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </Modal>

      {modalGerenciarVisivel && (
        <GerenciarMembrosModal visivel={modalGerenciarVisivel} onFechar={fecharGerenciar} />
      )}
    </View>
  );
};
