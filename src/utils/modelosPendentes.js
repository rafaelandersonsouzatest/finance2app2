// Decide quais modelos (de gasto ou de entrada) ainda não viraram lançamento
// num mês — base do "Gerar do Mês" incremental: permite gerar só o que falta
// depois que o mês já foi gerado uma vez (ex.: modelo criado no meio do mês).
//
// Um modelo conta como "já lançado" no mês quando existe um lançamento com
// `origemModelo: true` e:
// - `modeloId` igual ao id do modelo (lançamentos gerados a partir desta
//   versão), ou
// - sem `modeloId` e com a mesma descrição (lançamentos gerados antes desta
//   versão, que não guardavam de qual modelo vieram). Fallback só para dado
//   legado: se o lançamento antigo foi renomeado, o modelo aparece como
//   pendente — a tela de confirmação deixa o usuário desmarcar.
//
// Um lançamento gerado e depois excluído também faz o modelo voltar a
// aparecer como pendente (não há registro de "já foi gerado e apagado") —
// de novo, a confirmação é a proteção.

const normalizarDescricao = (texto) =>
  String(texto || '').trim().toLowerCase();

export function calcularModelosPendentes(modelos = [], lancamentosDoMes = []) {
  const gerados = lancamentosDoMes.filter((l) => l?.origemModelo === true);

  const idsGerados = new Set(
    gerados.filter((l) => l.modeloId).map((l) => l.modeloId)
  );
  const descricoesLegadas = new Set(
    gerados
      .filter((l) => !l.modeloId)
      .map((l) => normalizarDescricao(l.descricao))
  );

  return modelos.filter(
    (m) =>
      !idsGerados.has(m.id) &&
      !descricoesLegadas.has(normalizarDescricao(m.descricao))
  );
}
