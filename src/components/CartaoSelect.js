import { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput } from 'react-native';
import Modal from 'react-native-modal';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useCarteira } from '../hooks/useCarteira';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import CartaoVisual from './CartaoVisual';
import GerenciarCarteiraModal from './carteira/GerenciarCarteiraModal';

// =========================================================
// 🔹 Seletor único de "qual cartão" está associado a uma compra — mesmo
// padrão de MembroSelect.js/CategoriaSelect.js (consumidor puro de
// useCarteira, nenhum acesso a Firestore aqui dentro; a seleção é sempre um
// objeto completo, não uma string, para quem usa o componente ter o `id`).
//
// Dentro do seletor só existem duas coisas: a lista de cartões cadastrados
// (+ "Outro cartão...", para o caso informal/pontual, mesmo tratamento de
// "Outra pessoa..." do MembroSelect) e o atalho "Gerenciar cartões" — não há
// criação rápida aqui dentro; quem precisa cadastrar um cartão de verdade
// acessa "Gerenciar cartões", cadastra, volta e continua o lançamento.
// =========================================================
export const CartaoSelect = ({
  cartaoSelecionado,
  onSelecionar,
  label = 'Cartão',
  mostrarLabel = true,
  onBloquearFechamento,
}) => {
  const { cartoesCadastrados } = useCarteira();
  const cartoesAtivos = cartoesCadastrados.filter((c) => c.ativo !== false);

  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalOutroVisivel, setModalOutroVisivel] = useState(false);
  const [modalGerenciarVisivel, setModalGerenciarVisivel] = useState(false);
  const [nomeOutro, setNomeOutro] = useState('');

  const fecharModal = () => {
    setModalVisivel(false);
    onBloquearFechamento?.(false);
  };

  const handleSelecionarCartao = (cartao) => {
    onSelecionar({ id: cartao.id, nome: cartao.nome, cor: cartao.cor, banco: cartao.banco || null });
    fecharModal();
  };

  const abrirOutro = () => {
    onBloquearFechamento?.(true);
    setModalOutroVisivel(true);
  };

  const fecharOutro = () => {
    setModalOutroVisivel(false);
    setNomeOutro('');
    onBloquearFechamento?.(false);
  };

  const confirmarOutro = () => {
    const nome = nomeOutro.trim();
    if (!nome) return;
    onSelecionar({ id: null, nome, cor: null, banco: null });
    fecharOutro();
    fecharModal();
  };

  const abrirGerenciar = () => {
    onBloquearFechamento?.(true);
    setModalGerenciarVisivel(true);
  };

  const fecharGerenciar = () => {
    setModalGerenciarVisivel(false);
    onBloquearFechamento?.(false);
  };

  const nomeExibido =
    (typeof cartaoSelecionado === 'object' ? cartaoSelecionado?.nome : cartaoSelecionado) || null;
  const corExibida = typeof cartaoSelecionado === 'object' ? cartaoSelecionado?.cor : null;

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
          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
          {!!corExibida && (
            // 🔹 Miniatura no formato de cartão (não uma bolinha) — mais
            // imersivo, mesma cor cadastrada do CartaoVisual.
            <View
              style={{
                width: 22,
                height: 14,
                borderRadius: 3,
                backgroundColor: corExibida,
                marginRight: 8,
              }}
            />
          )}
          <Text
            style={{ color: nomeExibido ? colors.textPrimary : colors.textSecondary, fontSize: 16 }}
            numberOfLines={1}
          >
            {nomeExibido || `Selecionar ${label.toLowerCase()}`}
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-down" size={22} color={colors.textSecondary} />
      </TouchableOpacity>

      {/* Modal principal — lista de cartões cadastrados + "Outro cartão..." */}
      <Modal
        isVisible={modalVisivel}
        onBackdropPress={fecharModal}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={[globalStyles.modalContainer, { maxHeight: '80%' }]}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{label}</Text>
            <TouchableOpacity onPress={fecharModal}>
              <MaterialCommunityIcons name="close-circle" size={28} color={colors.textTertiary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={cartoesAtivos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 12 }}>
                <CartaoVisual cartao={item} tamanho="compacto" onPress={() => handleSelecionarCartao(item)} />
              </View>
            )}
            ListEmptyComponent={
              <Text style={[globalStyles.noDataText, { marginBottom: 12 }]}>
                Nenhum cartão cadastrado ainda.
              </Text>
            }
            ListFooterComponent={
              <View>
                <TouchableOpacity
                  style={[globalStyles.listItem, { flexDirection: 'row', alignItems: 'center' }]}
                  onPress={abrirOutro}
                >
                  <MaterialCommunityIcons name="credit-card-outline" size={22} color={colors.textSecondary} />
                  <Text style={[globalStyles.listItemTitle, { marginLeft: 8, color: colors.textSecondary }]}>
                    Outro cartão...
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setModalVisivel(false);
                    abrirGerenciar();
                  }}
                  style={{ alignItems: 'center', paddingVertical: 14 }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Gerenciar cartões</Text>
                </TouchableOpacity>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Modal pequeno — só pede o nome, para o caso pontual de um cartão
          não cadastrado (mesmo tratamento de "Outra pessoa..." em
          MembroSelect.js). */}
      <Modal
        isVisible={modalOutroVisivel}
        onBackdropPress={fecharOutro}
        style={{ justifyContent: 'flex-end', margin: 0 }}
      >
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>Outro cartão</Text>
            <TouchableOpacity onPress={fecharOutro}>
              <MaterialIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <TextInput
            style={[globalStyles.input, { marginBottom: 12 }]}
            placeholder="Nome do cartão"
            placeholderTextColor={colors.textSecondary}
            value={nomeOutro}
            onChangeText={setNomeOutro}
            onSubmitEditing={confirmarOutro}
            autoFocus
          />
          <TouchableOpacity style={globalStyles.modalBotaoAdd} onPress={confirmarOutro}>
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={globalStyles.modalBotaoAddTexto}>Confirmar</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {modalGerenciarVisivel && (
        <GerenciarCarteiraModal visivel={modalGerenciarVisivel} onFechar={fecharGerenciar} />
      )}
    </View>
  );
};
