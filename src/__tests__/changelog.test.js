// O número de versão do Sobre vem de src/config/changelog.js. Este teste
// garante que toda entrada tem número no formato MAIOR.MENOR.CORREÇÃO e que a
// lista está do mais novo para o mais antigo, sem repetir número — o Sobre
// mostra sempre o da primeira entrada.
import { CHANGELOG } from '../config/changelog';

const comparar = (a, b) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
};

describe('changelog (versão exibida no Sobre)', () => {
  it('toda entrada tem versão MAIOR.MENOR.CORREÇÃO, data e texto', () => {
    for (const entrada of CHANGELOG) {
      expect(entrada.versao).toMatch(/^\d+\.\d+\.\d+$/);
      expect(entrada.data).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entrada.texto.length).toBeGreaterThan(0);
    }
  });

  it('do mais novo para o mais antigo, sem repetir número', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(comparar(CHANGELOG[i - 1].versao, CHANGELOG[i].versao)).toBeGreaterThan(0);
    }
  });
});
