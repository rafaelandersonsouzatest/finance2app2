import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 1,
  },
  scrollView: {
    flex: 1,
    padding: 10,
    backgroundColor: colors.background,
  },
  sectionContainer: {
    gap: 16,
    paddingBottom: 16,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    color: colors.textPrimary,
  },
  

  // Cabeçalhos
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },

  // Cartões principais
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardElegant: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 18,
    marginBottom: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.expense,
    letterSpacing: -0.3,
  },

  // Itens da lista
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
    itemPendente: {
    opacity: 0.3, 
    },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listItemIcon: {
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  listItemSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '400',
  },
  listItemStatus: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  listItemActions: {
    alignItems: 'flex-end',
  },
  listItemAmount: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: -0.1,
  },

  // Ações
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
statusButton: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 6,
  borderRadius: 4,
},
statusButtonText: {
  marginLeft: 6,
  fontSize: 12,
  fontWeight: '600',
},

  // Estado vazio
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    color: '#999',
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },

  // Botão flutuante
  // BotaoAddFlutuante: {
  //   position: 'absolute',
  //   right: 20,
  //   bottom: 30,
  //   backgroundColor: colors.primary,
  //   width: 56,
  //   height: 56,
  //   borderRadius: 28,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   elevation: 5,
  //   shadowColor: '#000',
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.25,
  //   shadowRadius: 3.84,
  // },


  
  // ───────────────────────────────
  // UTILITÁRIOS DE LAYOUT E TIPOGRAFIA
  row: { flexDirection: 'row' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
  alignCenter: { alignItems: 'center' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  flex1: { flex: 1 },

  gap8: { gap: 8 },
  gap12: { gap: 12 },
  gap16: { gap: 16 },
  mb4:  { marginBottom: -10 },
  mb8:  { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb20: { marginBottom: 20 },
  pl16: { paddingLeft: 16 },
  ml8: { marginLeft: 8 },
  ml12: { marginLeft: 12 },
  mt2: { marginTop: 2 },
  mt16: { marginTop: 16 },

  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  textSecondary: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  valueIncome: {
    color: colors.balance,
  },
  valueExpense: {
    color: colors.expense,
  },
  italic: {
    fontStyle: 'italic',
  },

  // Indicadores e ícones
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
    elevation: 0,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  iconContainerColored: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.12,
    elevation: 0,
  },
  iconText: {
    fontSize: 18,
  },

  // // Estilos especiais para seções elegantes
  // sectionHeaderModern: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   marginBottom: 12,
  //   paddingBottom: 8,
  //   borderBottomWidth: 0.5,
  //   borderBottomColor: colors.borderLight,
  // },
  // sectionTitleModern: {
  //   fontSize: 18,
  //   fontWeight: '600',
  //   color: colors.textPrimary,
  //   letterSpacing: 0.2,
  //   flex: 1,
  // },
  // sectionIconModern: {
  //   width: 24,
  //   height: 24,
  //   borderRadius: 12,
  //   backgroundColor: colors.primary + '15',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  //   marginRight: 10,
  // },
  
  // Cards com gradientes sutis
  cardGradient: {
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  
  // Estilos para valores destacados
  // valueHighlight: {
  //   fontSize: 20,
  //   fontWeight: '600',
  //   letterSpacing: -0.2,
  // },
  
  // // Container com bordas elegantes
  // elegantBorder: {
  //   borderWidth: 0.5,
  //   borderColor: colors.borderLight,
  //   borderRadius: 10,
  //   backgroundColor: colors.background + '60',
  // },

  // Estilos para seções de investimentos
  // investmentCard: {
  //   backgroundColor: colors.cardBackground,
  //   borderRadius: 10,
  //   padding: 14,
  //   marginBottom: 10,
  //   elevation: 2,
  //   shadowColor: colors.balance,
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.06,
  //   shadowRadius: 4,
  //   borderLeftWidth: 3,
  //   borderLeftColor: colors.balance,
  // },
   investmentItem: {
    gap: 5,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  investmentName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
    fontStyle: 'italic',
  },
  // // Estilos para seções de empréstimos
  // loanCard: {
  //   backgroundColor: colors.cardBackground,
  //   borderRadius: 10,
  //   padding: 14,
  //   marginBottom: 10,
  //   elevation: 2,
  //   shadowColor: colors.pending,
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.06,
  //   shadowRadius: 4,
  //   borderLeftWidth: 3,
  //   borderLeftColor: colors.pending,
  // },
  
  // // Estilos para seções de gastos fixos
  // expenseCard: {
  //   backgroundColor: colors.cardBackground,
  //   borderRadius: 10,
  //   padding: 14,
  //   marginBottom: 10,
  //   elevation: 2,
  //   shadowColor: colors.expense,
  //   shadowOffset: { width: 0, height: 2 },
  //   shadowOpacity: 0.06,
  //   shadowRadius: 4,
  //   borderLeftWidth: 3,
  //   borderLeftColor: colors.expense,
  // },
// donutWrapper: {
//   alignItems: 'center',
//   justifyContent: 'center',
// },
// donutChartLarge: {
//   height: 100,
//   width: 100,
// },
// avatarWrapper: {
//   position: 'absolute',
//   alignItems: 'center',
// },
// avatarImage: {
//   width: 40,
//   height: 40,
//   borderRadius: 20,
//   borderWidth: 2,
//   borderColor: '#fff',
// },
// avatarPercent: {
//   fontSize: 10,
//   marginTop: 2,
//   color: colors.textPrimary,
// },



// Avatares no donut
donutWrapper: {
  alignItems: 'center',
  justifyContent: 'center',
},
listAvatar: {
  width: 24,
  height: 24,
  borderRadius: 12,
  marginRight: 8,
},











  // Status de Empréstimos e Gastos
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 75,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  statusBadgePaid: {
    backgroundColor: colors.badgePaid,
    borderWidth: 0.5,
    borderColor: colors.balance + '30',
  },
  statusBadgePending: {
    backgroundColor: colors.badgePending,
    borderWidth: 0.5,
    borderColor: colors.pending + '30',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },

  // Barra de progresso
  progressBackground: {
    height: 8,
    backgroundColor: colors.progressBackground,
    borderRadius: 4,
    overflow: 'hidden',
    elevation: 0,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: colors.progressFill,
    elevation: 0,
  },

  // Mini Resumo
  miniResumoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: -12
  },
  miniCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderLeftWidth: 4,
    marginBottom: -12
  },
  miniCardTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  miniCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  miniCardNote: {
    fontSize: 10,
    color: colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },

  botaoGerarFixas:{position: 'absolute',
    bottom: 65,
    left: 20,
    backgroundColor: colors.primary,
    paddingHorizontal: 3,
    paddingVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 30,
    zIndex: 100,
  },
  textoBotao: {
    color: colors.background,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },

  // =================================================
  // 🔹 ESTILOS PARA MODAIS (ADICIONADOS/CENTRALIZADOS)
  // =================================================
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContainer: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1, 
  },
  modalSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
    marginTop: -12, 
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 20,
    marginBottom: 8,
  },
  modalValorAtual: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  modalProgressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  modalMetaText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  modalBotaoAdd: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  modalBotaoAddTexto: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // --- Inputs e Labels para Modais ---
  label: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.background,
    color: colors.textPrimary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },

  // --- Seletores de Tipo (Aporte/Retirada) ---
  tipoContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  tipoBotao: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  tipoTexto: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  tipoBotaoAtivoVerde: {
    backgroundColor: colors.balance,
  },
  tipoBotaoAtivoVermelho: {
    backgroundColor: colors.expense,
  },
  tipoTextoAtivo: {
    color: colors.textPrimary,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  infoRowIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  infoRowLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  infoRowValue: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  // =================================================
  // 🔹 ESTILOS PARA O RESUMO FINANCEIRO NO MODAL
  // =================================================
  resumoFinanceiroContainer: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  resumoFinanceiroLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  resumoFinanceiroValor: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 4,
  },
// --- Botão de ação pequeno (ex: adiantar, editar, excluir)
iconButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 6,
  paddingHorizontal: 7,
  borderRadius: 20,
  marginLeft: 6,
},

iconButtonWarning: {
  backgroundColor: colors.pending + '20',
},
// --- Cartões de lista menores (CartaoEmprestadoCard, etc)
smallCard: {
  padding: 16,
  marginBottom: 12,
  borderRadius: 12,
  backgroundColor: colors.cardBackground,
  borderLeftWidth: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3.84,
  elevation: 3,
},
cardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 12,
},
cardTitleSmall: {
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 6,
},
// descricao: {
//   color: colors.textPrimary,
//   fontSize: 16,
//   fontWeight: '500',
//   marginBottom: 12,
//   lineHeight: 22,
// },
pessoaNome: {
  color: colors.textSecondary,
  fontSize: 14,
  marginLeft: 6,
},
valorTotal: {
  color: colors.textPrimary,
  fontSize: 16,
  fontWeight: 'bold',
},
valorLabel: {
  color: colors.textSecondary,
  fontSize: 12,
},
footerContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderTopWidth: 1,
  borderTopColor: colors.borderLight,
  paddingTop: 12,
  marginTop: 4,
},

// =================================================
// 🔹 ESTILOS PARA O MENU FAB (Floating Action Button) - VERSÃO CORRIGIDA
// =================================================
fabMenuContainer: {
  position: 'absolute',
  right: 20, // Um pouco mais de espaço da borda
  bottom: 65, // Sobe um pouco para não ficar colado na Tab Bar
  alignItems: 'flex-end',
},
// 👇 REMOVIDO: 'position: absolute' daqui. O container pai já é absoluto.
fabMenuItemContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  paddingBottom: 4,
  width: '100%', 
},
fabMenuItemLabel: {
  backgroundColor: colors.cardBackground,
  color: colors.textPrimary,
  fontSize: 14,
  fontWeight: '500',
  marginRight: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  borderRadius: 8,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.15,
  shadowRadius: 2,
},
fabMenuItemButton: {
  width: 38, // Um pouco maior para um toque mais fácil
  height: 38,
  borderRadius: 30,
  backgroundColor: colors.cardBackground, // Cor de fundo para combinar com o label
  borderWidth: 1.5,
  borderColor: colors.primary,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 4,
},
fabPrimary: {
  width: 38,
  height: 38,
  borderRadius: 30,
  backgroundColor: colors.primary,
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 6,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  zIndex: 10, 
},  
fabItemsWrapper: {
  alignItems: 'flex-end',
},
  // =================================================
  // 🔹 ESTILOS PARA TELAS DE GERENCIAMENTO (Modelos)
  // =================================================
  fullScreenModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  managementModalContainer: {
    width: '95%',
    height: '80%',
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
  },
  managementModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  managementModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  modeloItemRow: { // Renomeado de itemContainer para ser mais específico
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modeloItemDescricao: { // Reutilizando estilo já existente
    color: colors.textPrimary,
    fontSize: 16,
  },
  modeloItemDetalhes: { // Reutilizando estilo já existente
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  formContainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 16,
  },

    // =================================================
  // 🔹 ESTILOS PARA ABAS DAS CONFIGURAÇÕES DE MODELOS
  // =================================================

tabHeader: {
  flexDirection: "row",
  marginBottom: 12,
},
tabButton: {
  flex: 1,
  paddingVertical: 10,
  alignItems: "center",
  borderBottomWidth: 2,
  borderBottomColor: "transparent",
},
tabButtonActive: {
  borderBottomColor: colors.primary,
},
tabButtonText: {
  fontSize: 16,
  fontWeight: "600",
  color: colors.textSecondary,
},
inputError: {
    borderColor: colors.error, // Borda vermelha para indicar erro
  },
  errorMessage: {
    color: colors.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
buttonRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 20,
},

rightButtons: {
  flexDirection: 'row',
  alignItems: 'center',
},

deleteButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.error,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginRight: 10, // espaço antes do grupo da direita
},
deleteButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
  marginLeft: 6,
},

cancelButton: {
  backgroundColor: colors.textSecondary + '20',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
},
cancelButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},

saveButton: {
  backgroundColor: colors.primary,
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginLeft: 10,
},
saveButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},



  // =================================================
  // 🔹 ESTILOS PARA ABAS DA TELA DE SAÍDAS (Top Tabs)
  // =================================================
  topTabContainer: { // Renomeado de 'tabHeader' para evitar conflito
    flexDirection: 'row',
    marginBottom: -5, // Aumentei um pouco a margem inferior para dar mais respiro
    marginTop: -25,
  },
  topTabButton: { // Renomeado de 'tabButton'
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10, // Aumentei o padding para uma área de toque maior
    borderRadius: 10,
    borderBottomWidth: 2, // Aumentei a espessura para mais destaque
    borderBottomColor: 'transparent', // Inativo é transparente
  },
  topTabButtonActive: { // Renomeado de 'tabButtonActive'
    borderBottomColor: colors.primary, // Apenas a borda inferior fica colorida
  },
  topTabButtonText: { // Renomeado de 'tabButtonText'
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  topTabButtonTextActive: { // Novo estilo para o texto ativo
    color: colors.textPrimary,
  },
});


