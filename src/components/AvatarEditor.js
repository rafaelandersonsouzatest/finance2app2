// src/components/AvatarEditor.js
// Editor de avatar por seções/abas (Sprint 5). Só altera o objeto de
// configuração já existente; quem desenha o resultado é sempre o
// `AvatarRenderer.js` (nunca este arquivo). Não conhece o motor de geração
// (DiceBear) diretamente — toda a lógica de categorias/seções vem de
// `utils/avatar.js`, então trocar de motor no futuro, ou adicionar uma
// categoria nova, não exige tocar aqui: nenhuma condicional específica de
// estilo existe neste arquivo, só laços sobre o que `utils/avatar.js`
// devolve.
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import Modal from "react-native-modal";
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { SvgXml } from "react-native-svg";
import { globalStyles } from "../styles/globalStyles";
import { colors } from "../styles/colors";
import {
  gerarAvatarPadrao,
  gerarAvatarAleatorio,
  listarSecoesEditaveis,
  listarCategoriasEditaveis,
  aplicarEdicaoAvatar,
  renderizarPreviaCategoria,
} from "../utils/avatar";
import AvatarRenderer from "./AvatarRenderer";

const TAMANHO_PREVIA = 44;

// 🔹 Uma opção da categoria "cor" — swatch simples, sem depender do motor.
function OpcaoCor({ valor, selecionada, onPress }) {
  const transparente = valor === "transparente";
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 10, alignItems: "center" }}>
      <View
        style={{
          width: TAMANHO_PREVIA,
          height: TAMANHO_PREVIA,
          borderRadius: TAMANHO_PREVIA / 2,
          backgroundColor: transparente ? colors.cardBackground : valor,
          borderWidth: selecionada ? 3 : 1,
          borderColor: selecionada ? colors.primary : colors.borderLight,
          borderStyle: transparente ? "dashed" : "solid",
        }}
      />
    </TouchableOpacity>
  );
}

// 🔹 Uma opção da categoria "variante" — mini prévia do avatar inteiro com
// essa variante aplicada, para o usuário ver o resultado antes de escolher.
function OpcaoVariante({ avatarBase, categoriaChave, valor, selecionada, onPress }) {
  const svg = renderizarPreviaCategoria(avatarBase, categoriaChave, valor);
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 10, alignItems: "center" }}>
      <View
        style={{
          width: TAMANHO_PREVIA,
          height: TAMANHO_PREVIA,
          borderRadius: TAMANHO_PREVIA / 2,
          overflow: "hidden",
          borderWidth: selecionada ? 3 : 1,
          borderColor: selecionada ? colors.primary : colors.borderLight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {svg ? (
          <SvgXml xml={svg} width={TAMANHO_PREVIA} height={TAMANHO_PREVIA} />
        ) : (
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>?</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// 🔹 Aba de seção — ícone + rótulo, sem nenhuma referência a categorias
// específicas.
function AbaSecao({ secao, ativa, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        alignItems: "center",
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginRight: 6,
        borderRadius: 10,
        backgroundColor: ativa ? colors.primary + "22" : "transparent",
      }}
    >
      <MaterialCommunityIcons
        name={secao.icone}
        size={20}
        color={ativa ? colors.primary : colors.textSecondary}
      />
      <Text
        style={{
          marginTop: 2,
          fontSize: 11,
          color: ativa ? colors.primary : colors.textSecondary,
          fontWeight: ativa ? "700" : "400",
        }}
      >
        {secao.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function AvatarEditor({
  visivel,
  onFechar,
  avatarAtual,
  seedPadrao,
  nome,
  aoSalvar,
}) {
  const [avatarEmEdicao, setAvatarEmEdicao] = useState(null);
  const [secaoAtiva, setSecaoAtiva] = useState(null);
  const [salvando, setSalvando] = useState(false);

  // 🔹 Só recarrega o estado local ao abrir o editor — mesmo princípio já
  // usado em ModalEdicao.js ("atualiza só ao abrir, não a cada re-render").
  useEffect(() => {
    if (!visivel) return;
    const inicial = avatarAtual || gerarAvatarPadrao(seedPadrao);
    setAvatarEmEdicao(inicial);
    setSecaoAtiva(listarSecoesEditaveis(inicial)[0]?.chave || null);
  }, [visivel]);

  if (!avatarEmEdicao) return null;

  const secoes = listarSecoesEditaveis(avatarEmEdicao);
  const secaoInfo = secoes.find((s) => s.chave === secaoAtiva) || secoes[0];
  const categoriasDaSecao = listarCategoriasEditaveis(avatarEmEdicao).filter(
    (c) => c.secao === secaoInfo?.chave
  );

  const handleSalvar = async () => {
    try {
      setSalvando(true);
      await aoSalvar(avatarEmEdicao);
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Modal
      isVisible={visivel}
      onBackdropPress={onFechar}
      onBackButtonPress={onFechar}
      style={{ justifyContent: "flex-end", margin: 0 }}
    >
      <View style={[globalStyles.modalContainer, { maxHeight: "85%" }]}>
        <View style={globalStyles.modalHeader}>
          <Text style={globalStyles.modalTitle}>Editar avatar{nome ? ` de ${nome}` : ""}</Text>
          <TouchableOpacity onPress={onFechar}>
            <MaterialIcons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: "center", marginVertical: 16 }}>
          <AvatarRenderer avatar={avatarEmEdicao} nome={nome} tamanho={120} />
        </View>

        {/* 🔹 Abas — uma por seção; só as categorias da seção ativa são
            renderizadas abaixo, então trocar de aba já reduz bastante o
            que precisa ser desenhado de uma vez (nenhuma prévia de outra
            seção fica montada enquanto ela não está em foco). */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
          {secoes.map((secao) => (
            <AbaSecao
              key={secao.chave}
              secao={secao}
              ativa={secao.chave === secaoInfo?.chave}
              onPress={() => setSecaoAtiva(secao.chave)}
            />
          ))}
        </ScrollView>

        <ScrollView keyboardShouldPersistTaps="handled" style={{ marginTop: 12 }}>
          {!!secaoInfo?.descricao && (
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 14 }}>
              {secaoInfo.descricao}
            </Text>
          )}

          {categoriasDaSecao.map((categoria) => (
            <View key={categoria.chave} style={{ marginBottom: 18 }}>
              <Text style={[globalStyles.label, { marginBottom: 8 }]}>{categoria.label}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categoria.opcoes.map((valor) =>
                  categoria.tipo === "cor" ? (
                    <OpcaoCor
                      key={valor}
                      valor={valor}
                      selecionada={valor === categoria.valorSelecionado}
                      onPress={() =>
                        setAvatarEmEdicao((atual) => aplicarEdicaoAvatar(atual, categoria.chave, valor))
                      }
                    />
                  ) : (
                    <OpcaoVariante
                      key={valor}
                      avatarBase={avatarEmEdicao}
                      categoriaChave={categoria.chave}
                      valor={valor}
                      selecionada={valor === categoria.valorSelecionado}
                      onPress={() =>
                        setAvatarEmEdicao((atual) => aplicarEdicaoAvatar(atual, categoria.chave, valor))
                      }
                    />
                  )
                )}
              </ScrollView>
            </View>
          ))}

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
            <TouchableOpacity
              style={[globalStyles.modalBotaoAdd, { flex: 1, marginRight: 8 }]}
              onPress={() => setAvatarEmEdicao(gerarAvatarAleatorio())}
            >
              <MaterialIcons name="shuffle" size={18} color="#fff" />
              <Text style={globalStyles.modalBotaoAddTexto}>Gerar aleatório</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[globalStyles.modalBotaoAdd, { flex: 1, backgroundColor: colors.textSecondary }]}
              onPress={() => setAvatarEmEdicao(gerarAvatarPadrao(seedPadrao))}
            >
              <MaterialIcons name="restore" size={18} color="#fff" />
              <Text style={globalStyles.modalBotaoAddTexto}>Restaurar padrão</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[globalStyles.modalBotaoAdd, { marginTop: 12, backgroundColor: colors.primary }]}
            onPress={handleSalvar}
            disabled={salvando}
          >
            {salvando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="check" size={20} color="#fff" />
                <Text style={globalStyles.modalBotaoAddTexto}>Salvar</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );
}
