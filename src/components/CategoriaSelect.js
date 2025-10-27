import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import AlertaModal from './AlertaModal';


// 🔹 Categorias padrão iniciais
const CATEGORIAS_PADRAO = [
  'Moradia',
  'Transporte',
  'Alimentação',
  'Saúde',
  'Educação',
  'Doações',
  'Lazer',
  'Impostos',
  'Renda',
  'Outros',
];

const STORAGE_KEY = '@categorias_personalizadas';

export default function CategoriaSelect({
  value,
  onChange,
  modoHibrido = true,
}) {
  const [modalVisivel, setModalVisivel] = useState(false);
  const [gerenciarVisivel, setGerenciarVisivel] = useState(false);
  const [categorias, setCategorias] = useState(CATEGORIAS_PADRAO);
  const [busca, setBusca] = useState('');
  const [animOpacity] = useState(new Animated.Value(0));
  const [alerta, setAlerta] = useState({ visivel: false });


  // 🔸 Carrega categorias personalizadas ao iniciar
  useEffect(() => {
    (async () => {
      try {
        const armazenadas = await AsyncStorage.getItem(STORAGE_KEY);
        if (armazenadas) {
          const personalizadas = JSON.parse(armazenadas);
          setCategorias([...CATEGORIAS_PADRAO, ...personalizadas]);
        }
      } catch (e) {
        console.log('Erro ao carregar categorias:', e);
      }
    })();
  }, []);

  // 🔸 Animação de entrada do modal
  useEffect(() => {
    if (modalVisivel) {
      Animated.timing(animOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [modalVisivel]);

  // 🔸 Filtragem dinâmica
  const categoriasFiltradas = useMemo(() => {
    if (!busca.trim()) return categorias;
    const lower = busca.toLowerCase();
    return categorias.filter((c) => c.toLowerCase().includes(lower));
  }, [busca, categorias]);

  const handleSelecionar = (cat) => {
    onChange(cat);
    setModalVisivel(false);
    setBusca('');
  };

  const handleAdicionarNova = async () => {
    const nova = busca.trim();
    if (!nova) return;
    const jaExiste = categorias.some((c) => c.toLowerCase() === nova.toLowerCase());
    if (jaExiste) {
      handleSelecionar(nova);
      return;
    }

    const novaLista = [...categorias, nova];
    setCategorias(novaLista);
    handleSelecionar(nova);

    try {
      const personalizadas = novaLista.filter((c) => !CATEGORIAS_PADRAO.includes(c));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(personalizadas));
    } catch (e) {
      console.log('Erro ao salvar nova categoria:', e);
    }
  };

  // 🔹 Abre painel de gerenciamento
  const abrirGerenciar = () => {
    setGerenciarVisivel(true);
  };

// 🔹 Remove uma categoria personalizada
const handleExcluirCategoria = async (cat) => {
  setAlerta({
    visivel: true,
    titulo: 'Remover categoria',
    mensagem: `Deseja realmente excluir "${cat}"?`,
    icone: 'trash-can-outline',
    corIcone: colors.error,
    botoes: [
      {
        texto: 'Cancelar',
        onPress: () => setAlerta({ visivel: false }),
        style: 'primary',
      },
      {
        texto: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          const novas = categorias.filter(
            (c) => c !== cat && !CATEGORIAS_PADRAO.includes(c)
          );
          setCategorias([...CATEGORIAS_PADRAO, ...novas]);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novas));
          setAlerta({ visivel: false });
        },
      },
    ],
  });
}; // 👈 Faltava fechar aqui

// 🔹 Limpa todas personalizadas
const handleLimparTodas = async () => {
  setAlerta({
    visivel: true,
    titulo: 'Limpar categorias personalizadas',
    mensagem:
      'Tem certeza que deseja remover todas as categorias criadas por você?',
    icone: 'alert-circle-outline',
    corIcone: colors.warning || '#EFB700',
    botoes: [
      {
        texto: 'Cancelar',
        onPress: () => setAlerta({ visivel: false }),
        style: 'primary',
      },
      {
        texto: 'Limpar Tudo',
        style: 'destructive',
        onPress: async () => {
          setCategorias(CATEGORIAS_PADRAO);
          await AsyncStorage.removeItem(STORAGE_KEY);
          setAlerta({ visivel: false });
        },
      },
    ],
  });
}; // 👈 e aqui também


  return (
    <View style={{ marginTop: 2 }}>
      {/* Campo principal */}
      <TouchableOpacity
        style={[
          globalStyles.input,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        ]}
        onPress={() => setModalVisivel(true)}
        activeOpacity={0.8}
      >
        <Text
          style={{
            color: value ? colors.textPrimary : colors.textSecondary,
            fontSize: 16,
          }}
        >
          {value || 'Selecione uma categoria'}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={22}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Modal principal */}
      <Modal
        visible={modalVisivel}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisivel(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={globalStyles.fullScreenModalOverlay}
        >
          <Animated.View
            style={[
              globalStyles.managementModalContainer,
              { opacity: animOpacity, padding: 16, height: '75%' },
            ]}
          >
            <Text style={globalStyles.managementModalTitle}>Selecionar Categoria</Text>

            {/* Campo de busca */}
            <TextInput
              placeholder="Buscar ou criar nova..."
              value={busca}
              onChangeText={setBusca}
              placeholderTextColor={colors.textSecondary}
              style={[
                globalStyles.input,
                { marginVertical: 10, fontSize: 16 },
              ]}
            />

            {/* Lista de categorias */}
            <FlatList
              data={categoriasFiltradas}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{
                    paddingVertical: 12,
                    borderBottomColor: colors.border,
                    borderBottomWidth: 1,
                  }}
                  onPress={() => handleSelecionar(item)}
                >
                  <Text style={{ fontSize: 16, color: colors.textPrimary }}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                modoHibrido && busca.trim() ? (
                  <TouchableOpacity
                    onPress={handleAdicionarNova}
                    style={{
                      paddingVertical: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: `${colors.primary}20`,
                      borderRadius: 12,
                      marginTop: 10,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="plus-circle-outline"
                      size={22}
                      color={colors.primary}
                    />
                    <Text
                      style={{
                        color: colors.primary,
                        marginTop: 4,
                        fontWeight: '600',
                      }}
                    >
                      Adicionar "{busca.trim()}"
                    </Text>
                  </TouchableOpacity>
                ) : null
              }
              contentContainerStyle={{ paddingBottom: 20 }}
            />

            {/* Rodapé */}
            <View style={{ marginTop: 16, alignItems: 'center' }}>
                <TouchableOpacity
                onPress={abrirGerenciar}
                activeOpacity={0.8}
                style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: `${colors.primary}44`, // 27% opaco
                    borderRadius: 10,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                }}
                >
                <MaterialCommunityIcons
                    name="cog-outline"
                    size={20}
                    color={`${colors.primary}DD`} // 60% opaco
                    style={{ marginRight: 6 }}
                />
                <Text
                    style={{
                    color: `${colors.primary}DD`,
                    fontWeight: '600',
                    fontSize: 15,
                    }}
                >
                    Gerenciar categorias
                </Text>
                </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setModalVisivel(false)}
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 🔹 Modal secundário — Gerenciar */}
      <Modal
        visible={gerenciarVisivel}
        animationType="slide"
        transparent
        onRequestClose={() => setGerenciarVisivel(false)}
      >
        <View style={globalStyles.fullScreenModalOverlay}>
          <View
            style={[
              globalStyles.managementModalContainer,
              { padding: 16, height: '70%' },
            ]}
          >
            <Text style={globalStyles.managementModalTitle}>Gerenciar Categorias</Text>
            <FlatList
              data={categorias.filter((c) => !CATEGORIAS_PADRAO.includes(c))}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 16, color: colors.textPrimary }}>{item}</Text>
                  <TouchableOpacity onPress={() => handleExcluirCategoria(item)}>
                    <MaterialCommunityIcons
                      name="trash-can-outline"
                      size={22}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={
                <Text
                  style={{
                    color: colors.textSecondary,
                    textAlign: 'center',
                    marginTop: 40,
                  }}
                >
                  Nenhuma categoria personalizada.
                </Text>
              }
            />

            <TouchableOpacity
            onPress={handleLimparTodas}
            style={[
                globalStyles.cancelButton,
                {
                marginTop: 20,
                backgroundColor: colors.error,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                },
            ]}
            activeOpacity={0.8}
            >
            <MaterialCommunityIcons
                name="trash-can-outline"
                size={20}
                color={colors.textPrimary} // preto (ou cor padrão do texto)
                style={{ marginRight: 8 }}
            />
            <Text
                style={[
                globalStyles.cancelButtonText,
                {
                    color: colors.textPrimary, // preto
                    textAlign: 'center',
                    fontWeight: '600',
                },
                ]}
            >
                Limpar todas
            </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setGerenciarVisivel(false)}
              style={{ marginTop: 12, alignItems: 'center' }}
            >
              <Text style={{ color: colors.textSecondary }}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <AlertaModal
  visible={alerta.visivel}
  onClose={() => setAlerta({ visivel: false })}
  {...alerta}
/>

    </View>
  );
}
