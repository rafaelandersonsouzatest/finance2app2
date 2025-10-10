import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { vibrarSucesso } from '../utils/haptics';
import { datasPadraoPorDescricao } from '../utils/datasPadrao';
import { gerarDataComDia } from '../utils/gerarDataComDia';
import {
  formatarDataParaExibicao,
  normalizarParaISO,
} from '../utils/formatarData';
import { formatarBRL, parseBRL } from '../utils/formatarValor';

export default function ModalEdicao({
  visivel,
  aoFechar,
  aoSalvar,
  aoExcluir,
  item,
  tipo,
  titulo,
}) {
  const [valores, setValores] = useState({});
  const [ocultarCampoData, setOcultarCampoData] = useState(false);

  useEffect(() => {
    if (visivel) {
      if (item) {
        const valoresFormatados = { ...item };

        // 🔹 formatar valores
        if (valoresFormatados.valor !== undefined) {
          valoresFormatados.valor = formatarBRL(valoresFormatados.valor);
        }
        if (tipo === 'investimento') {
          if (valoresFormatados.valorInicial !== undefined) {
            valoresFormatados.valorInicial = formatarBRL(
              valoresFormatados.valorInicial
            );
          }
          if (valoresFormatados.meta !== undefined) {
            valoresFormatados.meta = formatarBRL(valoresFormatados.meta);
          }
        }

        // 🔹 formatar datas
        if (valoresFormatados.data)
          valoresFormatados.data = formatarDataParaExibicao(
            valoresFormatados.data
          );
        if (valoresFormatados.dataVencimento)
          valoresFormatados.dataVencimento = formatarDataParaExibicao(
            valoresFormatados.dataVencimento
          );
        if (valoresFormatados.dataCompra)
          valoresFormatados.dataCompra = formatarDataParaExibicao(
            valoresFormatados.dataCompra
          );
        if (valoresFormatados.dataPagamento)
          valoresFormatados.dataPagamento = formatarDataParaExibicao(
            valoresFormatados.dataPagamento
          );

        setValores(valoresFormatados);

        const descricao = item.descricao;
        if (descricao && datasPadraoPorDescricao.hasOwnProperty(descricao)) {
          const diaPadrao = datasPadraoPorDescricao[descricao];
          if (!valoresFormatados.dataVencimento) {
            const novaData = gerarDataComDia(diaPadrao);
            valoresFormatados.dataVencimento = formatarDataParaExibicao(novaData);
        }
      }
      setOcultarCampoData(false);

      }
    }
  }, [visivel, item, tipo]);

  const handleChange = (campo, valor) => {
    setValores((prev) => ({ ...prev, [campo]: valor }));
  };

  const getCamposObrigatorios = () => {
    switch (tipo) {
      case 'entrada':
        return ['descricao', 'valor', 'membro'];
      case 'gasto':
        return ['descricao', 'valor', 'dataVencimento'];
      case 'cartao':
        return ['descricao', 'valor', 'dataCompra'];
      case 'emprestimo':
        return ['descricao', 'valor', 'dataVencimento'];
      case 'investimento':
        return ['nome', 'valorInicial', 'instituicao'];
      default:
        return [];
    }
  };

  const handleSalvar = () => {
    const camposObrigatorios = getCamposObrigatorios();
    const camposFaltando = camposObrigatorios.filter((campo) => !valores[campo]);

    if (camposFaltando.length > 0) {
      alert(`Preencha os campos obrigatórios: ${camposFaltando.join(', ')}`);
      return;
    }

    vibrarSucesso();

    const valoresParaSalvar = { ...valores };

    // 🔹 normalizar datas
    if (valoresParaSalvar.data)
      valoresParaSalvar.data = normalizarParaISO(valoresParaSalvar.data);
    if (valoresParaSalvar.dataVencimento)
      valoresParaSalvar.dataVencimento = normalizarParaISO(
        valoresParaSalvar.dataVencimento
      );
    if (valoresParaSalvar.dataCompra)
      valoresParaSalvar.dataCompra = normalizarParaISO(
        valoresParaSalvar.dataCompra
      );
    if (valoresParaSalvar.dataPagamento)
      valoresParaSalvar.dataPagamento = normalizarParaISO(
        valoresParaSalvar.dataPagamento
      );

    // 🔹 converter valores
    if (valoresParaSalvar.valor !== undefined) {
      valoresParaSalvar.valor = parseBRL(valoresParaSalvar.valor);
    }
    if (tipo === 'investimento') {
      valoresParaSalvar.valorInicial = parseBRL(valoresParaSalvar.valorInicial);
    if (valoresParaSalvar.meta) {
      valoresParaSalvar.meta = parseBRL(valoresParaSalvar.meta);
    } else {
    delete valoresParaSalvar.meta;
    }
  }


    aoSalvar(valoresParaSalvar);
  };

const handleExcluir = () => {
  if (aoExcluir) {
    aoExcluir(valores);
    aoFechar(); // 👈 fecha o modal imediatamente após excluir
  }
};

  const renderCamposPorTipo = () => {
    switch (tipo) {
      case 'entrada':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Descrição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.descricao || ''}
                onChangeText={(t) => handleChange('descricao', t)}
                placeholder="Ex: Salário"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Membro *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.membro || ''}
                onChangeText={(t) => handleChange('membro', t)}
                placeholder="Ex: Rafael"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valor ?? ''}
                onChangeText={(t) =>
                  handleChange('valor', formatarBRL(parseBRL(t)))
                }
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Recebimento</Text>
                <TextInput
                  style={globalStyles.input}
                  value={valores.data || ''}
                  onChangeText={(t) => handleChange('data', t)}
                  placeholder="DD-MM-AAAA"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Categoria</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.categoria || ''}
                onChangeText={(t) => handleChange('categoria', t)}
                placeholder="Ex: Trabalho"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

      case 'gasto':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Descrição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.descricao || ''}
                onChangeText={(t) => handleChange('descricao', t)}
                placeholder="Ex: Aluguel"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valor ?? ''}
                onChangeText={(t) =>
                  handleChange('valor', formatarBRL(parseBRL(t)))
                }
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Data de Vencimento *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.dataVencimento || ''}
                onChangeText={(t) => handleChange('dataVencimento', t)}
                placeholder="DD-MM-AAAA"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {valores.pago && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Pagamento</Text>
                <TextInput
                  style={globalStyles.input}
                  value={valores.dataPagamento || ''}
                  onChangeText={(t) => handleChange('dataPagamento', t)}
                  placeholder="DD-MM-AAAA"
                  placeholderTextColor={colors.textSecondary}
                />
              </View>
            )}

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Categoria</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.categoria || ''}
                onChangeText={(t) => handleChange('categoria', t)}
                placeholder="Ex: Moradia"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

      case 'emprestimo':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Descrição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.descricao || ''}
                onChangeText={(t) => handleChange('descricao', t)}
                placeholder="Ex: Parcela Carro"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor da Parcela *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valor ?? ''}
                onChangeText={(t) =>
                  handleChange('valor', formatarBRL(parseBRL(t)))
                }
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Data de Vencimento *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.dataVencimento || ''}
                onChangeText={(t) => handleChange('dataVencimento', t)}
                placeholder="DD-MM-AAAA"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {valores.pago && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Pagamento</Text>
                <TextInput
                  style={globalStyles.input}
                  value={valores.dataPagamento || ''}
                  onChangeText={(t) => handleChange('dataPagamento', t)}
                  placeholder="DD-MM-AAAA"
                  placeholderTextColor={colors.textSecondary}
              />
            </View>
            )}
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Pessoa/Instituição</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.pessoa || ''}
                onChangeText={(t) => handleChange('pessoa', t)}
                placeholder="Ex: Banco XYZ"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

      case 'cartao':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Descrição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.descricao || ''}
                onChangeText={(t) => handleChange('descricao', t)}
                placeholder="Ex: Compra supermercado"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valor ?? ''}
                onChangeText={(t) =>
                  handleChange('valor', formatarBRL(parseBRL(t)))
                }
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Data da Compra *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.dataCompra || ''}
                onChangeText={(t) => handleChange('dataCompra', t)}
                placeholder="DD-MM-AAAA"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

      case 'investimento':
        return (
          <>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Nome do Investimento *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.nome || ''}
                onChangeText={(t) => handleChange('nome', t)}
                placeholder="Ex: Reserva de Emergência"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor Inicial *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valorInicial ?? ''}
                onChangeText={(t) =>
                  handleChange('valorInicial', formatarBRL(parseBRL(t)))
                }
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Instituição *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.instituicao || ''}
                onChangeText={(t) => handleChange('instituicao', t)}
                placeholder="Ex: Nubank, XP, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Meta (Opcional)</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.meta ?? ''}
                onChangeText={(t) => handleChange('meta', formatarBRL(parseBRL(t)))}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </>
        );

      default:
        return (
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Tipo não suportado</Text>
          </View>
        );
    }
  };

  return (
    <Modal visible={visivel} animationType="slide" transparent onRequestClose={aoFechar}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={globalStyles.modalOverlay}
      >
        <View style={globalStyles.modalContainer}>
          <View style={globalStyles.modalHeader}>
            <Text style={globalStyles.modalTitle}>{titulo || 'Editar Item'}</Text>
            <TouchableOpacity onPress={aoFechar}>
              <MaterialCommunityIcons
                name="close"
                size={28}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {renderCamposPorTipo()}
          </ScrollView>

          <View style={globalStyles.buttonRow}>
            {aoExcluir && (
              <TouchableOpacity style={globalStyles.deleteButton} onPress={handleExcluir}>
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
      </KeyboardAvoidingView>
    </Modal>
  );
}
