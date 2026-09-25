import { useState } from 'react';
import { colors } from '../styles/colors';

/**
 * Fluxo do botão "Gerar do Mês" (entradas ou gastos), compartilhado por
 * EntradasScreen e SaidasScreen: busca os modelos ainda não lançados no mês,
 * abre a confirmação (ModalGerarPendentes) e gera só os escolhidos.
 *
 * @param {Function} listarModelosPendentes - do useGastos/useEntradas.
 * @param {Function} gerarFixosDoMes - do useGastos/useEntradas; recebe os ids escolhidos.
 * @param {Function} setAlerta - estado do AlertaModal da tela.
 * @param {'entrada' | 'gasto'} tipo - para textos.
 */
export function useGerarFixos(listarModelosPendentes, gerarFixosDoMes, setAlerta, tipo = 'gasto') {
  const [pendentes, setPendentes] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [gerando, setGerando] = useState(false);

  const isEntrada = tipo === 'entrada';
  const textoTipo = isEntrada ? 'entradas' : 'gastos';
  const textoModelo = isEntrada ? 'modelo de entrada' : 'modelo de gasto';

  const mostrarAlerta = ({ titulo, mensagem, icone, corIcone }) =>
    setAlerta({
      visivel: true,
      titulo,
      mensagem,
      icone,
      corIcone,
      botoes: [{ texto: 'Entendi', onPress: () => setAlerta({ visivel: false }), style: 'primary' }],
    });

  const alertaErro = () =>
    mostrarAlerta({
      titulo: 'Erro',
      mensagem: `❌ Ocorreu um problema ao tentar gerar os ${textoTipo} do mês. Verifique sua conexão e tente novamente.`,
      icone: 'alert-circle-outline',
      corIcone: colors.gasto,
    });

  const alertaNadaPendente = () =>
    mostrarAlerta({
      titulo: 'Tudo Certo!',
      mensagem: `ℹ️ Todos os seus modelos já foram lançados neste mês.`,
      icone: 'information-outline',
      corIcone: colors.primary,
    });

  const iniciar = async () => {
    const { status, pendentes: lista } = await listarModelosPendentes();

    if (status === 'SEM_MODELOS') {
      return mostrarAlerta({
        titulo: 'Nenhum Modelo Encontrado',
        mensagem: `⚙️ Você ainda não cadastrou nenhum ${textoModelo}. Vá em "Configurar Modelos" para começar.`,
        icone: 'file-document-edit-outline',
        corIcone: colors.pending,
      });
    }
    if (status === 'NADA_PENDENTE') return alertaNadaPendente();
    if (status !== 'OK') return alertaErro();

    setPendentes(lista);
    setModalVisivel(true);
  };

  const confirmar = async (modeloIds) => {
    setGerando(true);
    const { status, quantidade } = await gerarFixosDoMes(modeloIds);
    setGerando(false);
    setModalVisivel(false);

    if (status === 'NADA_PENDENTE') return alertaNadaPendente();
    if (status !== 'SUCESSO') return alertaErro();

    mostrarAlerta({
      titulo: 'Sucesso!',
      mensagem:
        quantidade === 1
          ? `1 ${isEntrada ? 'entrada foi gerada' : 'gasto foi gerado'} para este mês.`
          : `${quantidade} ${isEntrada ? 'entradas foram geradas' : 'gastos foram gerados'} para este mês.`,
      icone: 'check-circle-outline',
      corIcone: colors.balance,
    });
  };

  return {
    iniciarGeracao: iniciar,
    modalGerarProps: {
      visible: modalVisivel,
      tipo,
      pendentes,
      gerando,
      onConfirmar: confirmar,
      onClose: () => !gerando && setModalVisivel(false),
    },
  };
}
