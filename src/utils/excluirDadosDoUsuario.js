// src/utils/excluirDadosDoUsuario.js
// Apaga TODOS os dados de um usuário no Firestore — usado na exclusão de conta
// (useAuth.excluirConta; exigência do Google Play e da LGPD).
//
// O Firestore não apaga subcoleções junto com o documento pai, nem deixa o
// app listar quais subcoleções existem — por isso a lista abaixo é explícita.
// Coleção nova em users/{uid}/... precisa entrar aqui: o teste
// src/__tests__/exclusaoConta.test.js falha se alguma coleção usada no app
// estiver faltando.
import { collection, doc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';

export const SUBCOLECOES_DO_USUARIO = [
  // Finanças
  'entradas',
  'gastos',
  'emprestimos',
  'cartoes',
  'investimentos',
  'modelosDeEntrada',
  'modelosDeGasto',
  'categorias',
  'membros',
  'carteira',
  'linhaDoTempo',
  // Colaboração entre usuários (atrás de flag hoje, mas pode ter dado)
  'conexoes',
  'bloqueios',
  'convitesDeDivisao',
  'propostasDeAlteracao',
  'despesasCompartilhadas',
];

// Limite do Firestore é 500 operações por lote; fica uma folga.
const TAMANHO_DO_LOTE = 400;

async function apagarColecao(db, caminho) {
  const snapshot = await getDocs(collection(db, caminho));
  for (let i = 0; i < snapshot.docs.length; i += TAMANHO_DO_LOTE) {
    const lote = writeBatch(db);
    snapshot.docs.slice(i, i + TAMANHO_DO_LOTE).forEach((d) => lote.delete(d.ref));
    await lote.commit();
  }
}

/**
 * Ordem importa:
 * 1. reserva do CPF/CNPJ — a regra de segurança confere o `documento` do
 *    perfil, que ainda precisa existir;
 * 2. subcoleções;
 * 3. o perfil (users/{uid}).
 * A conta de login (Firebase Auth) é apagada depois, por quem chamou.
 */
export async function excluirDadosDoUsuario(db, uid, documento) {
  if (documento) {
    // Reserva de cadastros antigos pode não bater com o perfil — não impede
    // a exclusão do resto.
    try {
      await deleteDoc(doc(db, 'documentosCadastrados', documento));
    } catch (err) {
      console.warn('Reserva do documento não pôde ser apagada:', err?.message);
    }
  }

  for (const nome of SUBCOLECOES_DO_USUARIO) {
    await apagarColecao(db, `users/${uid}/${nome}`);
  }

  await deleteDoc(doc(db, 'users', uid));
}
