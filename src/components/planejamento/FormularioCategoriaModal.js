// src/components/planejamento/FormularioCategoriaModal.js
// Formulário de criar/editar categoria ou subcategoria — usado tanto pela
// tela de Categorias quanto pelo atalho "Gerenciar categorias" a partir do
// CategoriaSelect (ver GerenciarCategoriasModal.js). Único formulário para
// os dois casos: `categoria` vem preenchida ao editar, vazia ao criar.
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategorias } from '../../hooks/useCategorias';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import ModernTabs from '../ModernTabs';

const ICONES_DISPONIVEIS = [
  'shape-outline', 'home-outline', 'car-outline', 'food-outline', 'medical-bag',
  'school-outline', 'hand-heart-outline', 'church', 'movie-outline', 'file-document-outline',
  'cash-plus', 'cash-minus', 'cart-outline', 'gas-station-outline', 'bus',
  'airplane', 'gift-outline', 'dumbbell', 'paw', 'baby-face-outline', 'tshirt-crew-outline',
];

const CORES_DISPONIVEIS = [
  '#EF5350', '#FF8A65', '#FFCA28', '#66BB6A', '#26A69A',
  '#42A5F5', '#5C6BC0', '#AB47BC', '#EC407A', '#8D6E63', '#78909C',
];

export default function FormularioCategoriaModal({
  visivel,
  onFechar,
  categoria = null, // null = criando; objeto = editando
  parentIdPadrao = null,
  parentNome = null,
}) {
  const { adicionarCategoria, atualizarCategoria } = useCategorias();
  const editando = !!categoria;

  const [nome, setNome] = useState('');
  const [tipoTransacao, setTipoTransacao] = useState('despesa');
  const [icone, setIcone] = useState(ICONES_DISPONIVEIS[0]);
  const [cor, setCor] = useState(CORES_DISPONIVEIS[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!visivel) return;
    setNome(categoria?.nome || '');
    setTipoTransacao(categoria?.tipoTransacao || 'despesa');
    setIcone(categoria?.icone || ICONES_DISPONIVEIS[0]);
    setCor(categoria?.cor || CORES_DISPONIVEIS[0]);
    setErro(null);
  }, [visivel, categoria]);

  const salvar = async () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      setErro('Digite um nome.');
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      if (editando) {
        await atualizarCategoria(categoria.id, { nome: nomeTrim, tipoTransacao, icone, cor });
      } else {
        await adicionarCategoria({
          nome: nomeTrim,
          parentId: parentIdPadrao,
          tipoTransacao,
          icone,
          cor,
        });
      }
      onFechar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isVisible={visivel}
      onBackdropPress={onFechar}
      onBackButtonPress={onFechar}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[globalStyles.modalContainer, { maxHeight: '85%' }]}>
        <View style={globalStyles.modalHeader}>
          <Text style={globalStyles.modalTitle}>
            {editando ? 'Editar categoria' : parentNome ? `Nova subcategoria em ${parentNome}` : 'Nova categoria'}
          </Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialCommunityIcons name="close-circle" size={28} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={globalStyles.label}>Nome</Text>
          <TextInput
            style={globalStyles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Alimentação"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[globalStyles.label, { marginTop: 16 }]}>Tipo de transação</Text>
          <ModernTabs
            compact
            tabs={[
              { key: 'despesa', label: 'Despesa', icon: 'arrow-down-bold-outline' },
              { key: 'receita', label: 'Receita', icon: 'arrow-up-bold-outline' },
              { key: 'ambos', label: 'Ambos', icon: 'swap-vertical-bold' },
            ]}
            activeTab={tipoTransacao}
            setActiveTab={setTipoTransacao}
            backgroundColor="transparent"
          />

          <Text style={[globalStyles.label, { marginTop: 16 }]}>Ícone</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {ICONES_DISPONIVEIS.map((nomeIcone) => (
              <TouchableOpacity
                key={nomeIcone}
                onPress={() => setIcone(nomeIcone)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: icone === nomeIcone ? `${cor}33` : colors.background,
                  borderWidth: icone === nomeIcone ? 2 : 1,
                  borderColor: icone === nomeIcone ? cor : colors.borderLight,
                }}
              >
                <MaterialCommunityIcons name={nomeIcone} size={20} color={cor} />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[globalStyles.label, { marginTop: 16 }]}>Cor</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CORES_DISPONIVEIS.map((corDisponivel) => (
              <TouchableOpacity
                key={corDisponivel}
                onPress={() => setCor(corDisponivel)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: corDisponivel,
                  borderWidth: cor === corDisponivel ? 3 : 0,
                  borderColor: colors.textPrimary,
                }}
              />
            ))}
          </View>

          {!!erro && (
            <Text style={{ color: colors.error, marginTop: 12, textAlign: 'center' }}>{erro}</Text>
          )}

          <TouchableOpacity
            style={[globalStyles.saveButton, { marginTop: 20, marginBottom: 12 }]}
            onPress={salvar}
            disabled={salvando}
          >
            <Text style={globalStyles.saveButtonText}>
              {salvando ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
