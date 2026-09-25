import {
  somarBase,
  calcularValorPercentual,
  converterBaseLegada,
  arredondarCentavos,
  temBaseNova,
} from '../basePercentual';

const modelosEntrada = [
  { id: 'salario', descricao: 'Salário' },
  { id: 'aluguel', descricao: 'Aluguel recebido' },
];

describe('somarBase', () => {
  const entradasDoMes = [
    { id: 'e1', origemModelo: true, modeloId: 'salario', descricao: 'Salário', valor: 5000 },
    { id: 'e2', origemModelo: true, modeloId: 'aluguel', descricao: 'Aluguel recebido', valor: 1200 },
    { id: 'e3', descricao: 'Freela', valor: 800 },
    { id: 'e4', origemModelo: false, descricao: 'Venda', valor: 150.5 },
  ];

  it('soma só as entradas dos modelos escolhidos', () => {
    const base = { baseModelosEntrada: ['salario'], baseIncluiAvulsas: false };
    expect(somarBase(base, entradasDoMes, modelosEntrada)).toBe(5000);
  });

  it('inclui as avulsas quando marcado', () => {
    const base = { baseModelosEntrada: ['salario'], baseIncluiAvulsas: true };
    expect(somarBase(base, entradasDoMes, modelosEntrada)).toBe(5950.5);
  });

  it('só avulsas, sem nenhum modelo', () => {
    const base = { baseModelosEntrada: [], baseIncluiAvulsas: true };
    expect(somarBase(base, entradasDoMes, modelosEntrada)).toBe(950.5);
  });

  it('entrada antiga (sem modeloId) conta pela descrição do modelo', () => {
    const antigas = [
      { origemModelo: true, descricao: ' salário ', valor: 4000 },
      { origemModelo: true, descricao: 'Outra coisa', valor: 999 },
    ];
    const base = { baseModelosEntrada: ['salario'], baseIncluiAvulsas: false };
    expect(somarBase(base, antigas, modelosEntrada)).toBe(4000);
  });

  it('entrada gerada por modelo nunca conta como avulsa', () => {
    const base = { baseModelosEntrada: [], baseIncluiAvulsas: true };
    const soDeModelo = [{ origemModelo: true, modeloId: 'salario', valor: 5000 }];
    expect(somarBase(base, soDeModelo, modelosEntrada)).toBe(0);
  });

  it('mês sem entradas dá zero', () => {
    const base = { baseModelosEntrada: ['salario'], baseIncluiAvulsas: true };
    expect(somarBase(base, [], modelosEntrada)).toBe(0);
  });

  it('aceita valor salvo como texto no formato brasileiro', () => {
    const base = { baseModelosEntrada: [], baseIncluiAvulsas: true };
    expect(somarBase(base, [{ descricao: 'X', valor: '1.234,56' }], [])).toBe(1234.56);
  });
});

describe('calcularValorPercentual / arredondarCentavos', () => {
  it('calcula a porcentagem', () => {
    expect(calcularValorPercentual(5000, 10)).toBe(500);
  });

  it('arredonda para centavos', () => {
    expect(calcularValorPercentual(1234.56, 7.5)).toBe(92.59); // 92.592
    expect(arredondarCentavos(1.005)).toBe(1.01); // toFixed daria 1.00
  });
});

describe('converterBaseLegada', () => {
  it('entrada com modeloId vira o modelo', () => {
    const r = converterBaseLegada(
      [{ origemModelo: true, modeloId: 'salario', descricao: 'Salário' }],
      modelosEntrada
    );
    expect(r).toEqual({ baseModelosEntrada: ['salario'], baseIncluiAvulsas: false });
  });

  it('entrada antiga sem modeloId acha o modelo pela descrição', () => {
    const r = converterBaseLegada(
      [{ origemModelo: true, descricao: 'aluguel recebido' }],
      modelosEntrada
    );
    expect(r).toEqual({ baseModelosEntrada: ['aluguel'], baseIncluiAvulsas: false });
  });

  it('entrada avulsa liga "avulsas do mês"', () => {
    const r = converterBaseLegada(
      [
        { origemModelo: true, modeloId: 'salario' },
        { descricao: 'Freela' },
      ],
      modelosEntrada
    );
    expect(r).toEqual({ baseModelosEntrada: ['salario'], baseIncluiAvulsas: true });
  });

  it('não repete o mesmo modelo', () => {
    const r = converterBaseLegada(
      [
        { origemModelo: true, modeloId: 'salario' },
        { origemModelo: true, descricao: 'Salário' },
      ],
      modelosEntrada
    );
    expect(r.baseModelosEntrada).toEqual(['salario']);
  });

  it('nada convertível (entradas apagadas ou modelo inexistente) → null', () => {
    expect(converterBaseLegada([], modelosEntrada)).toBeNull();
    expect(
      converterBaseLegada([{ origemModelo: true, descricao: 'Modelo apagado' }], modelosEntrada)
    ).toBeNull();
  });
});

describe('temBaseNova', () => {
  it('diferencia base nova de legado', () => {
    expect(temBaseNova({ baseModelosEntrada: [] })).toBe(true);
    expect(temBaseNova({ entradasSelecionadas: ['x'] })).toBe(false);
  });
});
