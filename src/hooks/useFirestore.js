import { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, getDocs, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, serverTimestamp, writeBatch, orderBy, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { datasPadraoPorDescricao } from '../utils/datasPadrao';
import { gerarDataComDia } from '../utils/gerarDataComDia';
import { colors } from '../styles/colors';
import { vencimentoCartaoPorNome } from '../utils/datasPadrao';


// ================================
// 🔹 HOOK: ENTRADAS
// ================================
  // const fixedIncomes = [
  //   { nome: 'Salário Rafael', categoria: 'Renda', membro: 'Rafael', valor: 2300.20, pago: false, recorrente: true },
  //   { nome: 'Salário Kézzia', categoria: 'Renda', membro: 'Kézzia', valor: 4500.00, pago: false, recorrente: true },
  //   { nome: 'Atendimento Particular - Tânia', categoria: 'Extra', membro: 'Kézzia', valor: 400.00, pago: false, recorrente: true },
  // ];
export const useIncomes = (month, year) => {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!month || !year) return;
    setLoading(true);
    const q = query(collection(db, 'entradas'), where('mes', '==', month), where('ano', '==', year));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let dados = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        valor: parseFloat(docSnap.data().valor) || 0,
        pago: docSnap.data().pago === true,
      }));
      dados.sort((a, b) => (a.data || '').localeCompare(b.data || ''));
      setIncomes(dados);
      setLoading(false);
    }, (err) => {
      console.error('Erro ao buscar entradas:', err);
      setError(err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [month, year]);

const gerarFixasDoMes = async () => {
  try {
    const qEntradas = query(collection(db, 'entradas'), where('mes', '==', month), where('ano', '==', year));
    const snapshotEntradas = await getDocs(qEntradas);
    const jaGerou = snapshotEntradas.docs.some(doc => doc.data().origemModelo === true);
    if (jaGerou) {
      console.log('Entradas fixas já foram geradas para este mês.');
      return 'JA_GERADO';
    }

    const qModelos = query(collection(db, 'modelosDeEntrada'), where('ativo', '==', true));
    const modelosSnapshot = await getDocs(qModelos);
    if (modelosSnapshot.empty) {
      console.log('Nenhum modelo de entrada ativo encontrado.');
      return 'SEM_MODELOS';
    }

    const novas = modelosSnapshot.docs.map((doc) => {
      const modelo = doc.data();
      return {
        descricao: modelo.descricao,
        categoria: modelo.categoria,
        membro: modelo.membro || '',
        valor: parseFloat(modelo.valor),
        data: gerarDataComDia(modelo.diaDoMes, month, year),
        mes: month,
        ano: year,
        pago: false,
        origemModelo: true,
        criadoEm: serverTimestamp(),
      };
    });

    const batch = writeBatch(db);
    novas.forEach((i) => {
      const docRef = doc(collection(db, 'entradas'));
      batch.set(docRef, i);
    });
    await batch.commit();
    return 'SUCESSO';
  } catch (err) {
    console.error('Erro ao gerar entradas fixas a partir dos modelos:', err);
    setError(err.message);
    return 'ERRO';
  }
};

  const addIncome = async (income) => {
    try {
      const diaPadrao = datasPadraoPorDescricao[income.nome || income.descricao] || 1;
      const dataFinal = income.data || gerarDataComDia(diaPadrao, income.mes || month, income.ano || year);

      const docRef = await addDoc(collection(db, 'entradas'), {
        ...income,
        pago: income.pago === true,
        data: dataFinal,
        valor: parseFloat(income.valor),
        criadoEm: serverTimestamp(),
      });

      return { ...income, id: docRef.id };
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateIncome = async (id, income) => {
    try {
      const dadosAtualizados = { ...income };

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split('T')[0];
      } else if (dadosAtualizados.pago === false && dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(doc(db, 'entradas', id), {
        ...dadosAtualizados,
        valor: parseFloat(dadosAtualizados.valor),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteIncome = async (id) => {
    try {
      await deleteDoc(doc(db, 'entradas', id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { incomes, loading, error, addIncome, updateIncome, deleteIncome, gerarFixasDoMes };
};


// ================================
// 🔹 HOOK: GASTOS FIXOS
// ================================
//   { descricao: 'Auxilio Creche', categoria: 'Conhecimento', valor: 60, fixo: true, pago: false },
//   { descricao: 'Seguro Prisma', categoria: 'Transporte', valor: 127, fixo: true, pago: false },
//   { descricao: 'Aluguel', categoria: 'Moradia', valor: 900, fixo: true, pago: false },
//   { descricao: 'Internet', categoria: 'Utilidades', valor: 104.30, fixo: true, pago: false },
//   { descricao: 'Energia', categoria: 'Moradia', valor: 124, fixo: true, pago: false },
//   { descricao: 'Água', categoria: 'Moradia', valor: 115, fixo: true, pago: false },
// ];

export const useFixedExpenses = (month, year) => {
  const [fixedExpenses, setFixedExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!month || !year) return;
    setLoading(true);
    const q = query(collection(db, 'gastosFixos'), where('mes', '==', month), where('ano', '==', year));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFixedExpenses(snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        valor: parseFloat(d.data().valor) || 0,
      })));
      setLoading(false);
    }, (err) => {
      console.error('Erro ao carregar gastos fixos:', err);
      setError(err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [month, year]);

const gerarFixosDoMes = async () => {
    try {
      // 1. Verifica se já existem gastos gerados por um modelo
      const qGastos = query(collection(db, 'gastosFixos'), where('mes', '==', month), where('ano', '==', year));
      const snapshotGastos = await getDocs(qGastos);
      const jaGerou = snapshotGastos.docs.some(doc => doc.data().origemModelo === true);
      if (jaGerou) {
        console.log('Gastos fixos já foram gerados para este mês.');
        return 'JA_GERADO'; // ✨ RETORNO ESPECÍFICO
      }

      // 2. Busca os modelos de gasto cadastrados pelo usuário
      const qModelos = query(collection(db, 'modelosDeGasto'), where('ativo', '==', true));
      const modelosSnapshot = await getDocs(qModelos);
      if (modelosSnapshot.empty) {
        return 'SEM_MODELOS'; // ✨ RETORNO ESPECÍFICO
      }

      // 3. Mapeia e salva os novos gastos (lógica de sucesso)
      const novosGastos = modelosSnapshot.docs.map((doc) => {
        const modelo = doc.data();
        return {
          descricao: modelo.descricao,
          categoria: modelo.categoria,
          valor: parseFloat(modelo.valor),
          dataVencimento: gerarDataComDia(modelo.diaVencimento, month, year),
          mes: month,
          ano: year,
          pago: false,
          origemModelo: true,
          criadoEm: serverTimestamp(),
        };
      });

      const batch = writeBatch(db);
      novosGastos.forEach((gasto) => {
        const docRef = doc(collection(db, 'gastosFixos'));
        batch.set(docRef, gasto);
      });
      await batch.commit();
      
      return 'SUCESSO'; // ✨ RETORNO ESPECÍFICO
    } catch (err) {
      console.error('Erro ao gerar gastos fixos a partir dos modelos:', err);
      setError(err.message);
      return 'ERRO'; // Retorno em caso de falha na execução
    }
  };
  
  const addFixedExpense = async (expense) => {
    try {
      const diaPadrao = datasPadraoPorDescricao[expense.descricao] || 1;
      const dataFinal = expense.dataVencimento || gerarDataComDia(diaPadrao, expense.mes || month, expense.ano || year);

      await addDoc(collection(db, 'gastosFixos'), {
        ...expense,
        dataVencimento: dataFinal,
        valor: parseFloat(expense.valor),
        criadoEm: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateFixedExpense = async (id, expense) => {
    try {
      const dadosAtualizados = { ...expense };

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split('T')[0];
      } else if (dadosAtualizados.pago === false && dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(doc(db, 'gastosFixos', id), {
        ...dadosAtualizados,
        valor: parseFloat(dadosAtualizados.valor),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteFixedExpense = async (id) => {
    try {
      await deleteDoc(doc(db, 'gastosFixos', id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { fixedExpenses, loading, error, addFixedExpense, updateFixedExpense, deleteFixedExpense, gerarFixosDoMes };
};

// ================================
// 🔹 HOOK: EMPRÉSTIMOS
// ================================
export const useLoans = (month, year) => {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!month || !year) {
      setLoans([]);
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'emprestimos'), where('mes', '==', month), where('ano', '==', year));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setLoans(snapshot.docs.map((d) => ({ id: d.id, ...d.data(), valor: parseFloat(d.data().valor) || 0 })));
        setLoading(false);
      },
      (err) => {
        console.error('Erro ao carregar empréstimos:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [month, year]);

  const converterDataParaISO = (dataStr) => {
    if (!dataStr || typeof dataStr !== 'string') return null;
    const separador = dataStr.includes('/') ? '/' : '-';
    const partes = dataStr.split(separador);
    if (partes.length !== 3) {
      console.error("Formato de data inválido recebido:", dataStr);
      return dataStr;
    }
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`;
  };

  const addLoan = async (loan) => {
    try {
      const { descricao, valorTotal, totalParcelas, dataInicio, pessoa, categoria } = loan;
      const valorParcela = parseFloat(valorTotal) / totalParcelas;

      const dataBaseISO = converterDataParaISO(dataInicio);
      if (!dataBaseISO) {
        throw new Error("Data de início inválida.");
      }
      const dataBase = new Date(dataBaseISO + 'T00:00:00');

      const idCompra = `${pessoa}-${descricao.replace(/\s+/g, '-')}-${Date.now()}`;

      const parcelas = Array.from({ length: totalParcelas }, (_, i) => {
        const dataParcela = new Date(dataBase);
        dataParcela.setMonth(dataBase.getMonth() + i);
        return {
          descricao,
          pessoa,
          categoria,
          valor: parseFloat(valorParcela.toFixed(2)),
          parcelaAtual: i + 1,
          totalParcelas,
          dataVencimento: dataParcela.toISOString().split('T')[0],
          pago: false,
          mes: dataParcela.getMonth() + 1,
          ano: dataParcela.getFullYear(),
          criadoEm: serverTimestamp(),
          idCompra: idCompra,
        };
      });

      const batch = writeBatch(db);
      parcelas.forEach((p) => {
        const docRef = doc(collection(db, 'emprestimos'));
        batch.set(docRef, p);
      });
      await batch.commit();

    } catch (err) {
      console.error('Erro ao adicionar empréstimo:', err);
      setError(err.message);
      throw err;
    }
  };

  const updateLoan = async (id, loan) => {
    try {
      const dadosAtualizados = { ...loan };

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split('T')[0];
      } else if (dadosAtualizados.pago === false && dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(doc(db, 'emprestimos', id), {
        ...dadosAtualizados,
        valor: parseFloat(dadosAtualizados.valor),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteLoan = async (id) => {
    try {
      await deleteDoc(doc(db, 'emprestimos', id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { loans, loading, error, addLoan, updateLoan, deleteLoan };
};

// ================================
// 🔹 HOOK: INVESTIMENTOS
// ================================

// 🔧 Funções utilitárias para números (aceita "10,50" ou "10.50")
const parseNumber = (raw) => {
  if (raw === undefined || raw === null) return 0;
  const s = String(raw).replace(/\s/g, '').replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
};

const calcValorAtual = (valorInicial, movimentacoes = []) => {
  const base = parseNumber(valorInicial);
  const somaMovs = movimentacoes.reduce((acc, mov) => {
    const v = parseNumber(mov.valor ?? 0);
    return acc + (mov.tipo === 'Aporte' ? v : -v);
  }, 0);
  return Math.max(0, base + somaMovs);
};

export const useInvestments = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 🔎 Listener em tempo real
  useEffect(() => {
    const q = query(collection(db, 'investimentos'), orderBy('criadoEm', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((d) => {
          const docData = d.data();
          const valorInicial = parseNumber(docData.valorInicial ?? docData.valorAtual ?? 0);
          const movimentacoes = Array.isArray(docData.movimentacoes) ? docData.movimentacoes : [];
          const valorAtual = calcValorAtual(valorInicial, movimentacoes);

          return {
            id: d.id,
            ...docData,
            valorInicial,
            valorAtual,
            meta: parseNumber(docData.meta ?? 0),
            movimentacoes,
          };
        });
        setInvestments(data);
        setLoading(false);
      },
      (err) => {
        console.error('Erro no snapshot de investimentos:', err);
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // ➕ Criar investimento
  const addInvestment = async (investment) => {
    try {
      const valorInicial = parseNumber(investment.valorInicial ?? investment.valorAtual ?? 0);
      const novo = {
        nome: investment.nome || 'Sem nome',
        instituicao: investment.instituicao || 'Não Informado',
        valorInicial,
        valorAtual: valorInicial,
        meta: parseNumber(investment.meta ?? 0),
        movimentacoes: [],
        criadoEm: serverTimestamp(),
      };
      await addDoc(collection(db, 'investimentos'), novo);
    } catch (err) {
      console.error('Erro ao adicionar investimento:', err);
      setError(err.message);
      throw err;
    }
  };

  // ✏️ Atualizar dados principais (recalcula valorAtual)
  const updateInvestment = async (id, dadosAtualizados) => {
    try {
      const investmentRef = doc(db, 'investimentos', id);
      const snap = await getDoc(investmentRef);
      if (!snap.exists()) throw new Error('Investimento não encontrado.');

      const atual = snap.data();
      const movs = atual.movimentacoes || [];
      const novoValorInicial = parseNumber(dadosAtualizados.valorInicial ?? atual.valorInicial ?? 0);
      const novoValorAtual = calcValorAtual(novoValorInicial, movs);

      await updateDoc(investmentRef, {
        nome: dadosAtualizados.nome || atual.nome || 'Sem nome',
        instituicao: dadosAtualizados.instituicao || atual.instituicao || 'Não Informado',
        valorInicial: novoValorInicial,
        valorAtual: novoValorAtual,
        meta: parseNumber(dadosAtualizados.meta ?? atual.meta ?? 0),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao atualizar investimento:', err);
      throw err;
    }
  };

  // ❌ Deletar investimento
  const deleteInvestment = async (id) => {
    try {
      await deleteDoc(doc(db, 'investimentos', id));
    } catch (err) {
      console.error('Erro ao deletar investimento:', err);
      setError(err.message);
    }
  };

  // ➕ Adicionar movimentação
  const addTransaction = async (investmentId, transaction) => {
    const investmentRef = doc(db, 'investimentos', investmentId);
    try {
      const docSnap = await getDoc(investmentRef);
      if (!docSnap.exists()) throw new Error('Investimento não encontrado.');
      const data = docSnap.data();
      const movs = data.movimentacoes || [];

      const novaMov = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        ...transaction,
        valor: parseNumber(transaction.valor ?? 0),
        data: transaction.data || new Date().toISOString(),
      };

      const novasMovs = [...movs, novaMov];
      const valorAtual = calcValorAtual(data.valorInicial, novasMovs);

      await updateDoc(investmentRef, {
        movimentacoes: novasMovs,
        valorAtual,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao adicionar movimentação:', err);
      throw err;
    }
  };

  // ✏️ Editar movimentação
  const updateTransaction = async (investmentId, transactionId, updatedTransaction) => {
    const investmentRef = doc(db, 'investimentos', investmentId);
    try {
      const docSnap = await getDoc(investmentRef);
      if (!docSnap.exists()) throw new Error('Investimento não encontrado.');
      const data = docSnap.data();
      const movs = data.movimentacoes || [];

      const novasMovs = movs.map((mov) =>
        mov.id === transactionId
          ? { ...mov, ...updatedTransaction, valor: parseNumber(updatedTransaction.valor ?? mov.valor ?? 0) }
          : mov
      );
      const valorAtual = calcValorAtual(data.valorInicial, novasMovs);

      await updateDoc(investmentRef, {
        movimentacoes: novasMovs,
        valorAtual,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao editar movimentação:', err);
      throw err;
    }
  };

  // ❌ Deletar movimentação
  const deleteTransaction = async (investmentId, transactionId) => {
    const investmentRef = doc(db, 'investimentos', investmentId);
    try {
      const docSnap = await getDoc(investmentRef);
      if (!docSnap.exists()) throw new Error('Investimento não encontrado.');
      const data = docSnap.data();
      const movs = data.movimentacoes || [];

      const novasMovs = movs.filter((mov) => mov.id !== transactionId);
      const valorAtual = calcValorAtual(data.valorInicial, novasMovs);

      await updateDoc(investmentRef, {
        movimentacoes: novasMovs,
        valorAtual,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      console.error('Erro ao deletar movimentação:', err);
      throw err;
    }
  };

  return {
    investments,
    loading,
    error,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
};



// =======================================
// 🔹 HOOK: CARTÕES EMPRESTADOS
// =======================================
export const useCartoesEmprestados = (month, year) => {
  const [cartoes, setCartoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!month || !year) {
      setCartoes([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, 'cartoesEmprestados'),
      where('mes', '==', month),
      where('ano', '==', year)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const dados = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        pago: d.data().pago === true,
        valor: parseFloat(d.data().valor) || 0,
      }));
      setCartoes(dados);
      setLoading(false);
    }, (err) => {
      console.error("Erro no snapshot de cartões:", err);
      setError(err.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [month, year]);

  const converterDataParaISO = (dataDDMMYYYY) => {
    if (!dataDDMMYYYY || typeof dataDDMMYYYY !== 'string') return null;
    const partes = dataDDMMYYYY.split('-');
    if (partes.length !== 3) return dataDDMMYYYY;
    const [dia, mes, ano] = partes;
    return `${ano}-${mes}-${dia}`;
  };

  const getCorDoCartao = (nomeCartao) => {
    const nomeLimpo = typeof nomeCartao === 'string' ? nomeCartao.trim() : '';
    if (colors.byInstitution && colors.byInstitution[nomeLimpo]) {
      return colors.byInstitution[nomeLimpo];
    }
    return colors.byInstitution?.Default || '#888888';
  };

  const addCartao = async (cartao) => {
    try {
      const { descricao, valor: valorTotal, parcelas, dataCompra, pessoa, cartao: nomeCartao } = cartao;
      
      const corDoCartao = getCorDoCartao(nomeCartao);
      const valorParcela = parseFloat(valorTotal) / parcelas;
      const dataBaseISO = converterDataParaISO(dataCompra);
      const dataBase = new Date(dataBaseISO + 'T00:00:00');
      const idCompra = `${descricao.replace(/\s+/g, '-')}-${dataBaseISO}`;
      const diaVencimento = vencimentoCartaoPorNome[nomeCartao] || vencimentoCartaoPorNome.Default;

      const dataFechamentoEstimada = new Date(dataBase.getFullYear(), dataBase.getMonth(), diaVencimento - 7);
      let mesOffset = dataBase > dataFechamentoEstimada ? 1 : 0;

      const loteParcelas = Array.from({ length: parcelas }, (_, i) => {
        const dataReferencia = new Date(dataBase);
        dataReferencia.setMonth(dataReferencia.getMonth() + mesOffset + i);
        dataReferencia.setDate(diaVencimento);
        const dataVencimentoFinal = dataReferencia;

        return {
          descricao,
          pessoa,
          cartao: nomeCartao,
          corCartao: corDoCartao,
          valor: parseFloat(valorParcela.toFixed(2)),
          valorTotal: parseFloat(valorTotal),
          dataCompra: dataBaseISO,
          parcelaAtual: i + 1,
          totalParcelas: parcelas,
          dataVencimento: dataVencimentoFinal.toISOString().split('T')[0],
          pago: false,
          adiantada: false,
          mes: dataVencimentoFinal.getMonth() + 1,
          ano: dataVencimentoFinal.getFullYear(),
          idCompra: idCompra,
          criadoEm: serverTimestamp(),
        };
      });
      
      const batch = writeBatch(db);
      loteParcelas.forEach((p) => {
        const docRef = doc(collection(db, 'cartoesEmprestados'));
        batch.set(docRef, p);
      });
      await batch.commit();

    } catch (err) {
      console.error("Erro ao adicionar compra parcelada:", err);
      setError(err.message);
      throw err;
    }
  };

  const updateCartao = async (id, cartao) => {
    try {
      const dadosAtualizados = { ...cartao };

      if (dadosAtualizados.pago === true && !dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split('T')[0];
      } else if (dadosAtualizados.pago === false && dadosAtualizados.dataPagamento) {
        dadosAtualizados.dataPagamento = null;
      }

      const cartaoRef = doc(db, 'cartoesEmprestados', id);
      await updateDoc(cartaoRef, { ...dadosAtualizados, atualizadoEm: serverTimestamp() });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteCartao = async (id) => {
    try {
      await deleteDoc(doc(db, 'cartoesEmprestados', id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const toggleCartaoStatus = async (cartaoId, statusAtual) => {
    try {
      const cartaoRef = doc(db, 'cartoesEmprestados', cartaoId);
      const novoStatus = !statusAtual;
      const dadosAtualizados = { pago: novoStatus };

      if (novoStatus === true) {
        dadosAtualizados.dataPagamento = new Date().toISOString().split('T')[0];
      } else {
        dadosAtualizados.dataPagamento = null;
      }

      await updateDoc(cartaoRef, {
        ...dadosAtualizados,
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { cartoes, loading, error, addCartao, updateCartao, deleteCartao, toggleCartaoStatus };
};

// ================================
// 🔹 HOOK: MODELOS (Gastos e Entradas)
// ================================
export const useFirestoreModelos = (tipo = 'gasto') => {
  const [modelos, setModelos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
    const q = query(collection(db, collectionName));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
          valor: parseFloat(docSnap.data().valor) || 0,
        }));
        setModelos(data);
        setLoading(false);
      },
      (err) => {
        console.error(`Erro ao carregar modelos (${tipo}):`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tipo]);

  const addModelo = async (modelo) => {
    try {
      const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
      await addDoc(collection(db, collectionName), {
        ...modelo,
        ativo: modelo.ativo ?? true,
        valor: parseFloat(modelo.valor),
        criadoEm: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const updateModelo = async (id, modelo) => {
    try {
      const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
      await updateDoc(doc(db, collectionName, id), {
        ...modelo,
        valor: parseFloat(modelo.valor),
        atualizadoEm: serverTimestamp(),
      });
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const deleteModelo = async (id) => {
    try {
      const collectionName = tipo === 'gasto' ? 'modelosDeGasto' : 'modelosDeEntrada';
      await deleteDoc(doc(db, collectionName, id));
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  return { modelos, loading, error, addModelo, updateModelo, deleteModelo };
};