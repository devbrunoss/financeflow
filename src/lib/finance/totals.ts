import Decimal from "decimal.js";
import { sum, ZERO } from "./money";

export type TxLike = { type: "INCOME" | "EXPENSE"; amount: Decimal.Value };
export type Summary = { income: Decimal; expense: Decimal; result: Decimal };

/** Receitas, despesas e resultado (receitas - despesas) de qualquer conjunto de transações. */
export function summarize(txs: TxLike[]): Summary {
  const income = sum(txs.filter((t) => t.type === "INCOME").map((t) => t.amount));
  const expense = sum(txs.filter((t) => t.type === "EXPENSE").map((t) => t.amount));
  return { income, expense, result: income.minus(expense) };
}

/** Saldo = resultado de TODAS as transações do usuário (sem saldo inicial na v1). */
export function balance(txs: TxLike[]): Decimal {
  return txs.length === 0 ? ZERO : summarize(txs).result;
}
