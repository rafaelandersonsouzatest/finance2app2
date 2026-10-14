// src/components/carteira/FormularioCartaoModal.js
// Formulário de criar/editar cartão — usado tanto pela tela "Gerenciar
// Cartões" quanto pelo atalho a partir do CartaoSelect (mesmo padrão de
// FormularioCategoriaModal.js). Único formulário para os dois casos:
// `cartao` vem preenchido ao editar, vazio ao criar.
import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';
import AreaFormulario from '../AreaFormulario';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCarteira } from '../../hooks/useCarteira';
import { globalStyles } from '../../styles/globalStyles';
import { colors } from '../../styles/colors';
import CartaoVisual from '../CartaoVisual';

// 🔹 Paleta própria de cores de cartão — diferente da paleta de categorias
// (FormularioCategoriaModal.js, decorativa) porque aqui precisa cobrir as
// Cores reais de cartão (ver comentário em src/styles/colors.js).
const CORES_DISPONIVEIS = colors.cardPalette;

export default function FormularioCartaoModal({ visivel, onFechar, cartao = null }) {
  const { adicionarCartao, atualizarCartao } = useCarteira();
  const editando = !!cartao;

  const [nome, setNome] = useState('');
  const [banco, setBanco] = useState('');
  const [ultimos4Digitos, setUltimos4Digitos] = useState('');
  const [cor, setCor] = useState(CORES_DISPONIVEIS[0]);
  const [diaVencimento, setDiaVencimento] = useState('');
  const [diaFechamento, setDiaFechamento] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!visivel) return;
    setNome(cartao?.nome || '');
    setBanco(cartao?.banco || '');
    setUltimos4Digitos(cartao?.ultimos4Digitos || '');
    setCor(cartao?.cor || CORES_DISPONIVEIS[0]);
    setDiaVencimento(cartao?.diaVencimento ? String(cartao.diaVencimento) : '');
    setDiaFechamento(cartao?.diaFechamento ? String(cartao.diaFechamento) : '');
    setErro(null);
  }, [visivel, cartao]);

  const previa = {
    nome: nome || 'Nome do cartão',
    banco,
    ultimos4Digitos,
    cor,
    diaVencimento: diaVencimento ? Number(diaVencimento) : null,
  };

  const salvar = async () => {
    const nomeTrim = nome.trim();
    if (!nomeTrim) {
      setErro('Digite um nome para o cartão.');
      return;
    }

    const diaVencimentoNum = parseInt(diaVencimento, 10);
    if (!diaVencimento || isNaN(diaVencimentoNum) || diaVencimentoNum < 1 || diaVencimentoNum > 31) {
      setErro('O dia de vencimento deve ser um número entre 1 e 31.');
      return;
    }

    const diaFechamentoNum = parseInt(diaFechamento, 10);
    if (!diaFechamento || isNaN(diaFechamentoNum) || diaFechamentoNum < 1 || diaFechamentoNum > 31) {
      setErro('O dia de fechamento deve ser um número entre 1 e 31.');
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      const dados = {
        nome: nomeTrim,
        banco: banco.trim(),
        ultimos4Digitos: ultimos4Digitos.replace(/\D/g, '').slice(0, 4),
        cor,
        diaVencimento: diaVencimentoNum,
        diaFechamento: diaFechamentoNum,
      };
      if (editando) {
        await atualizarCartao(cartao.id, dados);
      } else {
        await adicionarCartao(dados);
      }
      onFechar();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal statusBarTranslucent navigationBarTranslucent
      isVisible={visivel}
      onBackdropPress={onFechar}
      onBackButtonPress={onFechar}
      style={{ justifyContent: 'flex-end', margin: 0 }}
    >
      <View style={[globalStyles.modalContainer, { maxHeight: '90%' }]}>
        <View style={globalStyles.modalHeader}>
          <Text style={globalStyles.modalTitle}>{editando ? 'Editar cartão' : 'Novo cartão'}</Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialCommunityIcons name="close-circle" size={28} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <AreaFormulario>
          <CartaoVisual cartao={previa} />

          <Text style={[globalStyles.label, { marginTop: 20 }]}>Nome *</Text>
          <TextInput
            style={globalStyles.input}
            value={nome}
            onChangeText={setNome}
            placeholder="Ex.: Nubank Roxinho"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[globalStyles.label, { marginTop: 12 }]}>Banco</Text>
          <TextInput
            style={globalStyles.input}
            value={banco}
            onChangeText={setBanco}
            placeholder="Ex.: Nubank, Inter, C6..."
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={[globalStyles.label, { marginTop: 12 }]}>Últimos 4 dígitos (opcional)</Text>
          <TextInput
            style={globalStyles.input}
            value={ultimos4Digitos}
            onChangeText={(t) => setUltimos4Digitos(t.replace(/\D/g, '').slice(0, 4))}
            placeholder="0000"
            keyboardType="numeric"
            maxLength={4}
            placeholderTextColor={colors.textSecondary}
          />

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[globalStyles.label, { marginTop: 12 }]}>Dia do fechamento *</Text>
              <TextInput
                style={globalStyles.input}
                value={diaFechamento}
                onChangeText={(t) => setDiaFechamento(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="Ex.: 25"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[globalStyles.label, { marginTop: 12 }]}>Dia do vencimento *</Text>
              <TextInput
                style={globalStyles.input}
                value={diaVencimento}
                onChangeText={(t) => setDiaVencimento(t.replace(/\D/g, '').slice(0, 2))}
                placeholder="Ex.: 10"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          <Text style={[globalStyles.label, { marginTop: 16 }]}>Cor</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {CORES_DISPONIVEIS.map((corDisponivel) => (
              <TouchableOpacity
                key={corDisponivel}
                onPress={() => setCor(corDisponivel)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: corDisponivel,
                  borderWidth: cor === corDisponivel ? 3 : 0,
                  borderColor: colors.textPrimary,
                }}
              />
            ))}
          </View>

          {!!erro && (
            <Text style={{ color: colors.error, marginTop: 12, textAlign: 'center' }}>{erro}</Text>
          )}

          <TouchableOpacity
            style={[globalStyles.saveButton, { marginTop: 20, marginBottom: 12 }]}
            onPress={salvar}
            disabled={salvando}
          >
            <Text style={globalStyles.saveButtonText}>{salvando ? 'Salvando...' : 'Salvar'}</Text>
          </TouchableOpacity>
        </AreaFormulario>
      </View>
    </Modal>
  );
}
