import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import GastosFixosScreen from '../screens/GastosFixosScreen';
import EmprestimosScreen from '../screens/EmprestimosScreen';
import { colors } from '../styles/colors';

const Tab = createMaterialTopTabNavigator();

export default function SaidasTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.background }, 
        tabBarLabelStyle: { fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
        tabBarIndicatorStyle: { backgroundColor: colors.primary, height: 4 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Gastos Fixos" component={GastosFixosScreen} />
      <Tab.Screen name="Empréstimos" component={EmprestimosScreen} />
    </Tab.Navigator>
  );
}
