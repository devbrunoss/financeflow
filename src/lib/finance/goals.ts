import Decimal from "decimal.js";
import { sum, ZERO } from "./money";

export type GoalStatusT = "ACTIVE" | "COMPLETED" | "CANCELED";

/** Valor acumulado é DERIVADO da soma das contribuições (aportes positivos, retiradas negativas). */
export function goalProgress(target: Decimal.Value, contributions: Decimal.Value[]) {
  const t = new Decimal(target), accumulated = sum(contributions);
  return { accumulated, reached: accumulated.gte(t), percent: t.isZero() ? ZERO : accumulated.div(t).times(100).toDecimalPlaces(1), remaining: Decimal.max(t.minus(accumulated), 0) };
}

/** Meta cancelada permanece cancelada; as demais viram COMPLETED ao atingir o alvo e voltam a ACTIVE se cair abaixo. */
export function nextStatus(current: GoalStatusT, reached: boolean): GoalStatusT {
  return current === "CANCELED" ? current : reached ? "COMPLETED" : "ACTIVE";
}
