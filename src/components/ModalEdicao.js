import { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import ModalRN from 'react-native-modal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { vibrarSucesso } from '../utils/haptics';
import { datasPadraoPorDescricao } from '../utils/datasPadrao';
import { gerarDataComDia } from '../utils/gerarDataComDia';
import { formatarDataParaExibicao, normalizarParaISO } from '../utils/formatarData';
import { parseBRL } from '../utils/formatarValor';
import SeletorData from './SeletorData';
import CampoMonetarioCompartilhado from './CampoMonetario';
import CategoriaSelect from './CategoriaSelect';
import { MembroSelect } from '../components/MembroSelect';
import { CartaoSelect } from '../components/CartaoSelect';
import { useCategorias } from '../hooks/useCategorias';
import { useMembros } from '../hooks/useMembros';
import { useCarteira } from '../hooks/useCarteira';
import OpcaoPersonalizarParcelas from './OpcaoPersonalizarParcelas';


// ==========================================================
// 🔹 CAMPOS REUTILIZÁVEIS
// ==========================================================
const CampoTexto = memo(({ label, campo, placeholder, valores, atualizarCampo }) => (
  <View style={globalStyles.inputGroup}>
    <Text style={globalStyles.label}>{label}</Text>
    <TextInput
      style={globalStyles.input}
      value={valores[campo] || ''}
      onChangeText={(t) => atualizarCampo(campo, t)}
      placeholder={placeholder}
      placeholderTextColor={colors.textSecondary}
    />
  </View>
));

// 🔹 Adaptador fino para o padrão `campo`/`valores`/`atualizarCampo` já usado
// por todos os campos deste arquivo — por baixo, sempre o mesmo componente
// compartilhado por todo o app (`CampoMonetario.js`), nunca uma implementação
// própria de máscara monetária.
const CampoMonetario = memo(({ label, campo, valores, atualizarCampo }) => (
  <CampoMonetarioCompartilhado
    label={label}
    valor={valores[campo]}
    onChange={(valorNum) => atualizarCampo(campo, valorNum)}
  />
));

const CampoData = memo(({ label, campo, valores, atualizarCampo }) => (
  <View style={globalStyles.inputGroup}>
    <Text style={globalStyles.label}>{label}</Text>
    <SeletorData value={valores[campo] || ''} onChangeText={(t) => atualizarCampo(campo, t)} />
  </View>
));

const CampoStatusPago = memo(({ label, pago, aoAlternar }) => (
  <View
    style={[
      globalStyles.inputGroup,
      {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
      },
    ]}
  >
    <Text style={globalStyles.label}>{label}</Text>
    <TouchableOpacity
      onPress={() => aoAlternar(!pago)}
      style={{
        backgroundColor: pago ? colors.primary + '22' : colors.cardBackground,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 14,
      }}
    >
      <Text
        style={{
          color: pago ? colors.primary : colors.textSecondary,
          fontWeight: '600',
        }}
      >
        {pago ? 'Sim' : 'Não'}
      </Text>
    </TouchableOpacity>
  </View>
));
  const CampoCategoria = memo(({ valores, atualizarCampo, tipoTransacao }) => (
    <View style={globalStyles.inputGroup}>
      <CategoriaSelect
        categoria={valores.categoria}
        onSelecionar={(cat) => atualizarCampo('categoria', cat)}
        tipoTransacao={tipoTransacao}
      />
    </View>
  ));


// ==========================================================
// 🔹 CAMPOS POR TIPO (ISOLADOS DO MODAL)
// ==========================================================
const CamposModal = memo(({ tipo, valores, atualizarCampo, marcarComoPago, parcelasExistentes, parcelasBloqueadas }) => {
  const renderCamposPorTipo = () => {
    switch (tipo) {
      case 'entrada':
        return (
          <>
            <CampoTexto label="Descrição *" campo="descricao" placeholder="Ex: Salário" valores={valores} atualizarCampo={atualizarCampo} />
            <MembroSelect membroSelecionado={valores.membro} onSelecionar={(membro) => atualizarCampo('membro', membro)} />
            <CampoMonetario label="Valor *" campo="valor" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoStatusPago label="Recebido?" pago={valores.pago} aoAlternar={marcarComoPago} />
            {!valores.pago && <CampoData label="Data prevista para Recebimento 📅" campo="data" valores={valores} atualizarCampo={atualizarCampo} />}
            {valores.pago && <CampoData label="Data de Recebimento 💰" campo="dataPagamento" valores={valores} atualizarCampo={atualizarCampo} />}
            <CampoCategoria valores={valores} atualizarCampo={atualizarCampo} tipoTransacao="receita" />
          </>
        );

      case 'gasto':
        return (
          <>
            <CampoTexto label="Descrição *" campo="descricao" placeholder="Ex: Aluguel" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoMonetario label="Valor *" campo="valor" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoData label="Data de Vencimento 📅" campo="dataVencimento" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoStatusPago label="Pago?" pago={valores.pago} aoAlternar={marcarComoPago} />
            {valores.pago && <CampoData label="Data de Pagamento 💰" campo="dataPagamento" valores={valores} atualizarCampo={atualizarCampo} />}
            <CampoCategoria valores={valores} atualizarCampo={atualizarCampo} tipoTransacao="despesa" />
          </>
        );

      case 'emprestimo':
        return (
          <>
            <CampoTexto label="Descrição *" campo="descricao" placeholder="Ex: Parcela Carro" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoMonetario label="Valor da Parcela *" campo="valor" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoData label="Data de Vencimento 📅" campo="dataVencimento" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoStatusPago label="Pago?" pago={valores.pago} aoAlternar={marcarComoPago} />
            {valores.pago && <CampoData label="Data de Pagamento 💰" campo="dataPagamento" valores={valores} atualizarCampo={atualizarCampo} />}
            <CampoTexto label="Pessoa/Instituição" campo="credor" placeholder="Ex: Banco XYZ" valores={valores} atualizarCampo={atualizarCampo} />
            {/* 🔹 Corrigido nesta sprint: empréstimo podia receber categoria na
                criação (ModalCriacao.js), mas não tinha como editar depois —
                achado registrado em SPRINT4_DISCOVERY.md, seção 1. */}
            <CampoCategoria valores={valores} atualizarCampo={atualizarCampo} tipoTransacao="despesa" />
          </>
        );

      case 'cartao':
        return (
          <>
            <CampoTexto label="Descrição *" campo="descricao" placeholder="Ex: Compra supermercado" valores={valores} atualizarCampo={atualizarCampo} />
            {/* 🔹 Corrigido nesta sprint: usava um campo `comprador` que
                nunca era lido em nenhuma outra tela (useCartoes.js sempre
                usou `pessoa`) — editar o Comprador aqui não persistia de
                verdade. Achado durante a unificação Comprador/Membro, ver
                SPRINT5_DISCOVERY.md seção 4.3.2. */}
            <MembroSelect label="Comprador" membroSelecionado={valores.pessoa} onSelecionar={(membro) => atualizarCampo('pessoa', membro)} />
            <CartaoSelect label="Cartão *" cartaoSelecionado={valores.cartao} onSelecionar={(cartao) => atualizarCampo('cartao', cartao)} />

            {valores.pago || valores.adiantada ? (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Valor *</Text>
                <Text style={[globalStyles.text, { color: colors.textSecondary }]}>
                  R$ {Number(valores.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {'  '}· {valores.adiantada ? 'parcela antecipada' : 'parcela já paga'}, valor não pode ser alterado
                </Text>
              </View>
            ) : !(Array.isArray(valores.parcelasPersonalizadas) && valores.parcelasPersonalizadas.length > 0) ? (
              <CampoMonetario label="Valor *" campo="valor" valores={valores} atualizarCampo={atualizarCampo} />
            ) : (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Valor desta parcela</Text>
                <Text style={[globalStyles.text, { color: colors.textSecondary }]}>
                  R${' '}
                  {Number(
                    valores.parcelasPersonalizadas[(valores.parcelaAtual || 1) - 1] || 0
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {'  '}· definido em "Editar valores das parcelas"
                </Text>
              </View>
            )}

            {(valores.totalParcelas || 1) > 1 && (
              <OpcaoPersonalizarParcelas
                totalParcelas={valores.totalParcelas}
                valorBaseParaDivisaoIgual={Number(valores.valor || 0) * Number(valores.totalParcelas || 1)}
                valoresExistentes={parcelasExistentes}
                parcelasBloqueadas={parcelasBloqueadas}
                parcelasPersonalizadas={valores.parcelasPersonalizadas}
                onChange={(novoValor) => atualizarCampo('parcelasPersonalizadas', novoValor)}
                descricao={valores.descricao}
              />
            )}

            <CampoData label="Data da Compra *" campo="dataCompra" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoStatusPago label="Pago?" pago={valores.pago} aoAlternar={marcarComoPago} />
            {valores.pago && <CampoData label="Data de Pagamento 💰" campo="dataPagamento" valores={valores} atualizarCampo={atualizarCampo} />}
            <CampoCategoria valores={valores} atualizarCampo={atualizarCampo} tipoTransacao="despesa" />
          </>
        );

      case 'investimento':
        return (
          <>
            <CampoTexto label="Nome do Investimento *" campo="nome" placeholder="Ex: Reserva de Emergência" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoMonetario label="Valor Inicial *" campo="valorInicial" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoTexto label="Instituição *" campo="instituicao" placeholder="Ex: Nubank, XP..." valores={valores} atualizarCampo={atualizarCampo} />
            <CampoMonetario label="Meta (Opcional)" campo="meta" valores={valores} atualizarCampo={atualizarCampo} />
          </>
        );

      default:
        return <Text style={{ color: colors.textSecondary }}>Tipo não suportado</Text>;
    }
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ paddingBottom: 24 }}
    >
      {renderCamposPorTipo()}
    </ScrollView>
  );
});

// ==========================================================
// 🔹 COMPONENTE PRINCIPAL DO MODAL
// ==========================================================
export default function ModalEdicao({ visivel, aoFechar, aoSalvar, aoExcluir, item, tipo, titulo, buscarParcelasDaCompra }) {
  const [valores, setValores] = useState({});
  const { categorias } = useCategorias();
  const { membros } = useMembros();
  const { cartoesCadastrados } = useCarteira();
  const [parcelasExistentes, setParcelasExistentes] = useState(null);
  const [parcelasBloqueadas, setParcelasBloqueadas] = useState(null);

  // 🔹 Compra no cartão com mais de 1 parcela: busca os valores já gravados
  // de todas as parcelas do grupo (não só a que está aberta agora) — usados
  // como base do editor de parcelas. Se já não forem todas iguais, a compra
  // já tinha sido personalizada antes; o editor deve abrir com esses valores
  // reais, não recalculados. Também marca quais parcelas já estão pagas ou
  // antecipadas — essas nunca podem ter o valor alterado (ver ARQUITETURA.md
  // seção 15.9: risco de inconsistência financeira retroativa).
  //
  // 🔹 `buscarParcelasDaCompra` chega por prop, não de `useCartoes()` aqui
  // dentro — este componente não tem rota própria, é reaproveitado por
  // várias telas que já têm sua própria instância de `useCartoes()` (ver
  // ARQUITETURA.md seção 19, princípio "um dono, vários apresentadores").
  // Quem não usa cartão (Entradas, Investimentos) simplesmente não passa a
  // prop — o guard abaixo já cobre esse caso.
  useEffect(() => {
    if (
      tipo !== 'cartao' ||
      !visivel ||
      !item?.idCompra ||
      (item?.totalParcelas || 1) <= 1 ||
      !buscarParcelasDaCompra
    ) {
      setParcelasExistentes(null);
      setParcelasBloqueadas(null);
      return;
    }

    let ativo = true;
    buscarParcelasDaCompra(item.idCompra).then((parcelas) => {
      if (!ativo) return;
      const valoresReais = parcelas.map((p) => Number(p.valor) || 0);
      const bloqueios = parcelas.map((p) => p.pago === true || p.adiantada === true);
      setParcelasExistentes(valoresReais);
      setParcelasBloqueadas(bloqueios);

      const jaPersonalizada = valoresReais.some((v) => v !== valoresReais[0]);
      if (jaPersonalizada) {
        setValores((prev) => ({ ...prev, parcelasPersonalizadas: valoresReais }));
      }
    });

    return () => {
      ativo = false;
    };
  }, [visivel, tipo, item?.idCompra]);

useEffect(() => {
  if (!visivel) return; // só roda se o modal estiver aberto
  if (!item) return;

  const v = { ...item };

  ['valor', 'valorInicial', 'meta'].forEach((c) => {
    if (v[c] !== undefined) v[c] = Number(v[c]);
  });

  ['data', 'dataVencimento', 'dataCompra', 'dataPagamento'].forEach((c) => {
    if (v[c]) v[c] = formatarDataParaExibicao(v[c]);
  });

  const descricao = item.descricao;
  if (descricao && datasPadraoPorDescricao.hasOwnProperty(descricao)) {
    const diaPadrao = datasPadraoPorDescricao[descricao];
    if (!v.dataVencimento) {
      const novaData = gerarDataComDia(diaPadrao);
      v.dataVencimento = formatarDataParaExibicao(novaData);
    }
  }

  // 🔹 Resolve o Membro completo (com avatar) a partir de membroId quando
  // existir — mesmo padrão de categoriaId abaixo. Lançamentos antigos (só
  // `membro`/`pessoa` string, sem membroId) ganham um objeto sintético sem
  // `id`, só para exibir o nome (ver SPRINT5_DISCOVERY.md seção 4.3.3).
  ['membro', 'pessoa'].forEach((f) => {
    if (v[f] && typeof v[f] === 'string') {
      v[f] = v.membroId
        ? membros.find((m) => m.id === v.membroId) || { id: null, nome: v.membroNome || v[f] }
        : { id: null, nome: v[f] };
    }
  });

  // 🔹 Categoria: resolve o objeto completo (ícone/cor) a partir de
  // categoriaId quando existir; lançamentos antigos (só `categoria` string,
  // sem categoriaId — ver SPRINT4_DISCOVERY.md) ganham um objeto "sintético"
  // sem `id`, só para exibir o nome — handleSalvar sabe não gravar
  // categoriaId nesse caso, para não sobrescrever com um valor inválido.
  if (v.categoriaId) {
    v.categoria = categorias.find((c) => c.id === v.categoriaId) || { nome: v.categoriaNome || v.categoria };
  } else if (v.categoria && typeof v.categoria === 'string') {
    v.categoria = { nome: v.categoria };
  }

  // 🔹 Cartão: resolve o objeto completo (cor/banco) a partir de cartaoId
  // quando existir — mesmo padrão de categoriaId acima. Lançamentos antigos
  // (só `cartao` string, sem cartaoId) ganham um objeto sintético só com o
  // nome, sem `id` — handleSalvar sabe não gravar cartaoId nesse caso (ver
  // ARQUITETURA.md, Sprint 6 — Entidade Cartões).
  if (v.cartaoId) {
    v.cartao = cartoesCadastrados.find((c) => c.id === v.cartaoId) || { nome: v.cartao };
  } else if (v.cartao && typeof v.cartao === 'string') {
    v.cartao = { nome: v.cartao };
  }

  // 🔹 Atualiza SOMENTE ao abrir o modal (não a cada re-render)
  setValores(v);
}, [visivel]);

  const atualizarCampo = useCallback((campo, valor) => {
    setValores((prev) => (prev[campo] === valor ? prev : { ...prev, [campo]: valor }));
  }, []);

  const marcarComoPago = (novoStatus) => {
    const hoje = formatarDataParaExibicao(new Date());
    setValores((prev) => ({
      ...prev,
      pago: novoStatus,
      dataPagamento: novoStatus ? prev.dataPagamento || hoje : '',
    }));
  };

const handleSalvar = () => {
  const v = { ...valores };

  ['valor', 'valorInicial', 'meta'].forEach((c) => {
    if (typeof v[c] === 'string' && v[c].includes('R$')) {
      v[c] = parseBRL(v[c]);
    } else if (typeof v[c] === 'string') {
      v[c] = Number(v[c].replace(',', '.')) || 0;
    }
  });

  ['data', 'dataVencimento', 'dataCompra', 'dataPagamento'].forEach((c) => {
    if (v[c]) v[c] = normalizarParaISO(v[c]);
  });

  // 🔹 Garantir que campos com objetos sejam convertidos em texto, e gravar
  // membroId/membroNome (referência estável, mesmo padrão de categoriaId
  // abaixo) — ver SPRINT5_DISCOVERY.md seção 4.3.3.
    if (v.membro && typeof v.membro === 'object') {
      v.membroId = v.membro.id || null;
      v.membroNome = v.membro.nome;
      v.membro = v.membro.nome || '';
    }
    if (v.pessoa && typeof v.pessoa === 'object') {
      v.membroId = v.pessoa.id || null;
      v.membroNome = v.pessoa.nome;
      v.pessoa = v.pessoa.nome || '';
    }
    if (v.categoria && typeof v.categoria === 'object') {
      // 🔹 Só grava categoriaId/categoriaNome se o objeto tiver `id` de
      // verdade (evita gravar `undefined` no Firestore quando o item é
      // antigo e a categoria nunca foi resolvida a partir de um
      // categoriaId real — ver useEffect de carregamento acima).
      if (v.categoria.id) {
        v.categoriaId = v.categoria.id;
        v.categoriaNome = v.categoria.nome;
      }
      v.categoria = v.categoria.nome || '';
    }
    // 🔹 CartaoSelect seleciona um objeto completo ({id, nome, cor, banco})
    // — id fica null para "Outro cartão..." (mesmo tratamento do
    // membro/pessoa acima, não o de categoria — cartão informal é um estado
    // válido e intencional, não só "campo nunca tocado").
    if (v.cartao && typeof v.cartao === 'object') {
      v.cartaoId = v.cartao.id || null;
      v.cartao = v.cartao.nome || '';
    }



  vibrarSucesso();
  aoSalvar(v);
  aoFechar();
};

  // ==========================================================
  // 🔹 RENDER FINAL
  // ==========================================================
return (
  <ModalRN
    isVisible={visivel}
    onBackdropPress={aoFechar}
    onBackButtonPress={aoFechar}
    avoidKeyboard
    animationIn="slideInUp"
    animationOut="slideOutDown"
    hideModalContentWhileAnimating
    backdropOpacity={0.4}
    propagateSwipe={true}
    style={{ margin: 0, justifyContent: 'flex-end' }} // fixa na base
  >
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, justifyContent: 'flex-end' }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {/* Container “sheet” (mantém o visual anterior) */}
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 20,
            maxHeight: '90%',
          }}
        >
          {/* Cabeçalho (mesmo que você já tinha) */}
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{titulo || 'Editar Item'}</Text>
            <TouchableOpacity onPress={aoFechar}>
              <MaterialCommunityIcons name="close" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Campos (mantém exatamente como antes) */}
          <CamposModal
            tipo={tipo}
            valores={valores}
            atualizarCampo={atualizarCampo}
            marcarComoPago={marcarComoPago}
            parcelasExistentes={parcelasExistentes}
            parcelasBloqueadas={parcelasBloqueadas}
          />

          {/* Botões (mantém) */}
          <View style={[globalStyles.buttonRow, { marginTop: 20 }]}>
            {aoExcluir && (
              <TouchableOpacity
                style={globalStyles.deleteButton}
                onPress={() => {
                  aoExcluir(valores);
                  aoFechar();
                }}
              >
                <MaterialCommunityIcons name="trash-can" size={12} color="#fff" />
                <Text style={globalStyles.deleteButtonText}>Excluir</Text>
              </TouchableOpacity>
            )}

            <View style={globalStyles.rightButtons}>
              <TouchableOpacity style={globalStyles.cancelButton} onPress={aoFechar}>
                <Text style={globalStyles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={globalStyles.saveButton} onPress={handleSalvar}>
                <Text style={globalStyles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  </ModalRN>
);
}
