// ✅ Gera datas em ISO (yyyy-mm-dd) para salvar no Firestore
export function gerarDataComDia(dia, mes, ano) {
  try {
    const data = new Date(ano, mes - 1, dia);
    const dd = String(data.getDate()).padStart(2, '0');
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    const yyyy = data.getFullYear();
    return `${yyyy}-${mm}-${dd}`; // ISO
  } catch (e) {
    console.error('Erro ao gerar data:', e);
    return null;
  }
}
