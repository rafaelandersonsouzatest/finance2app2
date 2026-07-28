// src/navigation/MainStack.js
// Envolve o BottomTabs existente + as telas de categoria do Menu do
// Usuário/Configurações (ver ARQUITETURA.md seção 11). Um Stack (não telas
// dentro do bottom sheet) porque Conta/Membros vão crescer em conteúdo e
// ganham botão de voltar e gesto nativo de graça.
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from './BottomTabs';
import ContaScreen from '../screens/ContaScreen';
import AlterarSenhaScreen from '../screens/AlterarSenhaScreen';
import FinanceiroScreen from '../screens/FinanceiroScreen';
import MembrosScreen from '../screens/MembrosScreen';
import GerenciarCartoesScreen from '../screens/GerenciarCartoesScreen';
import AparenciaScreen from '../screens/AparenciaScreen';
import NotificacoesScreen from '../screens/NotificacoesScreen';
import SobreScreen from '../screens/SobreScreen';
import AgendaFinanceiraScreen from '../screens/AgendaFinanceiraScreen';
import CentralAvisosScreen from '../screens/CentralAvisosScreen';
import { colors } from '../styles/colors';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.cardBackground },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={BottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AgendaFinanceira"
        component={AgendaFinanceiraScreen}
        options={{ title: 'Agenda Financeira' }}
      />
      <Stack.Screen
        name="CentralAvisos"
        component={CentralAvisosScreen}
        options={{ title: 'Central de Avisos' }}
      />
      <Stack.Screen name="Conta" component={ContaScreen} options={{ title: 'Conta' }} />
      <Stack.Screen
        name="AlterarSenha"
        component={AlterarSenhaScreen}
        options={{ title: 'Alterar Senha' }}
      />
      <Stack.Screen name="Financeiro" component={FinanceiroScreen} options={{ title: 'Financeiro' }} />
      <Stack.Screen name="Membros" component={MembrosScreen} options={{ title: 'Membros' }} />
      <Stack.Screen name="GerenciarCartoes" component={GerenciarCartoesScreen} options={{ title: 'Cartões' }} />
      <Stack.Screen name="Aparencia" component={AparenciaScreen} options={{ title: 'Aparência' }} />
      <Stack.Screen name="Notificacoes" component={NotificacoesScreen} options={{ title: 'Notificações' }} />
      <Stack.Screen name="Sobre" component={SobreScreen} options={{ title: 'Sobre' }} />
    </Stack.Navigator>
  );
}
