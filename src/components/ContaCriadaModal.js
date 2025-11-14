import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import Modal from "react-native-modal";
import { MaterialIcons } from "@expo/vector-icons";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Paleta multicolorida p/ confetes
const CONFETTI_COLORS = [
  "#FF6B6B",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#BD4EC6",
];

export const ContaCriadaModal = ({
  visivel,
  nomeUsuario = "",
  onFechar,
  onTutorial,
}) => {
  // ========= ANIMAÇÕES GERAIS =========
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  // ========= CHECK ICON + GLOW =========
  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const burstScale = useRef(new Animated.Value(0)).current;

  // ========= BOTÕES =========
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsScale = useRef(new Animated.Value(0.8)).current;

  // ========= CONFETES =========
  const confetti = Array.from({ length: 18 }).map(() => ({
    x: new Animated.Value(Math.random() * SCREEN_WIDTH),
    y: new Animated.Value(-Math.random() * 200),
    rot: new Animated.Value(Math.random() * 360),
    size: 6 + Math.random() * 10,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
  }));

  const startAnimations = () => {
    fade.setValue(0);
    slide.setValue(40);

    glowScale.setValue(1);
    glowOpacity.setValue(0.3);
    burstScale.setValue(0);

    buttonsOpacity.setValue(0);
    buttonsScale.setValue(0.8);

    // ==== Entrada do modal ====
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slide, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // ==== Glow pulsante ====
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, {
          toValue: 1.15,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 0.3,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // ==== Burst atrás do check ====
    Animated.timing(burstScale, {
      toValue: 1.4,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // ==== Botões ====
    Animated.parallel([
      Animated.timing(buttonsOpacity, {
        toValue: 1,
        delay: 350,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(buttonsScale, {
        toValue: 1,
        delay: 350,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // ==== CONFETES ====
    confetti.forEach((c) => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(c.y, {
            toValue: SCREEN_HEIGHT + 50,
            duration: 3500 + Math.random() * 1500,
            useNativeDriver: true,
          }),
          Animated.timing(c.rot, {
            toValue: Math.random() * 360,
            duration: 4000,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(c.x, {
              toValue: c.x.__getValue() + (Math.random() * 40 - 20),
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(c.x, {
              toValue: c.x.__getValue() + (Math.random() * 40 - 20),
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    });
  };

  useEffect(() => {
    if (visivel) startAnimations();
  }, [visivel]);

  return (
    <Modal
      isVisible={visivel}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.7}
      useNativeDriver
      style={{ justifyContent: "center", alignItems: "center", margin: 0 }}
      onBackdropPress={onFechar}
    >
      <Animated.View
        style={[
          styles.container,
          { opacity: fade, transform: [{ translateY: slide }] },
        ]}
      >
        {/* CONFETES */}
        {confetti.map((c, i) => (
          <Animated.View
            key={i}
            style={{
              width: c.size,
              height: c.size * 1.3,
              backgroundColor: c.color,
              borderRadius: 2,
              position: "absolute",
              top: -100,
              transform: [
                { translateX: c.x },
                { translateY: c.y },
                { rotate: c.rot.interpolate({
                    inputRange: [0, 360],
                    outputRange: ["0deg", "360deg"],
                })},
              ],
            }}
          />
        ))}

        {/* BURST */}
        <Animated.View
          style={{
            position: "absolute",
            width: 160,
            height: 160,
            backgroundColor: colors.primary + "33",
            borderRadius: 999,
            transform: [{ scale: burstScale }],
          }}
        />

        {/* ICON + GLOW */}
        <Animated.View
          style={{
            width: 120,
            height: 120,
            backgroundColor: colors.primary + "33",
            borderRadius: 999,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: 10,
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />

        <MaterialIcons name="check-circle" size={110} color={colors.primary} style={{ marginTop: -130 }} />

        {/* TITULO */}
        <Text style={styles.title}>Conta criada com sucesso!</Text>

        {/* NOME */}
        <Text style={styles.sub}>
          Seja bem-vindo(a)
          {nomeUsuario ? (
            <> <Text style={{ color: colors.primary }}>{nomeUsuario}</Text>!</>
          ) : "!"}
        </Text>

        {/* BOTÕES */}
        <Animated.View
          style={{
            width: "100%",
            gap: 12,
            opacity: buttonsOpacity,
            transform: [{ scale: buttonsScale }],
          }}
        >
          <TouchableOpacity style={styles.btnPrimary} onPress={onTutorial}>
            <MaterialIcons name="school" size={20} color="#fff" />
            <Text style={styles.btnText}>Conhecer funcionalidades</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnSecondary} onPress={onFechar}>
            <MaterialIcons name="login" size={20} color="#fff" />
            <Text style={styles.btnText}>Conhecer depois</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    padding: 28,
    width: "85%",
    borderRadius: 20,
    alignItems: "center",
    overflow: "hidden",
  },

  title: {
    fontSize: 20,
    color: colors.textPrimary,
    marginTop: -10,
    textAlign: "center",
    fontWeight: "600",
  },

  sub: {
    marginTop: 8,
    fontSize: 15,
    textAlign: "center",
    color: colors.textSecondary,
    marginBottom: 20,
  },

  btnPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  btnSecondary: {
    backgroundColor: colors.textSecondary,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
});
