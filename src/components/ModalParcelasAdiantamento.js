import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { formatarBRL, parseBRL } from '../utils/formatarValor';
import { vibrarLeve } from '../utils/haptics';
import SeletorData from './SeletorData';
import { useCurrencyInput } from '../hooks/useCurrencyInput';



export default function ModalParcelasAdiantamento({
  visivel,
  aoFechar,
  parcelasFuturas = [],
  aoConfirmar, // 👈 agora vem de fora, via useAdiantamento
}) {
  const [selecionadas, setSelecionadas] = useState([]);
  const [usarDataAtual, setUsarDataAtual] = useState(true);
  const [dataEscolhida, setDataEscolhida] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
  });
  const [usarValorIntegral, setUsarValorIntegral] = useState(true);
  const [valorComDesconto, setValorComDesconto] = useState('');

  useEffect(() => {
    if (visivel) {
      setSelecionadas([]);
      setUsarDataAtual(true);
      setDataEscolhida({
        mes: new Date().getMonth() + 1,
        ano: new Date().getFullYear(),
      });
      setUsarValorIntegral(true);
      setValorComDesconto('');
    }
  }, [visivel]);

  const toggleSelecao = (id) => {
    vibrarLeve();
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const confirmar = async () => {
    if (selecionadas.length === 0) return;

    const dataFinal = usarDataAtual
      ? new Date().toISOString().split('T')[0]
      : `${dataEscolhida.ano}-${String(dataEscolhida.mes).padStart(2, '0')}-01`;

    const valorFinal = usarValorIntegral ? null : parseBRL(valorComDesconto || '0');

    await aoConfirmar(selecionadas, dataFinal, valorFinal); // ✅ chama o hook correto
    aoFechar();
  };

  const renderParcela = ({ item }) => {
    const selecionada = selecionadas.includes(item.id);
    return (
      <TouchableOpacity
        style={[
          globalStyles.listItem,
          { backgroundColor: selecionada ? colors.primary + '20' : colors.cardBackground },
        ]}
        onPress={() => toggleSelecao(item.id)}
      >
        <View style={globalStyles.listItemContent}>
          <MaterialCommunityIcons
            name={selecionada ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={selecionada ? colors.primary : colors.textSecondary}
            style={globalStyles.listItemIcon}
          />
          <View style={globalStyles.listItemInfo}>
            <Text style={globalStyles.listItemTitle}>
              Parcela {item.parcelaAtual}/{item.totalParcelas}
            </Text>
            <Text style={globalStyles.listItemSubtitle}>
              Venc: {new Date(item.dataVencimento + 'T00:00:00').toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
        <Text style={[globalStyles.listItemAmount, { color: colors.expense }]}>
          R$ {item.valor.toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={aoFechar}>
      <View style={globalStyles.fullScreenModalOverlay}>
        <View style={[globalStyles.managementModalContainer, { maxHeight: '85%' }]}>
          <View style={globalStyles.managementModalHeader}>
            <Text style={globalStyles.managementModalTitle}>Antecipar Parcelas</Text>
            <TouchableOpacity onPress={aoFechar}>
              <MaterialCommunityIcons name="close-circle" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={parcelasFuturas}
            keyExtractor={(item) => item.id}
            renderItem={renderParcela}
            showsVerticalScrollIndicator={false}
            style={{ marginTop: 12 }}
          />

          {/* Escolher Data */}
          <View style={{ marginTop: 16 }}>
            <TouchableOpacity
              onPress={() => setUsarDataAtual(!usarDataAtual)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
            >
              <MaterialCommunityIcons
                name={usarDataAtual ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={{ color: colors.textPrimary, marginLeft: 6 }}>
                Usar data de hoje
              </Text>
            </TouchableOpacity>

            {!usarDataAtual && (
              <>
                <Text style={globalStyles.label}>Data personalizada:</Text>
                <SeletorData
                />
              </>
            )}
          </View>

          {/* Valor Integral / com Desconto */}
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              onPress={() => setUsarValorIntegral(!usarValorIntegral)}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
            >
              <MaterialCommunityIcons
                name={usarValorIntegral ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={{ color: colors.textPrimary, marginLeft: 6 }}>
                Usar valor integral
              </Text>
            </TouchableOpacity>

            {!usarValorIntegral && (
              <View style={{ marginTop: 6 }}>
                <Text style={globalStyles.label}>Valor com desconto:</Text>
                <View style={globalStyles.inputContainer}>
                  <MaterialCommunityIcons name="cash-minus" size={20} color={colors.textSecondary} />
                  <TextInput
                    style={globalStyles.input}
                    placeholder="R$ 0,00"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="numeric"
                    value={valorComDesconto}
                    onChangeText={(t) => setValorComDesconto(formatarBRL(parseBRL(t)))}
                  />
                </View>
              </View>
            )}
          </View>

          {/* Botões */}
          <View style={[globalStyles.buttonRow, { marginTop: 24 }]}>
            <TouchableOpacity style={globalStyles.cancelButton} onPress={aoFechar}>
              <Text style={globalStyles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                globalStyles.saveButton,
                { opacity: selecionadas.length > 0 ? 1 : 0.5, flexDirection: 'row' },
              ]}
              disabled={selecionadas.length === 0}
              onPress={confirmar}
            >
              <MaterialCommunityIcons
                name="rocket-launch-outline"
                size={18}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={globalStyles.saveButtonText}>
                Antecipar ({selecionadas.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
