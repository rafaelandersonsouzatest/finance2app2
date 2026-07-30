// src/utils/avatar.js
// Motor de geração/renderização/edição do avatar vetorial (Sprint 5 — ver
// SPRINT5_DISCOVERY.md seção 5). Única camada que conhece o mecanismo real
// (hoje DiceBear/avataaars) — `AvatarRenderer.js` e `AvatarEditor.js` só
// chamam as funções exportadas aqui, nunca importam `@dicebear/*`
// diretamente. Trocar o motor no futuro é mudar só este arquivo.
import { Avatar as DicebearAvatar, Style } from "@dicebear/core";
import avataaarsStyleJson from "@dicebear/styles/avataaars.json";

const avataaarsStyle = new Style(avataaarsStyleJson);

const MOTOR_PADRAO = "dicebear";
const ESTILO_PADRAO = "avataaars";

// Sentinelas usados nos catálogos abaixo — não são valores do DiceBear, são
// convenções deste arquivo para representar "nenhum" nas categorias em que
// o DiceBear não tem um valor de enum para isso.
const SEM_BARBA = "sem_barba";
const SEM_ACESSORIO = "sem_acessorio";
const FUNDO_TRANSPARENTE = "transparente";

// 🔹 Paletas próprias — o `avataaars` aceita qualquer hex livre em todo
// campo de cor (testado manualmente), então expandimos além da paleta
// "oficial" do estilo onde fazia sentido (pele e roupa), sem depender de
// mudança nenhuma no motor.
const PALETA_TOM_DE_PELE = [
  "#4a2c13", "#614335", "#8d5524", "#ae5d29", "#c68642",
  "#d08b5b", "#e0ac69", "#edb98a", "#f1c27d", "#ffdbb4",
  "#ffe0bd", "#fd9841", "#f8d25c",
];

const PALETA_COR_DA_ROUPA = [
  ...avataaarsStyleJson.colors.clothes.values,
  "#000000", "#6b4226", "#2e7d32", "#f57c00",
  "#7b1fa2", "#c2185b", "#0288d1", "#fdd835",
];

const PALETA_FUNDO = [
  FUNDO_TRANSPARENTE,
  "#b6e3f4",
  "#c0aede",
  "#d1d4f9",
  "#ffd5dc",
  "#ffdfbf",
];

// 🔹 Campos que `.toJSON().options` devolve mas que a própria lib não aceita
// de volta como entrada (rotação/translação/escala computadas por
// componente), além de qualquer valor `null`/`undefined` (o Firestore não
// aceita `undefined`, e `null` falha a validação de tipo do DiceBear para
// vários campos) — descartados antes de persistir ou depois de qualquer
// edição. Confirmado manualmente: removê-los (junto do `seed`) não muda o
// resultado visual, só os ids internos gerados em <defs>, que não afetam a
// renderização.
function sanitizarOpcoes(opcoes) {
  const limpas = {};
  for (const [chave, valor] of Object.entries(opcoes)) {
    if (chave === "seed") continue;
    if (/(Rotate|TranslateX|TranslateY|Scale)$/.test(chave)) continue;
    if (valor === null || valor === undefined) continue;
    limpas[chave] = valor;
  }
  return limpas;
}

function gerarDicebear(seed) {
  const avatar = new DicebearAvatar(avataaarsStyle, { seed, size: 128 });
  const { options } = avatar.toJSON();
  return {
    estilo: ESTILO_PADRAO,
    opcoes: sanitizarOpcoes(options),
  };
}

function renderizarDicebearSvg(dados) {
  const avatar = new DicebearAvatar(avataaarsStyle, dados.opcoes);
  return avatar.toString();
}

// =========================================================
// 🔹 Seções — só agrupamento visual (rótulo/ícone/descrição), sem nenhum
// nome de campo do DiceBear. Usadas pelo editor para montar as abas; uma
// seção só aparece se o estilo atual tiver pelo menos uma categoria
// pertencente a ela (ver `listarSecoesEditaveis`).
// =========================================================
const SECOES = [
  { chave: "pele", label: "Pele", icone: "palette-outline" },
  {
    chave: "cabelo",
    label: "Cabelo",
    icone: "content-cut",
    descricao:
      "No estilo atual, penteados e coberturas de cabeça (boné, turbante, lenço) compartilham a mesma opção — escolher uma substitui a outra.",
  },
  { chave: "barba", label: "Barba", icone: "face-man" },
  { chave: "roupa", label: "Roupa", icone: "tshirt-crew-outline" },
  { chave: "expressao", label: "Expressão", icone: "emoticon-outline" },
  { chave: "acessorios", label: "Acessórios", icone: "sunglasses" },
  { chave: "fundo", label: "Fundo", icone: "image-outline" },
];

// =========================================================
// 🔹 Catálogo de categorias editáveis, por estilo — motor-específico (só
// este arquivo conhece nomes de campo do DiceBear), mas exposto de forma
// genérica (`chave`, `label`, `tipo`, `secao`, `opcoes`) para quem
// consome. Adicionar uma categoria nova (e futuramente um estilo novo) é
// só um item de array aqui — nenhum componente precisa mudar.
// =========================================================
const CATEGORIAS_AVATAAARS = [
  {
    chave: "tomDePele",
    label: "Tom",
    secao: "pele",
    tipo: "cor",
    opcoes: PALETA_TOM_DE_PELE,
    ler: (opcoes) => opcoes.skinColor?.[0] || PALETA_TOM_DE_PELE[0],
    aplicar: (opcoes, valor) => ({ ...opcoes, skinColorFill: "solid", skinColor: [valor] }),
  },
  {
    chave: "cabelo",
    label: "Estilo",
    secao: "cabelo",
    tipo: "variante",
    opcoes: Object.keys(avataaarsStyleJson.components.top.variants),
    ler: (opcoes) => opcoes.topVariant,
    aplicar: (opcoes, valor) => ({ ...opcoes, topVariant: valor }),
  },
  {
    chave: "corDoCabelo",
    label: "Cor",
    secao: "cabelo",
    tipo: "cor",
    opcoes: avataaarsStyleJson.colors.hair.values,
    ler: (opcoes) => opcoes.hairColor?.[0] || avataaarsStyleJson.colors.hair.values[0],
    aplicar: (opcoes, valor) => ({ ...opcoes, hairColorFill: "solid", hairColor: [valor] }),
  },
  {
    // 🔹 O DiceBear não tem um valor de enum "sem barba" — a presença é
    // controlada por `facialHairProbability` (0 = nunca, 100 = sempre),
    // separado da variante em si. `SEM_BARBA` é a convenção deste arquivo
    // para expor isso como só mais uma opção da categoria.
    chave: "barba",
    label: "Estilo",
    secao: "barba",
    tipo: "variante",
    opcoes: [SEM_BARBA, ...Object.keys(avataaarsStyleJson.components.facialHair.variants)],
    ler: (opcoes) =>
      opcoes.facialHairProbability === 0 || !opcoes.facialHairVariant
        ? SEM_BARBA
        : opcoes.facialHairVariant,
    aplicar: (opcoes, valor) => {
      if (valor === SEM_BARBA) {
        const { facialHairVariant, ...resto } = opcoes;
        return { ...resto, facialHairProbability: 0 };
      }
      return { ...opcoes, facialHairProbability: 100, facialHairVariant: valor };
    },
  },
  {
    chave: "corDaBarba",
    label: "Cor",
    secao: "barba",
    tipo: "cor",
    opcoes: avataaarsStyleJson.colors.facialHair.values,
    ler: (opcoes) => opcoes.facialHairColor?.[0] || avataaarsStyleJson.colors.facialHair.values[0],
    aplicar: (opcoes, valor) => ({ ...opcoes, facialHairColorFill: "solid", facialHairColor: [valor] }),
  },
  {
    chave: "roupa",
    label: "Estilo",
    secao: "roupa",
    tipo: "variante",
    opcoes: Object.keys(avataaarsStyleJson.components.clothes.variants),
    ler: (opcoes) => opcoes.clothesVariant,
    aplicar: (opcoes, valor) => ({ ...opcoes, clothesVariant: valor }),
  },
  {
    chave: "corDaRoupa",
    label: "Cor",
    secao: "roupa",
    tipo: "cor",
    opcoes: PALETA_COR_DA_ROUPA,
    ler: (opcoes) => opcoes.clothesColor?.[0] || PALETA_COR_DA_ROUPA[0],
    aplicar: (opcoes, valor) => ({ ...opcoes, clothesColorFill: "solid", clothesColor: [valor] }),
  },
  {
    chave: "olhos",
    label: "Olhos",
    secao: "expressao",
    tipo: "variante",
    opcoes: Object.keys(avataaarsStyleJson.components.eyes.variants),
    ler: (opcoes) => opcoes.eyesVariant,
    aplicar: (opcoes, valor) => ({ ...opcoes, eyesVariant: valor }),
  },
  {
    chave: "sobrancelhas",
    label: "Sobrancelhas",
    secao: "expressao",
    tipo: "variante",
    opcoes: Object.keys(avataaarsStyleJson.components.eyebrows.variants),
    ler: (opcoes) => opcoes.eyebrowsVariant,
    aplicar: (opcoes, valor) => ({ ...opcoes, eyebrowsVariant: valor }),
  },
  {
    chave: "boca",
    label: "Boca",
    secao: "expressao",
    tipo: "variante",
    opcoes: Object.keys(avataaarsStyleJson.components.mouth.variants),
    ler: (opcoes) => opcoes.mouthVariant,
    aplicar: (opcoes, valor) => ({ ...opcoes, mouthVariant: valor }),
  },
  {
    // 🔹 Mesmo mecanismo de "sem barba": presença controlada por
    // `accessoriesProbability`, separada da variante.
    chave: "acessorios",
    label: "Óculos",
    secao: "acessorios",
    tipo: "variante",
    opcoes: [SEM_ACESSORIO, ...Object.keys(avataaarsStyleJson.components.accessories.variants)],
    ler: (opcoes) =>
      opcoes.accessoriesProbability === 0 || !opcoes.accessoriesVariant
        ? SEM_ACESSORIO
        : opcoes.accessoriesVariant,
    aplicar: (opcoes, valor) => {
      if (valor === SEM_ACESSORIO) {
        const { accessoriesVariant, ...resto } = opcoes;
        return { ...resto, accessoriesProbability: 0 };
      }
      return { ...opcoes, accessoriesProbability: 100, accessoriesVariant: valor };
    },
  },
  {
    chave: "corDosAcessorios",
    label: "Cor",
    secao: "acessorios",
    tipo: "cor",
    opcoes: avataaarsStyleJson.colors.accessories.values,
    ler: (opcoes) => opcoes.accessoriesColor?.[0] || avataaarsStyleJson.colors.accessories.values[0],
    aplicar: (opcoes, valor) => ({ ...opcoes, accessoriesColorFill: "solid", accessoriesColor: [valor] }),
  },
  {
    chave: "corDeFundo",
    label: "Cor",
    secao: "fundo",
    tipo: "cor",
    opcoes: PALETA_FUNDO,
    ler: (opcoes) => opcoes.backgroundColor?.[0] || FUNDO_TRANSPARENTE,
    aplicar: (opcoes, valor) => ({
      ...opcoes,
      backgroundColorFill: "solid",
      backgroundColor: valor === FUNDO_TRANSPARENTE ? [] : [valor],
    }),
  },
];

const CATALOGOS_POR_ESTILO = {
  [ESTILO_PADRAO]: CATEGORIAS_AVATAAARS,
};

// =========================================================
// 🔹 API pública — única camada que `AvatarRenderer.js`/`AvatarEditor.js`
// devem consumir
// =========================================================

// Gera o avatar inicial de um membro/perfil, a partir de um identificador
// permanente (`membroId` ou `uid` — nunca o nome, que é mutável, ver
// SPRINT5_DISCOVERY.md seção 12.2). O resultado já vem pronto para
// persistir em `membro.avatar`/`profile.avatarUrl`: o seed não é gravado e
// não participa de nenhuma renderização futura (seção 5 da Discovery).
// Usado também pelo botão "Restaurar avatar padrão" do editor — chamado de
// novo com o mesmo seed permanente, sempre reproduz o mesmo resultado.
export function gerarAvatarPadrao(seed) {
  return {
    tipo: "vetorial",
    motor: MOTOR_PADRAO,
    versao: 1,
    dados: gerarDicebear(seed),
  };
}

// Usado pelo botão "Gerar aleatório" do editor — mesmo mecanismo de
// `gerarAvatarPadrao`, mas com um seed descartável (nunca persistido) só
// para obter uma combinação nova.
export function gerarAvatarAleatorio() {
  const seedAleatorio = `aleatorio-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return gerarAvatarPadrao(seedAleatorio);
}

// Recebe o objeto `avatar` já persistido e devolve o SVG (string) pronto
// para o componente renderizar via `react-native-svg`. Retorna `null` se
// não houver avatar ainda ou o motor não for reconhecido — o componente
// decide o fallback visual nesse caso.
export function renderizarAvatarSvg(avatar) {
  if (!avatar?.dados) return null;
  switch (avatar.motor) {
    case "dicebear":
      return renderizarDicebearSvg(avatar.dados);
    default:
      return null;
  }
}

// Lista as categorias editáveis do avatar atual (dependente do
// motor/estilo), já com o valor selecionado de cada uma resolvido — usado
// pelo `AvatarEditor.js`, que não conhece nomes de campo do DiceBear.
export function listarCategoriasEditaveis(avatar) {
  const estilo = avatar?.dados?.estilo || ESTILO_PADRAO;
  const catalogo = CATALOGOS_POR_ESTILO[estilo] || [];
  const opcoesAtuais = avatar?.dados?.opcoes || {};

  return catalogo.map((categoria) => ({
    chave: categoria.chave,
    label: categoria.label,
    secao: categoria.secao,
    tipo: categoria.tipo,
    opcoes: categoria.opcoes,
    valorSelecionado: categoria.ler(opcoesAtuais),
  }));
}

// Lista as seções (abas) que fazem sentido para o avatar atual — só as que
// têm pelo menos uma categoria no catálogo do estilo em uso. O editor
// itera essa lista sem saber nada sobre o que compõe cada seção.
export function listarSecoesEditaveis(avatar) {
  const categorias = listarCategoriasEditaveis(avatar);
  const secoesComCategoria = new Set(categorias.map((c) => c.secao));
  return SECOES.filter((secao) => secoesComCategoria.has(secao.chave));
}

// Aplica a edição de uma categoria e devolve um novo objeto `avatar` — não
// muta o original. O motor e a versão são preservados; só `dados.opcoes`
// muda. Usado pelo `AvatarEditor.js` a cada seleção do usuário.
export function aplicarEdicaoAvatar(avatar, categoriaChave, valor) {
  const estilo = avatar?.dados?.estilo || ESTILO_PADRAO;
  const catalogo = CATALOGOS_POR_ESTILO[estilo] || [];
  const categoria = catalogo.find((c) => c.chave === categoriaChave);
  if (!categoria) return avatar;

  const opcoesAtuais = avatar?.dados?.opcoes || {};
  const novasOpcoes = sanitizarOpcoes(categoria.aplicar(opcoesAtuais, valor));

  return {
    ...avatar,
    dados: {
      ...avatar.dados,
      opcoes: novasOpcoes,
    },
  };
}

// Gera, só para pré-visualização (não persiste nada), o SVG de uma
// categoria com um valor candidato aplicado — usado pelo `AvatarEditor.js`
// para desenhar a miniatura de cada opção do seletor.
export function renderizarPreviaCategoria(avatar, categoriaChave, valor) {
  return renderizarAvatarSvg(aplicarEdicaoAvatar(avatar, categoriaChave, valor));
}

// Iniciais como fallback visual enquanto não há avatar gerado (dado legado
// sem `avatar`, ou geração ainda em andamento).
export function getIniciais(nome) {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
