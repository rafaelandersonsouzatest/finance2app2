import { useState } from 'react';
import { dividirValorIgualmente } from '../utils/parcelamento';
import { parseBRL } from '../utils/formatarValor';

const ESTADO_INICIAL_ALERTA = { visivel: false, titulo: '', mensagem: '', botoes: [] };
const ESTADO_INICIAL_EDITOR = { visivel: false, descricao: '', valoresIniciais: [], bloqueadas: [], onConfirmar: null };

// =========================================================
// 🔹 Mecanismo único de confirmação de exclusão — usado por todo lugar do
// app que exclui um gasto, entrada, cartão ou empréstimo. Antes desta
// mudança existiam 4+ implementações de "handleExcluir" copiadas e
// inconsistentes entre si (algumas sem confirmação nenhuma) — ver
// ARQUITETURA.md seção 17. Mesmo padrão de useAdiantamento.js: o hook só
// guarda o estado dos modais, quem chama é responsável por renderizar
// <AlertaModal>/<ModalEditorParcelas> com esse estado.
//
// Cada chamador só descreve O QUE fazer (as funções de exclusão do hook de
// dados correspondente); este hook decide QUANDO perguntar o quê:
//
// - Gasto/entrada, ou cartão/empréstimo com 1 parcela só: 1 alerta —
//   Cancelar/Excluir.
// - Cartão/empréstimo com mais de 1 parcela:
//   1) Cancelar / Somente esta parcela / Excluir tudo
//   2) (se "somente esta parcela") Remover do total / Redistribuir
//   3) (se "Redistribuir") Igualmente / Manualmente
//      "Manualmente" abre o ModalEditorParcelas (componente já existente,
//      100% desacoplado de persistência) pré-preenchido com o estado
//      simulado PÓS-exclusão. Nada é gravado até o usuário confirmar o
//      editor — cancelar o editor não exclui nada, a operação inteira
//      (exclusão + renumeração + gravação dos valores) acontece de uma vez
//      só, no confirmar (ver reestruturarParcelamento.js).
//
// A redistribuição (igual ou manual) sempre reparte só o VALOR DA PARCELA
// EXCLUÍDA entre as parcelas restantes não bloqueadas — nunca o valor total
// da compra.
// =========================================================
export const useExclusaoParcelada = () => {
  const [alerta, setAlerta] = useState(ESTADO_INICIAL_ALERTA);
  const [editor, setEditor] = useState(ESTADO_INICIAL_EDITOR);

  const fecharAlerta = () => setAlerta(ESTADO_INICIAL_ALERTA);
  const fecharEditor = () => setEditor(ESTADO_INICIAL_EDITOR);

  const abrirEditorManual = (item, restantes, elegiveis, excluirComValoresPersonalizados) => {
    const ordenados = [...restantes].sort((a, b) => (a.parcelaAtual || 0) - (b.parcelaAtual || 0));
    const incrementos = dividirValorIgualmente(parseBRL(item.valor), elegiveis.length);
    let indiceIncremento = 0;

    const valoresIniciais = ordenados.map((p) => {
      const bloqueada = p.pago === true || p.adiantada === true;
      if (bloqueada) return parseBRL(p.valor);
      const incremento = incrementos[indiceIncremento];
      indiceIncremento += 1;
      return parseFloat((parseBRL(p.valor) + incremento).toFixed(2));
    });
    const bloqueadas = ordenados.map((p) => p.pago === true || p.adiantada === true);

    setEditor({
      visivel: true,
      descricao: item.descricao,
      valoresIniciais,
      bloqueadas,
      onConfirmar: async (valoresFinais) => {
        const novosValoresPorId = {};
        ordenados.forEach((p, indice) => {
          if (!bloqueadas[indice]) {
            novosValoresPorId[p.id] = parseFloat(parseBRL(valoresFinais[indice]).toFixed(2));
          }
        });
        await excluirComValoresPersonalizados(item.id, item.idCompra, novosValoresPorId);
      },
    });
  };

  const perguntarComoRedistribuir = (item, restantes, elegiveis, { excluirParcela, excluirComValoresPersonalizados }) => {
    setAlerta({
      visivel: true,
      titulo: 'Como redistribuir?',
      mensagem:
        'O valor desta parcela pode ser dividido igualmente entre as demais parcelas em aberto, ou você pode definir manualmente o valor de cada uma.',
      botoes: [
        { texto: 'Cancelar', style: 'primary', onPress: fecharAlerta },
        {
          texto: 'Igualmente',
          style: 'default',
          onPress: async () => {
            fecharAlerta();
            await excluirParcela(item.id, { idCompra: item.idCompra, modo: 'igual' });
          },
        },
        {
          texto: 'Manualmente',
          style: 'default',
          onPress: () => {
            fecharAlerta();
            abrirEditorManual(item, restantes, elegiveis, excluirComValoresPersonalizados);
          },
        },
      ],
    });
  };

  const perguntarOQueFazerComOValor = async (
    item,
    { buscarParcelasDoGrupo, excluirParcela, excluirComValoresPersonalizados }
  ) => {
    const parcelasDoGrupo = await buscarParcelasDoGrupo(item.idCompra);
    const restantes = parcelasDoGrupo.filter((p) => p.id !== item.id);
    const elegiveis = restantes.filter((p) => p.pago !== true && p.adiantada !== true);

    const botoes = [
      { texto: 'Cancelar', style: 'primary', onPress: fecharAlerta },
      {
        texto: 'Remover do total',
        style: 'destructive',
        onPress: async () => {
          fecharAlerta();
          await excluirParcela(item.id, { idCompra: item.idCompra, modo: 'reduzir' });
        },
      },
    ];

    if (elegiveis.length > 0) {
      botoes.push({
        texto: 'Redistribuir',
        style: 'default',
        onPress: () => perguntarComoRedistribuir(item, restantes, elegiveis, { excluirParcela, excluirComValoresPersonalizados }),
      });
    }

    setAlerta({
      visivel: true,
      titulo: 'O que fazer com o valor desta parcela?',
      mensagem: `O valor de R$ ${Number(parseBRL(item.valor)).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
      })} pode ser removido do total ou redistribuído entre as demais parcelas em aberto.`,
      botoes,
    });
  };

  const confirmarExclusao = ({
    item,
    tipoLabel,
    suportaGrupo = false,
    buscarParcelasDoGrupo,
    excluirParcela,
    excluirGrupoInteiro,
    excluirComValoresPersonalizados,
  }) => {
    if (!item?.id) return;

    const grupoComMaisDeUmaParcela = suportaGrupo && !!item.idCompra && (item.totalParcelas || 1) > 1;

    // 🔹 Item avulso: gasto, entrada, ou cartão/empréstimo com 1 parcela só —
    // não há o que escolher além de confirmar.
    if (!grupoComMaisDeUmaParcela) {
      setAlerta({
        visivel: true,
        titulo: `Excluir ${tipoLabel}`,
        mensagem: `Tem certeza que deseja excluir "${item.descricao}"?`,
        botoes: [
          { texto: 'Cancelar', style: 'primary', onPress: fecharAlerta },
          {
            texto: 'Excluir',
            style: 'destructive',
            onPress: async () => {
              fecharAlerta();
              await excluirParcela(item.id, {});
            },
          },
        ],
      });
      return;
    }

    // 🔹 Etapa 1: só esta parcela ou o grupo inteiro.
    const rotuloGrupo = tipoLabel === 'Empréstimo' ? 'o empréstimo inteiro' : 'a compra inteira';
    setAlerta({
      visivel: true,
      titulo: `Excluir ${tipoLabel}`,
      mensagem: `Deseja excluir somente esta parcela ou ${rotuloGrupo} (todas as parcelas) de "${item.descricao}"?`,
      botoes: [
        { texto: 'Cancelar', style: 'primary', onPress: fecharAlerta },
        {
          texto: 'Somente esta parcela',
          style: 'default',
          onPress: () =>
            perguntarOQueFazerComOValor(item, { buscarParcelasDoGrupo, excluirParcela, excluirComValoresPersonalizados }),
        },
        {
          texto: tipoLabel === 'Empréstimo' ? 'Excluir empréstimo inteiro' : 'Excluir compra inteira',
          style: 'destructive',
          onPress: async () => {
            fecharAlerta();
            await excluirGrupoInteiro(item.idCompra);
          },
        },
      ],
    });
  };

  return {
    confirmarExclusao,
    alertaExclusao: alerta,
    fecharAlertaExclusao: fecharAlerta,
    editorExclusao: editor,
    fecharEditorExclusao: fecharEditor,
    confirmarEditorExclusao: (valoresFinais) => {
      editor.onConfirmar?.(valoresFinais);
      fecharEditor();
    },
  };
};
