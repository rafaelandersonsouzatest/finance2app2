import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';
import * as Haptics from 'expo-haptics';

export default function SeletorData({ label = 'Data', value, onChangeText }) {
  const [mostrarModal, setMostrarModal] = useState(false);

  // 🔹 Converte string DD-MM-YYYY → Date
  const parseData = (str) => {
    if (!str) return new Date();
    const partes = str.split('-');
    if (partes.length === 3) {
      const [dia, mes, ano] = partes.map((p) => parseInt(p, 10));
      const data = new Date(ano, mes - 1, dia);
      if (!isNaN(data.getTime())) return data;
    }
    return new Date();
  };

  // 🔹 Estados internos
// 🔹 Estados principais (valor confirmado)
const [dia, setDia] = useState(1);
const [mes, setMes] = useState(1);
const [ano, setAno] = useState(new Date().getFullYear());

// 🔹 Estados temporários (para uso dentro do modal)
const [tempDia, setTempDia] = useState(dia);
const [tempMes, setTempMes] = useState(mes);
const [tempAno, setTempAno] = useState(ano);

useEffect(() => {
  const maxDias = new Date(tempAno, tempMes, 0).getDate();
  if (tempDia > maxDias) {
    setTempDia(maxDias);

    // 🔹 Rolagem automática para alinhar o novo dia válido
    const timer = setTimeout(() => {
      if (refDia.current) {
        refDia.current.scrollToOffset({
          offset: (maxDias - 1) * ITEM_HEIGHT,
          animated: true,
        });
      }
    }, 150);

    return () => clearTimeout(timer);
  }
}, [tempMes, tempAno]);


  const refDia = useRef(null);
  const refMes = useRef(null);
  const refAno = useRef(null);

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const VISIBLE_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const PADDING_VERTICAL = (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2;

  // 🔹 Dias agora dependem do mês e do ano selecionados
  const dias = useMemo(() => {
  const maxDias = new Date(tempAno, tempMes, 0).getDate();
  return Array.from({ length: maxDias }, (_, i) => i + 1);
}, [tempMes, tempAno]);

  const meses = useMemo(
    () => [
      'Janeiro', 'Fevereiro', 'Março', 'Abril',
      'Maio', 'Junho', 'Julho', 'Agosto',
      'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ],
    []
  );
  const anos = useMemo(() => {
    const atual = new Date().getFullYear();
    return Array.from({ length: 60 }, (_, i) => atual - 40 + i);
  }, []);

  // 🔹 Atualiza os estados quando o value muda
  useEffect(() => {
    const data = parseData(value);
    setDia(data.getDate());
    setMes(data.getMonth() + 1);
    setAno(data.getFullYear());
  }, [value]);

// 🔹 Centraliza corretamente o item ao abrir o seletor
useEffect(() => {
  if (mostrarModal) {
    // Aguardar layout do FlatList
    const scrollTo = (ref, index) => {
      if (!ref?.current || index < 0) return;
      const offset = index * ITEM_HEIGHT;
      ref.current.scrollToOffset({ offset, animated: true });

    };

    const diaIndex = tempDia - 1;
    const mesIndex = tempMes - 1;
    const anoIndex = anos.findIndex((a) => a === tempAno);

    // Pequeno atraso para evitar comportamento automático do iOS
    const timer = setTimeout(() => {
      scrollTo(refDia, diaIndex);
      scrollTo(refMes, mesIndex);
      if (anoIndex >= 0) scrollTo(refAno, anoIndex);
    }, 250);

    return () => clearTimeout(timer);
  }
}, [mostrarModal]);

  // 🔹 Confirmar
const confirmar = () => {
  setDia(tempDia);
  setMes(tempMes);
  setAno(tempAno);

  const dataFormatada = `${String(tempDia).padStart(2, '0')}-${String(tempMes).padStart(2, '0')}-${tempAno}`;
  onChangeText?.(dataFormatada);
  setMostrarModal(false);
};

  const formatarDataTexto = (d, m, a) =>
    `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;

  const renderScroll = (data, valorAtual, setValor, tipo) => (
    <FlatList
      ref={tipo === 'dia' ? refDia : tipo === 'mes' ? refMes : refAno}
      data={data}
      keyExtractor={(item) => item.toString()}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingTop: PADDING_VERTICAL,
        paddingBottom: PADDING_VERTICAL,
      }}
      style={[globalStyles.scrollPicker, { height: VISIBLE_HEIGHT }]}
      getItemLayout={(_, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
      })}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="normal"
      onMomentumScrollEnd={(e) => {
        Haptics.selectionAsync();
        const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
        const novoValor = data[index];
        if (novoValor != null) {
          tipo === 'dia'
            ? setValor(novoValor)
            : tipo === 'mes'
            ? setValor(index + 1)
            : setValor(novoValor);
        }
      }}
      renderItem={({ item, index }) => {
        const ativo =
          tipo === 'dia'
            ? item === valorAtual
            : tipo === 'mes'
            ? index + 1 === valorAtual
            : item === valorAtual;

        return (
          <TouchableOpacity
            onPress={() =>
              tipo === 'dia'
                ? setValor(item)
                : tipo === 'mes'
                ? setValor(index + 1)
                : setValor(item)
            }
            style={[
              globalStyles.scrollItem,
              ativo && globalStyles.scrollItemAtivo,
            ]}
          >
            <Text
              style={[
                globalStyles.scrollItemTexto,
                ativo && globalStyles.scrollItemTextoAtivo,
              ]}
            >
              {tipo === 'mes' ? item : item.toString()}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );

  return (
    <View style={globalStyles.dataContainer}>
      <TouchableOpacity
        style={globalStyles.dataButton}
        onPress={() => {
          setTempDia(dia);
          setTempMes(mes);
          setTempAno(ano);
          setMostrarModal(true);
        }}
      >
        <MaterialCommunityIcons
          name="calendar"
          size={22}
          color={colors.primary}
          style={globalStyles.dataIcon}
        />
        <Text style={globalStyles.dataValue}>
          {value ? formatarDataTexto(dia, mes, ano) : 'Selecionar data'}
        </Text>
      </TouchableOpacity>

      <Modal visible={mostrarModal} transparent animationType="fade">
        <View style={globalStyles.dataModalOverlay}>
          <View style={globalStyles.dataModalBox}>
            <Text
              style={[
                globalStyles.managementModalTitle,
                { textAlign: 'center', marginBottom: 10 },
              ]}
            >
              Selecione a data
            </Text>

            <View style={{ position: 'relative', overflow: 'hidden' }}>
              <LinearGradient
                colors={[colors.background, colors.background + 'CC', colors.background + '00']}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 60,
                  zIndex: 3,
                }}
              />

              <View style={globalStyles.scrollCenterLine} />

              <View style={globalStyles.datePickerRow}>
                {renderScroll(dias, tempDia, setTempDia, 'dia')}
                {renderScroll(meses, tempMes, setTempMes, 'mes')}
                {renderScroll(anos, tempAno, setTempAno, 'ano')}
              </View>

              <LinearGradient
                colors={[colors.background + '00', colors.background + 'CC', colors.background]}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 60,
                  zIndex: 3,
                }}
              />
            </View>

            <View style={globalStyles.modalButtons}>
              <TouchableOpacity onPress={() => setMostrarModal(false)}>
                <Text
                  style={[globalStyles.cancelButtonText, { marginRight: 20 }]}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmar}>
                <Text style={globalStyles.confirmButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
