// src/utils/metas.js
import { colors } from '../styles/colors';
// Cálculo único de progresso de meta — hoje só Meta de Investimento usa,
// mas qualquer tipo de meta futuro (Sprint 5, "Planejamento Financeiro")
// reaproveita a mesma função. Antes desta sprint havia 3 implementações
// divergentes (0–100 vs 0–1, travada vs não travada em 100%) espalhadas em
// SecaoInvestimentos.js, TelaPadrao.js e DetalhesInvestimentoModal.js — ver
// SPRINT4_DISCOVERY.md, seção 7.

// Sempre retorna uma escala 0–100, sempre travada em 100 (nunca "estoura"
// mesmo quando valorAtual > valorMeta).
export function calcularProgressoMeta(valorAtual, valorMeta) {
  const meta = Number(valorMeta) || 0;
  if (meta <= 0) return 0;
  const atual = Number(valorAtual) || 0;
  return Math.min((atual / meta) * 100, 100);
}

// Cor "semáforo" por faixa de progresso — mesmos limiares que
// SecaoInvestimentos.js já usava.
export function corProgressoMeta(percentual) {
  if (percentual < 33) return colors.gasto;
  if (percentual < 66) return colors.pending;
  return colors.balance;
}
