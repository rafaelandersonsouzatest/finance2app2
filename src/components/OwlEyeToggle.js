import React, { useState, useEffect, useRef } from "react";
import { TouchableOpacity, View, Animated, Easing } from "react-native";

export default function OwlEyeToggle({ onModeChange }) {
  const [mode, setMode] = useState(0); 
  // 0 = fechado, 1 = olho 1 aberto, 2 = dois olhos abertos

  const leftEye = useRef(new Animated.Value(0)).current;
  const rightEye = useRef(new Animated.Value(0)).current;

  const animateEyes = (left, right) => {
    Animated.parallel([
      Animated.timing(leftEye, {
        toValue: left,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
      Animated.timing(rightEye, {
        toValue: right,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }),
    ]).start();
  };

  const nextMode = () => {
    const newMode = (mode + 1) % 3;
    setMode(newMode);
    onModeChange(newMode);
  };

  useEffect(() => {
    if (mode === 0) {
      animateEyes(0, 0);
    } else if (mode === 1) {
      animateEyes(1, 0);
    } else {
      animateEyes(1, 1);
    }
  }, [mode]);

  const interpolateEye = (anim) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: ["2px", "10px"], // abertura vertical da pálpebra
    });

  return (
    <TouchableOpacity onPress={nextMode} style={{ flexDirection: "row", gap: 12 }}>
      {/* Olho Esquerdo */}
      <View
        style={{
          width: 28,
          height: 28,
          backgroundColor: "#333",
          borderRadius: 14,
          borderWidth: 2,
          borderColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            width: 10,
            height: interpolateEye(leftEye),
            backgroundColor: "#fff",
            borderRadius: 5,
          }}
        />
      </View>

      {/* Olho Direito */}
      <View
        style={{
          width: 28,
          height: 28,
          backgroundColor: "#333",
          borderRadius: 14,
          borderWidth: 2,
          borderColor: "#000",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <Animated.View
          style={{
            width: 10,
            height: interpolateEye(rightEye),
            backgroundColor: "#fff",
            borderRadius: 5,
          }}
        />
      </View>
    </TouchableOpacity>
  );
}
