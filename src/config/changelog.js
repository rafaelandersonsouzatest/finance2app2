// Lista curta e manual do que mudou nas últimas atualizações — exibida na
// tela Sobre (SobreScreen.js) para o usuário/testador conseguir confirmar
// se uma atualização específica já chegou. Mais recente primeiro. Atualizar
// à mão ao publicar algo que valha a pena o usuário saber (não precisa
// listar toda mudança interna/técnica).
//
// 🔹 `versao` (MAIOR.MENOR.CORREÇÃO) é o número que o usuário vê no Sobre —
// a cada publicação, uma entrada nova com o número seguinte:
//   - CORREÇÃO (1.10.0 → 1.10.1): só conserto de bug;
//   - MENOR (1.10.1 → 1.11.0): funcionalidade nova;
//   - MAIOR (1.x → 2.0.0): mudança grande no app.
// A versão interna do app (`version` no app.json) NÃO acompanha: mudá-la
// muda a "etiqueta" de compatibilidade e o APK instalado para de receber
// atualizações. Ela só é igualada a este número quando sai um build novo
// (APK/loja). Ver PROJECT_STATUS.md seção 0.
export const CHANGELOG = [
  {
    versao: '1.10.0',
    data: '2026-10-15',
    texto: 'Agora dá para excluir a sua conta em Menu → Conta. No iPhone, o app não trava mais depois de salvar, editar ou excluir. Cores do app revisadas e padronizadas.',
  },
  {
    versao: '1.8.0',
    data: '2026-10-10',
    texto: 'Formulários agora sobem de verdade quando o teclado abre também no app instalado (APK), e o fim das janelas não fica mais atrás dos botões de navegação do celular. No Android, é preciso instalar o APK novo uma vez.',
  },
  {
    versao: '1.7.1',
    data: '2026-10-09',
    texto: 'O teclado não cobre mais o que você está digitando nos formulários, e o menu do usuário passa a rolar quando a fonte do celular está grande.',
  },
  {
    versao: '1.7.0',
    data: '2026-09-25',
    texto: '"Gerar do Mês" agora gera só os modelos que faltam (dá para escolher quais), novo modelo pode ser lançado no mês na hora, e gastos em porcentagem não vêm mais zerados nos meses novos.',
  },
  {
    versao: '1.6.2',
    data: '2026-09-20',
    texto: 'Corrige o botão "+" ficando atrás do menu inferior em celulares Android com navegação por 3 botões.',
  },
  {
    versao: '1.6.1',
    data: '2026-09-19',
    texto: 'Atualização interna do Expo (compatibilidade com o Expo Go atual) e correção para a sessão de login não cair ao reabrir o app.',
  },
];
