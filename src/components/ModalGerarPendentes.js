import { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import { formatarBRL } from '../utils/formatarValor';

// Confirmação do "Gerar do Mês": lista os modelos que ainda não viraram
// lançamento no mês (ver utils/modelosPendentes.js), todos marcados por
// padrão — o usuário desmarca o que não quer (ex.: algo que ele apagou de
// propósito e que, por isso, voltou a aparecer como pendente).
export default function ModalGerarPendentes({
  visible,
  tipo = 'gasto',
  pendentes = [],
  gerando = false,
  onConfirmar,
  onClose,
}) {
  const [selecionados, setSelecionados] = useState([]);

  // Mesma ordem da lista de modelos (useModelos.js): por dia de vencimento.
  const dia = (m) => m.diaVencimento || m.diaDoMes || 99;
  const ordenados = [...pendentes].sort((a, b) => dia(a) - dia(b));

  useEffect(() => {
    if (visible) setSelecionados(pendentes.map((m) => m.id));
  }, [visible, pendentes]);

  const todosMarcados = selecionados.length === pendentes.length && pendentes.length > 0;

  const alternar = (id) =>
    setSelecionados((atual) =>
      atual.includes(id) ? atual.filter((s) => s !== id) : [...atual, id]
    );

  const alternarTodos = () =>
    setSelecionados(todosMarcados ? [] : pendentes.map((m) => m.id));

  const textoValor = (modelo) =>
    modelo.modoCalculo === 'porcentagem'
      ? `${Number(modelo.valor || 0)}% das entradas`
      : formatarBRL(modelo.valor) || 'R$ 0,00';

  const isEntrada = tipo === 'entrada';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.cabecalho}>
            <Text style={styles.titulo}>
              {isEntrada ? 'Gerar entradas do mês' : 'Gerar gastos do mês'}
            </Text>
            <TouchableOpacity onPress={onClose} disabled={gerando}>
              <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitulo}>
            Estes modelos ainda não foram lançados neste mês. Escolha quais gerar:
          </Text>

          <TouchableOpacity onPress={alternarTodos} style={styles.linha} disabled={gerando}>
            <MaterialCommunityIcons
              name={todosMarcados ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.textoLinha, { fontWeight: '600' }]}>
              {todosMarcados ? 'Desmarcar todos' : 'Marcar todos'}
            </Text>
          </TouchableOpacity>

          <ScrollView style={styles.lista} showsVerticalScrollIndicator={false}>
            {ordenados.map((modelo) => (
              <TouchableOpacity
                key={modelo.id}
                onPress={() => alternar(modelo.id)}
                style={styles.linha}
                disabled={gerando}
              >
                <MaterialCommunityIcons
                  name={selecionados.includes(modelo.id) ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={colors.primary}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[styles.textoLinha, { marginLeft: 0 }]} numberOfLines={1}>
                    {modelo.descricao}
                  </Text>
                  <Text style={styles.detalhe}>
                    {textoValor(modelo)} · Dia {modelo.diaVencimento || modelo.diaDoMes}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            onPress={() => onConfirmar(selecionados)}
            disabled={gerando || selecionados.length === 0}
            style={[
              globalStyles.saveButton,
              styles.botao,
              (gerando || selecionados.length === 0) && { opacity: 0.5 },
            ]}
          >
            {gerando ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={globalStyles.saveButtonText}>
                {selecionados.length === 0
                  ? 'Nenhum selecionado'
                  : `Gerar ${selecionados.length} ${selecionados.length === 1 ? 'item' : 'itens'}`}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  container: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: 16,
    padding: 16,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titulo: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
  },
  subtitulo: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 8,
  },
  lista: {
    flexGrow: 0,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  textoLinha: {
    marginLeft: 8,
    color: colors.textPrimary,
    fontSize: 15,
  },
  detalhe: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  botao: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
});
