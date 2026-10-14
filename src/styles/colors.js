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
  // amarelo → verde → verde-claro (balance).
  forcaSenhaFraca: '#f39c12',
  forcaSenhaMedia: '#f1c40f',
  forcaSenhaForte: '#2ecc71',

  // --- Marcas de terceiros ---
  google: '#DB4437',
};
