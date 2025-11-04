import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import EntradasScreen from '../screens/EntradasScreen';
import GastosFixosScreen from '../screens/GastosFixosScreen';
import EmprestimosScreen from '../screens/EmprestimosScreen';
import CartoesEmprestadosScreen from '../screens/CartoesEmprestadosScreen';
import InvestimentosScreen from '../screens/InvestimentosScreen';
import ResumoMensal from '../screens/ResumoMensal';
import CustomTabBar from '../components/CustomTabBar';
import SaidasScreen from '../screens/SaidasScreen';
import MembrosScreen from '../screens/MembrosScreen';
import AlterarSenhaScreen from '../screens/AlterarSenhaScreen';

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
        component={CartoesEmprestadosScreen}
        options={{
          tabBarLabel: 'Cartões',
          tabBarIcon: 'card-outline',
        }}
      /> */}
      {/* <Tab.Screen 
        name="Membros" 
        component={MembrosScreen}
        options={{
          tabBarLabel: 'Membros',
          tabBarIcon: 'people-outline',
        }}
/> */}
{/* <Tab.Screen 
        name="AlterarSenha" 
        component={AlterarSenhaScreen}
        options={{
          tabBarLabel: 'Senha',
          tabBarIcon: 'lock-closed-outline',
        }}
      /> */}
    </Tab.Navigator>
  );
}
