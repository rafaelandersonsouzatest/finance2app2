// src/components/ContaCriadaModal.js
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from "react-native";
import Modal from "react-native-modal";
import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { colors } from "../styles/colors";
import { globalStyles } from "../styles/globalStyles";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const CONFETTI_COLORS = [
  "#4FC3F7",
  "#81C784",
  "#AB47BC",
  "#FF8A65",
  "#FFD93D",
];

export const ContaCriadaModal = ({
  visivel,
  nomeUsuario = "",
  onFechar,
  onTutorial,
  onAtualizarPerfil,
}) => {

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(40)).current;

  const glowScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.3)).current;
  const burstScale = useRef(new Animated.Value(0)).current;

  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsScale = useRef(new Animated.Value(0.8)).current;

  // CONFETTI
  const confetti = Array.from({ length: 18 }).map(() => ({
    x: new Animated.Value(Math.random() * SCREEN_WIDTH - SCREEN_WIDTH / 2),
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

    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowScale, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(glowScale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 0.6, duration: 900, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.3, duration: 900, useNativeDriver: true }),
      ])
    ).start();

    Animated.timing(burstScale, {
      toValue: 1.4,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(buttonsOpacity, { toValue: 1, delay: 350, duration: 400, useNativeDriver: true }),
      Animated.timing(buttonsScale, { toValue: 1, delay: 350, duration: 400, useNativeDriver: true }),
    ]).start();

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
  // usa o backdrop do próprio modal para escurecer o fundo
  backdropColor={colors.cardBackground || "rgba(18,18,18,0.9)"} 
  backdropOpacity={0.97} 
  style={{ margin: 0, justifyContent: "center", alignItems: "center" }}
  onBackdropPress={onFechar}
>
      {/* FUNDO COM BLUR */}
      <BlurView
        intensity={65}
        tint="dark"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      />

      {/* CAIXA DO MODAL */}
      <Animated.View
        style={[
          globalStyles.modalBox,
          {
            width: "85%",
            opacity: fade,
            transform: [{ translateY: slide }],
            alignItems: "center",
            padding: 28,
            borderRadius: 22,
            backgroundColor: colors.background,
            // ⭐ SOMBRA 3D
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 30,
          },
        ]}
      >
        {/* CONFETTI */}
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
                 {
                   rotate: c.rot.interpolate({
                     inputRange: [0, 360],
                     outputRange: ["0deg", "360deg"],
                   }),
                 },
               ],
             }}
           />
         ))}

        {/* BURST */}
        <Animated.View
          style={{
            position: "absolute",
            width: 170,
            height: 170,
            backgroundColor: colors.primary + "22",
            borderRadius: 999,
            transform: [{ scale: burstScale }],
          }}
        />

        {/* GLOW */}
        <Animated.View
          style={{
            width: 130,
            height: 130,
            backgroundColor: colors.primary + "33",
            borderRadius: 999,
            justifyContent: "center",
            alignItems: "center",
            opacity: glowOpacity,
            transform: [{ scale: glowScale }],
          }}
        />

        {/* CORUJA PNG */}
        <View style={{ marginTop: -140, marginBottom: -10 }}>
          <Image
            source={require("../../assets/coruja-teste.png")}
            style={{ width: 150, height: 150, resizeMode: "contain" }}
          />
        </View>

        {/* TÍTULO */}
        <Text style={globalStyles.screenTitle}>Conta criada com sucesso!</Text>

        {/* TEXTO BOAS-VINDAS */}
        <Text style={[globalStyles.text, { textAlign: "center", marginBottom: 22 }]}>
          Seja bem-vindo(a)
          {nomeUsuario ? (
            <> <Text style={{ color: colors.primary }}>{nomeUsuario}</Text>!</>
          ) : "!"}
        </Text>

        {/* BOTÕES LADO A LADO */}
        <Animated.View
          style={{
            width: "100%",
            flexDirection: "row",
            justifyContent: "space-between",
            opacity: buttonsOpacity,
            transform: [{ scale: buttonsScale }],
            marginTop: 10,
          }}
        >
          <TouchableOpacity
            style={[
              globalStyles.saveButton,
              { flex: 1, marginRight: 6, flexDirection: "row", justifyContent: "center", alignItems: "center" },
            ]}
            onPress={() => {
                onTutorial();
                onAtualizarPerfil && onAtualizarPerfil();
                }}

          >
            <MaterialIcons name="school" size={20} color="#fff" />
            <Text style={globalStyles.saveButtonText}> Conhecer Funcionalidades</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              globalStyles.cancelButton,
              { flex: 1, marginLeft: 6, flexDirection: "row", justifyContent: "center", alignItems: "center" },
            ]}
            onPress={() => {
                onFechar();
                onAtualizarPerfil && onAtualizarPerfil();
                }}

          >
            <MaterialIcons name="login" size={20} color="#fff" />
            <Text style={globalStyles.cancelButtonText}> Conhecer Depois</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};
