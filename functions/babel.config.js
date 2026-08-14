// Só existe pra permitir que o Jest transforme `jose` (dependência ESM-only
// puxada indiretamente por firebase-functions/v2/https → firebase-admin/auth
// → jwks-rsa) — ver jest.config.js e a descoberta registrada em
// ARQUITETURA.md (seção 16.1/7.3, 2026-08-13). Não afeta o runtime real das
// Functions (isso só é usado pelo Jest).
module.exports = {
  presets: [["@babel/preset-env", { targets: { node: "current" } }]],
};
