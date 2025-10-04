import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useFirestoreModelos } from '../hooks/useFirestore';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AlertaModal from './AlertaModal';

// Componente do formulário com validação
const FormularioModelo = ({ tipo, onSave, initialData, onCancel }) => {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [dia, setDia] = useState('');
  const [membro, setMembro] = useState('');
  const [erros, setErros] = useState({});

  useEffect(() => {
    if (initialData) {
      setDescricao(initialData.descricao || '');
      setValor(String(initialData.valor || ''));
      setCategoria(initialData.categoria || '');
      setDia(String(initialData.diaVencimento || initialData.diaDoMes || ''));
      setMembro(initialData.membro || '');
    } else {
      setDescricao('');
      setValor('');
      setCategoria('');
      setDia('');
      setMembro('');
    }
    setErros({});
  }, [initialData]);

  const validarCampos = () => {
    const novosErros = {};
    const valorNumerico = parseFloat(String(valor).replace(',', '.')) || 0;
    const diaNumerico = parseInt(dia, 10);

    if (!descricao.trim()) {
      novosErros.descricao = 'A descrição é obrigatória.';
    }
    if (valorNumerico <= 0) {
      novosErros.valor = 'O valor deve ser maior que zero.';
    }
    if (!dia || isNaN(diaNumerico) || diaNumerico < 1 || diaNumerico > 31) {
      novosErros.dia = 'O dia deve ser um número entre 1 e 31.';
    }
    if (tipo === 'entrada' && !membro.trim()) {
      novosErros.membro = 'O membro é obrigatório.';
    }
    
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const handleSalvar = () => {
    if (!validarCampos()) return;

    const modelo = {
      descricao: descricao.trim(),
      valor: parseFloat(String(valor).replace(',', '.')) || 0,
      categoria: categoria.trim() || 'Outros',
      ativo: true,
      membro: membro.trim(),
    };

    if (tipo === 'gasto') {
      modelo.diaVencimento = Number(dia);
    } else {
      modelo.diaDoMes = Number(dia);
    }
    onSave(modelo);
  };

  return (
    <ScrollView style={globalStyles.formContainer} keyboardShouldPersistTaps="handled">
      <Text style={globalStyles.formTitle}>
        {initialData ? 'Editar Modelo' : 'Adicionar Novo Modelo'}
      </Text>
      
      <TextInput
        placeholder="Descrição *"
        value={descricao}
        onChangeText={(text) => { setDescricao(text); if (erros.descricao) setErros({}); }}
        placeholderTextColor={colors.textSecondary}
        style={[globalStyles.input, erros.descricao && globalStyles.inputError]}
      />
      {erros.descricao && <Text style={globalStyles.errorMessage}>{erros.descricao}</Text>}

      <TextInput
        placeholder="Valor *"
        value={valor}
        onChangeText={(text) => { setValor(text); if (erros.valor) setErros({}); }}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textSecondary}
        style={[globalStyles.input, { marginTop: 12 }, erros.valor && globalStyles.inputError]}
      />
      {erros.valor && <Text style={globalStyles.errorMessage}>{erros.valor}</Text>}

      <TextInput
        placeholder="Categoria"
        value={categoria}
        onChangeText={setCategoria}
        placeholderTextColor={colors.textSecondary}
        style={[globalStyles.input, { marginTop: 12 }]}
      />

      {tipo === 'entrada' && (
        <>
          <TextInput
            placeholder="Membro*"
            value={membro}
            onChangeText={(text) => { setMembro(text); if (erros.membro) setErros({}); }}
            placeholderTextColor={colors.textSecondary}
            style={[globalStyles.input, { marginTop: 12 }, erros.membro && globalStyles.inputError]}
          />
          {erros.membro && <Text style={globalStyles.errorMessage}>{erros.membro}</Text>}
        </>
      )}

      <TextInput
        placeholder={tipo === 'gasto' ? 'Dia do Vencimento *' : 'Dia do Recebimento *'}
        value={dia}
        onChangeText={(text) => { setDia(text); if (erros.dia) setErros({}); }}
        keyboardType="number-pad"
        maxLength={2}
        placeholderTextColor={colors.textSecondary}
        style={[globalStyles.input, { marginTop: 12 }, erros.dia && globalStyles.inputError]}
      />
      {erros.dia && <Text style={globalStyles.errorMessage}>{erros.dia}</Text>}

      <TouchableOpacity onPress={handleSalvar} style={[globalStyles.saveButton, { marginTop: 24 }]}>
        <Text style={globalStyles.saveButtonText}>Salvar Modelo</Text>
      </TouchableOpacity>
      
      {initialData && (
        <TouchableOpacity onPress={onCancel} style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.textSecondary }}>Cancelar Edição</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

export default function GerenciarModelosModal({ visible, onClose, tipo = 'gasto' }) {
  const { modelos, loading, addModelo, updateModelo, deleteModelo } = useFirestoreModelos(tipo);
  const [editingItem, setEditingItem] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState('modelos');
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', botoes: [] });

  const handleSave = (modelo) => {
    if (editingItem) {
      updateModelo(editingItem.id, modelo);
    } else {
      addModelo(modelo);
    }
    setEditingItem(null);
    setAbaAtiva('modelos');
  };

  // === CORREÇÃO AQUI: aguardar a exclusão assíncrona do modelo antes de fechar o alerta ===
const handleDeletar = (item) => {
  setAlerta({
    visivel: true,
    titulo: 'Confirmar Exclusão',
    mensagem: `Tem certeza que deseja excluir o modelo "${item.descricao}"? Esta ação não pode ser desfeita.`,
    icone: 'trash-can-outline',
    corIcone: colors.error,
    botoes: [
      { 
        texto: 'Cancelar', 
        onPress: () => setAlerta({ visivel: false }), 
        style: 'primary' 
      },
      { 
        texto: 'Excluir', 
        onPress: async () => {
          try {
            await deleteModelo(item.id);
            setAlerta({ visivel: false });
          } catch (e) {
            setAlerta({
              visivel: true,
              titulo: 'Erro',
              mensagem: 'Não foi possível excluir o modelo. Tente novamente.',
              icone: 'alert-circle-outline',
              corIcone: colors.error,
              botoes: [{ texto: 'OK', onPress: () => setAlerta({ visivel: false }) }],
            });
          }
        }, 
        style: 'destructive' 
      },
    ],
  });
};

  const handleClose = () => {
    setAbaAtiva('modelos');
    setEditingItem(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={globalStyles.fullScreenModalOverlay}>
        <View style={globalStyles.managementModalContainer}>
          <View style={globalStyles.managementModalHeader}>
            <Text style={globalStyles.managementModalTitle}>
              Modelos de {tipo === 'gasto' ? 'Gastos' : 'Entradas'}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={globalStyles.tabHeader}>
            <TouchableOpacity
              style={[globalStyles.tabButton, abaAtiva === 'modelos' && globalStyles.tabButtonActive]}
              onPress={() => { setEditingItem(null); setAbaAtiva('modelos'); }}
            >
              <Text style={globalStyles.tabButtonText}>Modelos</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[globalStyles.tabButton, abaAtiva === 'novo' && globalStyles.tabButtonActive]}
              onPress={() => { setEditingItem(null); setAbaAtiva('novo'); }}
            >
              <Text style={globalStyles.tabButtonText}>{editingItem ? 'Editar' : 'Novo'}</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
          ) : abaAtiva === 'modelos' ? (
            <FlatList
              data={modelos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={globalStyles.modeloItemRow}>
                  <View>
                    <Text style={globalStyles.modeloItemDescricao}>{item.descricao}</Text>
                    <Text style={globalStyles.modeloItemDetalhes}>
                      R$ {item.valor.toFixed(2)} - Dia {item.diaVencimento || item.diaDoMes}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={() => { setEditingItem(item); setAbaAtiva('novo'); }} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeletar(item)} style={{ padding: 4, marginLeft: 8 }}>
                      <MaterialCommunityIcons name="trash-can-outline" size={22} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          ) : (
            <FormularioModelo
              tipo={tipo}
              onSave={handleSave}
              initialData={editingItem}
              onCancel={() => { setEditingItem(null); setAbaAtiva('modelos'); }}
            />
          )}
        </View>
      </View>
      <AlertaModal
        visible={alerta.visivel}
        onClose={() => setAlerta({ visivel: false })}
        titulo={alerta.titulo}
        mensagem={alerta.mensagem}
        botoes={alerta.botoes}
        icone={alerta.icone}
        corIcone={alerta.corIcone}
      />
    </Modal>
  );
}
