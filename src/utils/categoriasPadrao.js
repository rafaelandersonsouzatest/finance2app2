// src/utils/categoriasPadrao.js
// Catálogo de categorias padrão semeado no Firestore de cada usuário na
// primeira vez que useCategorias encontra a coleção vazia (ver
// SPRINT4_DISCOVERY.md, seções 1 e 3). IDs determinísticos (não gerados por
// addDoc) para que semear duas vezes seja seguro — um `set` repetido só
// sobrescreve com os mesmos dados, nunca duplica.
export const CATEGORIAS_PADRAO_SEED = [
  { id: 'padrao-moradia', nome: 'Moradia', tipoTransacao: 'despesa', icone: 'home-outline', cor: '#8D6E63', ordem: 1 },
  {
    id: 'padrao-transporte', nome: 'Transporte', tipoTransacao: 'despesa', icone: 'car-outline', cor: '#42A5F5', ordem: 2,
    subcategorias: [
      { id: 'padrao-transporte-combustivel', nome: 'Combustível' },
      { id: 'padrao-transporte-uber', nome: 'Uber' },
      { id: 'padrao-transporte-manutencao', nome: 'Manutenção' },
    ],
  },
  {
    id: 'padrao-alimentacao', nome: 'Alimentação', tipoTransacao: 'despesa', icone: 'food-outline', cor: '#FF8A65', ordem: 3,
    subcategorias: [
      { id: 'padrao-alimentacao-mercado', nome: 'Mercado' },
      { id: 'padrao-alimentacao-restaurante', nome: 'Restaurante' },
      { id: 'padrao-alimentacao-delivery', nome: 'Delivery' },
    ],
  },
  { id: 'padrao-saude', nome: 'Saúde', tipoTransacao: 'despesa', icone: 'medical-bag', cor: '#EF5350', ordem: 4 },
  { id: 'padrao-educacao', nome: 'Educação', tipoTransacao: 'despesa', icone: 'school-outline', cor: '#AB47BC', ordem: 5 },
  { id: 'padrao-doacoes', nome: 'Doações', tipoTransacao: 'despesa', icone: 'hand-heart-outline', cor: '#EC407A', ordem: 6 },
  { id: 'padrao-lazer', nome: 'Lazer', tipoTransacao: 'despesa', icone: 'movie-outline', cor: '#7E57C2', ordem: 7 },
  { id: 'padrao-impostos', nome: 'Impostos', tipoTransacao: 'despesa', icone: 'file-document-outline', cor: '#78909C', ordem: 8 },
  { id: 'padrao-renda', nome: 'Renda', tipoTransacao: 'receita', icone: 'cash-plus', cor: '#66BB6A', ordem: 9 },
  { id: 'padrao-outros', nome: 'Outros', tipoTransacao: 'ambos', icone: 'shape-outline', cor: '#8D6E63', ordem: 10 },
];
