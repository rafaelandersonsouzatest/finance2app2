import React from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import GastosFixosScreen from '../screens/GastosFixosScreen';
import EmprestimosScreen from '../screens/EmprestimosScreen';
import CartoesScreen from '../screens/CartoesScreen';
import { globalStyles } from '../styles/globalStyles';
import { colors } from '../styles/colors';

const Tab = createMaterialTopTabNavigator();

export default function SaidasTabs() {
  return (
    <Tab.Navigator
      tabBar={({ state, descriptors, navigation }) => (
        <View style={[globalStyles.modernTabBarContainer, { marginTop: 4 }]}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              options.tabBarLabel ?? options.title ?? route.name;
            const isFocused = state.index === index;

            return (
              <TouchableOpacity
                key={route.key}
                onPress={() => navigation.navigate(route.name)}
                style={[
                  globalStyles.modernTabButton,
                  isFocused && globalStyles.modernTabButtonActive,
                ]}
              >
                <Text
                  style={[
                    globalStyles.modernTabText,
                    isFocused && globalStyles.modernTabTextActive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      screenOptions={{
        swipeEnabled: true,
        tabBarStyle: { display: 'none' },
        tabBarPressColor: colors.primary + '15',
      }}
    >
      <Tab.Screen name="Gastos Fixos" component={GastosFixosScreen} />
      <Tab.Screen name="Empréstimos" component={EmprestimosScreen} />
      <Tab.Screen name="Cartões" component={CartoesScreen} />
    </Tab.Navigator>
  );
}
