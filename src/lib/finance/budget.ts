import Decimal from "decimal.js";
import { ZERO } from "./money";

export type BudgetState = "OK" | "NEAR" | "EXCEEDED";
export const NEAR_THRESHOLD = 80;
export const STATE_LABEL: Record<BudgetState, string> = { OK: "Dentro do limite", NEAR: "Perto do limite (80% ou mais)", EXCEEDED: "Limite ultrapassado" };

/** Estado: gasto > limite => EXCEEDED; gasto >= 80% do limite => NEAR (inclui exatamente 100%); senão OK. A comparação usa precisão total; só a exibição é arredondada. */
export function budgetStatus(spent: Decimal.Value, limit: Decimal.Value) {
  const s = new Decimal(spent), l = new Decimal(limit);
  const state: BudgetState = s.gt(l) ? "EXCEEDED" : s.times(100).gte(l.times(NEAR_THRESHOLD)) ? "NEAR" : "OK";
  return { state, percent: l.isZero() ? ZERO : s.div(l).times(100).toDecimalPlaces(1), remaining: l.minus(s) };
}
