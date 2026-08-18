// functions/tempoUtil.js
// Compartilhado entre conexoes.js e divisaoDespesa.js — mesma regra de
// expiração "preguiçosa" (ver COLABORACAO_ARQUITETURA_V1.md seção 1) usada
// tanto para solicitação de conexão quanto para convite de divisão de
// despesa. Extraído para não duplicar a lógica de data em dois arquivos.
function diasDesde(timestamp) {
  if (!timestamp) return Infinity;
  const ms = typeof timestamp.toMillis === "function" ? timestamp.toMillis() : timestamp;
  return (Date.now() - ms) / (1000 * 60 * 60 * 24);
}

const EXPIRACAO_PENDENTE_DIAS = 15;

module.exports = { diasDesde, EXPIRACAO_PENDENTE_DIAS };
