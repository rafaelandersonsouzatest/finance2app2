// Guardião da exclusão de conta: toda coleção que o app grava dentro de
// users/{uid}/... precisa estar em SUBCOLECOES_DO_USUARIO
// (src/utils/excluirDadosDoUsuario.js) — senão, ao excluir a conta, os dados
// dessa coleção ficariam para trás (falha de LGPD/Google Play).
//
// Se este teste falhar: acrescente a coleção nova na lista de
// excluirDadosDoUsuario.js.
const fs = require('fs');
const path = require('path');
// O teste só precisa da lista — o Firebase de verdade não é carregado.
jest.mock('firebase/firestore', () => ({}));
import { SUBCOLECOES_DO_USUARIO } from '../utils/excluirDadosDoUsuario';

const RAIZ = path.join(__dirname, '..');

function arquivosJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivosJs(caminho);
    return e.name.endsWith('.js') ? [caminho] : [];
  });
}

// Formas como o app monta caminhos dentro do usuário:
//   `${basePath}/gastos`, `${getBasePath(user)}/entradas`
//   doc(db, 'users', user.uid, 'conexoes', ...)
const PADROES = [
  /\$\{\s*(?:basePath|getBasePath\([^)]*\))\s*\}\/(\w+)/g,
  /['"]users['"]\s*,\s*[\w.?]+\s*,\s*['"](\w+)['"]/g,
];

function colecoesUsadas() {
  const achadas = new Map();
  for (const arquivo of arquivosJs(RAIZ)) {
    const rel = path.relative(RAIZ, arquivo).replace(/\\/g, '/');
    if (rel === 'utils/excluirDadosDoUsuario.js') continue;
    const codigo = fs
      .readFileSync(arquivo, 'utf8')
      .split(/\r?\n/)
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join('\n');
    for (const padrao of PADROES) {
      for (const m of codigo.matchAll(padrao)) {
        if (!achadas.has(m[1])) achadas.set(m[1], rel);
      }
    }
  }
  return achadas;
}

describe('exclusão de conta apaga todas as coleções do usuário', () => {
  it('o levantamento encontra as coleções conhecidas (o teste está funcionando)', () => {
    const usadas = colecoesUsadas();
    for (const nome of ['gastos', 'entradas', 'membros', 'conexoes']) {
      expect(usadas.has(nome)).toBe(true);
    }
  });

  it('toda coleção usada no app está em SUBCOLECOES_DO_USUARIO', () => {
    const faltando = [...colecoesUsadas()]
      .filter(([nome]) => !SUBCOLECOES_DO_USUARIO.includes(nome))
      .map(([nome, arquivo]) => `${nome} (usada em ${arquivo})`);
    expect(faltando).toEqual([]);
  });
});
