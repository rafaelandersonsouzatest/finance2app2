// src/components/MembroSelect.js
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import Modal from 'react-native-modal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GerenciarMembrosModal } from './GerenciarMembrosModal';

/**
 * 🔹 Componente genérico para selecionar um membro ou comprador.
 * 
 * Props:
 * - membroSelecionado: objeto selecionado ({id, nome})
 * - onSelecionar: função callback ao selecionar
 * - lista: lista customizada (opcional, modo pessoa)
 * - label: tipo de pessoa ("Membro" ou "Comprador")
 * - tipo: "membro" = seleciona membros do Firestore, 
 *         "pessoa" = permite digitar ou selecionar recentes
 */
export const MembroSelect = ({
  membroSelecionado,
  onSelecionar,
  lista,
  label = 'Membro',
  tipo = 'membro',
  onBloquearFechamento,
}) => {
  const [membros, setMembros] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalGerenciarVisivel, setModalGerenciarVisivel] = useState(false);

  const abrirGerenciar = () => {
    onBloquearFechamento?.(true); // ✅ bloqueia fechamento do modal pai
    setModalGerenciarVisivel(true);
  };

  const fecharGerenciar = () => {
    setModalGerenciarVisivel(false);
    onBloquearFechamento?.(false); // ✅ libera novamente
  };

  const [novoNome, setNovoNome] = useState('');
  const [recentes, setRecentes] = useState([]);

  const STORAGE_KEY = '@ultimas_pessoas';

  // =========================================================
  // 🔹 Carregar membros (modo membro ou lista customizada)
  // =========================================================
  const carregarMembros = async () => {
    if (tipo !== 'membro') {
      setMembros(lista || []);
      return;
    }
    try {
      if (lista) {
        setMembros(lista);
        return;
      }
      const snapshot = await getDocs(collection(db, 'membros'));
      const listaFirestore = snapshot.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome || 'Sem nome',
      }));
      setMembros(listaFirestore);
    } catch (erro) {
      console.error('Erro ao carregar membros:', erro);
    }
  };

  useEffect(() => {
    carregarMembros();
    if (tipo === 'pessoa') carregarRecentes();
  }, [lista, tipo]);

  // =========================================================
  // 🔹 Carregar e salvar recentes (modo pessoa)
  // =========================================================
  const carregarRecentes = async () => {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      if (json) setRecentes(JSON.parse(json));
    } catch (erro) {
      console.error('Erro ao carregar recentes:', erro);
    }
  };

  const salvarRecentes = async (nome) => {
    try {
      const novos = [nome, ...recentes.filter(r => r !== nome)].slice(0, 5);
      setRecentes(novos);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novos));
    } catch (erro) {
      console.error('Erro ao salvar recentes:', erro);
    }
  };

  // =========================================================
  // 🔹 Selecionar item da lista ou recentes
  // =========================================================
  const handleSelecionar = (membro) => {
  onSelecionar(membro);
  if (tipo === 'pessoa') salvarRecentes(membro.nome);
  setModalVisivel(false);
  onBloquearFechamento?.(false); // 🔹 novo
};


  // =========================================================
  // 🔹 Confirmar pessoa digitada (modo pessoa)
  // =========================================================
const confirmarPessoa = () => {
  const nomeFinal = novoNome.trim();
  if (!nomeFinal) return;
  onSelecionar({ id: nomeFinal, nome: nomeFinal });
  salvarRecentes(nomeFinal);
  setModalVisivel(false);
  onBloquearFechamento?.(false); // 🔹 novo
  setNovoNome('');
};

  // =========================================================
  // 🔹 Label exibido no modal (apenas tipo, sem "Selecione")
  // =========================================================
  const labelFinal = label;

  // =========================================================
  // 🔹 Render
  // =========================================================
    return (
        <View style={{ marginBottom: -2 }}>
          <Text style={globalStyles.label}>{labelFinal}</Text>

          <TouchableOpacity
            onPress={() => {
              onBloquearFechamento?.(true);
              setModalVisivel(true);
            }}
            style={[
              globalStyles.input,
              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }
            ]}
          >
            <Text style={globalStyles.text}>
              {membroSelecionado
                ? Array.isArray(membroSelecionado)
                  ? membroSelecionado.map(c => c.nome).join(', ')
                  : membroSelecionado.nome
                : `Selecionar ${labelFinal.toLowerCase()}`}
            </Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* ===================================================== */}
          {/* 🔹 MODAL PRINCIPAL */}
          {/* ===================================================== */}
          <Modal
            isVisible={modalVisivel}
            onBackdropPress={() => {
              setModalVisivel(false);
              onBloquearFechamento?.(false);
            }}
            style={{ justifyContent: 'flex-end', margin: 0 }}
          >
            <View style={globalStyles.modalContainer}>
              <View style={globalStyles.modalHeader}>
                <Text style={globalStyles.modalTitle}>{labelFinal}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisivel(false);
                    onBloquearFechamento?.(false);
                  }}
                >
                  <MaterialIcons name="close" size={24} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* 🔸 Modo Membro */}
              {tipo === 'membro' ? (
                membros.length > 0 ? (
                  <FlatList
                    data={membros}
                    keyExtractor={(item) => item.id || item.nome}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => handleSelecionar(item)}
                        style={globalStyles.listItem}
                      >
                        <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
                        {membroSelecionado?.id === item.id && (
                          <MaterialIcons name="check" size={20} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                ) : (
                  <View style={globalStyles.emptyContainer}>
                    <Text style={globalStyles.noDataText}>
                      Nenhum {labelFinal.toLowerCase()} cadastrado
                    </Text>
                  </View>
                )
              ) : (
                // 🔸 Modo Pessoa
                <View>
                  <Text style={globalStyles.label}>{labelFinal}</Text>
                  <TextInput
                    style={[globalStyles.input, { marginBottom: 12 }]}
                    placeholder="Digite o nome"
                    placeholderTextColor={colors.textSecondary}
                    value={novoNome}
                    onChangeText={setNovoNome}
                  />

                  <TouchableOpacity
                    style={globalStyles.modalBotaoAdd}
                    onPress={confirmarPessoa}
                  >
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

              {/* 🔹 Botão Gerenciar Membros */}
              {tipo === 'membro' && !lista && (
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

          {/* ===================================================== */}
          {/* 🔹 FIX — MODAL GERENCIAR MEMBROS AGORA FORA DO MODAL PRINCIPAL */}
          {/* ===================================================== */}
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