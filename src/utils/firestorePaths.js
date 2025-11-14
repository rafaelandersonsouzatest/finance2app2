export const getBasePath = (user, compartilhado = false) => {
  if (!user?.uid) throw new Error("Usuário não autenticado.");

  // 🔸 Quando o modo família for ativado, se o usuário pertencer a um grupo:
  if (compartilhado && user.tenantId) {
    return `tenants/${user.tenantId}`;
  }

  // 🔸 Caminho padrão individual:
  return `users/${user.uid}`;
};
