import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import ModalEditorParcelas from './ModalEditorParcelas';
import { dividirValorIgualmente, somarParcelas } from '../utils/parcelamento';

// =========================================================
// 🔹 Opção única "Editar valores das parcelas" — usada tanto na criação
// (ModalCriacao) quanto na edição (ModalEdicao) de uma compra no cartão.
// Só aparece quando há mais de 1 parcela. Enquanto não usada, o
// comportamento de cálculo automático (igual para todas) continua exatamente
// o mesmo — ver PARCELAMENTO_DISCOVERY.md.
// =========================================================
export default function OpcaoPersonalizarParcelas({
  totalParcelas,
  valorBaseParaDivisaoIgual,
  valoresExistentes,
  parcelasBloqueadas,
  parcelasPersonalizadas,
  onChange,
  descricao,
  onBloquearFechamento,
}) {
  const [editorVisivel, setEditorVisivel] = useState(false);
  const quantidade = parseInt(totalParcelas || 1, 10);
  const personalizado = Array.isArray(parcelasPersonalizadas) && parcelasPersonalizadas.length > 0;

  if (!quantidade || quantidade <= 1) return null;

  const abrirEditor = () => {
    onBloquearFechamento?.(true);
    setEditorVisivel(true);
  };

  const fecharEditor = () => {
    setEditorVisivel(false);
    onBloquearFechamento?.(false);
  };

  const removerPersonalizacao = () => onChange(null);

  // 🔹 Ordem de prioridade para o valor inicial de cada linha do editor:
  // 1) já personalizado nesta sessão de edição; 2) valores já gravados no
  // Firestore (edição de compra existente — item 9 do pedido); 3) cálculo
  // automático de sempre (criação nova, sem nada gravado ainda).
  const valoresIniciais = personalizado
    ? parcelasPersonalizadas
    : Array.isArray(valoresExistentes) && valoresExistentes.length === quantidade
    ? valoresExistentes
    : dividirValorIgualmente(valorBaseParaDivisaoIgual, quantidade);

  return (
    <View style={globalStyles.inputGroup}>
      <TouchableOpacity
        onPress={abrirEditor}
        style={{ flexDirection: 'row', alignItems: 'center' }}
      >
        <MaterialCommunityIcons
          name={personalizado ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={20}
          color={colors.primary}
        />
        <Text style={{ color: colors.textPrimary, marginLeft: 8, fontWeight: '500' }}>
          Editar valores das parcelas
        </Text>
      </TouchableOpacity>

      {personalizado && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 6,
            marginLeft: 28,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Total personalizado: R${' '}
            {somarParcelas(parcelasPersonalizadas).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })}
          </Text>
          <TouchableOpacity onPress={removerPersonalizacao}>
            <Text style={{ color: colors.error, fontSize: 12, fontWeight: '600' }}>Remover</Text>
          </TouchableOpacity>
        </View>
      )}

      <ModalEditorParcelas
        visivel={editorVisivel}
        aoFechar={fecharEditor}
        aoConfirmar={onChange}
        descricao={descricao}
        totalParcelas={quantidade}
        valoresIniciais={valoresIniciais}
        bloqueadas={valoresExistentes ? parcelasBloqueadas : null}
      />
    </View>
  );
}
