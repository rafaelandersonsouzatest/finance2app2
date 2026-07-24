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
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { useAuth } from "../auth/useAuth"; // ✅ importante
import { GerenciarMembrosModal } from "./GerenciarMembrosModal";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";

export const MembroSelect = ({
  membroSelecionado,
  onSelecionar,
  lista,
  label = "Membro",
  tipo = "membro",
  mostrarLabel = true,
  onBloquearFechamento,
}) => {
  const { user } = useAuth(); // ✅ usuário logado
  const [membros, setMembros] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalGerenciarVisivel, setModalGerenciarVisivel] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [recentes, setRecentes] = useState([]);

  const STORAGE_KEY = "@ultimas_pessoas";

  const abrirGerenciar = () => {
    onBloquearFechamento?.(true);
    setModalGerenciarVisivel(true);
  };

  const fecharGerenciar = () => {
    setModalGerenciarVisivel(false);
    onBloquearFechamento?.(false);
  };

  // =========================================================
  // 🔹 Carregar membros (modo membro ou lista customizada)
  // =========================================================
  const carregarMembros = async () => {
    if (tipo !== "membro" || !user?.uid) {
      setMembros(lista || []);
      return;
    }
    try {
      const ref = collection(db, "users", user.uid, "membros");
      const snapshot = await getDocs(ref);
      const listaFirestore = snapshot.docs.map((doc) => ({
        id: doc.id,
        nome: doc.data().nome || "Sem nome",
      }));
      setMembros(listaFirestore);
    } catch (erro) {
      console.error("Erro ao carregar membros:", erro);
    }
  };

  useEffect(() => {
    carregarMembros();
    if (tipo === "pessoa") carregarRecentes();
  }, [lista, tipo, user?.uid]);
  
  // =========================================================
  // 🔹 Recentes (modo pessoa)
  // =========================================================
  const carregarRecentes = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setRecentes(JSON.parse(json));
    } catch (erro) {
      console.error("Erro ao carregar recentes:", erro);
    }
  };

  const salvarRecentes = async (nome) => {
    try {
      const novos = [nome, ...recentes.filter((r) => r !== nome)].slice(0, 5);
      setRecentes(novos);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novos));
    } catch (erro) {
      console.error("Erro ao salvar recentes:", erro);
    }
  };

  // =========================================================
  // 🔹 Selecionar item
  // =========================================================
  const handleSelecionar = (membro) => {
    onSelecionar(membro);
    if (tipo === "pessoa") salvarRecentes(membro.nome);
    setModalVisivel(false);
    onBloquearFechamento?.(false);
  };

  const confirmarPessoa = () => {
    const nomeFinal = novoNome.trim();
    if (!nomeFinal) return;
    onSelecionar({ id: nomeFinal, nome: nomeFinal });
    salvarRecentes(nomeFinal);
    setModalVisivel(false);
    onBloquearFechamento?.(false);
    setNovoNome("");
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
        <Text style={globalStyles.text}>
          {membroSelecionado
            ? Array.isArray(membroSelecionado)
              ? membroSelecionado.map((c) => c?.nome || c).join(", ")
              : membroSelecionado?.nome || membroSelecionado
            : `Selecionar ${label.toLowerCase()}`}
        </Text>
        <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Modal principal */}
      <Modal
        isVisible={modalVisivel}
        onBackdropPress={() => {
          setModalVisivel(false);
          onBloquearFechamento?.(false);
        }}
        style={{ justifyContent: "flex-end", margin: 0 }}
      >
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{label}</Text>
            <TouchableOpacity
              onPress={() => {
                setModalVisivel(false);
                onBloquearFechamento?.(false);
              }}
            >
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {tipo === "membro" ? (
            membros.length > 0 ? (
              <FlatList
                data={membros}
                keyExtractor={(item) => item.id || item.nome}
                renderItem={({ item }) => (
                  <TouchableOpacity onPress={() => handleSelecionar(item)} style={globalStyles.listItem}>
                    <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
                    {(membroSelecionado?.id || membroSelecionado) === item.id && (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={globalStyles.emptyContainer}>
                <Text style={globalStyles.noDataText}>
                  Nenhum {label.toLowerCase()} cadastrado
                </Text>
              </View>
            )
          ) : (
            // Modo pessoa
            <View>
              <TextInput
                style={[globalStyles.input, { marginBottom: 12 }]}
                placeholder="Digite o nome"
                placeholderTextColor={colors.textSecondary}
                value={novoNome}
                onChangeText={setNovoNome}
              />
              <TouchableOpacity style={globalStyles.modalBotaoAdd} onPress={confirmarPessoa}>
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
                      onPress={() => handleSelecionar({ id: nome, nome })}
                    >
                      <Text style={globalStyles.listItemTitle}>{nome}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Botão Gerenciar */}
          {tipo === "membro" && !lista && (
            <TouchableOpacity
              style={[globalStyles.modalBotaoAdd, { marginTop: 12 }]}
              onPress={() => {
                setModalVisivel(false);
                abrirGerenciar();
              }}
            >
              <MaterialIcons name="group" size={20} color="#fff" />
              <Text style={globalStyles.modalBotaoAddTexto}>Gerenciar membros</Text>
            </TouchableOpacity>
          )}
        </View>
      </Modal>

      {modalGerenciarVisivel && (
        <GerenciarMembrosModal
          visivel={modalGerenciarVisivel}
          onFechar={fecharGerenciar}
          onAtualizarLista={carregarMembros}
        />
      )}
    </View>
  );
};
