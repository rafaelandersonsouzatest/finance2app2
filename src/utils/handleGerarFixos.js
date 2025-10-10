import { colors } from "../styles/colors";

/**
 * Executa a geração dos fixos (entradas ou saídas) e exibe o alerta apropriado.
 *
 * @param {Function} gerarDoMes - Função que gera as entradas/gastos do mês.
 * @param {Function} setAlerta - Função de estado usada para exibir o alerta.
 * @param {'entrada' | 'gasto'} tipo - Define o tipo (para textos e ícones).
 */
export const handleGerarFixosUtil = async (gerarDoMes, setAlerta, tipo = 'gasto') => {
  try {
    const resultado = await gerarDoMes();
    const isEntrada = tipo === 'entrada';

    // ✅ Define corretamente o gênero do artigo
    const artigo = isEntrada ? 'as' : 'os';
    const textoTipo = isEntrada ? 'entradas do mês' : 'gastos do mês';
    const textoModelo = isEntrada ? 'modelo de entrada' : 'modelo de gasto';
    const textoConfig = isEntrada ? 'Configurar Modelos de Entradas' : 'Configurar Modelos de Gastos';

    // 🔹 Configurações centralizadas
    const configs = {
      SUCESSO: {
        titulo: 'Sucesso!',
        mensagem: ` ${artigo.charAt(0).toUpperCase() + artigo.slice(1)} ${textoTipo} para este mês foram geradas com sucesso.`,
        icone: 'check-circle-outline',
        corIcone: colors.balance,
      },
      JA_GERADO: {
        titulo: 'Tudo Certo!',
        mensagem: `ℹ️ ${artigo.charAt(0).toUpperCase() + artigo.slice(1)} ${textoTipo} deste mês já foram geradas anteriormente.`,
        icone: 'information-outline',
        corIcone: colors.primary,
      },
      SEM_MODELOS: {
        titulo: 'Nenhum Modelo Encontrado',
        mensagem: `⚙️ Você ainda não cadastrou nenhum ${textoModelo}. Vá em "${textoConfig}" para começar.`,
        icone: 'file-document-edit-outline',
        corIcone: colors.pending,
      },
      ERRO: {
        titulo: 'Erro',
        mensagem: `❌ Ocorreu um problema ao tentar gerar ${artigo} ${textoTipo}. Tente novamente.`,
        icone: 'alert-circle-outline',
        corIcone: colors.expense,
      },
    };

    const alertaConfig = configs[resultado] || configs.ERRO;

    // Exibe o alerta compatível com seu AlertaModal
    setAlerta({
      visivel: true,
      ...alertaConfig,
      botoes: [
        {
          texto: 'Entendi',
          onPress: () => setAlerta({ visivel: false }),
          style: 'primary',
        },
      ],
    });
  } catch (err) {
    console.error('Erro ao gerar fixos:', err);
    setAlerta({
      visivel: true,
      titulo: 'Erro Inesperado',
      mensagem: 'Não foi possível gerar os fixos. Verifique sua conexão e tente novamente.',
      icone: 'wifi-off',
      corIcone: colors.error,
      botoes: [
        {
          texto: 'Fechar',
          onPress: () => setAlerta({ visivel: false }),
          style: 'primary',
        },
      ],
    });
  }
};
