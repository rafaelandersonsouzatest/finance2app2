// Guardião da regra "Estilos e cores" do CLAUDE.md: nenhuma cor escrita à mão
// ('#FF8A65', 'rgba(0,0,0,0.6)') fora de src/styles/colors.js — sempre um
// nome de `colors`. É o que deixa o app pronto para tema claro/escuro.
//
// Se este teste falhar num arquivo seu: troque a cor por `colors.<nome>`; se
// a cor não existir, crie o nome em src/styles/colors.js (com significado:
// `colors.gasto`, não `colors.laranja`).
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

// Exceções permanentes — a cor ali é DADO, não tema.
const PERMANENTES = {
  'styles/colors.js': 'é a própria paleta',
  'utils/avatar.js': 'cores do avatar são parâmetros do gerador (DiceBear), escolhidas pelo usuário',
  'utils/categoriasPadrao.js': 'cor inicial de cada categoria padrão é dado (o usuário pode trocar)',
};

// Arquivos ainda não migrados (levantamento de 2026-10-13). A lista só
// encolhe: ao corrigir um arquivo, tire-o daqui — o segundo teste abaixo
// avisa se um arquivo daqui já estiver limpo e esquecido na lista.
const PENDENTES = [
  'components/AlertaModal.js',
  'components/AvatarEditor.js',
  'components/AvatarRenderer.js',
  'components/CartaoSelect.js',
  'components/CartaoVisual.js',
  'components/CategoriaSelect.js',
  'components/CustomTabBar.js',
  'components/DetalhesInvestimentoModal.js',
  'components/EditarMembroModal.js',
  'components/FabMenu.js',
  'components/FiltroComponent.js',
  'components/GastoCartaoCard.js',
  'components/GerenciarModelosModal.js',
  'components/ItemConviteDivisao.js',
  'components/ItemPropostaAlteracao.js',
  'components/ItemValorSemDestino.js',
  'components/MembroSelect.js',
  'components/ModalAdicionarParticipante.js',
  'components/ModalCompartilharDespesa.js',
  'components/ModalDecidirDestino.js',
  'components/ModalEdicao.js',
  'components/ModalEditarCotaMembro.js',
  'components/ModalGerarPendentes.js',
  'components/ModalParcelasAdiantamento.js',
  'components/ModalProporAlteracao.js',
  'components/TelaPadrao.js',
  'components/UserMenu.js',
  'components/carteira/CartoesManager.js',
  'components/carteira/FormularioCartaoModal.js',
  'components/planejamento/CategoriasManager.js',
  'components/planejamento/FormularioCategoriaModal.js',
  'hooks/useAdiantamento.js',
  'hooks/useCarteira.js',
  'hooks/useCartoes.js',
  'hooks/useCategorias.js',
  'screens/AlterarSenhaScreen.js',
  'screens/CartoesScreen.js',
  'screens/ConexoesScreen.js',
  'screens/SaidasScreen.js',
];

// Cor hexadecimal entre aspas, ou rgb()/rgba() com números (uma cor
// CALCULADA, como `rgb(${r}, ...)` em CartaoVisual, não conta).
const PADRAO_COR = /['"](#[0-9A-Fa-f]{3,8})['"]|rgba?\(\s*\d/g;

function arquivosJs(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const caminho = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === '__tests__' ? [] : arquivosJs(caminho);
    return e.name.endsWith('.js') ? [caminho] : [];
  });
}

function coresEscritasAMao(arquivo) {
  const achados = [];
  fs.readFileSync(arquivo, 'utf8')
    .split(/\r?\n/)
    .forEach((linha, i) => {
      const t = linha.trim();
      // Código comentado fica de fora (limpeza separada, ver PROJECT_STATUS.md).
      if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('{/*')) return;
      for (const m of linha.matchAll(PADRAO_COR)) achados.push(`linha ${i + 1}: ${m[0]}`);
    });
  return achados;
}

const todos = arquivosJs(RAIZ).map((f) => ({
  rel: path.relative(RAIZ, f).replace(/\\/g, '/'),
  abs: f,
}));

describe('cores centralizadas em src/styles/colors.js', () => {
  it('nenhuma cor escrita à mão fora das exceções', () => {
    const violacoes = todos
      .filter(({ rel }) => !PERMANENTES[rel] && !PENDENTES.includes(rel))
      .flatMap(({ rel, abs }) => coresEscritasAMao(abs).map((a) => `${rel} — ${a}`));
    expect(violacoes).toEqual([]);
  });

  it('a lista de pendentes não tem arquivo já corrigido (tire-o da lista)', () => {
    const jaLimpos = PENDENTES.filter((rel) => {
      const abs = path.join(RAIZ, rel);
      return !fs.existsSync(abs) || coresEscritasAMao(abs).length === 0;
    });
    expect(jaLimpos).toEqual([]);
  });
});
