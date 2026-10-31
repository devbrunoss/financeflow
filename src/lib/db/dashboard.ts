import Decimal from "decimal.js";
import { prisma } from "./client";
import { expenseByCategory, monthBounds, monthlySeries, monthsEndingAt, type YearMonth } from "@/lib/finance/dashboard";
import { formatDateOnly, parseDateOnly } from "@/lib/finance/periods";

export async function getDashboardData(userId: string, ym: YearMonth) {
  const months = monthsEndingAt(ym, 6);
  const range = { gte: parseDateOnly(monthBounds(months[0]).start), lte: parseDateOnly(monthBounds(ym).end) };

  const [totals, rows, recent] = await Promise.all([
    prisma.transaction.groupBy({ by: ["type"], where: { userId }, _sum: { amount: true } }),
    prisma.transaction.findMany({ where: { userId, date: range }, select: { type: true, amount: true, date: true, categoryId: true, category: { select: { name: true } } } }),
    prisma.transaction.findMany({ where: { userId }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 5, include: { category: { select: { name: true } } } }),
  ]);

  const sumOf = (t: "INCOME" | "EXPENSE") => new Decimal(totals.find((x) => x.type === t)?._sum.amount?.toString() ?? 0);
  const balance = sumOf("INCOME").minus(sumOf("EXPENSE")); // todas as transações, de todos os tempos

  const series = monthlySeries(months, rows.map((r) => ({ type: r.type, amount: r.amount.toString(), date: formatDateOnly(r.date) })));
  const monthExpenses = rows.filter((r) => r.type === "EXPENSE" && formatDateOnly(r.date).slice(0, 7) === ym);

  return {
    hasAny: totals.length > 0,
    balance,
    series,
    current: series[series.length - 1],
    previous: series[series.length - 2],
    byCategory: expenseByCategory(monthExpenses.map((r) => ({ amount: r.amount.toString(), categoryId: r.categoryId, categoryName: r.category.name }))),
    recent,
  };
}
