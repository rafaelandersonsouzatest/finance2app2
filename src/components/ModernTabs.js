import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Text, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';

export default function ModernTabs({
  tabs = [],
  activeTab,
  setActiveTab,
  activeColor = colors.primary,
  inactiveColor = colors.textSecondary,
  backgroundColor = colors.background,
  children,
}) {
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animation, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start(() => animation.setValue(0));
  }, [activeTab]);

  return (
    <View style={{ flex: 1 }}>
      {/* 🔹 BARRA DE ABAS */}
      <View
        style={[
          globalStyles.modernTabBarContainer,
          { backgroundColor: backgroundColor },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const isDisabled = tab.disabled;

          const scale = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [1, isActive ? 1.05 : 1],
          });

          return (
            <TouchableOpacity
              key={tab.key}
              disabled={isDisabled}
              onPress={() => !isDisabled && setActiveTab(tab.key)}
              style={[
                globalStyles.modernTabButton,
                isActive && {
                  backgroundColor: activeColor + '10',
                  borderColor: activeColor,
                },
                isDisabled && { opacity: 0.5 },
              ]}
            >
              <Animated.View
                style={{
                  transform: [{ scale }],
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {tab.icon && (
                  <MaterialCommunityIcons
                    name={tab.icon}
                    size={18}
                    color={isActive ? activeColor : inactiveColor}
                  />
                )}
                <Text
                  style={[
                    globalStyles.modernTabText,
                    isActive && { color: activeColor, fontWeight: '700' },
                  ]}
                >
                  {tab.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 🔹 HEADER opcional (como Estatísticas) - AGORA ABAIXO DAS TABS */}
      {children?.find?.((child) => child?.props?.slot === 'header')}

      {/* 🔹 CONTEÚDO (telas embutidas) */}
      <View style={{ flex: 1 }}>
        {React.Children.map(children, (child) => {
          if (!child) return null;
          // Só renderiza o filho cuja aba está ativa
          return child.props.tabKey === activeTab ? child : null;
        })}
      </View>
    </View>
  );
}
