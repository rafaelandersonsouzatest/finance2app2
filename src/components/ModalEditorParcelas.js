import { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { globalStyles } from '../styles/globalStyles';
import CampoMonetario from './CampoMonetario';
import { dividirValorIgualmente, somarParcelas } from '../utils/parcelamento';

// =========================================================
// 🔹 Uma linha = uma parcela. A edição do valor usa exatamente o mesmo
// `CampoMonetario` compartilhado por todo o app (única implementação de
// entrada monetária do projeto) — nada de máscara própria aqui. Envolvida em
// `memo` porque vive dentro de uma `FlatList`: sem isso, cada tecla digitada
// numa linha re-renderizaria todas as outras linhas também. Parcelas já
// pagas ou antecipadas (`bloqueada`) só exibem o valor, sem campo editável —
// ver ARQUITETURA.md seção 15.9 (risco de inconsistência financeira
// retroativa).
// =========================================================
const LinhaParcela = memo(({ indice, numero, total, valor, onChange, bloqueada }) => {
  const handleChange = useCallback(
    (novoValor) => onChange(indice, novoValor),
    [onChange, indice]
  );

  return (
    <View
      style={[
        globalStyles.listItem,
        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
        {bloqueada && (
          <MaterialCommunityIcons
            name="lock-outline"
            size={16}
            color={colors.textSecondary}
            style={{ marginRight: 6 }}
          />
        )}
        <Text style={globalStyles.listItemTitle}>
          Parcela {numero.toString().padStart(2, '0')}/{total}
        </Text>
      </View>

      {bloqueada ? (
        <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
          R$ {Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </Text>
      ) : (
        <CampoMonetario
          valor={valor}
          onChange={handleChange}
          style={{ marginBottom: 0 }}
          textInputStyle={{ width: 140, textAlign: 'right' }}
        />
      )}
    </View>
  );
});

// =========================================================
// 🔹 Editor de valores individuais de parcela — não conhece Firestore, só
// recebe os valores iniciais (equal split ou já personalizados) e devolve o
// array final em aoConfirmar. Usado tanto na criação (ModalCriacao) quanto
// na edição (ModalEdicao) de uma compra no cartão — ver ARQUITETURA.md
// seção 15. `bloqueadas` (array de booleans, mesmo índice de `valoresIniciais`)
// marca parcelas já pagas/antecipadas — nunca editáveis nem redistribuídas.
// =========================================================
export default function ModalEditorParcelas({
  visivel,
  aoFechar,
  aoConfirmar,
  descricao,
  totalParcelas,
  valoresIniciais,
  bloqueadas,
}) {
  const [valores, setValores] = useState([]);

  useEffect(() => {
    if (visivel) setValores(valoresIniciais || []);
  }, [visivel]);

  const total = somarParcelas(valores);
  const estaBloqueada = (indice) => !!bloqueadas?.[indice];
  const existeParcelaAberta = valores.some((_, indice) => !estaBloqueada(indice));
  const existeParcelaBloqueada = valores.some((_, indice) => estaBloqueada(indice));

  // 🔹 Referência estável (não recriada a cada render) — passada igual para
  // todas as linhas, para que o `memo` de `LinhaParcela` de fato evite
  // re-renderizar linhas que não mudaram a cada tecla digitada em outra.
  const atualizarParcela = useCallback(
    (indice, novoValor) => {
      if (bloqueadas?.[indice]) return; // defesa extra — a linha nem tem campo editável
      setValores((prev) => {
        const copia = [...prev];
        copia[indice] = novoValor;
        return copia;
      });
    },
    [bloqueadas]
  );

  // 🔹 Reparte o total atual só entre as parcelas ainda abertas — as já
  // pagas/antecipadas mantêm exatamente o valor que já têm.
  const restaurarParcelasIguais = () => {
    const indicesAbertos = valores.map((_, indice) => indice).filter((indice) => !estaBloqueada(indice));
    if (indicesAbertos.length === 0) return;

    const totalBloqueado = somarParcelas(valores.filter((_, indice) => estaBloqueada(indice)));
    const novosValoresAbertos = dividirValorIgualmente(total - totalBloqueado, indicesAbertos.length);

    setValores((prev) => {
      const copia = [...prev];
      indicesAbertos.forEach((indice, posicao) => {
        copia[indice] = novosValoresAbertos[posicao];
      });
      return copia;
    });
  };

  const confirmar = () => {
    aoConfirmar(valores);
    aoFechar();
  };

  return (
    <Modal visible={!!visivel} transparent animationType="slide" onRequestClose={aoFechar}>
      <View style={globalStyles.fullScreenModalOverlay}>
        <View style={[globalStyles.managementModalContainer, { maxHeight: '90%' }]}>
          <View style={globalStyles.managementModalHeader}>
            <Text style={globalStyles.managementModalTitle}>Editar valores das parcelas</Text>
            <TouchableOpacity onPress={aoFechar}>
              <MaterialCommunityIcons name="close-circle" size={28} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {!!descricao && (
            <Text
              style={[globalStyles.modalSubtitle, { marginTop: -10, marginBottom: 10 }]}
              numberOfLines={1}
            >
              {descricao}
            </Text>
          )}

          {existeParcelaBloqueada && (
            <Text
              style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}
            >
              🔒 Parcelas já pagas ou antecipadas não podem ter o valor alterado.
            </Text>
          )}

          <FlatList
            data={valores}
            keyExtractor={(_, indice) => String(indice)}
            renderItem={({ item, index }) => (
              <LinhaParcela
                indice={index}
                numero={index + 1}
                total={valores.length}
                valor={item}
                onChange={atualizarParcela}
                bloqueada={estaBloqueada(index)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />

          {existeParcelaAberta && (
            <TouchableOpacity
              onPress={restaurarParcelasIguais}
              style={{ alignItems: 'center', paddingVertical: 12 }}
            >
              <Text style={{ color: colors.primary, fontWeight: '600' }}>
                Restaurar parcelas iguais
              </Text>
            </TouchableOpacity>
          )}

          <View style={[globalStyles.resumoFinanceiroContainer, { marginBottom: 4 }]}>
            <View style={globalStyles.rowBetween}>
              <Text style={globalStyles.resumoFinanceiroLabel}>Total da compra</Text>
              <Text style={globalStyles.resumoFinanceiroValor}>
                R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>

          <View style={globalStyles.buttonRow}>
            <View style={globalStyles.rightButtons}>
              <TouchableOpacity style={globalStyles.cancelButton} onPress={aoFechar}>
                <Text style={globalStyles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={globalStyles.saveButton} onPress={confirmar}>
                <Text style={globalStyles.saveButtonText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
