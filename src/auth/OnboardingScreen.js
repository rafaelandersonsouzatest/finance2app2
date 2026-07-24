import React, { useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { colors } from "../styles/colors";
import { useAuth } from "./useAuth"; // IMPORTANTE
import { db } from "../config/firebase"; // IMPORTANTE
import { doc, setDoc } from "firebase/firestore"; // IMPORTANTE

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    titulo: "Organize suas finanças",
    texto: "Registre entradas, gastos e saiba sempre para onde o seu dinheiro está indo.",
    imagem: require("../../assets/onboarding1.png"),
  },
  {
    titulo: "Categorias visuais",
    texto: "Gráficos simples e claros para analisar seus hábitos financeiros.",
    imagem: require("../../assets/onboarding2.png"),
  },
  {
    titulo: "Controle total",
    texto: "Planeje seu mês, defina metas e evolua sua vida financeira.",
    imagem: require("../../assets/onboarding3.png"),
  },
];

export default function OnboardingScreen({ onFinish }) {
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const { user } = useAuth(); // pegar usuário atual

  const concluir = async () => {
    // 🔥 Atualiza Firestore: agora sim viu o onboarding
    try {
      const ref = doc(db, "users", user.uid);
      await setDoc(ref, { jaViuOnboarding: true }, { merge: true });
    } catch (err) {
      console.log("Erro ao marcar jaViuOnboarding:", err);
    }

    onFinish();
  };

  const next = () => {
    if (isLast) {
      concluir();
    } else {
      setIndex((prev) => prev + 1);
    }
  };

  return (
    <View style={styles.container}>
      {!isLast && (
        <TouchableOpacity style={styles.skipButton} onPress={concluir}>
          <Text style={styles.skipButtonText}>Pular</Text>
        </TouchableOpacity>
      )}

      <Image
        source={SLIDES[index].imagem}
        style={styles.image}
        resizeMode="contain"
      />

      <Text style={styles.title}>{SLIDES[index].titulo}</Text>

      <Text style={styles.text}>{SLIDES[index].texto}</Text>

      <View style={styles.dotsContainer}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === index && styles.dotActive]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={next}>
        <Text style={styles.buttonText}>
          {isLast ? "Concluir" : "Próximo"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },

  skipButton: {
    position: "absolute",
    top: 50,
    right: 24,
    zIndex: 1,
  },

  skipButtonText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },

  image: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 40,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: 12,
  },

  text: {
    fontSize: 16,
    textAlign: "center",
    color: colors.textSecondary,
    paddingHorizontal: 12,
    marginBottom: 30,
  },

  dotsContainer: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 40,
  },

  dot: {
    width: 10,
    height: 10,
    backgroundColor: "#d0d0d0",
    borderRadius: 10,
  },

  dotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },

  button: {
    width: "80%",
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
