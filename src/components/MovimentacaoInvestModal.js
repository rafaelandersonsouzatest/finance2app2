import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import AlertaModal from './AlertaModal';

export default function MovimentacaoInvestModal({
  visible,
  onClose,
  onSave,
  initialData,
  saldoAtual = 0,
}) {
  const [tipo, setTipo] = useState('Aporte');
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');

  // estado do alerta genérico
  const [alerta, setAlerta] = useState({
    visible: false,
    titulo: '',
    mensagem: '',
    icone: 'alert-circle',
    cor: colors.expense,
  });

  // 🔄 Resetar os campos ao abrir ou quando mudar a movimentação
  useEffect(() => {
    if (initialData) {
      setTipo(initialData.tipo || 'Aporte');
      setValor(initialData.valor !== undefined ? String(initialData.valor) : '');
      setDescricao(initialData.descricao || '');
    } else {
      setTipo('Aporte');
      setValor('');
      setDescricao('');
    }
  }, [initialData, visible]);

  const handleSave = () => {
    const valorNumerico = Number(String(valor).replace(',', '.'));

    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      setAlerta({
        visible: true,
        titulo: 'Valor Inválido',
        mensagem: 'Por favor, digite um valor.',
        // O ícone e a cor de erro já são padrão no AlertaModal
      });
      return;
    }

    if (!descricao.trim()) {
      setAlerta({
        visible: true,
        titulo: 'Campo Obrigatório',
        mensagem: 'A descrição não pode ficar em branco.',
      });
      return;
    }

    if (tipo === 'Retirada' && valorNumerico > Number(saldoAtual || 0)) {
      setAlerta({
        visible: true,
        titulo: 'Saldo insuficiente',
        mensagem: `Você tentou retirar R$ ${valorNumerico.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
        })}, mas o saldo disponível é R$ ${Number(saldoAtual).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
        })}.`,
        icone: 'alert-circle',
        cor: colors.expense,
      });
      return;
    }

    const novaMov = {
      tipo,
      valor: valorNumerico,
      descricao: descricao.trim(),
      data: initialData?.data || new Date().toISOString(),
    };

    onSave(novaMov);
  };

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={globalStyles.modalOverlay}
        >
          <View style={globalStyles.modalContainer}>
            {/* Header */}
            <View style={globalStyles.modalHeader}>
              <Text style={globalStyles.modalTitle}>
                {initialData ? 'Editar Movimentação' : 'Nova Movimentação'}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <MaterialCommunityIcons name="close" size={28} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Seleção de Tipo */}
            <View style={globalStyles.tipoContainer}>
              <TouchableOpacity
                style={[
                  globalStyles.tipoBotao,
                  tipo === 'Aporte' && globalStyles.tipoBotaoAtivoVerde,
                ]}
                onPress={() => setTipo('Aporte')}
              >
                <Text
                  style={[
                    globalStyles.tipoTexto,
                    tipo === 'Aporte' && globalStyles.tipoTextoAtivo,
                  ]}
                >
                  Aporte
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  globalStyles.tipoBotao,
                  tipo === 'Retirada' && globalStyles.tipoBotaoAtivoVermelho,
                ]}
                onPress={() => setTipo('Retirada')}
              >
                <Text
                  style={[
                    globalStyles.tipoTexto,
                    tipo === 'Retirada' && globalStyles.tipoTextoAtivo,
                  ]}
                >
                  Retirada
                </Text>
              </TouchableOpacity>
            </View>

            {/* Campo Valor */}
            <Text style={globalStyles.label}>Valor</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="R$ 0,00"
              placeholderTextColor={colors.textSecondary}
              keyboardType="decimal-pad"
              value={valor}
              onChangeText={setValor}
            />

            {/* Campo Descrição */}
            <Text style={globalStyles.label}>Descrição</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="Ex: Aporte do salário"
              placeholderTextColor={colors.textSecondary}
              value={descricao}
              onChangeText={setDescricao}
            />

            {/* Botão Salvar */}
            <TouchableOpacity
              style={[globalStyles.saveButton, { marginTop: 20 }]}
              onPress={handleSave}
            >
              <Text style={globalStyles.saveButtonText}>
                {initialData ? 'Salvar Alterações' : 'Salvar Movimentação'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal genérico de alerta */}
      <AlertaModal
        visible={alerta.visible}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        onClose={() => setAlerta({ ...alerta, visible: false })}
      />
    </>
  );
}
