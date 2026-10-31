import Decimal from "decimal.js";
import { sum, ZERO } from "./money";
import { monthRange } from "./periods";
import { summarize } from "./totals";

/** Mês no formato "AAAA-MM". Um gasto pertence ao mês da sua data de calendário (sem fuso). */
export type YearMonth = string;

export function isYearMonth(s: string): boolean {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(s);
  return !!m && Number(m[1]) >= 1900 && Number(m[1]) <= 2100;
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** n meses terminando em ym, do mais antigo ao mais recente. */
export function monthsEndingAt(ym: YearMonth, n: number): YearMonth[] {
  return Array.from({ length: n }, (_, i) => shiftMonth(ym, i - (n - 1)));
}

export function monthBounds(ym: YearMonth) {
  const [y, m] = ym.split("-").map(Number);
  return monthRange(y, m);
}

/** Variação percentual (1 casa). Retorna null quando o valor anterior é zero: não há base de comparação. */
export function percentChange(current: Decimal.Value, previous: Decimal.Value): Decimal | null {
  const p = new Decimal(previous);
  if (p.isZero()) return null;
  return new Decimal(current).minus(p).div(p.abs()).times(100).toDecimalPlaces(1);
}

export type MonthlyPoint = { month: YearMonth; income: Decimal; expense: Decimal; result: Decimal };

export function monthlySeries(months: YearMonth[], txs: { type: "INCOME" | "EXPENSE"; amount: Decimal.Value; date: string }[]): MonthlyPoint[] {
  return months.map((month) => ({ month, ...summarize(txs.filter((t) => t.date.slice(0, 7) === month)) }));
}

export type CategorySlice = { categoryId: string; name: string; total: Decimal; percent: Decimal };

/** Distribuição das despesas por categoria, da maior para a menor. */
export function expenseByCategory(txs: { amount: Decimal.Value; categoryId: string; categoryName: string }[]): CategorySlice[] {
  const map = new Map<string, { categoryId: string; name: string; total: Decimal }>();
  for (const t of txs) {
    const cur = map.get(t.categoryId) ?? { categoryId: t.categoryId, name: t.categoryName, total: ZERO };
    map.set(t.categoryId, { ...cur, total: cur.total.plus(t.amount) });
  }
  const all = [...map.values()];
  const grand = sum(all.map((v) => v.total));
  return all
    .sort((a, b) => b.total.comparedTo(a.total) || a.name.localeCompare(b.name))
    .map((v) => ({ ...v, percent: grand.isZero() ? ZERO : v.total.div(grand).times(100).toDecimalPlaces(1) }));
}
