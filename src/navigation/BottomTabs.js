import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import EntradasScreen from '../screens/EntradasScreen';
import GastosScreen from '../screens/GastosScreen';
import EmprestimosScreen from '../screens/EmprestimosScreen';
import CartoesScreen from '../screens/CartoesScreen';
import InvestimentosScreen from '../screens/InvestimentosScreen';
import ResumoMensal from '../screens/ResumoMensal';
import CustomTabBar from '../components/CustomTabBar';
import SaidasScreen from '../screens/SaidasScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen 
        name="Resumo" 
        component={ResumoMensal}
        options={{
          tabBarLabel: 'Resumo',
          tabBarIcon: 'analytics-outline',
        }}
      />
      <Tab.Screen 
        name="Entradas" 
        component={EntradasScreen}
        options={{
          tabBarLabel: 'Entradas',
          tabBarIcon: 'cash-outline',
        }}
      />
<Tab.Screen 
        name="Saídas" 
        component={SaidasScreen}
        options={{
          tabBarLabel: 'Saídas',
          tabBarIcon: 'arrow-up-circle-outline', 
        }}
      />   
      <Tab.Screen 
        name="Investimentos" 
        component={InvestimentosScreen}
        options={{
          tabBarLabel: 'Investir',
          tabBarIcon: 'trending-up-outline',
        }}
      />
      {/* <Tab.Screen 
        name="Cartão" 
        component={CartoesScreen}
        options={{
          tabBarLabel: 'Cartões',
          tabBarIcon: 'card-outline',
        }}
      /> */}
      {/* Membros e Alterar Senha deixaram de ser abas — agora vivem no
          Menu do Usuário/Configurações (ver src/navigation/MainStack.js e
          ARQUITETURA.md seção 11). */}
    </Tab.Navigator>
  );
}
