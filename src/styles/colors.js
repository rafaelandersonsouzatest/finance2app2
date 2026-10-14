// src/styles/colors.js
// Paleta única do app — nenhum componente escreve cor à mão (regra do
// CLAUDE.md, seção "Estilos e cores", verificada por
// src/__tests__/coresCentralizadas.test.js). Nomes em inglês, como os do
// globalStyles; o nome diz a FUNÇÃO da cor, não a cor em si.
export const colors = {
  // --- Cores principais da interface ---
  background: '#1a1a1a',
  cardBackground: '#1E1E1E',
  // Caixa destacada dentro de um card/modal (seções, botões de seleção):
  // um pouco mais clara que cardBackground.
  surface: '#303030',
  shadowColor: '#000',
  primary: '#4FC3F7',
  error: '#EF5350',

  // --- Cores de texto ---
  textPrimary: '#ffffff',
  textSecondary: '#b0b0b0',
  textTertiary: '#BBBBBB',
  // Texto/ícone sobre fundo colorido (botões). Separado de `textPrimary`:
  // num tema claro o texto comum escurece, mas o texto em cima de um botão
  // colorido continua branco.
  textOnColor: '#ffffff',
  // Estados vazios ("Nenhum registro...").
  textEmpty: '#999999',
  textEmptySecondary: '#666666',

  // --- Valores financeiros ---
  // `income` tem o mesmo valor de `primary` por coincidência: são funções
  // diferentes (dinheiro entrando × cor da marca) e podem divergir num tema.
  income: '#4FC3F7',
  expense: '#FF8A65',
  balance: '#81C784', // saldo positivo / sucesso
  earlyPayment: '#AB47BC', // parcela antecipada ou com desconto

  // --- Status de pagamento ---
  pending: '#FFB74D',
  badgePaid: '#55f74f20',
  badgePending: '#FFB74D20',

  // --- Gráficos e ícones decorativos ---
  // Tons para dar variedade em gráficos/ícones — não são estados.
  decorativeBlue: '#42A5F5',
  decorativePurple: '#AB47BC',
  decorativeRed: '#EF5350',

  // --- Barras de progresso ---
  progressBackground: '#424242',

  // --- Bordas e divisórias ---
  borderLight: '#333333',
  divider: '#2C2C2E', // linha que separa o rodapé do card de compra no cartão

  // --- Navegação ---
  tabBarBackground: '#252525',
  tabActiveBubble: '#4FC3F733',
  inactiveIcon: '#888888',

  // --- Fundo escurecido atrás de modais ---
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayStrong: 'rgba(0, 0, 0, 0.7)',
  overlaySoft: 'rgba(0, 0, 0, 0.45)',

  // --- Escala do medidor de força da senha (Cadastro) ---
  // Cores diferentes entre si de propósito: vermelho (expense) → laranja →
  // amarelo → verde-claro (balance, "Forte") → verde intenso ("Excelente").
  passwordWeak: '#f39c12',
  passwordMedium: '#f1c40f',
  passwordExcellent: '#2ecc71',
  passwordEmpty: '#cccccc', // nenhum critério atendido ainda
  passwordTrack: '#eeeeee', // fundo da barra

  // --- Marcas de terceiros ---
  // Botão "Entrar com Google": visual padrão do Google (claro), não segue o
  // tema do app.
  google: '#DB4437',
  googleBackground: '#ffffff',
  googleBorder: '#dddddd',

  // --- Onboarding (tela clara, diferente do resto do app) ---
  onboardingBackground: '#ffffff',
  onboardingDotInactive: '#d0d0d0',

  // --- Ilustrações ---
  // Olhinho da coruja (mostrar/ocultar senha — OwlEyeToggle).
  owlEye: '#333333',
  owlEyeBorder: '#000000',
  owlEyeShine: '#ffffff',
  // Confete do "Conta criada" (as outras cores do confete já são da paleta).
  confettiYellow: '#FFD93D',

  // --- Cores reserva (dado sem cor válida) ---
  cardFallback: '#333333', // degradê do CartaoVisual
  categoryFallback: '#888888', // categoria gravada sem cor (dado antigo)

  // --- Cores por instituição ---
  byInstitution: {
    Nubank: '#820AD1',
    Inter: '#FF6F00',
    'XP Investimentos': '#004D40',
    C6: '#000000',
    Default: '#888888',
  },

  // --- Paletas de escolha (DADO: o usuário escolhe uma; não seguem o tema) ---
  // Cores reais de cartão disponíveis no mercado (preto, grafite, dourado,
  // rosé gold, prata etc.), incluindo tons escuros o bastante para o texto
  // branco do CartaoVisual continuar legível por cima.
  cardPalette: [
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
  categoryPalette: [
    '#EF5350', '#FF8A65', '#FFCA28', '#66BB6A', '#26A69A',
    '#42A5F5', '#5C6BC0', '#AB47BC', '#EC407A', '#8D6E63', '#78909C',
  ],
};
