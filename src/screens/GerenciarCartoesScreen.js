// Administração de cartões cadastrados — diferente de CartoesScreen.js, que
// trata lançamentos/faturas do mês. A partir da Sprint 6, "Cartão" passa a
// ser uma entidade própria (ver useCarteira.js/ARQUITETURA.md), no mesmo
// padrão de Categorias/Membros — esta tela deixa de ser um placeholder e
// embrulha o CRUD compartilhado (CartoesManager), igual CategoriasScreen.js.
import { View } from 'react-native';
import { globalStyles } from '../styles/globalStyles';
import CartoesManager from '../components/carteira/CartoesManager';

export default function GerenciarCartoesScreen() {
  return (
    <View style={globalStyles.container}>
      <CartoesManager />
    </View>
  );
}
