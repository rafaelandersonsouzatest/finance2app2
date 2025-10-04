import React, { useState, useRef } from 'react';
import { View, TouchableOpacity, Animated, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';

// O componente FabMenuItem não precisa de alterações
const FabMenuItem = ({ icon, label, onPress, style }) => (
  <Animated.View style={[globalStyles.fabMenuItemContainer, style]}>
    <Text style={globalStyles.fabMenuItemLabel}>{label}</Text>
    <TouchableOpacity
      style={globalStyles.fabMenuItemButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons name="plus" size={24} color="#FFF" />
    </TouchableOpacity>
  </Animated.View>
);

export default function FabMenu({ actions }) {
  const [isOpen, setIsOpen] = useState(false);
  const toggleAnimation = useRef(new Animated.Value(0)).current;
  const itemAnimations = useRef(actions.map(() => new Animated.Value(0))).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;

    Animated.spring(toggleAnimation, {
      toValue,
      friction: 6,
      useNativeDriver: true,
    }).start();

    const animations = itemAnimations.map(anim =>
      Animated.spring(anim, {
        toValue,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      })
    );

    if (isOpen) {
      Animated.stagger(50, animations.reverse()).start();
    } else {
      Animated.stagger(50, animations).start();
    }

    setIsOpen(!isOpen);
  };

  const rotation = {
    transform: [
      {
        rotate: toggleAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '45deg'],
        }),
      },
    ],
  };

  return (
    <View style={globalStyles.fabMenuContainer}>
      {/* ✨ Container APENAS para os itens do menu */}
      <View style={globalStyles.fabItemsWrapper}>
        {actions.map((action, index) => {
          const itemStyle = {
            transform: [
              {
                scale: itemAnimations[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1], // Começa invisível e escala para 1
                }),
              },
            ],
            opacity: itemAnimations[index],
          };

          return (
            <FabMenuItem
              key={action.name}
              icon={action.icon}
              label={action.label}
              onPress={() => {
                action.onPress();
                if (isOpen) toggleMenu();
              }}
              style={itemStyle}
            />
          );
        })}
      </View>

      {/* Botão Principal renderizado DEPOIS para ficar por cima */}
      <TouchableOpacity
        style={globalStyles.fabPrimary}
        onPress={toggleMenu}
        activeOpacity={1}
      >
        <Animated.View style={rotation}>
          <MaterialCommunityIcons name="plus" size={30} color="#FFF" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}
