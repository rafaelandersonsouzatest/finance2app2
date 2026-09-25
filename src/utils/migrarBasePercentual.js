import { collection, doc, getDoc, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { temBaseNova, converterBaseLegada } from './basePercentual';

/**
 * Converte, uma única vez, os modelos de gasto em "porcentagem" que ainda
 * guardam a base antiga (ids de entradas de um mês) para a base nova
 * (modelos de entrada + avulsas) — ver utils/basePercentual.js.
 *
 * Roda ao abrir "Configurar Modelos" de gastos e antes de gerar os gastos do
 * mês. Depois de convertido, o modelo não entra mais aqui. O campo antigo
 * `entradasSelecionadas` não é apagado.
 *
 * @returns lista `{ id, descricao, base }` — `base: null` quando não deu para
 *   converter (entradas apagadas / modelo de entrada inexistente): o modelo
 *   fica como está e o usuário resseleciona a base no formulário.
 */
export async function migrarBasesPercentuaisLegadas(basePath) {
  const snapshotModelos = await getDocs(collection(db, `${basePath}/modelosDeGasto`));
  const legados = snapshotModelos.docs.filter((d) => {
    const m = d.data();
    return (
      m.modoCalculo === 'porcentagem' &&
      !temBaseNova(m) &&
      Array.isArray(m.entradasSelecionadas) &&
      m.entradasSelecionadas.length > 0
    );
  });
  if (legados.length === 0) return [];

  const snapshotModelosEntrada = await getDocs(collection(db, `${basePath}/modelosDeEntrada`));
  const modelosEntrada = snapshotModelosEntrada.docs.map((d) => ({ id: d.id, ...d.data() }));

  const resultados = [];
  for (const docModelo of legados) {
    const modelo = docModelo.data();
    // Busca por id funciona em qualquer mês — é o que permite descobrir de
    // qual modelo (ou se de nenhum) veio cada entrada escolhida lá atrás.
    const snapshots = await Promise.all(
      modelo.entradasSelecionadas.map((id) => getDoc(doc(db, `${basePath}/entradas`, id)))
    );
    const encontradas = snapshots.filter((s) => s.exists()).map((s) => s.data());
    const base = converterBaseLegada(encontradas, modelosEntrada);

    if (base) {
      await updateDoc(docModelo.ref, { ...base, atualizadoEm: serverTimestamp() });
    }
    resultados.push({ id: docModelo.id, descricao: modelo.descricao, base });
  }

  console.log('Conversão de base percentual:', JSON.stringify(resultados));
  return resultados;
}
