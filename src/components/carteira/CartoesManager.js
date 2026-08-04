// src/components/carteira/CartoesManager.js
// CRUD completo de cartões — conteúdo compartilhado entre a tela
// "Gerenciar Cartões" (menu do usuário) e o atalho "Gerenciar cartões" a
// partir do CartaoSelect (ver GerenciarCarteiraModal.js), mesmo padrão de
// CategoriasManager.js — para não duplicar essa lógica em dois lugares.
import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCarteira } from '../../hooks/useCarteira';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import { vibrarLeve } from '../../utils/haptics';
import { useFabPosition } from '../../hooks/useFabPosition';
import AlertaModal from '../AlertaModal';
import CartaoVisual from '../CartaoVisual';
import FormularioCartaoModal from './FormularioCartaoModal';

function LinhaCartao({ item, onEditar, onArquivar, onExcluir }) {
  const arquivado = item.ativo === false;
  return (
    <View style={{ marginBottom: 20 }}>
      <CartaoVisual cartao={item} arquivado={arquivado} onPress={onEditar} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 20 }}>
        <TouchableOpacity onPress={onArquivar} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons
            name={arquivado ? 'archive-arrow-up-outline' : 'archive-outline'}
            size={18}
            color={colors.pending}
          />
          <Text style={{ color: colors.pending, marginLeft: 4, fontSize: 13 }}>
            {arquivado ? 'Reativar' : 'Arquivar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onExcluir} style={{ flexDirection: 'row', alignItems: 'center' }}>
          <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.error} />
          <Text style={{ color: colors.error, marginLeft: 4, fontSize: 13 }}>Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CartoesManager() {
  const { cartoesCadastrados, loading, arquivarCartao, reativarCartao, excluirCartao } = useCarteira();

  const fabPosition = useFabPosition();
  const [formVisivel, setFormVisivel] = useState(false);
  const [cartaoEditando, setCartaoEditando] = useState(null);
  const [alerta, setAlerta] = useState({ visivel: false });

  // 🔹 Ativos primeiro, arquivados por último — sem reordenar dentro de
  // cada grupo (mantém a ordem de criação vinda do hook).
  const cartoesOrdenados = [...cartoesCadastrados].sort(
    (a, b) => (a.ativo === false ? 1 : 0) - (b.ativo === false ? 1 : 0)
  );

  const abrirCriacao = () => {
    setCartaoEditando(null);
    setFormVisivel(true);
  };

  const abrirEdicao = (cartao) => {
    setCartaoEditando(cartao);
    setFormVisivel(true);
  };

  const confirmarArquivar = (cartao) => {
    vibrarLeve();
    if (cartao.ativo === false) {
      reativarCartao(cartao.id);
    } else {
      arquivarCartao(cartao.id);
    }
  };

  const confirmarExcluir = (cartao) => {
    setAlerta({
      visivel: true,
      titulo: 'Excluir cartão',
      mensagem: `Tem certeza que deseja excluir "${cartao.nome}"? Essa ação não pode ser desfeita.`,
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
              await excluirCartao(cartao.id);
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
        data={cartoesOrdenados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        renderItem={({ item }) => (
          <LinhaCartao
            item={item}
            onEditar={() => abrirEdicao(item)}
            onArquivar={() => confirmarArquivar(item)}
            onExcluir={() => confirmarExcluir(item)}
          />
        )}
        ListEmptyComponent={
          <View style={globalStyles.emptyContainer}>
            <Text style={globalStyles.noDataText}>Nenhum cartão cadastrado ainda.</Text>
          </View>
        }
      />

      <TouchableOpacity style={[globalStyles.fabPrimary, fabPosition]} onPress={abrirCriacao}>
        <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
      </TouchableOpacity>

      <FormularioCartaoModal
        visivel={formVisivel}
        onFechar={() => setFormVisivel(false)}
        cartao={cartaoEditando}
      />

      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ visivel: false })}
        {...alerta}
      />
    </View>
  );
}
