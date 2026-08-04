// 🔹 Firestore rejeita qualquer campo com valor `undefined` em addDoc/setDoc/
// updateDoc/batch (lança "Unsupported field value: undefined"). Em vez de
// depender de cada tela nunca deixar passar `undefined`, remove essas
// chaves antes de qualquer escrita — mesmo princípio de `sanitizarOpcoes`
// em `utils/avatar.js`. Usado por `useCartoes.js`, `useEntradas.js`,
// `useGastos.js` e `useEmprestimos.js` (ver ARQUITETURA.md seção 15.11).
//
// ⚠️ Remove SOMENTE `undefined` — nunca `null` (faz parte da modelagem do
// app, ex.: categoria não selecionada), string vazia, `NaN`, `0`, `false` ou
// objetos/arrays vazios. Todos esses valores são válidos no Firestore e
// devem ser preservados exatamente como vieram.
export const removerIndefinidos = (objeto) => {
  const limpo = {};
  Object.keys(objeto).forEach((chave) => {
    if (objeto[chave] !== undefined) limpo[chave] = objeto[chave];
  });
  return limpo;
};
