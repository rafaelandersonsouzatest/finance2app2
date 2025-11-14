import { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MembroSelect } from '../components/MembroSelect';
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";
import ModernTabs from "./ModernTabs";
import AlertaModal from "./AlertaModal";
import CategoriaSelect from "./CategoriaSelect";
import { useModelos } from "../hooks/useModelos";
import { useEntradas } from "../hooks/useEntradas";
import { useDateFilter } from "../contexts/DateFilterContext";

const FormularioModelo = ({ tipo, onSave, initialData, onCancel }) => {
  const { selectedMonth, selectedYear } = useDateFilter();
  const { entradas, loading: loadingEntradas } = useEntradas(selectedMonth, selectedYear);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("");
  const [dia, setDia] = useState("");
  const [membro, setMembro] = useState("");
  const [modoCalculo, setModoCalculo] = useState("valor");
  const [entradasPorMes, setEntradasPorMes] = useState({});
  const keyMes = `${selectedYear}-${selectedMonth}`;
  const entradasSelecionadas = entradasPorMes[keyMes] || [];
  const [fixacao, setFixacao] = useState("dinamico");
  const [miniModalEntradas, setMiniModalEntradas] = useState(false);
  const [erros, setErros] = useState({});

  // 🔄 Preenche ao editar
  useEffect(() => {
    if (initialData) {
      setDescricao(initialData.descricao || "");
      setValor(String(initialData.valor ?? ""));
      setCategoria(initialData.categoria || "");
      setDia(String(initialData.diaVencimento || initialData.diaDoMes || ""));
      setMembro(initialData.membro || "");
      setModoCalculo(initialData.modoCalculo || "valor");
      setFixacao(initialData.fixacao || "dinamico");

      if (initialData.entradasSelecionadas?.length) {
        setEntradasPorMes((prev) => ({
          ...prev,
          [keyMes]: initialData.entradasSelecionadas,
        }));
      }
    } else {
      setDescricao("");
      setValor("");
      setCategoria("");
      setDia("");
      setMembro("");
      setModoCalculo("valor");
      setFixacao("dinamico");
    }
    setErros({});
  }, [initialData, keyMes]);

  // ✅ Validação
  const validarCampos = () => {
    const novosErros = {};
    const valorNum = parseFloat(String(valor).replace(",", ".")) || 0;
    const diaNum = parseInt(dia, 10);

    if (!descricao.trim()) novosErros.descricao = "A descrição é obrigatória.";
    if (modoCalculo === "valor" && valorNum <= 0)
      novosErros.valor = "O valor deve ser maior que zero.";
    if (modoCalculo === "porcentagem" && (valorNum <= 0 || valorNum > 100))
      novosErros.valor = "A porcentagem deve estar entre 1 e 100.";
    if (!dia || isNaN(diaNum) || diaNum < 1 || diaNum > 31)
      novosErros.dia = "O dia deve ser um número entre 1 e 31.";

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // 💾 Salvar
  const handleSalvar = () => {
    if (!validarCampos()) return;

    const modelo = {
      descricao: descricao.trim(),
      valor: parseFloat(String(valor).replace(",", ".")) || 0,
      categoria: categoria.trim() || "Outros",
      ativo: true,
      membro: membro.trim(),
      modoCalculo,
      diaVencimento: Number(dia),
      fixacao,
      entradasSelecionadas: entradasPorMes[keyMes] || [],
    };

    onSave(modelo);
  };

  const toggleEntrada = (id) => {
    setEntradasPorMes((prev) => {
      const atuais = prev[keyMes] || [];
      const novas = atuais.includes(id)
        ? atuais.filter((e) => e !== id)
        : [...atuais, id];
      return { ...prev, [keyMes]: novas };
    });
  };

  const toggleTodas = () => {
    setEntradasPorMes((prev) => {
      const todas = prev[keyMes] || [];
      const novas =
        todas.length === entradas.length ? [] : entradas.map((e) => e.id);
      return { ...prev, [keyMes]: novas };
    });
  };

  // 🧮 Texto com nomes das entradas selecionadas
  const getTextoSelecionadas = () => {
    if (!entradasSelecionadas.length) return "Selecionar Entradas";
    const nomes = entradas
      .filter((e) => entradasSelecionadas.includes(e.id))
      .map((e) => e.descricao);
    if (nomes.length <= 2) return nomes.join(", ");
    return `${nomes.slice(0, 2).join(", ")} e +${nomes.length - 2}`;
  };

  // 💡 Interface
  return (
    <ScrollView
      style={globalStyles.formContainer}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Descrição */}
      <TextInput
        placeholder="Descrição *"
        value={descricao}
        onChangeText={(t) => {
          setDescricao(t);
          if (erros.descricao) setErros({});
        }}
        placeholderTextColor={colors.textSecondary}
        style={[globalStyles.input, erros.descricao && globalStyles.inputError]}
      />
      {erros.descricao && (
        <Text style={globalStyles.errorMessage}>{erros.descricao}</Text>
      )}

      {/* Tipo de cálculo — apenas GASTO */}
      {tipo === "gasto" && (
        <View style={{ marginTop: 10 }}>
          <ModernTabs
            compact
            tabs={[
              { key: "valor", label: "Valor Fixo", icon: "cash" },
              { key: "porcentagem", label: "Porcentagem", icon: "percent" },
            ]}
            activeTab={modoCalculo}
            setActiveTab={(tab) => setModoCalculo(tab)}
            backgroundColor="transparent"
          />
        </View>
      )}

      {/* Valor */}
      <TextInput
        placeholder={
          modoCalculo === "porcentagem" ? "Porcentagem (%) *" : "Valor *"
        }
        value={valor}
        onChangeText={(t) => {
          setValor(t);
          if (erros.valor) setErros({});
        }}
        keyboardType="decimal-pad"
        placeholderTextColor={colors.textSecondary}
        style={[
          globalStyles.input,
          erros.valor && globalStyles.inputError,
          tipo === "entrada" && { marginTop: 12 }, // 👈 espaçamento extra só para entradas
        ]}
      />

      {erros.valor && <Text style={globalStyles.errorMessage}>{erros.valor}</Text>}

      {/* 💰 Entradas — quando porcentagem */}
      {modoCalculo === "porcentagem" && (
        <>
          {/* 🔘 Botão de Seleção */}
          <View
            style={{
              marginTop: 10,
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.surface,
            }}
          >
            <Text
              style={[
                globalStyles.sectionTitle,
                {
                  marginBottom: 10,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.textPrimary,
                },
              ]}
            >
              Base de cálculo
            </Text>

            <TouchableOpacity
              onPress={() => setMiniModalEntradas(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: colors.card,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 14,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                <MaterialCommunityIcons
                  name="checkbox-multiple-marked-outline"
                  size={20}
                  color={colors.primary}
                />
                <Text
                  style={{
                    marginLeft: 8,
                    color: colors.textPrimary,
                    fontSize: 15,
                    flexShrink: 1,
                  }}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {getTextoSelecionadas()}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-down"
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* ⚙️ Atualização de valor */}
          <View
            style={{
              marginTop: -10,
              padding: 12,
              borderRadius: 12,
              backgroundColor: colors.surface,
            }}
          >
            <Text
              style={[
                globalStyles.sectionTitle,
                {
                  marginBottom: 10,
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.textPrimary,
                },
              ]}
            >
              Atualização de valor
            </Text>

            {[
              { key: "modelo", label: "Fixar ao gerar modelo" },
              { key: "gasto", label: "Fixar ao gerar gasto" },
              { key: "dinamico", label: "Atualizar dinamicamente" },
            ].map((op) => (
              <TouchableOpacity
                key={op.key}
                onPress={() => setFixacao(op.key)}
                style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}
              >
                <MaterialCommunityIcons
                  name={fixacao === op.key ? "radiobox-marked" : "radiobox-blank"}
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ marginLeft: 6, color: colors.textPrimary }}>{op.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 🪟 Mini-Modal de Seleção de Entradas */}
          <Modal
            visible={miniModalEntradas}
            transparent
            animationType="fade"
            onRequestClose={() => setMiniModalEntradas(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.6)",
                justifyContent: "center",
                alignItems: "center",
                padding: 16,
              }}
            >
              <View
                style={{
                  width: "100%",
                  maxHeight: "75%",
                  backgroundColor: colors.background,
                  borderRadius: 16,
                  padding: 16,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "600" }}>
                    Selecionar Entradas
                  </Text>
                  <TouchableOpacity onPress={() => setMiniModalEntradas(false)}>
                    <MaterialCommunityIcons name="close" size={22} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {loadingEntradas ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                  <ScrollView
                    style={{ marginTop: 12 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <TouchableOpacity
                      onPress={toggleTodas}
                      style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}
                    >
                      <MaterialCommunityIcons
                        name={
                          entradasSelecionadas.length === entradas.length && entradas.length > 0
                            ? "checkbox-marked"
                            : "checkbox-blank-outline"
                        }
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={{ marginLeft: 6, color: colors.textPrimary }}>
                        Selecionar todas
                      </Text>
                    </TouchableOpacity>

                    {entradas.map((entrada) => (
                      <TouchableOpacity
                        key={entrada.id}
                        onPress={() => toggleEntrada(entrada.id)}
                        style={{ flexDirection: "row", alignItems: "center", paddingVertical: 6 }}
                      >
                        <MaterialCommunityIcons
                          name={
                            entradasSelecionadas.includes(entrada.id)
                              ? "checkbox-marked"
                              : "checkbox-blank-outline"
                          }
                          size={20}
                          color={colors.primary}
                        />
                        <Text style={{ marginLeft: 6, color: colors.textPrimary }}>
                          {entrada.descricao} — R$ {entrada.valor.toFixed(2)} (
                          {typeof entrada.membro === "object"
                            ? entrada.membro?.nome || "Sem nome"
                            : entrada.membro || "Sem membro"}
                          )
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                <TouchableOpacity
                  onPress={() => setMiniModalEntradas(false)}
                  style={[
                    globalStyles.saveButton,
                    { marginTop: 10, paddingVertical: 10, borderRadius: 10 },
                  ]}
                >
                  <Text style={globalStyles.saveButtonText}>Confirmar Seleção</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Categoria */}
      <View style={{ marginTop: 12,  marginBottom: 12,}}>
        <CategoriaSelect value={categoria} onChange={setCategoria} />
      </View>

      {/* Membro (entradas apenas) */}
      {tipo === "entrada" && (
        <MembroSelect
          membroSelecionado={membro}
          onSelecionar={(m) => setMembro(typeof m === "object" ? m.nome : m)}
          tipo="membro"
          mostrarLabel={false} 
        />
    )}


      {/* Dia */}
      <TextInput
        placeholder={tipo === "gasto" ? "Dia do Vencimento *" : "Dia do Recebimento *"}
        value={dia}
        onChangeText={setDia}
        keyboardType="number-pad"
        maxLength={2}
        placeholderTextColor={colors.textSecondary}
        style={[globalStyles.input, { marginTop: 12 }]}
      />

      {/* Botões */}
      <TouchableOpacity onPress={handleSalvar} style={[globalStyles.saveButton, { marginTop: 24 }]}>
        <Text style={globalStyles.saveButtonText}>Salvar Modelo</Text>
      </TouchableOpacity>

      {initialData && (
        <TouchableOpacity onPress={onCancel} style={{ marginTop: 12, alignItems: "center" }}>
          <Text style={{ color: colors.textSecondary }}>Cancelar Edição</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// MODAL PRINCIPAL
export default function GerenciarModelosModal({ visible, onClose, tipo = "gasto" }) {
  const { modelos, loading, addModelo, updateModelo, deleteModelo } = useModelos(tipo);

  const [editingItem, setEditingItem] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("modelos");
  const [alerta, setAlerta] = useState({ visivel: false });

  const handleSave = async (modelo) => {
    try {
      if (editingItem) await updateModelo(editingItem.id, modelo);
      else await addModelo(modelo);
      setEditingItem(null);
      setAbaAtiva("modelos");
    } catch {
      setAlerta({
        visivel: true,
        titulo: "Erro",
        mensagem: "Não foi possível salvar o modelo.",
        icone: "alert-circle-outline",
        corIcone: colors.error,
      });
    }
  };

  const handleDeletar = (item) =>
    setAlerta({
      visivel: true,
      titulo: "Confirmar Exclusão",
      mensagem: `Excluir o modelo "${item.descricao}"?`,
      icone: "trash-can-outline",
      corIcone: colors.error,
      botoes: [
        { texto: "Cancelar", onPress: () => setAlerta({ visivel: false }) },
        {
          texto: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteModelo(item.id);
            setAlerta({ visivel: false });
          },
        },
      ],
    });

  const handleClose = () => {
    setEditingItem(null);
    setAbaAtiva("modelos");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={globalStyles.fullScreenModalOverlay}>
        <View style={globalStyles.managementModalContainer}>
          {/* Cabeçalho */}
          <View style={globalStyles.managementModalHeader}>
            <Text style={globalStyles.managementModalTitle}>
              Modelos de {tipo === "gasto" ? "Gastos Fixos" : "Entradas"}
            </Text>
            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Abas */}
          <View style={{ backgroundColor: "transparent", marginBottom: 8 }}>
            <ModernTabs
              compact
              tabs={[
                { key: "modelos", label: "Modelos", icon: "view-list" },
                { key: "novo", label: editingItem ? "Editar" : "Novo", icon: "plus-circle-outline" },
              ]}
              activeTab={abaAtiva}
              setActiveTab={(key) => {
                setEditingItem(null);
                setAbaAtiva(key);
              }}
              backgroundColor="transparent"
            />
          </View>

          {/* Conteúdo */}
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
          ) : abaAtiva === "modelos" ? (
            <FlatList
              data={modelos}
              keyExtractor={(i) => i.id}
              renderItem={({ item }) => (
                <View style={globalStyles.modeloItemRow}>
                  <View>
                    <Text style={globalStyles.modeloItemDescricao}>{item.descricao}</Text>
                    <Text style={globalStyles.modeloItemDetalhes}>
                      {item.modoCalculo === "porcentagem"
                        ? `${item.valor.toFixed(2)}%`
                        : `R$ ${item.valor.toFixed(2)}`}{" "}
                      - Dia {item.diaVencimento || item.diaDoMes}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingItem(item);
                        setAbaAtiva("novo");
                      }}
                      style={{ padding: 4 }}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={22} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeletar(item)}
                      style={{ padding: 4, marginLeft: 8 }}
                    >
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
              onCancel={() => {
                setEditingItem(null);
                setAbaAtiva("modelos");
              }}
            />
          )}
        </View>
      </View>

      {/* Modal de Alerta */}
      <AlertaModal {...alerta} visible={alerta.visivel} onClose={() => setAlerta({ visivel: false })} />
    </Modal>
    
  );
  
}
