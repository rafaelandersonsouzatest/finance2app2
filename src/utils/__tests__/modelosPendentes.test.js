import { calcularModelosPendentes } from '../modelosPendentes';

const modelos = [
  { id: 'a', descricao: 'Aluguel' },
  { id: 'b', descricao: 'Academia' },
  { id: 'c', descricao: 'Internet' },
];
const ids = (lista) => lista.map((m) => m.id);

describe('calcularModelosPendentes', () => {
  it('mês vazio: tudo pendente', () => {
    expect(ids(calcularModelosPendentes(modelos, []))).toEqual(['a', 'b', 'c']);
  });

  it('lançamento com modeloId marca o modelo como gerado, mesmo renomeado', () => {
    const lancamentos = [{ origemModelo: true, modeloId: 'a', descricao: 'Renomeado' }];
    expect(ids(calcularModelosPendentes(modelos, lancamentos))).toEqual(['b', 'c']);
  });

  it('lançamento antigo (sem modeloId) conta pela descrição', () => {
    const lancamentos = [{ origemModelo: true, descricao: ' aluguel ' }];
    expect(ids(calcularModelosPendentes(modelos, lancamentos))).toEqual(['b', 'c']);
  });

  it('lançamento manual com o mesmo nome não conta', () => {
    const lancamentos = [{ descricao: 'Aluguel' }];
    expect(ids(calcularModelosPendentes(modelos, lancamentos))).toEqual(['a', 'b', 'c']);
  });

  it('tudo gerado: nada pendente', () => {
    const lancamentos = [
      { origemModelo: true, modeloId: 'a' },
      { origemModelo: true, modeloId: 'b' },
      { origemModelo: true, descricao: 'Internet' },
    ];
    expect(calcularModelosPendentes(modelos, lancamentos)).toEqual([]);
  });
});
