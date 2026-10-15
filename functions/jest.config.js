module.exports = {
  testEnvironment: "node",
  // Os testes de regras (regras/) precisam do emulador do Firestore rodando —
  // ficam fora do `npm test` e rodam com `npm run test:regras`.
  testPathIgnorePatterns: ["/node_modules/", "/regras/"],
  // Por padrão o Jest não transforma nada em node_modules — `jose` (ESM-only,
  // puxado por firebase-functions/v2/https) precisa da exceção abaixo.
  transformIgnorePatterns: ["node_modules/(?!(jose)/)"],
};
