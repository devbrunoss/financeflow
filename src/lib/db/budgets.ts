import Decimal from "decimal.js";
import { prisma } from "./client";
import { DomainError } from "@/lib/errors";
import { budgetStatus } from "@/lib/finance/budget";
import { monthBounds, type YearMonth } from "@/lib/finance/dashboard";
import { parseDateOnly } from "@/lib/finance/periods";

const monthDate = (ym: YearMonth) => parseDateOnly(`${ym}-01`);

export async function setBudget(userId: string, i: { categoryId: string; month: YearMonth; limit: Decimal }) {
  const cat = await prisma.category.findFirst({ where: { id: i.categoryId, userId, type: "EXPENSE", isArchived: false }, select: { id: true } });
  if (!cat) throw new DomainError("Categoria de despesa inválida");
  const limitAmount = i.limit.toFixed(2), month = monthDate(i.month);
  await prisma.budget.upsert({ where: { userId_categoryId_month: { userId, categoryId: i.categoryId, month } }, create: { userId, categoryId: i.categoryId, month, limitAmount }, update: { limitAmount } });
}
export async function deleteBudget(userId: string, id: string) {
  if ((await prisma.budget.deleteMany({ where: { id, userId } })).count === 0) throw new DomainError("Orçamento não encontrado", "NOT_FOUND");
}
/** Gasto do orçamento = despesas da categoria com data dentro do mês (primeiro ao último dia, inclusivos). */
export async function listBudgetsWithSpent(userId: string, ym: YearMonth) {
  const { start, end } = monthBounds(ym);
  const [budgets, spentRows] = await Promise.all([
    prisma.budget.findMany({ where: { userId, month: monthDate(ym) }, include: { category: { select: { name: true } } }, orderBy: { category: { name: "asc" } } }),
    prisma.transaction.groupBy({ by: ["categoryId"], where: { userId, type: "EXPENSE", date: { gte: parseDateOnly(start), lte: parseDateOnly(end) } }, _sum: { amount: true } }),
  ]);
  return budgets.map((b) => {
    const spent = new Decimal(spentRows.find((r) => r.categoryId === b.categoryId)?._sum.amount?.toString() ?? 0);
    return { id: b.id, categoryName: b.category.name, limit: new Decimal(b.limitAmount.toString()), spent, ...budgetStatus(spent, b.limitAmount.toString()) };
  });
}
