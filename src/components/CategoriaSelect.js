// src/components/CategoriaSelect.js
// Seletor genérico de categoria/subcategoria — consumidor puro de
// useCategorias (nenhum acesso a Firestore/AsyncStorage aqui dentro). Mesmo
// padrão de MembroSelect.js (que consome useMembros): a seleção é sempre um
// objeto completo, não uma string, para que quem usa o componente tenha o
// `id` (necessário para gravar `categoriaId`) e não só o nome.
//
// Pensado para ser reaproveitado além dos formulários de lançamento — Metas
// Financeiras, Orçamentos, Relatórios, Dashboard e filtros futuros também
// vão selecionar categoria a partir deste mesmo componente (ver
// SPRINT4_DISCOVERY.md). Por isso ele não assume nada sobre "estar dentro de
// um formulário": não decide o que fazer com a seleção, só a devolve via
// `onSelecionar`.
//
// Preparado para um futuro modo de seleção múltipla (filtros de Relatórios/
// Dashboard/Agenda) sem precisar de um segundo componente: a árvore de dados
// (`categoriasTopo`, `subcategoriasDe`, `resultadoBusca`) já é independente
// de como a seleção é confirmada. Adicionar `multiplo`/`categoriasSelecionadas`
// no futuro só exigiria trocar `handleSelecionar` (hoje sempre fecha o modal
// na primeira escolha) por um alternar-e-confirmar quando `multiplo` for
// verdadeiro — não implementado agora, só deixado como extensão natural.
import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCategorias } from '../hooks/useCategorias';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import GerenciarCategoriasModal from './planejamento/GerenciarCategoriasModal';

// A gestão completa (criar com ícone/cor, editar, arquivar, excluir) vive em
// GerenciarCategoriasModal/CategoriasScreen — este componente só seleciona,
// e permite uma criação rápida (só nome, sem ícone/cor customizados).
export default function CategoriaSelect({
  categoria,
  onSelecionar,
  tipoTransacao, // 'despesa' | 'receita' | 'ambos' | undefined (undefined = mostra tudo)
  label = 'Categoria',
  mostrarLabel = true,
  permitirCriar = true,
  onBloquearFechamento,
}) {
  const { categorias, adicionarCategoria } = useCategorias();
  const [visivel, setVisivel] = useState(false);
  const [gerenciarVisivel, setGerenciarVisivel] = useState(false);
  const [busca, setBusca] = useState('');
  const [expandidaId, setExpandidaId] = useState(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState(null);
  const [criandoSubEm, setCriandoSubEm] = useState(null); // id da categoria-pai com o input de nova subcategoria aberto
  const [novoNomeSub, setNovoNomeSub] = useState('');

  const compativel = (cat) =>
    cat.ativa !== false &&
    (!tipoTransacao || cat.tipoTransacao === tipoTransacao || cat.tipoTransacao === 'ambos');

  const categoriasTopo = useMemo(
    () =>
      categorias
        .filter((c) => !c.parentId && compativel(c))
        .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [categorias, tipoTransacao]
  );

  const subcategoriasDe = (parentId) =>
    categorias
      .filter((c) => c.parentId === parentId && compativel(c))
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  // Busca ativa "achata" a árvore — mostra categorias e subcategorias juntas,
  // com o caminho completo, já que a estrutura em árvore não cabe numa busca.
  const resultadoBusca = useMemo(() => {
    if (!busca.trim()) return null;
    const termo = busca.trim().toLowerCase();
    return categorias
      .filter((c) => compativel(c) && c.nome.toLowerCase().includes(termo))
      .map((c) => {
        const pai = c.parentId ? categorias.find((p) => p.id === c.parentId) : null;
        return { ...c, caminho: pai ? `${pai.nome} › ${c.nome}` : c.nome };
      });
  }, [busca, categorias, tipoTransacao]);

  const abrir = () => {
    onBloquearFechamento?.(true);
    setVisivel(true);
  };

  const abrirGerenciar = () => {
    setVisivel(false);
    setGerenciarVisivel(true);
  };

  const fecharGerenciar = () => {
    setGerenciarVisivel(false);
    onBloquearFechamento?.(false);
  };

  const fechar = () => {
    setBusca('');
    setErro(null);
    onBloquearFechamento?.(false);
    setVisivel(false);
  };

  const handleSelecionar = (cat) => {
    onSelecionar(cat);
    fechar();
  };

  // Criação rápida de categoria de topo (a partir da busca sem resultado).
  const handleCriarCategoria = async (nome) => {
    if (!nome) return;
    setErro(null);
    setCriando(true);
    try {
      await adicionarCategoria({
        nome,
        parentId: null,
        tipoTransacao: tipoTransacao && tipoTransacao !== 'ambos' ? tipoTransacao : 'despesa',
      });
      setBusca('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCriando(false);
    }
  };

  // Criação rápida de subcategoria, dentro de uma categoria-pai expandida.
  const handleCriarSubcategoria = async (parentId) => {
    const nome = novoNomeSub.trim();
    if (!nome) return;
    setErro(null);
    setCriando(true);
    try {
      await adicionarCategoria({
        nome,
        parentId,
        tipoTransacao: tipoTransacao && tipoTransacao !== 'ambos' ? tipoTransacao : 'despesa',
      });
      setNovoNomeSub('');
      setCriandoSubEm(null);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCriando(false);
    }
  };

  return (
    <View style={{ marginBottom: -2 }}>
      {mostrarLabel && <Text style={globalStyles.label}>{label}</Text>}

      <TouchableOpacity
        onPress={abrir}
        style={[
          globalStyles.input,
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {!!categoria?.icone && (
            <MaterialCommunityIcons
              name={categoria.icone}
              size={18}
              color={categoria.cor || colors.textSecondary}
              style={{ marginRight: 8 }}
            />
          )}
          <Text style={{ color: categoria ? colors.textPrimary : colors.textSecondary, fontSize: 16 }}>
            {categoria?.nome || `Selecionar ${label.toLowerCase()}`}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        isVisible={visivel}
        onBackdropPress={fechar}
        onBackButtonPress={fechar}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[globalStyles.modalContainer, { maxHeight: '80%' }]}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={fechar}>
              <MaterialCommunityIcons name="close-circle" size={28} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[globalStyles.input, { marginBottom: 12 }]}
            placeholder="Buscar categoria..."
            placeholderTextColor={colors.textSecondary}
            value={busca}
            onChangeText={setBusca}
          />

          {resultadoBusca ? (
            <FlatList
              data={resultadoBusca}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={globalStyles.listItem} onPress={() => handleSelecionar(item)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <MaterialCommunityIcons
                      name={item.icone || 'shape-outline'}
                      size={20}
                      color={item.cor || colors.textSecondary}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={globalStyles.listItemTitle}>{item.caminho}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                permitirCriar ? (
                  <TouchableOpacity
                    style={[globalStyles.modalBotaoAdd, { marginTop: 8 }]}
                    disabled={criando}
                    onPress={() => handleCriarCategoria(busca.trim())}
                  >
                    <MaterialCommunityIcons name="plus-circle-outline" size={20} color="#fff" />
                    <Text style={globalStyles.modalBotaoAddTexto}>
                      Criar categoria "{busca.trim()}"
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={globalStyles.noDataText}>Nenhuma categoria encontrada.</Text>
                )
              }
            />
          ) : (
            <FlatList
              data={categoriasTopo}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                permitirCriar ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                    Digite acima para buscar ou criar uma nova categoria.
                  </Text>
                ) : null
              }
              renderItem={({ item }) => {
                const subs = subcategoriasDe(item.id);
                const expandida = expandidaId === item.id;
                return (
                  <View>
                    <TouchableOpacity style={globalStyles.listItem} onPress={() => handleSelecionar(item)}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons
                          name={item.icone || 'shape-outline'}
                          size={20}
                          color={item.cor || colors.textSecondary}
                          style={{ marginRight: 10 }}
                        />
                        <Text style={globalStyles.listItemTitle}>{item.nome}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation?.();
                          setExpandidaId(expandida ? null : item.id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons
                          name={expandida ? 'chevron-up' : 'chevron-down'}
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>

                    {expandida && (
                      <View style={{ paddingLeft: 20 }}>
                        {subs.length === 0 && (
                          <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 8 }}>
                            Nenhuma subcategoria cadastrada.
                          </Text>
                        )}
                        {subs.map((sub) => (
                          <TouchableOpacity
                            key={sub.id}
                            style={globalStyles.listItem}
                            onPress={() => handleSelecionar(sub)}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <MaterialCommunityIcons
                                name={sub.icone || 'shape-outline'}
                                size={18}
                                color={sub.cor || colors.textSecondary}
                                style={{ marginRight: 10 }}
                              />
                              <Text style={globalStyles.listItemTitle}>{sub.nome}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                        {permitirCriar && criandoSubEm === item.id ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }}>
                            <TextInput
                              style={[globalStyles.input, { flex: 1, marginRight: 8 }]}
                              placeholder="Nome da subcategoria"
                              placeholderTextColor={colors.textSecondary}
                              value={novoNomeSub}
                              onChangeText={setNovoNomeSub}
                              autoFocus
                              onSubmitEditing={() => handleCriarSubcategoria(item.id)}
                            />
                            <TouchableOpacity
                              disabled={criando}
                              onPress={() => handleCriarSubcategoria(item.id)}
                            >
                              <MaterialCommunityIcons name="check-circle" size={26} color={colors.primary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          permitirCriar && (
                            <TouchableOpacity
                              style={{ paddingVertical: 10, paddingLeft: 4 }}
                              onPress={() => {
                                setNovoNomeSub('');
                                setCriandoSubEm(item.id);
                              }}
                            >
                              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                                + Adicionar subcategoria
                              </Text>
                            </TouchableOpacity>
                          )
                        )}
                      </View>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={
                <Text style={globalStyles.noDataText}>Nenhuma categoria cadastrada ainda.</Text>
              }
            />
          )}

          {!!erro && (
            <Text style={{ color: colors.error, marginTop: 8, textAlign: 'center' }}>{erro}</Text>
          )}

          <TouchableOpacity
            onPress={abrirGerenciar}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: 12,
              paddingVertical: 8,
            }}
          >
            <MaterialCommunityIcons name="cog-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Gerenciar categorias</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <GerenciarCategoriasModal visivel={gerenciarVisivel} onFechar={fecharGerenciar} />
    </View>
  );
}
