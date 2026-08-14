module.exports = {
  testEnvironment: "node",
  // Por padrão o Jest não transforma nada em node_modules — `jose` (ESM-only,
  // puxado por firebase-functions/v2/https) precisa da exceção abaixo.
  transformIgnorePatterns: ["node_modules/(?!(jose)/)"],
};
