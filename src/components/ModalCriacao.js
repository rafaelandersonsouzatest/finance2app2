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

const ModalCriacao = ({
  visivel,
  aoFechar,
  aoSalvar,
  tipo,
  titulo,
  mesSelecionado,
  anoSelecionado,
}) => {
  const [valores, setValores] = useState({});

  const formatarDataParaExibicao = (data) => {
    if (!data) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(data)) return data;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}-${mes}-${ano}`;
    }
    try {
      const d = new Date(data);
      if (isNaN(d.getTime())) return '';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return String(data);
    }
  };

  const formatarDataParaSalvar = (data) => {
    if (!data) return '';
    if (/^\d{2}-\d{2}-\d{4}$/.test(data)) return data;
    if (/^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, dia] = data.split('-');
      return `${dia}-${mes}-${ano}`;
    }
    try {
      const d = new Date(data);
      if (isNaN(d.getTime())) return data;
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch {
      return data;
    }
  };

  useEffect(() => {
    if (visivel) {
      setValores(getValoresIniciais());
    }
  }, [visivel, tipo]);

  const getValoresIniciais = () => {
    const hoje = new Date();
    const hojeDDMMYYYY = gerarDataComDia(
      hoje.getDate(),
      hoje.getMonth() + 1,
      hoje.getFullYear()
    );

    switch (tipo) {
      case 'entrada':
        return { descricao: '', valor: '', data: formatarDataParaExibicao(hojeDDMMYYYY), categoria: '' };
      case 'gasto':
        return { descricao: '', valor: '', dataVencimento: formatarDataParaExibicao(hojeDDMMYYYY), categoria: '' };
      case 'emprestimo':
        return { descricao: '', valorTotal: '', totalParcelas: '', dataInicio: formatarDataParaExibicao(hojeDDMMYYYY), pessoa: '', categoria: '' };
      case 'cartao':
        return { descricao: '', valor: '', dataCompra: formatarDataParaExibicao(hojeDDMMYYYY), categoria: '', parcelas: 1, pessoa: '', cartao: '' };
      case 'investimento':
        return { nome: '', valorInicial: '', instituicao: '', meta: '' };
      default:
        return {};
    }
  };

  const handleChange = (campo, valor) =>
    setValores((prev) => ({ ...prev, [campo]: valor }));

  const handleSalvar = () => {
    vibrarSucesso();

    const camposObrigatorios = getCamposObrigatorios();
    const camposFaltando = camposObrigatorios.filter((campo) => !valores[campo]);
    if (camposFaltando.length > 0) {
      alert(`Preencha os campos obrigatórios: ${camposFaltando.join(', ')}`);
      return;
    }

    const valoresProcessados = processarValores(valores);
    const descricaoItem =
      valoresProcessados.descricao || valoresProcessados.nome || '';
    const now = new Date();
    const mesAlvo =
      typeof mesSelecionado === 'number' ? mesSelecionado : now.getMonth() + 1;
    const anoAlvo =
      typeof anoSelecionado === 'number' ? anoSelecionado : now.getFullYear();

    const aplicarDataPadraoSeNecessario = (
      campoData,
      chavePadrao = descricaoItem
    ) => {
      if (!chavePadrao) return;
      const diaPadrao = datasPadraoPorDescricao[chavePadrao];
      if (diaPadrao && !valoresProcessados[campoData]) {
        valoresProcessados[campoData] = gerarDataComDia(diaPadrao, mesAlvo, anoAlvo);
      } else if (valoresProcessados[campoData]) {
        valoresProcessados[campoData] = formatarDataParaSalvar(
          valoresProcessados[campoData]
        );
      }
    };

    if (tipo === 'entrada') aplicarDataPadraoSeNecessario('data');
    else if (tipo === 'gasto') aplicarDataPadraoSeNecessario('dataVencimento');
    else if (tipo === 'emprestimo') aplicarDataPadraoSeNecessario('dataInicio');
    else if (tipo === 'cartao') aplicarDataPadraoSeNecessario('dataCompra');

    aoSalvar(valoresProcessados);
    setValores(getValoresIniciais());
  };

  const processarValores = (vals) => {
    const processados = { ...vals };

    if (processados.valor) {
      processados.valor = parseFloat(String(processados.valor).replace(',', '.')) || 0;
    }
    if (processados.valorInicial) {
      processados.valorInicial = parseFloat(String(processados.valorInicial).replace(',', '.')) || 0;
    }
    if (processados.meta) {
      processados.meta = parseFloat(String(processados.meta).replace(',', '.')) || 0;
    }
    if (processados.parcelas) processados.parcelas = parseInt(processados.parcelas, 10) || 1;
    if (processados.valorTotal) {
      processados.valorTotal = parseFloat(String(processados.valorTotal).replace(',', '.')) || 0;
    }
    if (processados.totalParcelas) {
      processados.totalParcelas = parseInt(processados.totalParcelas, 10) || 1;
    }

    if (processados.data) processados.data = formatarDataParaSalvar(processados.data);
    if (processados.dataVencimento) processados.dataVencimento = formatarDataParaSalvar(processados.dataVencimento);
    if (processados.dataCompra) processados.dataCompra = formatarDataParaSalvar(processados.dataCompra);
    if (processados.dataInicio) processados.dataInicio = formatarDataParaSalvar(processados.dataInicio);

    return processados;
  };

  const getCamposObrigatorios = () => {
    switch (tipo) {
      case 'entrada': return ['descricao', 'valor', 'data'];
      case 'gasto': return ['descricao', 'valor', 'dataVencimento'];
      case 'emprestimo': return ['descricao', 'valorTotal', 'totalParcelas', 'dataInicio'];
      case 'cartao': return ['descricao', 'valor', 'dataCompra', 'pessoa', 'cartao'];
      case 'investimento': return ['nome', 'valorInicial', 'instituicao'];
      default: return [];
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
                onChangeText={(texto) => handleChange('descricao', texto)}
                placeholder="Ex: Salário"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Membro</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.membro || ''}
                onChangeText={(texto) => handleChange('membro', texto)}
                placeholder="Ex: Rafael"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valor?.toString() || ''}
                onChangeText={(texto) => handleChange('valor', texto)}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {!datasPadraoPorDescricao[valores.descricao] && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Recebimento *</Text>
                <TextInput
                  style={globalStyles.input}
                  value={valores.data || ''}
                  onChangeText={(texto) => handleChange('data', texto)}
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
                onChangeText={(texto) => handleChange('categoria', texto)}
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
                onChangeText={(texto) => handleChange('descricao', texto)}
                placeholder="Ex: Aluguel"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valor?.toString() || ''}
                onChangeText={(texto) => handleChange('valor', texto)}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {!datasPadraoPorDescricao[valores.descricao] && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Vencimento *</Text>
                <TextInput
                  style={globalStyles.input}
                  value={valores.dataVencimento || ''}
                  onChangeText={(texto) => handleChange('dataVencimento', texto)}
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
                onChangeText={(texto) => handleChange('categoria', texto)}
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
                onChangeText={(texto) => handleChange('descricao', texto)}
                placeholder="Ex: Empréstimo Carro"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor Total *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valorTotal?.toString() || ''}
                onChangeText={(texto) => handleChange('valorTotal', texto)}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Número de Parcelas *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.totalParcelas?.toString() || ''}
                onChangeText={(texto) => handleChange('totalParcelas', texto)}
                placeholder="Ex: 12"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {!datasPadraoPorDescricao[valores.descricao] && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data de Início *</Text>
                <TextInput
                  style={globalStyles.input}
                  value={valores.dataInicio || ''}
                  onChangeText={(texto) => handleChange('dataInicio', texto)}
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
                onChangeText={(texto) => handleChange('pessoa', texto)}
                placeholder="Ex: Banco XYZ"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Categoria</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.categoria || ''}
                onChangeText={(texto) => handleChange('categoria', texto)}
                placeholder="Ex: Financiamento"
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
                onChangeText={(texto) => handleChange('descricao', texto)}
                placeholder="Ex: Compra supermercado"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Pessoa *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.pessoa || ''}
                onChangeText={(texto) => handleChange('pessoa', texto)}
                placeholder="Quem fez a compra"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Cartão *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.cartao || ''}
                onChangeText={(texto) => handleChange('cartao', texto)}
                placeholder="Ex: Nubank, C6, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valor?.toString() || ''}
                onChangeText={(texto) => handleChange('valor', texto)}
                placeholder="R$ 0,00"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {!datasPadraoPorDescricao[valores.descricao] && (
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Data da Compra *</Text>
                <TextInput
                  style={globalStyles.input}
                  value={valores.dataCompra || ''}
                  onChangeText={(texto) => handleChange('dataCompra', texto)}
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
                onChangeText={(texto) => handleChange('categoria', texto)}
                placeholder="Ex: Alimentação"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Parcelas</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.parcelas?.toString() || ''}
                onChangeText={(texto) => handleChange('parcelas', texto)}
                placeholder="1"
                keyboardType="numeric"
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
                onChangeText={(texto) => handleChange('nome', texto)}
                placeholder="Ex: Reserva de Emergência"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Valor Inicial *</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.valorInicial?.toString() || ''}
                onChangeText={(t) => handleChange('valorInicial', t)}
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
                onChangeText={(texto) => handleChange('instituicao', texto)}
                placeholder="Ex: Nubank, XP, etc."
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Definir uma meta? (Opcional)</Text>
              <TextInput
                style={globalStyles.input}
                value={valores.meta?.toString() || ''}
                onChangeText={(texto) => handleChange('meta', texto)}
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
            <Text style={globalStyles.modalTitle}>{titulo || `Novo ${tipo}`}</Text>
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
};

export default ModalCriacao;
