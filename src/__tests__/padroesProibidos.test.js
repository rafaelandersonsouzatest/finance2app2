// Padrões de código que já causaram bug e não devem voltar.
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

function arquivosJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivosJs(caminho);
    return e.name.endsWith('.js') ? [caminho] : [];
  });
}

function ocorrencias(padrao) {
  return arquivosJs(RAIZ).flatMap((arquivo) =>
    fs
      .readFileSync(arquivo, 'utf8')
      .split(/\r?\n/)
      .flatMap((linha, i) => {
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(linha)) return [];
        return padrao.test(linha)
          ? [`${path.relative(RAIZ, arquivo).replace(/\\/g, '/')} linha ${i + 1}`]
          : [];
      })
  );
}

describe('padrões proibidos', () => {
  // `import('react-native')` dinâmico: no iPhone falhava no toque (botões
  // "Valor Total / Valor da Parcela" sem resposta, 2026-10-15) e copiava o
  // react-native inteiro, disparando avisos de componentes descontinuados.
  // Importe no topo do arquivo: import { X } from 'react-native'.
  it("nenhum import('react-native') dinâmico", () => {
    expect(ocorrencias(/import\(\s*['"]react-native['"]\s*\)/)).toEqual([]);
  });
});
