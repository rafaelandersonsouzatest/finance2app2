import { useState, useEffect, useCallback, memo } from 'react';
import {
  Modal,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { vibrarSucesso } from '../utils/haptics';
import { datasPadraoPorDescricao } from '../utils/datasPadrao';
import { gerarDataComDia } from '../utils/gerarDataComDia';
import { formatarDataParaExibicao, normalizarParaISO } from '../utils/formatarData';
import { formatarBRL, parseBRL } from '../utils/formatarValor';
import SeletorData from './SeletorData';
import { useCurrencyInput } from '../hooks/useCurrencyInput';
import CategoriaSelect from './CategoriaSelect';


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

const CampoMonetario = memo(({ label, campo, valores, atualizarCampo }) => {
  const { texto, handleChange, setTexto } = useCurrencyInput(valores[campo] || 0, (valorNum) =>
    atualizarCampo(campo, valorNum)
  );

  useEffect(() => {
    setTexto(formatarBRL(valores[campo] || 0));
  }, [valores[campo]]);

  return (
    <View style={globalStyles.inputGroup}>
      <Text style={globalStyles.label}>{label}</Text>
      <TextInput
        style={globalStyles.input}
        value={texto}
        onChangeText={handleChange}
        keyboardType="numeric"
        placeholder="R$ 0,00"
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
});

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
  const CampoCategoria = memo(({ valores, atualizarCampo }) => (
    <View style={globalStyles.inputGroup}>
      <Text style={globalStyles.label}>Categoria</Text>
      <CategoriaSelect
        value={valores.categoria || ''}
        onChange={(cat) => atualizarCampo('categoria', cat)}
      />
    </View>
  ));


// ==========================================================
// 🔹 CAMPOS POR TIPO (ISOLADOS DO MODAL)
// ==========================================================
const CamposModal = memo(({ tipo, valores, atualizarCampo, marcarComoPago }) => {
  const renderCamposPorTipo = () => {
    switch (tipo) {
      case 'entrada':
        return (
          <>
            <CampoTexto label="Descrição *" campo="descricao" placeholder="Ex: Salário" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoTexto label="Membro *" campo="membro" placeholder="Ex: Rafael" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoMonetario label="Valor *" campo="valor" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoStatusPago label="Recebido?" pago={valores.pago} aoAlternar={marcarComoPago} />
            {!valores.pago && <CampoData label="Data prevista para Recebimento 📅" campo="data" valores={valores} atualizarCampo={atualizarCampo} />}
            {valores.pago && <CampoData label="Data de Recebimento 💰" campo="dataPagamento" valores={valores} atualizarCampo={atualizarCampo} />}
            <CampoCategoria valores={valores} atualizarCampo={atualizarCampo} />
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
            <CampoCategoria valores={valores} atualizarCampo={atualizarCampo} />
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
            <CampoTexto label="Pessoa/Instituição" campo="pessoa" placeholder="Ex: Banco XYZ" valores={valores} atualizarCampo={atualizarCampo} />
          </>
        );

      case 'cartao':
        return (
          <>
            <CampoTexto label="Descrição *" campo="descricao" placeholder="Ex: Compra supermercado" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoMonetario label="Valor *" campo="valor" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoData label="Data da Compra *" campo="dataCompra" valores={valores} atualizarCampo={atualizarCampo} />
            <CampoStatusPago label="Pago?" pago={valores.pago} aoAlternar={marcarComoPago} />
            {valores.pago && <CampoData label="Data de Pagamento 💰" campo="dataPagamento" valores={valores} atualizarCampo={atualizarCampo} />}
            <CampoCategoria valores={valores} atualizarCampo={atualizarCampo} />
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
export default function ModalEdicao({ visivel, aoFechar, aoSalvar, aoExcluir, item, tipo, titulo }) {
  const [valores, setValores] = useState({});

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

  vibrarSucesso();
  aoSalvar(v);
  aoFechar();
};

  // ==========================================================
  // 🔹 RENDER FINAL
  // ==========================================================
  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={globalStyles.modalOverlay}>
            <View style={globalStyles.modalContainer}>
              <View style={globalStyles.modalHeader}>
                <Text style={globalStyles.modalTitle}>{titulo || 'Editar Item'}</Text>
                <TouchableOpacity onPress={aoFechar}>
                  <MaterialCommunityIcons name="close" size={28} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Campos isolados e estáveis */}
              <CamposModal tipo={tipo} valores={valores} atualizarCampo={atualizarCampo} marcarComoPago={marcarComoPago} />

              <View style={globalStyles.buttonRow}>
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
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
