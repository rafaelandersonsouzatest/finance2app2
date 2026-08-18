import { View } from 'react-native';
import ListItemGasto from '../components/ListItemGasto';
import { deveMostrarIconeCompartilhado } from '../utils/compartilhamento';

// =========================================================
// 🔹 Componente de apresentação pura — não busca dados nem é dono de
// nenhum modal. Renderizado só por SaidasScreen.js, que é hoje a única
// fonte de verdade de dados/ações (ver ARQUITETURA.md seção 19, Sprint de
// Saneamento). `onDeleteItem` aciona o mesmo mecanismo único de exclusão
// usado por ModalEdicao (ver ARQUITETURA.md seção 20) — o ícone de excluir
// na linha agora funciona igual ao caminho linha → Detalhes → Editar →
// Excluir, não é mais um botão inerte.
//
// `despesasPorId` (seção 11.1/11.3, 2026-08-17) — mapa `despesaId → despesa`
// vindo do DivisaoDespesaContext através de SaidasScreen; só usado aqui pra
// decidir o ícone de compartilhamento (some se a divisão foi encerrada) e o
// alerta de valor sem destino — nunca buscado por este componente.
// =========================================================
export default function GastosScreen({
  gastos = [],
  onPressItem,
  onToggleStatus,
  onDeleteItem,
  despesasPorId = {},
}) {
  return (
    <View style={{ flex: 1 }}>
      {gastos.map((item) => {
        const despesaVinculada = item.compartilhamentoId ? despesasPorId[item.compartilhamentoId] : null;
        return (
          <ListItemGasto
            key={item.id}
            item={item}
            mostrarIconeCompartilhado={deveMostrarIconeCompartilhado(item, despesaVinculada)}
            valorSemDestinoPendente={(despesaVinculada?.valorSemDestinoCentavos || 0) > 0}
            onPressItem={() => onPressItem?.(item)}
            onToggleStatus={() => onToggleStatus?.(item.id)}
            onDelete={() => onDeleteItem?.(item)}
          />
        );
      })}
    </View>
  );
}
