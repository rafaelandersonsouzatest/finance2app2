// src/styles/colors.js
export const colors = {
  // --- Cores principais da interface ---
  background: '#1a1a1a',
  cardBackground: '#1E1E1E',
  fundoCard: '#2a2a2a',
  shadowColor: '#000',
  primary: '#4FC3F7',
  error: '#EF5350',
  tabIcon: '#888888',

  // --- Cores de texto ---
  textPrimary: '#ffffff',
  textSecondary: '#b0b0b0',
  textTertiary: '#BBBBBB',

  // --- Valores financeiros ---
  entrada: '#4FC3F7',
  gasto: '#FF8A65',
  balance: '#81C784',
  warning: '#AB47BC',

  // --- Status de pagamento ---
  paid: '#4FC3F7',
  pending: '#FFB74D',

  // --- Gráficos e ícones ---
  // (o verde dos ícones/gráficos foi unificado com `balance` — ver
  // PROJECT_STATUS.md, backlog de estilos)
  chartBlue: '#42A5F5',
  chartPurple: '#AB47BC',
  iconRed: '#EF5350',
  iconBlue: '#42A5F5',
  iconPurple: '#AB47BC',

  // --- Barras de progresso ---
  progressFill: '#4FC3F7',
  progressBackground: '#424242',

  // --- Cores por instituição ---
  byInstitution: {
    Nubank: '#820AD1',
    Inter: '#FF6F00',
    'XP Investimentos': '#004D40',
    C6: '#000000',
    Default: '#888888',
  },

  // --- Badges de status ---
  badgePaid: '#55f74f20',
  badgePending: '#FFB74D20',

  // --- Extras para UI refinada ---
  tabBarBackground: '#252525',
  tabActiveBubble: '#4FC3F733',
  inactiveIcon: '#888888',
  borderLight: '#333333',
  border: '#161616ff',

  // --- Texto/ícone sobre fundo colorido (botões) ---
  // Separado de `textPrimary`: num tema claro o texto comum escurece, mas o
  // texto em cima de um botão colorido continua branco.
  textoSobreCor: '#ffffff',

  // --- Estados vazios ("Nenhum registro...") ---
  textoVazio: '#999999',
  textoVazioSecundario: '#666666',

  // --- Fundo escurecido atrás de modais ---
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayForte: 'rgba(0, 0, 0, 0.7)',
  overlaySuave: 'rgba(0, 0, 0, 0.45)',

  // --- Escala do medidor de força da senha (Cadastro) ---
  // Cores diferentes entre si de propósito: vermelho (gasto) → laranja →
  // amarelo → verde-claro (balance, "Forte") → verde intenso ("Excelente").
  forcaSenhaFraca: '#f39c12',
  forcaSenhaMedia: '#f1c40f',
  forcaSenhaExcelente: '#2ecc71',
  forcaSenhaVazia: '#cccccc', // nenhum critério atendido ainda
  forcaSenhaTrilho: '#eeeeee', // fundo da barra

  // --- Marcas de terceiros ---
  // Botão "Entrar com Google": visual padrão do Google (claro), não segue o
  // tema do app.
  google: '#DB4437',
  googleFundo: '#ffffff',
  googleBorda: '#dddddd',

  // --- Onboarding (tela clara, diferente do resto do app) ---
  onboardingFundo: '#ffffff',
  onboardingPontoInativo: '#d0d0d0',

  // --- Ilustrações ---
  // Olhinho da coruja (mostrar/ocultar senha — OwlEyeToggle).
  olhoCoruja: '#333333',
  olhoCorujaBorda: '#000000',
  olhoCorujaBrilho: '#ffffff',
  // Confete do "Conta criada" (as outras cores do confete já são da paleta).
  confeteAmarelo: '#FFD93D',

  // --- Cartões ---
  divisoria: '#2C2C2E', // linha que separa o rodapé do card de compra no cartão
  cartaoSemCor: '#333333', // cor reserva do degradê do CartaoVisual (cartão sem cor válida)

  // --- Paletas de escolha (DADO: o usuário escolhe uma; não seguem o tema) ---
  // Cores reais de cartão disponíveis no mercado (preto, grafite, dourado,
  // rosé gold, prata etc.), incluindo tons escuros o bastante para o texto
  // branco do CartaoVisual continuar legível por cima.
  paletaCartao: [
    '#000000', // Preto
    '#1C1C1E', // Grafite
    '#5C5C5E', // Prata / Titânio
    '#B8860B', // Dourado
    '#B76E79', // Rosé Gold
    '#820AD1', // Roxo
    '#4A148C', // Roxo escuro
    '#FF7A00', // Laranja
    '#CC092F', // Vermelho
    '#1B5E20', // Verde escuro
    '#00695C', // Verde-azulado
    '#0D47A1', // Azul marinho
    '#1565C0', // Azul
    '#37474F', // Azul-acinzentado
    '#6D4C41', // Marrom / Bronze
  ],
  paletaCategoria: [
    '#EF5350', '#FF8A65', '#FFCA28', '#66BB6A', '#26A69A',
    '#42A5F5', '#5C6BC0', '#AB47BC', '#EC407A', '#8D6E63', '#78909C',
  ],
};
