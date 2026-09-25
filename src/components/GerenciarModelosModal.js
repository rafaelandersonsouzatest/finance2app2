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
import { MembroSelect } from "../components/MembroSelect";
import CampoMonetario from "./CampoMonetario";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";
import ModernTabs from "./ModernTabs";
import AlertaModal from "./AlertaModal";
import CategoriaSelect from "./CategoriaSelect";
import { useCategorias } from "../hooks/useCategorias";
import { useModelos } from "../hooks/useModelos";
import { useMembros } from "../hooks/useMembros";
import { useDateFilter } from "../contexts/DateFilterContext";
import { useAuth } from "../auth/useAuth";
import { getBasePath } from "../utils/firestorePaths";
import { migrarBasesPercentuaisLegadas } from "../utils/migrarBasePercentual";

// 🔹 Opções de "Atualização de valor" (só modo porcentagem). Modelos antigos
// com "modelo"/"gasto" (as duas opções de "fixar" de antes, que já se
// comportavam igual) aparecem como "fixo" — só "dinamico" é recalculado.
const OPCOES_FIXACAO = [
  { key: "dinamico", label: "Recalcular quando as entradas mudarem" },
  { key: "fixo", label: "Manter o valor calculado na hora de gerar" },
];

const FormularioModelo = ({ tipo, onSave, initialData, onCancel }) => {
  const { categorias } = useCategorias();
  const { membros } = useMembros();
  // 🔹 Base de cálculo do modo porcentagem = modelos de entrada (estáveis
  // entre meses) — ver utils/basePercentual.js.
  const { modelos: modelosEntrada, loading: loadingModelosEntrada } =
    useModelos("entrada");

  const [descricao, setDescricao] = useState("");
  // 🔹 Valor monetário edita via CampoMonetario (número, mesmo componente
  // usado em todo o resto do app); porcentagem é um campo numérico solto,
  // sem relação com o padrão monetário — não faz sentido unificar os dois.
  const [valorMonetario, setValorMonetario] = useState(0);
  const [valorPercentual, setValorPercentual] = useState("");
  const [categoria, setCategoria] = useState(null);
  const [dia, setDia] = useState("");
  const [membro, setMembro] = useState(null);
  const [modoCalculo, setModoCalculo] = useState("valor");
  const [baseModelosEntrada, setBaseModelosEntrada] = useState([]);
  const [baseIncluiAvulsas, setBaseIncluiAvulsas] = useState(false);
  const [fixacao, setFixacao] = useState("dinamico");
  const [miniModalEntradas, setMiniModalEntradas] = useState(false);
  const [erros, setErros] = useState({});

  // 🔄 Preenche ao editar
  useEffect(() => {
    if (initialData) {
      setDescricao(initialData.descricao || "");
      if (initialData?.modoCalculo === "porcentagem") {
        setValorPercentual(String(initialData.valor ?? ""));
        setValorMonetario(0);
      } else {
        setValorPercentual("");
        setValorMonetario(Number(initialData.valor) || 0);
      }
      if (initialData.categoriaId) {
        setCategoria(
          categorias.find((c) => c.id === initialData.categoriaId) || {
            nome: initialData.categoriaNome || initialData.categoria,
          }
        );
      } else if (initialData.categoria) {
        setCategoria({ nome: initialData.categoria });
      } else {
        setCategoria(null);
      }
      setDia(String(initialData.diaVencimento || initialData.diaDoMes || ""));
      // 🔹 Resolve o Membro completo (com avatar) a partir de membroId
      // quando existir — mesmo padrão de categoriaId acima. Lançamentos
      // antigos (só `membro` string, sem membroId) caem para um objeto
      // sintético só com o nome, sem `id` (ver SPRINT5_DISCOVERY.md 4.3.3).
      if (initialData?.membroId) {
        setMembro(
          membros.find((m) => m.id === initialData.membroId) || {
            id: null,
            nome: initialData.membroNome || initialData.membro,
          }
        );
      } else if (initialData?.membro) {
        setMembro({ id: null, nome: initialData.membro });
      } else {
        setMembro(null);
      }
      setModoCalculo(initialData.modoCalculo || "valor");
      setFixacao(
        initialData.fixacao && initialData.fixacao !== "dinamico" ? "fixo" : "dinamico"
      );
      // Modelo antigo ainda não convertido (ver utils/migrarBasePercentual.js)
      // abre sem base marcada — o usuário resseleciona.
      setBaseModelosEntrada(initialData.baseModelosEntrada || []);
      setBaseIncluiAvulsas(initialData.baseIncluiAvulsas === true);
    } else {
      setDescricao("");
      setValorPercentual("");
      setValorMonetario(0);
      setCategoria(null);
      setDia("");
      setMembro(null);
      setModoCalculo("valor");
      setFixacao("dinamico");
      setBaseModelosEntrada([]);
      setBaseIncluiAvulsas(false);
    }

    setErros({});
  }, [initialData]);

  // ✅ Validação
  const validarCampos = () => {
    const novosErros = {};
    const valorNum =
      modoCalculo === "porcentagem"
        ? parseFloat(String(valorPercentual).replace(",", ".")) || 0
        : Number(valorMonetario) || 0;

    const diaNum = parseInt(dia, 10);

    if (!descricao.trim()) novosErros.descricao = "A descrição é obrigatória.";

    if (modoCalculo === "valor" && valorNum <= 0) {
      novosErros.valor = "O valor deve ser maior que zero.";
    }

    if (modoCalculo === "porcentagem" && (valorNum <= 0 || valorNum > 100)) {
      novosErros.valor = "A porcentagem deve estar entre 1 e 100.";
    }

    // Sem base, o gasto seria gerado sempre zerado.
    if (
      modoCalculo === "porcentagem" &&
      baseModelosEntrada.length === 0 &&
      !baseIncluiAvulsas
    ) {
      novosErros.base = "Escolha ao menos uma entrada para a base de cálculo.";
    }

    if (!dia || isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      novosErros.dia = "O dia deve ser um número entre 1 e 31.";
    }

    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  // 💾 Salvar
  const handleSalvar = () => {
    if (!validarCampos()) return;

    const modelo = {
      descricao: descricao.trim(),
      valor:
        modoCalculo === "porcentagem"
          ? parseFloat(String(valorPercentual).replace(",", ".")) || 0
          : Number(valorMonetario) || 0,
      // 🔹 categoria (string) mantida por compatibilidade com exibição
      // existente; categoriaId/categoriaNome são a referência estável para
      // Metas/Relatórios futuros (ver SPRINT4_DISCOVERY.md).
      categoria: categoria?.nome || "Outros",
      categoriaId: categoria?.id || null,
      categoriaNome: categoria?.nome || null,
      ativo: true,
      // 🔹 membro (string) mantido por compatibilidade; membroId/membroNome
      // são a referência estável (mesmo padrão de categoriaId, ver
      // SPRINT5_DISCOVERY.md seção 4.3.3) — membroId fica null quando o
      // nome foi digitado livremente, sem cadastro prévio.
      membro: membro?.nome || null,
      membroId: membro?.id || null,
      membroNome: membro?.nome || null,
      modoCalculo,
      diaVencimento: Number(dia),
      fixacao,
      // 🔹 `entradasSelecionadas` (base antiga) não é mais gravado — o
      // updateDoc preserva o valor antigo em modelos já existentes.
      ...(modoCalculo === "porcentagem" && {
        baseModelosEntrada,
        baseIncluiAvulsas,
      }),
    };

    onSave(modelo);
  };

  const limparErroBase = () => {
    if (erros.base) setErros((prev) => ({ ...prev, base: null }));
  };

  const toggleModeloEntrada = (id) => {
    limparErroBase();
    setBaseModelosEntrada((atuais) =>
      atuais.includes(id) ? atuais.filter((e) => e !== id) : [...atuais, id]
    );
  };

  const toggleAvulsas = () => {
    limparErroBase();
    setBaseIncluiAvulsas((atual) => !atual);
  };

  const todasMarcadas =
    baseIncluiAvulsas &&
    modelosEntrada.every((m) => baseModelosEntrada.includes(m.id));

  const toggleTodas = () => {
    limparErroBase();
    setBaseModelosEntrada(todasMarcadas ? [] : modelosEntrada.map((m) => m.id));
    setBaseIncluiAvulsas(!todasMarcadas);
  };

  // 🧮 Texto com nomes da base selecionada
  const getTextoSelecionadas = () => {
    const nomes = modelosEntrada
      .filter((m) => baseModelosEntrada.includes(m.id))
      .map((m) => m.descricao);
    if (baseIncluiAvulsas) nomes.push("Entradas avulsas");

    if (!nomes.length) return "Selecionar Entradas";
    if (nomes.length <= 2) return nomes.join(", ");
    return `${nomes.slice(0, 2).join(", ")} e +${nomes.length - 2}`;
  };

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
          if (erros.descricao) {
            setErros((prev) => ({ ...prev, descricao: null }));
          }
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
            setActiveTab={setModoCalculo}
            backgroundColor="transparent"
          />
        </View>
      )}

      {/* Valor */}
      {modoCalculo === "porcentagem" ? (
        <TextInput
          placeholder="Porcentagem (%) *"
          value={valorPercentual}
          onChangeText={(t) => {
            setValorPercentual(t.replace(/[^0-9.,]/g, ""));
            if (erros.valor) {
              setErros((prev) => ({ ...prev, valor: null }));
            }
          }}
          keyboardType="decimal-pad"
          placeholderTextColor={colors.textSecondary}
          style={[
            globalStyles.input,
            erros.valor && globalStyles.inputError,
            tipo === "entrada" && { marginTop: 12 },
          ]}
        />
      ) : (
        // 🔹 Mesmo componente de entrada monetária usado em todo o app —
        // antes daqui era uma máscara própria (formatarMoeda/desformatarMoeda),
        // achado numa auditoria pedida pelo usuário (ver ARQUITETURA.md).
        <CampoMonetario
          placeholder="Valor *"
          valor={valorMonetario}
          onChange={(v) => {
            setValorMonetario(v);
            if (erros.valor) {
              setErros((prev) => ({ ...prev, valor: null }));
            }
          }}
          style={{ marginBottom: 0 }}
          textInputStyle={[
            erros.valor && globalStyles.inputError,
            tipo === "entrada" && { marginTop: 12 },
          ]}
        />
      )}
      {erros.valor && (
        <Text style={globalStyles.errorMessage}>{erros.valor}</Text>
      )}

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
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
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
            {erros.base && (
              <Text style={globalStyles.errorMessage}>{erros.base}</Text>
            )}
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

            {OPCOES_FIXACAO.map((op) => (
              <TouchableOpacity
                key={op.key}
                onPress={() => setFixacao(op.key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 6,
                }}
              >
                <MaterialCommunityIcons
                  name={
                    fixacao === op.key ? "radiobox-marked" : "radiobox-blank"
                  }
                  size={20}
                  color={colors.primary}
                />
                <Text style={{ marginLeft: 6, color: colors.textPrimary }}>
                  {op.label}
                </Text>
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
                  <Text
                    style={{
                      color: colors.textPrimary,
                      fontSize: 18,
                      fontWeight: "600",
                    }}
                  >
                    Selecionar Entradas
                  </Text>

                  <TouchableOpacity
                    onPress={() => setMiniModalEntradas(false)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={22}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {loadingModelosEntrada ? (
                  <ActivityIndicator
                    color={colors.primary}
                    style={{ marginTop: 20 }}
                  />
                ) : (
                  <ScrollView
                    style={{ marginTop: 12 }}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                  >
                    <TouchableOpacity
                      onPress={toggleTodas}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={
                          todasMarcadas
                            ? "checkbox-marked"
                            : "checkbox-blank-outline"
                        }
                        size={20}
                        color={colors.primary}
                      />
                      <Text
                        style={{ marginLeft: 6, color: colors.textPrimary }}
                      >
                        Selecionar todas
                      </Text>
                    </TouchableOpacity>

                    {modelosEntrada.map((modeloEntrada) => (
                      <TouchableOpacity
                        key={modeloEntrada.id}
                        onPress={() => toggleModeloEntrada(modeloEntrada.id)}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 6,
                        }}
                      >
                        <MaterialCommunityIcons
                          name={
                            baseModelosEntrada.includes(modeloEntrada.id)
                              ? "checkbox-marked"
                              : "checkbox-blank-outline"
                          }
                          size={20}
                          color={colors.primary}
                        />
                        <Text
                          style={{ marginLeft: 6, color: colors.textPrimary, flexShrink: 1 }}
                        >
                          {/* Sem valor: o do modelo pode ser diferente do da
                              entrada do mês (editada depois de gerada), que é
                              o que entra de fato na conta. */}
                          {modeloEntrada.descricao}
                          {modeloEntrada.membroNome || modeloEntrada.membro
                            ? ` (${modeloEntrada.membroNome || modeloEntrada.membro})`
                            : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    {/* Entradas lançadas à mão, fora dos modelos — soma
                        todas as do mês, qualquer que seja o mês */}
                    <TouchableOpacity
                      onPress={toggleAvulsas}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: 6,
                        marginTop: 4,
                        borderTopWidth: 1,
                        borderTopColor: colors.border,
                        paddingTop: 10,
                      }}
                    >
                      <MaterialCommunityIcons
                        name={
                          baseIncluiAvulsas
                            ? "checkbox-marked"
                            : "checkbox-blank-outline"
                        }
                        size={20}
                        color={colors.primary}
                      />
                      <View style={{ marginLeft: 6, flexShrink: 1 }}>
                        <Text style={{ color: colors.textPrimary }}>
                          Entradas avulsas do mês
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                          Tudo que você lançar à mão, fora dos modelos
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </ScrollView>
                )}

                <TouchableOpacity
                  onPress={() => setMiniModalEntradas(false)}
                  style={[
                    globalStyles.saveButton,
                    { marginTop: 10, paddingVertical: 10, borderRadius: 10 },
                  ]}
                >
                  <Text style={globalStyles.saveButtonText}>
                    Confirmar Seleção
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </>
      )}

      {/* Categoria */}
      <View style={{ marginTop: 12, marginBottom: 12 }}>
        <CategoriaSelect
          categoria={categoria}
          onSelecionar={setCategoria}
          tipoTransacao={tipo === "gasto" ? "despesa" : "receita"}
        />
      </View>

      {/* Membro (entradas apenas) */}
      {tipo === "entrada" && (
        <MembroSelect
          membroSelecionado={membro}
          onSelecionar={(m) => setMembro(m)}
          mostrarLabel={false}
        />
      )}

      {/* Dia */}
      <TextInput
        placeholder={
          tipo === "gasto" ? "Dia do Vencimento *" : "Dia do Recebimento *"
        }
        value={dia}
        onChangeText={(t) => {
          setDia(t);

          if (erros.dia) {
            setErros((prev) => ({ ...prev, dia: null }));
          }
        }}
        keyboardType="number-pad"
        maxLength={2}
        placeholderTextColor={colors.textSecondary}
        style={[globalStyles.input, erros.dia && globalStyles.inputError, { marginTop: 12 }]}
      />
      {erros.dia && <Text style={globalStyles.errorMessage}>{erros.dia}</Text>}

      {/* Botões */}
      <TouchableOpacity
        onPress={handleSalvar}
        style={[globalStyles.saveButton, { marginTop: 24 }]}
      >
        <Text style={globalStyles.saveButtonText}>Salvar Modelo</Text>
      </TouchableOpacity>

      {initialData && (
        <TouchableOpacity
          onPress={onCancel}
          style={{ marginTop: 12, alignItems: "center" }}
        >
          <Text style={{ color: colors.textSecondary }}>Cancelar Edição</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
};

// MODAL PRINCIPAL
export default function GerenciarModelosModal({
  visible,
  onClose,
  tipo = "gasto",
  // 🔹 Do useGastos/useEntradas da tela dona (mesma função do "Gerar do
  // Mês") — usado para oferecer lançar um modelo recém-criado no mês na hora.
  gerarFixosDoMes,
}) {
  const { modelos, loading, addModelo, updateModelo, deleteModelo } =
    useModelos(tipo);
  const { getFormattedDate } = useDateFilter();
  const { user } = useAuth();

  // 🔹 Converte modelos em porcentagem ainda na base antiga assim que o
  // usuário abre os modelos de gasto — o formulário já abre com a base nova
  // marcada (ver utils/migrarBasePercentual.js). O listener de useModelos
  // recebe a atualização sozinho.
  useEffect(() => {
    if (!visible || tipo !== "gasto" || !user?.uid) return;
    migrarBasesPercentuaisLegadas(getBasePath(user)).catch((err) =>
      console.error("Erro ao converter base percentual:", err)
    );
  }, [visible, tipo, user?.uid]);

  const [editingItem, setEditingItem] = useState(null);
  const [abaAtiva, setAbaAtiva] = useState("modelos");
  const [alerta, setAlerta] = useState({ visivel: false });

  const fecharAlerta = () => setAlerta({ visivel: false });

  const lancarNoMes = async (modeloId) => {
    fecharAlerta();
    const { status } = await gerarFixosDoMes([modeloId]);
    // NADA_PENDENTE aqui = já existe um lançamento com a mesma descrição no
    // mês (dado antigo, ver utils/modelosPendentes.js) — nada a fazer.
    if (status === "SUCESSO" || status === "NADA_PENDENTE") return;
    setAlerta({
      visivel: true,
      titulo: "Erro",
      mensagem:
        'O modelo foi salvo, mas não foi possível lançá-lo neste mês. Use "Gerar do Mês" para tentar de novo.',
      icone: "alert-circle-outline",
      corIcone: colors.error,
    });
  };

  const perguntarLancarNoMes = (modeloId, descricao) =>
    setAlerta({
      visivel: true,
      titulo: "Modelo salvo!",
      mensagem: `Deseja lançar "${descricao}" também em ${getFormattedDate("full")}?`,
      icone: "calendar-plus",
      corIcone: colors.primary,
      botoes: [
        { texto: "Não", onPress: fecharAlerta },
        { texto: "Sim", onPress: () => lancarNoMes(modeloId) },
      ],
    });

  const handleSave = async (modelo) => {
    try {
      if (editingItem) {
        await updateModelo(editingItem.id, modelo);
      } else {
        const novoId = await addModelo(modelo);
        if (gerarFixosDoMes) perguntarLancarNoMes(novoId, modelo.descricao);
      }

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
        {
          texto: "Cancelar",
          onPress: () => setAlerta({ visivel: false }),
        },
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={globalStyles.fullScreenModalOverlay}>
        <View style={globalStyles.managementModalContainer}>
          {/* Cabeçalho */}
          <View style={globalStyles.managementModalHeader}>
            <Text style={globalStyles.managementModalTitle}>
              Modelos de {tipo === "gasto" ? "Gastos Fixos" : "Entradas"}
            </Text>

            <TouchableOpacity onPress={handleClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          </View>

          {/* Abas */}
          <View style={{ backgroundColor: "transparent", marginBottom: 8 }}>
            <ModernTabs
              compact
              tabs={[
                { key: "modelos", label: "Modelos", icon: "view-list" },
                {
                  key: "novo",
                  label: editingItem ? "Editar" : "Novo",
                  icon: "plus-circle-outline",
                },
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
                    <Text style={globalStyles.modeloItemDescricao}>
                      {item.descricao}
                    </Text>
                    <Text style={globalStyles.modeloItemDetalhes}>
                      {item.modoCalculo === "porcentagem"
                        ? `${Number(item.valor || 0).toFixed(2)}%`
                        : `R$ ${Number(item.valor || 0).toFixed(2)}`}{" "}
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
                      <MaterialCommunityIcons
                        name="pencil-outline"
                        size={22}
                        color={colors.primary}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleDeletar(item)}
                      style={{ padding: 4, marginLeft: 8 }}
                    >
                      <MaterialCommunityIcons
                        name="trash-can-outline"
                        size={22}
                        color={colors.error}
                      />
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
      <AlertaModal
        {...alerta}
        visible={alerta.visivel}
        onClose={fecharAlerta}
      />
    </Modal>
  );
}