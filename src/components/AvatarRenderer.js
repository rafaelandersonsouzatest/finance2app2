// src/components/AvatarRenderer.js
// Componente único de apresentação do avatar — usado tanto no Perfil quanto
// em Membros (Sprint 5, ver SPRINT5_DISCOVERY.md seção 5). Não conhece o
// motor de geração: só chama `renderizarAvatarSvg`/`getIniciais` de
// `utils/avatar.js`. Trocar o motor de geração no futuro não exige tocar
// neste arquivo nem em quem o consome. Renomeado de `Avatar.js` para
// `AvatarRenderer.js` ao introduzir o `AvatarEditor.js` — o editor altera
// o objeto de configuração, este componente só desenha o resultado.
import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { SvgXml } from "react-native-svg";
import { renderizarAvatarSvg, getIniciais } from "../utils/avatar";
import { colors } from "../styles/colors";

// 🔹 Presets de tamanho por variante — a única diferença visual entre elas.
// Novas variantes (ex.: "profileGrande") entram aqui, sem criar outro
// componente.
const TAMANHOS = {
  mini: 24,
  circle: 48,
  profile: 96,
};

export default function AvatarRenderer({ avatar, nome, variante = "circle", tamanho }) {
  const tamanhoFinal = tamanho || TAMANHOS[variante] || TAMANHOS.circle;

  const svg = useMemo(() => renderizarAvatarSvg(avatar), [avatar]);

  const estiloContainer = [
    styles.container,
    {
      width: tamanhoFinal,
      height: tamanhoFinal,
      borderRadius: tamanhoFinal / 2,
    },
  ];

  if (svg) {
    return (
      <View style={estiloContainer}>
        <SvgXml xml={svg} width={tamanhoFinal} height={tamanhoFinal} />
      </View>
    );
  }

  // 🔹 Fallback: iniciais, enquanto não houver avatar gerado (dado legado).
  return (
    <View style={[estiloContainer, styles.fallback]}>
      <Text style={[styles.iniciais, { fontSize: tamanhoFinal * 0.4 }]}>
        {getIniciais(nome)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fallback: {
    backgroundColor: colors.primary,
  },
  iniciais: {
    color: "#fff",
    fontWeight: "700",
  },
});
