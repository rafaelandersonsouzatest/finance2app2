import { View } from 'react-native';
import ListItemGasto from '../components/ListItemGasto';

// =========================================================
// 🔹 Componente de apresentação pura — não busca dados nem é dono de
// nenhum modal. Renderizado só por SaidasScreen.js, que é hoje a única
// fonte de verdade de dados/ações (ver ARQUITETURA.md seção 19, Sprint de
// Saneamento). `onDeleteItem` aciona o mesmo mecanismo único de exclusão
// usado por ModalEdicao (ver ARQUITETURA.md seção 20) — o ícone de excluir
// na linha agora funciona igual ao caminho linha → Detalhes → Editar →
// Excluir, não é mais um botão inerte.
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
