import { View } from 'react-native';
import ListItemGasto from '../components/ListItemGasto';

// =========================================================
// 🔹 Componente de apresentação pura — não busca dados nem é dono de
// nenhum modal. Renderizado só por SaidasScreen.js, que é hoje a única
// fonte de verdade de dados/ações (ver ARQUITETURA.md seção 19, Sprint de
// Saneamento). `onDeleteItem` continua aceito por compatibilidade de
// assinatura, mas nunca é chamado pelo pai — a exclusão de verdade acontece
// via ModalEdicao (linha → Detalhes → Editar → Excluir), mesmo comportamento
// de antes desta sprint.
// =========================================================
export default function GastosScreen({ gastos = [], onPressItem, onToggleStatus, onDeleteItem }) {
  return (
    <View style={{ flex: 1 }}>
      {gastos.map((item) => (
        <ListItemGasto
          key={item.id}
          item={item}
          onPressItem={() => onPressItem?.(item)}
          onToggleStatus={() => onToggleStatus?.(item.id)}
          onDelete={() => onDeleteItem?.(item)}
        />
      ))}
    </View>
  );
}
