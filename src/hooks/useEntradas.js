import { useState, useEffect } from 'react';
import { doc, getDoc, getDocs, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { datasPadraoPorDescricao } from '../utils/datasPadrao';
import { gerarDataComDia } from '../utils/gerarDataComDia';
import { colors } from '../styles/colors';
import { normalizarParaISO } from '../utils/formatarData';
import { useAuth } from "../auth/useAuth";
import { getBasePath } from "../utils/firestorePaths";


// =========================================================
// 🔹 HOOK: ENTRADAS (multiusuário + fixos dinâmicos + preparado p/ modo família)
// =========================================================
export const useEntradas = (mes, ano) => {
  const { user } = useAuth();
  const [entradas, setEntradas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  // =========================================================
  // 🔹 Listener em tempo real das entradas do usuário
  // =========================================================
  useEffect(() => {
    if (!user?.uid || !mes || !ano) return;
    setCarregando(true);

    const ref = collection(db, `${getBasePath(user)}/entradas`);
    const q = query(ref, where("mes", "==", mes), where("ano", "==", ano));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dados = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            valor: parseFloat(data.valor) || 0,
            pago: data.pago === true,
            membro:
              typeof data.membro === "object" ? data.membro?.nome : data.membro,
            categoria:
              typeof data.categoria === "object"
                ? data.categoria?.nome
                : data.categoria,
          };
        });

        // 🔸 Ordenar por data
        dados.sort(
          (a, b) =>
            new Date(a.data || "2100-12-31") - new Date(b.data || "2100-12-31")
        );

        setEntradas(dados);
        setCarregando(false);
      },
      (err) => {
        console.error("Erro ao buscar entradas:", err);
        setErro(err.message);
        setCarregando(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, mes, ano]);

  // =========================================================
  // 🔹 Recalcular automaticamente gastos dinâmicos
  // =========================================================
  useEffect(() => {
    if (!user?.uid || !mes || !ano || entradas.length === 0) return;

    const qGastos = query(
      collection(db, `${getBasePath(user)}/gastos`),
      where("mes", "==", mes),
      where("ano", "==", ano),
      where("fixacao", "==", "dinamico")
    );

    const unsubscribe = onSnapshot(qGastos, async (snapshot) => {
      const batch = writeBatch(db);

      snapshot.docs.forEach((docSnap) => {
        const gasto = docSnap.data();

        if (
          gasto.modoCalculo === "porcentagem" &&
          Array.isArray(gasto.entradasSelecionadas) &&
          gasto.entradasSelecionadas.length > 0
        ) {
          const entradasSelecionadas = entradas.filter((e) =>
            gasto.entradasSelecionadas.includes(e.id)
          );

          const total = entradasSelecionadas.reduce(
            (soma, e) => soma + (parseFloat(e.valor) || 0),
            0
          );

          const novoValor = total * (parseFloat(gasto.valorPercentual) / 100);

          if (novoValor.toFixed(2) !== (gasto.valor || 0).toFixed(2)) {
            batch.update(
              doc(db, `${getBasePath(user)}/gastos`, docSnap.id),
              {
                valor: parseFloat(novoValor.toFixed(2)),
                atualizadoEm: serverTimestamp(),
              }
            );
          }
        }
      });

      await batch.commit();
    });

    return () => unsubscribe();
  }, [entradas, user?.uid, mes, ano]);

  // =========================================================
  // 🔹 Criar nova entrada
  // =========================================================
  const adicionarEntrada = async (entrada) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");

    try {
      const basePath = getBasePath(user);
      const diaPadrao = datasPadraoPorDescricao[entrada.descricao] || 1;
      const dataFinal = entrada.data
        ? normalizarParaISO(entrada.data)
        : normalizarParaISO(
            gerarDataComDia(diaPadrao, entrada.mes || mes, entrada.ano || ano)
          );

      const docRef = await addDoc(collection(db, `${basePath}/entradas`), {
        ...entrada,
        pago: entrada.pago === true,
        data: dataFinal,
        valor: parseFloat(entrada.valor),
        compartilhado: false, // 👈 novo campo padrão
        criadoEm: serverTimestamp(),
      });

      return { ...entrada, id: docRef.id };
    } catch (err) {
      setErro(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Atualizar entrada existente
  // =========================================================
  const atualizarEntrada = async (id, entrada) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");

    try {
      const ref = doc(db, `${getBasePath(user)}/entradas`, id);
      const dadosAtualizados = { ...entrada };

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split("T")[0];
      } else if (
        dadosAtualizados.pago === false &&
        dadosAtualizados.dataPagamento
      ) {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(ref, {
        ...dadosAtualizados,
        valor: parseFloat(dadosAtualizados.valor),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      setErro(err.message);
      throw err;
    }
  };

  // =========================================================
  // 🔹 Excluir entrada
  // =========================================================
  const excluirEntrada = async (id) => {
    if (!user?.uid) throw new Error("Usuário não autenticado.");
    try {
      await deleteDoc(doc(db, `${getBasePath(user)}/entradas`, id));
    } catch (err) {
      setErro(err.message);
      throw err;
    }
  };

// =========================================================
// 🔹 Gerar entradas fixas do mês com base em modelos
// =========================================================
const gerarFixosDoMes = async () => {
  if (!user?.uid) throw new Error("Usuário não autenticado.");

  try {
    const basePath = getBasePath(user);

    // 👉 agora o destino é ENTRADAS, não gastos
    const refEntradas = collection(db, `${basePath}/entradas`);
    const qEntradas = query(refEntradas, where("mes", "==", mes), where("ano", "==", ano));
    const snapshotEntradasExistentes = await getDocs(qEntradas);

    const jaGerou = snapshotEntradasExistentes.docs.some(
      (doc) => doc.data().origemModelo === true
    );
    if (jaGerou) return "JA_GERADO";

    // 👉 agora buscamos modelosDeEntrada (já estava certo)
    const refModelos = collection(db, `${basePath}/modelosDeEntrada`);
    const snapshotModelos = await getDocs(refModelos);
    if (snapshotModelos.empty) return "SEM_MODELOS";

    const novosDocs = [];

    for (const docSnap of snapshotModelos.docs) {
      const modelo = docSnap.data();
      let valorFinal = parseFloat(modelo.valor) || 0;

      // cálculo de porcentagem se houver
      if (
        modelo.modoCalculo === "porcentagem" &&
        Array.isArray(modelo.entradasSelecionadas) &&
        modelo.entradasSelecionadas.length > 0
      ) {
        const entradasSelecionadas = snapshotEntradasExistentes.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((e) => modelo.entradasSelecionadas.includes(e.id));

        const totalEntradas = entradasSelecionadas.reduce(
          (soma, e) => soma + (parseFloat(e.valor) || 0),
          0
        );
        valorFinal = totalEntradas * (parseFloat(modelo.valor) / 100);
      }

      novosDocs.push({
        descricao: modelo.descricao,
        categoria: modelo.categoria,
        membro: modelo.membro || null,
        valor: parseFloat(valorFinal.toFixed(2)),
        data: gerarDataComDia(modelo.diaVencimento, mes, ano),
        mes,
        ano,
        pago: false,
        origemModelo: true,
        criadoEm: serverTimestamp(),
      });
    }

    const batch = writeBatch(db);

    // 🟢 adiciona como novas ENTRADAS, não GASTOS
    novosDocs.forEach((e) => batch.set(doc(refEntradas), e));

    await batch.commit();

    return "SUCESSO";
  } catch (err) {
    console.error("Erro ao gerar fixos:", err);
    setErro(err.message);
    return "ERRO";
  }
};

  // =========================================================
  // 🔹 Retorno do hook
  // =========================================================
  return {
    entradas,
    carregando,
    erro,
    adicionarEntrada,
    atualizarEntrada,
    excluirEntrada,
    gerarFixosDoMes,
  };
};
