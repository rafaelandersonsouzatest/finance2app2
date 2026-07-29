// src/components/planejamento/CategoriasManager.js
// CRUD completo de categorias/subcategorias — conteúdo compartilhado entre
// a tela "Categorias" (dentro do hub Planejamento Financeiro) e o atalho
// "Gerenciar categorias" a partir do CategoriaSelect (GerenciarCategoriasModal),
// para não duplicar essa lógica em dois lugares.
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategorias } from '../../hooks/useCategorias';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { vibrarLeve } from '../../utils/haptics';
import { useFabPosition } from '../../hooks/useFabPosition';
import AlertaModal from '../AlertaModal';
import FormularioCategoriaModal from './FormularioCategoriaModal';

function LinhaCategoria({ item, nivel, podeExpandir, expandida, onExpandir, onEditar, onArquivar, onExcluir }) {
  return (
    <View
      style={[
        globalStyles.listItem,
        nivel > 0 && { marginLeft: 20, backgroundColor: colors.background },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
        <MaterialCommunityIcons
          name={item.icone || 'shape-outline'}
          size={20}
          color={item.cor || colors.textSecondary}
          style={{ marginRight: 10 }}
        />
        <Text
          style={[
            globalStyles.listItemTitle,
            item.ativa === false && { color: colors.textSecondary, fontStyle: 'italic' },
          ]}
        >
          {item.nome}
          {item.ativa === false ? ' (arquivada)' : ''}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {podeExpandir && (
          <TouchableOpacity onPress={onExpandir} style={{ marginRight: 10 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialCommunityIcons
              name={expandida ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={onEditar} style={{ marginRight: 10 }}>
          <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onArquivar} style={{ marginRight: 10 }}>
          <MaterialCommunityIcons
            name={item.ativa === false ? 'archive-arrow-up-outline' : 'archive-outline'}
            size={20}
            color={colors.pending}
          />
        </TouchableOpacity>
        <TouchableOpacity onPress={onExcluir}>
          <MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CategoriasManager() {
  const {
    categorias,
    loading,
    arquivarCategoria,
    reativarCategoria,
    excluirCategoria,
  } = useCategorias();

  const fabPosition = useFabPosition();
  const [expandidaId, setExpandidaId] = useState(null);
  const [formVisivel, setFormVisivel] = useState(false);
  const [categoriaEditando, setCategoriaEditando] = useState(null);
  const [parentContexto, setParentContexto] = useState(null);
  const [alerta, setAlerta] = useState({ visivel: false });

  const categoriasTopo = categorias
    .filter((c) => !c.parentId)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const subcategoriasDe = (parentId) =>
    categorias
      .filter((c) => c.parentId === parentId)
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const abrirCriacao = (parent = null) => {
    setCategoriaEditando(null);
    setParentContexto(parent);
    setFormVisivel(true);
  };

  const abrirEdicao = (categoria) => {
    setCategoriaEditando(categoria);
    setParentContexto(null);
    setFormVisivel(true);
  };

  const confirmarArquivar = (categoria) => {
    vibrarLeve();
    if (categoria.ativa === false) {
      reativarCategoria(categoria.id);
    } else {
      arquivarCategoria(categoria.id);
    }
  };

  const confirmarExcluir = (categoria) => {
    setAlerta({
      visivel: true,
      titulo: 'Excluir categoria',
      mensagem: `Tem certeza que deseja excluir "${categoria.nome}"? Essa ação não pode ser desfeita.`,
      icone: 'trash-can-outline',
      corIcone: colors.error,
      botoes: [
        { texto: 'Cancelar', onPress: () => setAlerta({ visivel: false }) },
        {
          texto: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setAlerta({ visivel: false });
            try {
              await excluirCategoria(categoria.id);
            } catch (err) {
              setAlerta({
                visivel: true,
                titulo: 'Não foi possível excluir',
                mensagem: err.message,
                icone: 'alert-circle-outline',
                corIcone: colors.error,
                botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }) }],
              });
            }
          },
        },
      ],
    });
  };

  if (loading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={categoriasTopo}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => {
          const subs = subcategoriasDe(item.id);
          const expandida = expandidaId === item.id;
          return (
            <View>
              <LinhaCategoria
                item={item}
                nivel={0}
                podeExpandir
                expandida={expandida}
                onExpandir={() => setExpandidaId(expandida ? null : item.id)}
                onEditar={() => abrirEdicao(item)}
                onArquivar={() => confirmarArquivar(item)}
                onExcluir={() => confirmarExcluir(item)}
              />
              {expandida && (
                <>
                  {subs.length === 0 && (
                    <Text
                      style={{
                        color: colors.textSecondary,
                        marginLeft: 20,
                        marginBottom: 8,
                        fontSize: 13,
                      }}
                    >
                      Nenhuma subcategoria cadastrada.
                    </Text>
                  )}
                  {subs.map((sub) => (
                    <LinhaCategoria
                      key={sub.id}
                      item={sub}
                      nivel={1}
                      podeExpandir={false}
                      onEditar={() => abrirEdicao(sub)}
                      onArquivar={() => confirmarArquivar(sub)}
                      onExcluir={() => confirmarExcluir(sub)}
                    />
                  ))}
                  <TouchableOpacity
                    style={{ marginLeft: 20, paddingVertical: 10 }}
                    onPress={() => abrirCriacao(item)}
                  >
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>
                      + Adicionar subcategoria
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={globalStyles.emptyContainer}>
            <Text style={globalStyles.noDataText}>Nenhuma categoria cadastrada ainda.</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[globalStyles.fabPrimary, fabPosition]}
        onPress={() => abrirCriacao(null)}
      >
        <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      <FormularioCategoriaModal
        visivel={formVisivel}
        onFechar={() => setFormVisivel(false)}
        categoria={categoriaEditando}
        parentIdPadrao={parentContexto?.id || null}
        parentNome={parentContexto?.nome || null}
      />

      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ visivel: false })}
        {...alerta}
      />
    </View>
  );
}
