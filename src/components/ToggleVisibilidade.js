import React from 'react';
import { TouchableOpacity, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import { useVisibility } from '../contexts/VisibilityContext';

const ToggleVisibilidade = ({ size = 24, style = {} }) => {
  const { isVisible, toggleVisibility } = useVisibility();
  const [scaleAnim] = React.useState(new Animated.Value(1));

  const handlePress = () => {
    // Animação de "pulse" ao pressionar
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    toggleVisibility();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        {
          padding: 8,
          borderRadius: 20,
          backgroundColor: isVisible ? 'transparent' : colors.primary + '20',
          borderWidth: 1,
          borderColor: isVisible ? 'transparent' : colors.primary + '40',
        },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <MaterialCommunityIcons
          name={isVisible ? 'eye-outline' : 'eye-off-outline'}
          size={size}
          color={isVisible ? colors.textSecondary : colors.primary}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default ToggleVisibilidade;

