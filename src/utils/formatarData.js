// ✅ Converte ISO -> dd-mm-yyyy para EXIBIÇÃO
export function formatarDataParaExibicao(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const mISO = /^(\d{4})-(\d{2})-(\d{2})$/;
  const mBR = /^(\d{2})-(\d{2})-(\d{4})$/;

  if (mISO.test(iso)) {
    const [, y, m, d] = iso.match(mISO);
    return `${d}-${m}-${y}`;
  }
  if (mBR.test(iso)) return iso; // já está em dd-mm-yyyy
  return iso; // fallback
}

// ✅ Converte dd-mm-yyyy/Date/ISO -> ISO (yyyy-mm-dd) para SALVAR
export function normalizarParaISO(v) {
  if (!v) return null;

  if (v instanceof Date && !isNaN(v)) {
    const dd = String(v.getDate()).padStart(2, '0');
    const mm = String(v.getMonth() + 1).padStart(2, '0');
    const yyyy = v.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  if (typeof v === 'string') {
    const mBR = /^(\d{2})-(\d{2})-(\d{4})$/;
    const mISO = /^(\d{4})-(\d{2})-(\d{2})$/;

    if (mISO.test(v)) return v;
    if (mBR.test(v)) {
      const [, d, m, y] = v.match(mBR);
      return `${y}-${m}-${d}`;
    }
  }

  // último recurso: tentar new Date()
  const d = new Date(v);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}
