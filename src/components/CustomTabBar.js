import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../styles/colors';

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();
  const animations = useRef(
    state.routes.map((_, index) => new Animated.Value(index === state.index ? 1.2 : 1))
  ).current;

  useEffect(() => {
    animations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: index === state.index ? 2 : 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }).start();
    });
  }, [state.index]);

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      <View style={styles.container}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : route.name;

          const iconName = options.tabBarIcon;
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.button}
            >
              <Animated.View
                style={[
                  styles.iconContainer,
                  {
                    transform: [{ scale: animations[index] }],
                    backgroundColor: isFocused ? colors.tabActiveBubble : 'transparent',
                  },
                ]}
              >
                <Ionicons
                  name={iconName}
                  size={13}
                  color={isFocused ? colors.primary : colors.inactiveIcon}
                />
              </Animated.View>
              <Text
                style={{
                  fontSize: 11,
                  color: isFocused ? colors.primary : colors.inactiveIcon,
                }}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 5,
    zIndex: 100,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.tabBarBackground,
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    padding: 6,
    borderRadius: 20,
  },
});

export default CustomTabBar;
