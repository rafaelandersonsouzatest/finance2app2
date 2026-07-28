// src/utils/perfil.js
// Única fonte da regra "qual nome mostrar" — usada no cabeçalho
// (TelaPadrao.js), no Menu do Usuário (UserMenu.js) e em ContaScreen.js.
// Antes desta sprint, cada um repetia a mesma cadeia de fallback; extraído
// para não haver um 4º lugar divergindo quando o fallback for ajustado.
export function getNomeExibicao(profile) {
  return (
    profile?.apelido ||
    profile?.nome ||
    (profile?.email ? profile.email.split('@')[0] : null) ||
    'Usuário'
  );
}
