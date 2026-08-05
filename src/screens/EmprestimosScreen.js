import { useMemo } from 'react';
import { View } from 'react-native';
import ListItemEmprestimo from '../components/ListItemEmprestimo';

// 🧩 Função auxiliar para extrair data de forma segura
const extractDate = (item) => {
  const possible = [
    item.dataVencimento,
    item.vencimento,
    item.dataPagamento,
    item.data,
    item.createdAt,
  ];
  for (const d of possible) {
    if (!d) continue;
    if (d instanceof Date) return d;
    const parsed = new Date(d);
    if (!isNaN(parsed)) return parsed;
  }
  return new Date(8640000000000000);
};

// =========================================================
// 🔹 Componente de apresentação pura — não busca dados nem é dono de nenhum
// modal (histórico, antecipação, exclusão). Renderizado só por
// SaidasScreen.js, que é hoje a única fonte de verdade de dados/ações (ver
// ARQUITETURA.md seção 19, Sprint de Saneamento). `onDeleteItem` continua
// aceito por compatibilidade de assinatura, mas nunca é chamado pelo pai —
// mesmo comportamento de antes desta sprint.
// =========================================================
export default function EmprestimosScreen({
  emprestimos = [],
  onPressItem,
  onToggleStatus,
  onDeleteItem,
  onAdiantarParcelas,
  onHistoryPress,
}) {
  // 🔹 Ordenar por data de vencimento e nome
  const sortedEmprestimos = useMemo(() => {
    return [...emprestimos].sort((a, b) => {
      const dateA = extractDate(a);
      const dateB = extractDate(b);
      const diff = dateA - dateB;
      if (diff !== 0) return diff;
      return (a.descricao || '').localeCompare(b.descricao || '');
    });
  }, [emprestimos]);

  return (
    <View style={{ flex: 1 }}>
      {sortedEmprestimos.map((item) => (
        <ListItemEmprestimo
          key={item.id}
          item={item}
          onPressItem={() => onPressItem?.(item)}
          onToggleStatus={() => onToggleStatus?.(item.id)}
          onAdiantarParcelas={onAdiantarParcelas}
          onDelete={() => onDeleteItem?.(item)}
          onHistoryPress={() => onHistoryPress?.(item)}
        />
      ))}
    </View>
  );
}
