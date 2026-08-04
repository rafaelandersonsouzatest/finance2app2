import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useDateFilter } from '../contexts/DateFilterContext';
import { useGastos } from '../hooks/useGastos';
import EstatisticasComponent from '../components/EstatisticasComponent';
import ListItemGasto from '../components/ListItemGasto';
import ModalCriacao from '../components/ModalCriacao';
import GerenciarModelosModal from '../components/GerenciarModelosModal';
import AlertaModal from '../components/AlertaModal';
import ModalEditorParcelas from '../components/ModalEditorParcelas';
import { handleGerarFixosUtil } from '../utils/handleGerarFixos';
import { useExclusaoParcelada } from '../hooks/useExclusaoParcelada';

export default function GastosScreen({
  isEmbedded = false,
  onPressItem,       
  onEditItem,        
  onDeleteItem,      
}) {
  const { selectedMonth, selectedYear } = useDateFilter();
  const {
    gastos,
    addGasto,
    updateGasto,
    deleteGasto,
    gerarFixosDoMes,
  } = useGastos(selectedMonth, selectedYear);

  const [modalCriacaoVisivel, setModalCriacaoVisivel] = useState(false);
  const [modalModelosVisivel, setModalModelosVisivel] = useState(false);
  const [alerta, setAlerta] = useState({ visivel: false, titulo: '', mensagem: '', botoes: [] });
  const {
    confirmarExclusao,
    alertaExclusao,
    fecharAlertaExclusao,
    editorExclusao,
    fecharEditorExclusao,
    confirmarEditorExclusao,
  } = useExclusaoParcelada();

  const total = useMemo(
    () => gastos.filter((g) => g.pago).reduce((s, g) => s + (Number(g.valor) || 0), 0),
    [gastos]
  );

  const estatisticas = useMemo(
    () => ({
      total,
      pagos: gastos.filter((g) => g.pago).length,
      emAberto: gastos.filter((g) => !g.pago).length,
      totalItens: gastos.length,
    }),
    [gastos, total]
  );

  const handleAdicionar = async (novoGasto) => {
    await addGasto({ ...novoGasto, mes: selectedMonth, ano: selectedYear });
    setModalCriacaoVisivel(false);
  };

  const handleExcluir = (item) => {
    confirmarExclusao({ item, tipoLabel: 'Gasto', excluirParcela: deleteGasto });
  };

  const handleToggleStatus = async (id) => {
    const item = gastos.find((g) => g.id === id);
    if (item) await updateGasto(id, { ...item, pago: !item.pago });
  };

  const handleGerarFixos = () =>
    handleGerarFixosUtil(gerarFixosDoMes, setAlerta, 'gasto');

  return (
    <View style={{ flex: 1 }}>

      {gastos.map((item) => (
        <ListItemGasto
          key={item.id}
          item={item}
          onPressItem={() => onPressItem?.(item)}  // 👈 segura e opcional
          onToggleStatus={() => handleToggleStatus(item.id)}
          onDelete={() =>
            isEmbedded ? onDeleteItem?.(item) : handleExcluir(item)
          }
        />
      ))}

      {/* Só exibe modais se NÃO estiver embutido */}
      {!isEmbedded && (
        <>
          <ModalCriacao
            visivel={modalCriacaoVisivel}
            aoFechar={() => setModalCriacaoVisivel(false)}
            aoSalvar={handleAdicionar}
            tipo="gasto"
            titulo="Novo Gasto Fixo"
          />

          <GerenciarModelosModal
            visible={modalModelosVisivel}
            onClose={() => setModalModelosVisivel(false)}
            tipo="gasto"
          />

          <AlertaModal
            visible={alerta.visivel}
            onClose={() => setAlerta({ visivel: false })}
            {...alerta}
          />

          <AlertaModal visible={alertaExclusao.visivel} onClose={fecharAlertaExclusao} {...alertaExclusao} />
          <ModalEditorParcelas
            visivel={editorExclusao.visivel}
            aoFechar={fecharEditorExclusao}
            aoConfirmar={confirmarEditorExclusao}
            descricao={editorExclusao.descricao}
            totalParcelas={editorExclusao.valoresIniciais.length}
            valoresIniciais={editorExclusao.valoresIniciais}
            bloqueadas={editorExclusao.bloqueadas}
          />
        </>
      )}
    </View>
  );
}
