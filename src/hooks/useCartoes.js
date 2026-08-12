import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../auth/useAuth';
import { getBasePath } from '../utils/firestorePaths';
import { colors } from '../styles/colors';
import { normalizarParaISO } from '../utils/formatarData';
import { vencimentoCartaoPorNome } from '../utils/datasPadrao';
import { parseBRL } from '../utils/formatarValor';
import { dividirValorIgualmente, somarParcelas } from '../utils/parcelamento';
import { removerIndefinidos } from '../utils/firestoreSanitize';
import { extrairCamposDaCompra, propagarCamposDaCompra } from '../utils/propagacaoCompra';
import { reestruturarParcelamento } from '../utils/reestruturarParcelamento';
import { registrarEvento } from '../utils/registrarEvento';
import { detectarAlteracoes } from '../utils/linhaDoTempoConfig';

// 🔹 Campos que descrevem a COMPRA inteira (iguais em todas as parcelas do
// mesmo idCompra) — ver ARQUITETURA.md seção 16.12. `valor`, `pago`,
// `dataPagamento`, `dataVencimento`, `mes`/`ano` continuam de fora: são da
// parcela, não da compra.
const CAMPOS_DA_COMPRA_CARTAO = [
  'descricao',
  'pessoa',
  'membroId',
  'membroNome',
  'categoria',
  'categoriaId',
  'categoriaNome',
  'cartaoId',
  'cartao',
  'corCartao',
  'dataCompra',
];

// =======================================
// 🔹 HOOK: CARTÕES
// =======================================
export const useCartoes = (month, year) => {
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user } = useAuth();

  // 🔹 Busca dados do mês/ano selecionado
  useEffect(() => {
    if (!month || !year || !user) {
      setCartoes([]);
      setLoading(false);
      return;
    }

    const basePath = getBasePath(user);
    const q = query(
      collection(db, `${basePath}/cartoes`),
      where('mes', '==', month),
      where('ano', '==', year)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            valor: parseBRL(data.valor),
            pago: data.pago === true,
            // 🔹 `data.categoria`/`data.pessoa` podem ser `null` (nenhuma
            // categoria escolhida, ou — achado em 2026-08-04 investigando um
            // crash do Firestore — `null` também passa `typeof x === 'object'`
            // em JS; sem o `data.categoria &&` aqui, `null?.nome` vira
            // `undefined`, um valor que o Firestore rejeita em qualquer
            // escrita futura desse item, ver ARQUITETURA.md seção 15.11).
            pessoa:
              data.pessoa && typeof data.pessoa === 'object'
                ? data.pessoa?.nome
                : data.pessoa,
            categoria:
              data.categoria && typeof data.categoria === 'object'
                ? data.categoria?.nome
                : data.categoria,
          };
        });

        // ✅ Ordenar por data de vencimento
        dados.sort(
          (a, b) => new Date(a.dataVencimento) - new Date(b.dataVencimento)
        );
        setCartoes(dados);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no snapshot de cartões:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [month, year, user]);

  const getCorDoCartao = (nomeCartao) => {
    const nomeLimpo = typeof nomeCartao === 'string' ? nomeCartao.trim() : '';
    if (colors.byInstitution && colors.byInstitution[nomeLimpo]) {
      return colors.byInstitution[nomeLimpo];
    }
    return colors.byInstitution?.Default || '#888888';
  };

  // ➕ Adicionar nova compra parcelada
  const addCartao = async (cartao) => {
    if (!user) throw new Error('Usuário não autenticado.');

    try {
      const basePath = getBasePath(user);
      const {
        descricao,
        valorTotal,
        valorParcela,
        totalParcelas,
        parcelasPersonalizadas,
        dataCompra,
        pessoa,
        membroId,
        membroNome,
        cartao: nomeCartao,
        cartaoId,
        categoria,
        categoriaId,
        categoriaNome,
      } = cartao;

      const parcelas = parseInt(totalParcelas || 1, 10);
      const valorTotalNum = parseBRL(valorTotal);
      const valorParcelaNum =
        parseBRL(valorParcela) ||
        (parcelas > 0 ? valorTotalNum / parcelas : 0);

      // 🔹 Valor de cada parcela: se o usuário personalizou (editor de
      // parcelas), usa exatamente o que ele definiu; senão, cálculo
      // automático de sempre (parcelas iguais). Em ambos os casos, o valor
      // total gravado (abaixo) é sempre a SOMA das parcelas — nunca uma
      // segunda fonte de verdade independente (ver PARCELAMENTO_DISCOVERY.md).
      const valoresDasParcelas =
        Array.isArray(parcelasPersonalizadas) &&
        parcelasPersonalizadas.length === parcelas
          ? parcelasPersonalizadas.map((v) => parseFloat(parseBRL(v).toFixed(2)))
          : dividirValorIgualmente(
              valorTotalNum || valorParcelaNum * parcelas,
              parcelas
            );
      const valorTotalReal = somarParcelas(valoresDasParcelas);

      // 🔹 Cor/vencimento/fechamento vêm do cartão cadastrado (useCarteira,
      // ver ARQUITETURA.md Sprint 6 — Entidade Cartões) quando o lançamento
      // referencia um por `cartaoId`. Sem cartão cadastrado (informal, "Outro
      // cartão..." ou lançamento antigo), cai no mesmo hardcode de sempre —
      // nenhuma mudança de comportamento para quem nunca cadastrar um cartão.
      const cartaoCadastrado = cartaoId
        ? (await getDoc(doc(db, `${basePath}/carteira`, cartaoId))).data()
        : null;

      const corDoCartao = cartaoCadastrado?.cor || getCorDoCartao(nomeCartao);
      const dataBaseISO = normalizarParaISO(dataCompra);
      const dataBase = new Date(dataBaseISO + 'T00:00:00');
      // 🔹 Sufixo de timestamp evita colisão entre duas compras com a mesma
      // descrição e data (ex.: "Mercado" comprado duas vezes no mesmo dia,
      // ambas sem cartão cadastrado) — sem isso, as parcelas das duas
      // compras se misturariam no mesmo grupo. Mesmo critério já usado em
      // useEmprestimos.js. Compras antigas mantêm seu idCompra atual, sem
      // migração — isso só afeta compras criadas a partir de agora.
      const idCompra = `${descricao.replace(/\s+/g, '-')}-${dataBaseISO}-${Date.now()}`;
      const diaVencimento =
        cartaoCadastrado?.diaVencimento ||
        vencimentoCartaoPorNome[nomeCartao] ||
        vencimentoCartaoPorNome.Default;

      // 🔹 Dia de fechamento real do cartão cadastrado, quando existir —
      // substitui a estimativa "diaVencimento - 7" (ver PROJECT_STATUS.md,
      // achado de baixa severidade já catalogado) só para quem já cadastrou
      // o cartão; sem isso, comportamento antigo preservado.
      const diaFechamento = cartaoCadastrado?.diaFechamento || diaVencimento - 7;
      const dataFechamentoEstimada = new Date(
        dataBase.getFullYear(),
        dataBase.getMonth(),
        diaFechamento
      );
      const mesOffset = dataBase > dataFechamentoEstimada ? 1 : 0;

      const loteParcelas = Array.from({ length: parcelas }, (_, i) => {
        const dataReferencia = new Date(dataBase);
        dataReferencia.setMonth(dataReferencia.getMonth() + mesOffset + i);
        dataReferencia.setDate(diaVencimento);
        const dataVencimentoFinal = dataReferencia;

        return {
          descricao,
          pessoa,
          // 🔹 Referência estável de Membro (Sprint 5, mesmo padrão de
          // categoriaId abaixo — ver SPRINT5_DISCOVERY.md 4.3.3). `pessoa`
          // (string) é mantida por compatibilidade com exibição existente.
          membroId: membroId || null,
          membroNome: membroNome || null,
          cartao: nomeCartao,
          // 🔹 Referência estável ao cartão cadastrado (Sprint 6, mesmo
          // padrão de membroId/categoriaId) — null para cartão informal
          // ("Outro cartão...") ou lançamentos antigos.
          cartaoId: cartaoId || null,
          corCartao: corDoCartao,
          // 🔹 Corrigido nesta sprint: addCartao destructurava só um subconjunto
          // de campos e descartava a categoria escolhida na criação (achado
          // durante a auditoria pós-incremento 4, ver SPRINT4_DISCOVERY.md).
          categoria: categoria || null,
          categoriaId: categoriaId || null,
          categoriaNome: categoriaNome || null,
          valor: valoresDasParcelas[i],
          valorTotal: valorTotalReal,
          dataCompra: dataBaseISO,
          parcelaAtual: i + 1,
          totalParcelas: parcelas,
          dataVencimento: dataVencimentoFinal.toISOString().split('T')[0],
          pago: false,
          adiantada: false,
          mes: dataVencimentoFinal.getMonth() + 1,
          ano: dataVencimentoFinal.getFullYear(),
          idCompra,
          criadoEm: serverTimestamp(),
        };
      });

      const batch = writeBatch(db);
      loteParcelas.forEach((p) => {
        const docRef = doc(collection(db, `${basePath}/cartoes`));
        batch.set(docRef, removerIndefinidos(p));
      });
      await batch.commit();

      // 🔹 Um evento só para a compra inteira, mesmo com N parcelas geradas
      // no mesmo batch — ver ARQUITETURA.md seção 18 ("1 evento por ação do
      // usuário, nunca por documento alterado internamente").
      await registrarEvento(basePath, {
        acao: 'criado',
        entidade: 'cartao',
        entidadeId: idCompra,
        idCompra,
        origem: { agente: 'usuario', canal: 'criacao' },
        usuarioId: user.uid,
      });
    } catch (err) {
      console.error('❌ Erro ao adicionar compra parcelada:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateCartao = async (id, cartao) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      // 🔹 `parcelasPersonalizadas` é só um sinal transitório do editor de
      // parcelas (ver ModalEditorParcelas.js) — nunca é gravado como campo no
      // Firestore, cada parcela continua guardando só o seu próprio `valor`.
      //
      // 🔹 `valorTotal` NUNCA pode vir do chamador. `cartao` (= `v` em
      // ModalEdicao.js) é construído a partir de `{...item}`, e `item` já
      // carrega o `valorTotal` que estava gravado quando o modal abriu — se
      // esse valor ficasse aqui, uma edição comum (ex.: só a descrição, ou
      // o "Salvar" final do editor de parcelas) reescreveria o valorTotal de
      // volta para esse valor antigo, desfazendo o recálculo que acabou de
      // rodar (`salvarParcelasPersonalizadas`/`recalcularValorTotalCompra`).
      // Essa era a causa raiz do card mostrando um total diferente do
      // ModalDetalhes/ModalHistoricoParcelas (que sempre resomam as
      // parcelas, nunca leem este campo direto) — ver ARQUITETURA.md seção
      // 15.12. `valorTotal` só pode ser definido pelas funções dedicadas
      // deste hook, nunca por um `updateDoc` genérico.
      const { parcelasPersonalizadas, valorTotal: _valorTotalIgnorado, ...dadosCartao } = cartao;
      const dadosAtualizados = { ...dadosCartao };
      const cartaoRef = doc(db, `${basePath}/cartoes`, id);
      const docSnap = await getDoc(cartaoRef);
      const atual = docSnap.data();

      // 🔹 Calculado antes de qualquer mutação de `dadosAtualizados` (a
      // propagação de campos da compra, logo abaixo, remove esses campos do
      // objeto) — ver ARQUITETURA.md seção 18.
      const alteracoesCampos = detectarAlteracoes('cartao', atual, dadosAtualizados);

      // 🔹 Se o lançamento passou a referenciar um cartão cadastrado (ou
      // trocou de cartão), a cor exibida vem sempre do cadastro — mesma
      // identidade visual de Gerenciar Cartões, sem precisar reeditar cada
      // lançamento quando o usuário mudar a cor do cartão (ver
      // ARQUITETURA.md, Sprint 6 — Entidade Cartões).
      if (dadosAtualizados.cartaoId) {
        const cartaoCadastradoSnap = await getDoc(
          doc(db, `${basePath}/carteira`, dadosAtualizados.cartaoId)
        );
        const cartaoCadastrado = cartaoCadastradoSnap.data();
        if (cartaoCadastrado?.cor) {
          dadosAtualizados.corCartao = cartaoCadastrado.cor;
        }
      }

      // 🔹 Reverter antecipação
      if (atual?.adiantada && dadosAtualizados.pago === false) {
        return new Promise((resolve, reject) => {
          setTimeout(() => {
            global.alertaGlobal?.({
              titulo: 'Reverter antecipação?',
              mensagem:
                'Esta parcela foi antecipada. Deseja desfazer a antecipação e restaurar os dados originais?',
              icone: 'history',
              corIcone: colors.warning,
              botoes: [
                { texto: 'Cancelar', onPress: () => reject('Reversão cancelada.') },
                {
                  texto: 'Sim, reverter',
                  style: 'destructive',
                  onPress: async () => {
                    const dadosRevertidos = {
                      pago: false,
                      adiantada: false,
                      descontoAplicado: 0,
                      valor: atual.valorOriginal || atual.valor,
                      dataPagamento: null,
                      mes: atual.mesOriginal || atual.mes,
                      ano: atual.anoOriginal || atual.ano,
                      atualizadoEm: serverTimestamp(),
                    };
                    await updateDoc(cartaoRef, removerIndefinidos(dadosRevertidos));
                    // 🔹 O valor volta a ser o original (sem desconto) — o
                    // valorTotal precisa refletir isso, mesma lógica de
                    // anteciparParcelas (ver ARQUITETURA.md seção 15.2).
                    if (atual.idCompra && (atual.totalParcelas || 1) > 1) {
                      await recalcularValorTotalCompra(basePath, atual.idCompra);
                    }
                    await registrarEvento(basePath, {
                      acao: 'revertido',
                      entidade: 'cartao',
                      entidadeId: id,
                      idCompra: atual.idCompra || null,
                      origem: { agente: 'usuario', canal: 'edicao' },
                      usuarioId: user.uid,
                    });
                    resolve(true);
                  },
                },
              ],
            });
          }, 100);
        });
      }

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split('T')[0];
      } else if (dadosAtualizados.pago === false && dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = null;
      }

      const pertenceAUmGrupo = !!atual?.idCompra && (atual?.totalParcelas || 1) > 1;
      // 🔹 Regra de negócio: o valor de uma parcela já paga ou antecipada é
      // imutável — evita que uma edição retroativa altere quanto já foi
      // efetivamente pago (ver ARQUITETURA.md seção 15.9). A UI já impede
      // isso; aqui é defesa em profundidade, direto na camada de dados.
      const parcelaBloqueada = atual?.pago === true || atual?.adiantada === true;

      // 🔹 Campos da compra (descrição, categoria, cartão, comprador, data da
      // compra) nunca ficam só nesta parcela — são propagados para todas as
      // parcelas do mesmo idCompra num único batch, mesmo mecanismo usado
      // por useEmprestimos.js (ver ARQUITETURA.md seção 16.12, achado
      // relatado pelo usuário na Sprint 6). Não depende de `parcelaBloqueada`
      // — são metadados da compra, só o `valor` de uma parcela já paga é
      // imutável.
      if (pertenceAUmGrupo) {
        const camposDaCompra = extrairCamposDaCompra(dadosAtualizados, CAMPOS_DA_COMPRA_CARTAO);
        if (Object.keys(camposDaCompra).length > 0) {
          await propagarCamposDaCompra(`${basePath}/cartoes`, atual.idCompra, camposDaCompra);
        }
      }

      if (pertenceAUmGrupo && Array.isArray(parcelasPersonalizadas)) {
        // 🔹 Editor de parcelas personalizadas: o valor desta parcela vem do
        // array (fonte única), não do campo `valor` solto — grava todas as
        // parcelas do grupo + o total (soma) num só lugar.
        const { valor: _valorIgnorado, ...outrosCampos } = dadosAtualizados;
        await salvarParcelasPersonalizadas(basePath, atual.idCompra, parcelasPersonalizadas);
        await updateDoc(
          cartaoRef,
          removerIndefinidos({
            ...outrosCampos,
            atualizadoEm: serverTimestamp(),
          })
        );
        // 🔹 Um evento só cobrindo os valores personalizados + qualquer
        // outro campo relevante editado no mesmo "Salvar" (ver ARQUITETURA.md
        // seção 18) — nunca dois eventos para uma ação só.
        await registrarEvento(basePath, {
          acao: 'valores_personalizados',
          entidade: 'cartao',
          entidadeId: atual.idCompra,
          idCompra: atual.idCompra,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: 'usuario', canal: 'edicao' },
          usuarioId: user.uid,
        });
        return;
      }

      if (parcelaBloqueada) {
        dadosAtualizados.valor = atual.valor;
      }

      const novoValor = parseBRL(dadosAtualizados.valor);
      const valorMudou =
        !parcelaBloqueada &&
        dadosAtualizados.valor !== undefined &&
        novoValor !== parseBRL(atual?.valor);

      await updateDoc(
        cartaoRef,
        removerIndefinidos({
          ...dadosAtualizados,
          valor: novoValor,
          atualizadoEm: serverTimestamp(),
        })
      );

      // 🔹 Mantém o valorTotal da compra sempre igual à soma das parcelas —
      // mesmo quando o valor de uma parcela é editado fora do editor
      // dedicado (ex.: campo "Valor" comum), o total nunca fica dessincronizado.
      // Só recalcula quando o valor de fato muda (evita escrita extra em
      // ações que não tocam o valor, como marcar como pago).
      if (pertenceAUmGrupo && valorMudou) {
        await recalcularValorTotalCompra(basePath, atual.idCompra);
      }

      // 🔹 "Pago"/"Reaberto" têm ação própria (mais reconhecível pro usuário
      // do que um "editado" genérico) — só quando de fato transiciona de um
      // estado pro outro. Fora isso, um evento "editado" cobre qualquer
      // campo relevante que mudou nesta mesma chamada.
      const marcouComoPago = dadosAtualizados.pago === true && atual?.pago !== true;
      const desmarcouComoPago = dadosAtualizados.pago === false && atual?.pago === true;
      if (marcouComoPago) {
        await registrarEvento(basePath, {
          acao: 'pago',
          entidade: 'cartao',
          entidadeId: id,
          idCompra: atual?.idCompra || null,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: 'usuario', canal: 'edicao' },
          usuarioId: user.uid,
        });
      } else if (desmarcouComoPago) {
        await registrarEvento(basePath, {
          acao: 'reaberto',
          entidade: 'cartao',
          entidadeId: id,
          idCompra: atual?.idCompra || null,
          alteracoes: Object.keys(alteracoesCampos).length > 0 ? alteracoesCampos : null,
          origem: { agente: 'usuario', canal: 'edicao' },
          usuarioId: user.uid,
        });
      } else if (Object.keys(alteracoesCampos).length > 0) {
        await registrarEvento(basePath, {
          acao: 'editado',
          entidade: 'cartao',
          entidadeId: id,
          idCompra: atual?.idCompra || null,
          alteracoes: alteracoesCampos,
          origem: { agente: 'usuario', canal: 'edicao' },
          usuarioId: user.uid,
        });
      }
    } catch (err) {
      console.error('Erro ao atualizar cartão:', err);
      setError(err.message);
      throw err;
    }
  };

  // 🔹 Recalcula o valorTotal de uma compra somando o `valor` atual de cada
  // parcela — chamada sempre que uma parcela isolada é editada, para o total
  // nunca ser uma segunda fonte de verdade (ver PARCELAMENTO_DISCOVERY.md).
  const recalcularValorTotalCompra = async (basePath, idCompra) => {
    const qParcelas = query(
      collection(db, `${basePath}/cartoes`),
      where('idCompra', '==', idCompra)
    );
    const snapshot = await getDocs(qParcelas);
    const valorTotal = somarParcelas(snapshot.docs.map((d) => d.data().valor));

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => {
      batch.update(doc(db, `${basePath}/cartoes`, docSnap.id), { valorTotal });
    });
    await batch.commit();
  };

  // 🔹 Grava o valor individual de cada parcela de uma compra (editor de
  // parcelas personalizadas) — novosValores é um array ordenado por
  // parcelaAtual (1ª parcela no índice 0). Parcelas já pagas/antecipadas
  // nunca têm o valor sobrescrito, mesmo que o array recebido traga outro
  // número (defesa em profundidade — a UI já bloqueia editar essas linhas no
  // editor). Reaproveita o mesmo mecanismo de `reestruturarParcelamento`
  // usado pela exclusão de parcela (ver ARQUITETURA.md seção 17) — aqui
  // nenhuma parcela é removida, só os valores são redefinidos.
  const salvarParcelasPersonalizadas = async (basePath, idCompra, novosValores) => {
    const parcelas = await buscarParcelasDaCompra(idCompra);
    const novosValoresPorId = {};
    parcelas.forEach((parcela, indice) => {
      const bloqueada = parcela.pago === true || parcela.adiantada === true;
      if (!bloqueada) {
        novosValoresPorId[parcela.id] = parseFloat(parseBRL(novosValores[indice]).toFixed(2));
      }
    });

    await reestruturarParcelamento(`${basePath}/cartoes`, idCompra, { novosValores: novosValoresPorId });
    await recalcularValorTotalCompra(basePath, idCompra);
  };

  // 🔹 Busca todas as parcelas de uma compra (mesmo `idCompra`), ordenadas —
  // usado pelo editor de parcelas ao abrir para edição (precisa dos valores
  // já gravados, não só da parcela aberta no momento).
  const buscarParcelasDaCompra = async (idCompra) => {
    if (!user) throw new Error('Usuário não autenticado.');
    const basePath = getBasePath(user);
    const qParcelas = query(
      collection(db, `${basePath}/cartoes`),
      where('idCompra', '==', idCompra)
    );
    const snapshot = await getDocs(qParcelas);
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.parcelaAtual || 0) - (b.parcelaAtual || 0));
  };

  // 🔹 Busca todas as parcelas de um cartão (todos os meses, todas as
  // compras) — usada pelo resumo "Por Cartão" (CartoesScreen.js), que
  // precisa de indicadores como "parcelas futuras"/"próximo vencimento" que
  // o listener deste hook (escopado por mês/ano) não tem como fornecer.
  // Prioriza `cartaoId` (cartão cadastrado); cai para o nome (string) só
  // para cartão informal/lançamentos antigos, sem cartaoId — mesmo critério
  // de agrupamento que a tela já usava antes da Sprint 6.
  const buscarParcelasDoCartao = async ({ cartaoId, nomeCartao }) => {
    if (!user) throw new Error('Usuário não autenticado.');
    const valorBusca = cartaoId || nomeCartao;
    if (!valorBusca) return [];

    const basePath = getBasePath(user);
    const qParcelas = query(
      collection(db, `${basePath}/cartoes`),
      where(cartaoId ? 'cartaoId' : 'cartao', '==', valorBusca)
    );
    const snapshot = await getDocs(qParcelas);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  };

  // 🔹 Exclui uma única parcela — ver ARQUITETURA.md seção 17. Sem grupo
  // (compra à vista ou parcela avulsa), é uma exclusão simples. Com grupo,
  // `modo` decide o destino do valor da parcela excluída: 'reduzir' (some do
  // total, nenhuma outra parcela muda) ou 'igual' (somado em partes iguais
  // só entre as parcelas do grupo ainda não pagas/antecipadas — nunca
  // redivide o valor TOTAL da compra, só o valor desta parcela). Renumeração
  // e `totalParcelas` sempre ficam a cargo de `reestruturarParcelamento`.
  const excluirParcela = async (id, { idCompra, modo } = {}) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);

      if (!idCompra) {
        await deleteDoc(doc(db, `${basePath}/cartoes`, id));
        await registrarEvento(basePath, {
          acao: 'excluido',
          entidade: 'cartao',
          entidadeId: id,
          idCompra: null,
          origem: { agente: 'usuario', canal: 'exclusao' },
          usuarioId: user.uid,
        });
        return;
      }

      let novosValores = {};
      if (modo === 'igual') {
        const docSnap = await getDoc(doc(db, `${basePath}/cartoes`, id));
        const atual = docSnap.data();
        const qParcelas = query(
          collection(db, `${basePath}/cartoes`),
          where('idCompra', '==', idCompra)
        );
        const snapshot = await getDocs(qParcelas);
        const elegiveis = snapshot.docs.filter(
          (d) => d.id !== id && d.data().pago !== true && d.data().adiantada !== true
        );
        if (elegiveis.length > 0) {
          const incrementos = dividirValorIgualmente(parseBRL(atual?.valor), elegiveis.length);
          elegiveis.forEach((docSnap2, i) => {
            novosValores[docSnap2.id] = parseFloat(
              (parseBRL(docSnap2.data().valor) + incrementos[i]).toFixed(2)
            );
          });
        }
      }

      await reestruturarParcelamento(`${basePath}/cartoes`, idCompra, {
        idsParaRemover: [id],
        novosValores,
      });
      await recalcularValorTotalCompra(basePath, idCompra);

      await registrarEvento(basePath, {
        acao: modo === 'igual' ? 'redistribuido' : 'excluido',
        entidade: 'cartao',
        entidadeId: id,
        idCompra,
        origem: { agente: 'usuario', canal: 'exclusao' },
        usuarioId: user.uid,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // 🔹 Exclusão com valores definidos manualmente pelo usuário no editor de
  // parcelas (ver useExclusaoParcelada.js) — só grava quando o usuário
  // confirma o editor; até lá, nada foi tocado no Firestore.
  const excluirParcelaComValoresPersonalizados = async (id, idCompra, novosValoresPorId) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      await reestruturarParcelamento(`${basePath}/cartoes`, idCompra, {
        idsParaRemover: [id],
        novosValores: novosValoresPorId,
      });
      await recalcularValorTotalCompra(basePath, idCompra);

      await registrarEvento(basePath, {
        acao: 'redistribuido',
        entidade: 'cartao',
        entidadeId: id,
        idCompra,
        origem: { agente: 'usuario', canal: 'exclusao' },
        usuarioId: user.uid,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // 🔹 Exclui todas as parcelas da compra.
  const excluirGrupoInteiro = async (idCompra) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const qParcelas = query(
        collection(db, `${basePath}/cartoes`),
        where('idCompra', '==', idCompra)
      );
      const snapshot = await getDocs(qParcelas);
      const batch = writeBatch(db);
      snapshot.docs.forEach((d) => batch.delete(doc(db, `${basePath}/cartoes`, d.id)));
      await batch.commit();

      // 🔹 `entidadeId === idCompra` marca que o evento é da compra inteira,
      // não de uma parcela isolada — ver linhaDoTempoRender.js.
      await registrarEvento(basePath, {
        acao: 'excluido',
        entidade: 'cartao',
        entidadeId: idCompra,
        idCompra,
        origem: { agente: 'usuario', canal: 'exclusao' },
        usuarioId: user.uid,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleCartaoStatus = async (cartaoId, statusAtual) => {
    if (!user) throw new Error('Usuário não autenticado.');
    try {
      const basePath = getBasePath(user);
      const cartaoRef = doc(db, `${basePath}/cartoes`, cartaoId);
      const novoStatus = !statusAtual;
      const dadosAtualizados = {
        pago: novoStatus,
        dataPagamento: novoStatus
          ? new Date().toISOString().split('T')[0]
          : null,
        atualizadoEm: serverTimestamp(),
      };

      await updateDoc(cartaoRef, dadosAtualizados);

      // 🔹 Caminho de mutação separado de updateCartao (toggle direto de
      // pago/pendente) — precisa do próprio registro de evento, ver
      // ARQUITETURA.md seção 18. Mesmo critério de updateCartao: marcar como
      // pago gera "pago", desmarcar gera "reaberto".
      const docSnap = await getDoc(cartaoRef);
      const atual = docSnap.data();
      await registrarEvento(basePath, {
        acao: novoStatus ? 'pago' : 'reaberto',
        entidade: 'cartao',
        entidadeId: cartaoId,
        idCompra: atual?.idCompra || null,
        origem: { agente: 'usuario', canal: 'edicao' },
        usuarioId: user.uid,
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // 🔹 Antecipar parcelas (com data e valor opcional)
  const anteciparParcelas = async (idsSelecionados, dataPagamento, valorComDesconto = null) => {
    if (!idsSelecionados?.length || !user) return;
    try {
      const basePath = getBasePath(user);
      const batch = writeBatch(db);
      const [ano, mes, dia] = dataPagamento.split('-').map(Number);
      const data = new Date(ano, mes - 1, dia);
      const mesPagamento = data.getMonth() + 1;
      const anoPagamento = data.getFullYear();

      const atualizados = [];
      const idsCompraAfetados = new Set();

      for (const id of idsSelecionados) {
        const docRef = doc(db, `${basePath}/cartoes`, id);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) continue;

        const atual = docSnap.data();
        const valorOriginal = parseBRL(atual.valor);
        const valorFinal = valorComDesconto ? parseBRL(valorComDesconto) : valorOriginal;
        const descontoAplicado = valorOriginal - valorFinal;

        const novosDados = {
          pago: true,
          adiantada: true,
          dataPagamento,
          // 🔹 Sem isso, reverter a antecipação (branch "Reverter
          // antecipação?" em updateCartao) sempre caía no fallback
          // atual.mes/atual.ano (o mês da antecipação, não o original) — só
          // useEmprestimos.js gravava esses campos até agora, mesmo critério.
          mesOriginal: atual.mes,
          anoOriginal: atual.ano,
          mes: mesPagamento,
          ano: anoPagamento,
          valor: valorFinal,
          valorOriginal,
          descontoAplicado,
          atualizadoEm: serverTimestamp(),
        };

        batch.update(docRef, novosDados);
        atualizados.push({ id, ...atual, ...novosDados });
        if (atual.idCompra && (atual.totalParcelas || 1) > 1) {
          idsCompraAfetados.add(atual.idCompra);
        }
      }

      await batch.commit();

      // 🔹 O desconto da antecipação muda o `valor` da parcela — sem isso, o
      // valorTotal ficaria desatualizado (a mesma inconsistência que a
      // edição manual de parcela já corrige, ver ARQUITETURA.md seção 15.2).
      // Um evento por compra afetada, não por parcela antecipada (podem ser
      // várias parcelas da mesma compra numa única ação de antecipar).
      for (const idCompra of idsCompraAfetados) {
        await recalcularValorTotalCompra(basePath, idCompra);
        await registrarEvento(basePath, {
          acao: 'antecipado',
          entidade: 'cartao',
          entidadeId: idCompra,
          idCompra,
          origem: { agente: 'usuario', canal: 'antecipacao' },
          usuarioId: user.uid,
        });
      }

      setCartoes((prev) => {
        const outros = prev.filter((p) => !idsSelecionados.includes(p.id));
        return [...outros, ...atualizados];
      });
    } catch (err) {
      console.error('❌ Erro ao antecipar parcelas:', err);
      setError(err.message);
      throw err;
    }
  };

  return {
    cartoes,
    loading,
    error,
    addCartao,
    updateCartao,
    excluirParcela,
    excluirParcelaComValoresPersonalizados,
    excluirGrupoInteiro,
    toggleCartaoStatus,
    anteciparParcelas,
    buscarParcelasDaCompra,
    buscarParcelasDoCartao,
  };
};
