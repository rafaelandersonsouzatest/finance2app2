// src/utils/membros.js
// Única fonte da regra "este membro é o proprietário da conta" — ver
// SPRINT5_DISCOVERY.md seção 12. Centraliza a decisão aqui em vez de
// comparar `ehProprietario` em cada lugar, para que papéis futuros da
// identidade do sistema (administrador, dependente, convidado, responsável,
// etc.) exijam mudar só este arquivo.
export function isMembroProprietario(membro) {
  return membro?.ehProprietario === true;
}
