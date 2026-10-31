import { prisma } from "./client";
import { DomainError } from "@/lib/errors";
import { parseDateOnly } from "@/lib/finance/periods";
import type { TransactionFilters, TransactionInput } from "@/lib/validation/transaction";
import { buildOrderBy, buildTransactionWhere, PAGE_SIZE } from "./transaction-filters";

async function assertCategory(userId: string, input: TransactionInput) {
  const cat = await prisma.category.findFirst({
    where: { id: input.categoryId, userId, type: input.type, isArchived: false },
    select: { id: true },
  });
  if (!cat) throw new DomainError("Categoria inválida para este tipo de transação");
}

const toData = (i: TransactionInput) => ({
  type: i.type,
  description: i.description,
  amount: i.amount.toFixed(2),
  date: parseDateOnly(i.date),
  categoryId: i.categoryId,
  notes: i.notes ?? null,
});

export async function createTransaction(userId: string, input: TransactionInput) {
  await assertCategory(userId, input);
  return prisma.transaction.create({ data: { ...toData(input), userId } });
}

export async function updateTransaction(userId: string, id: string, input: TransactionInput) {
  await assertCategory(userId, input);
  const { count } = await prisma.transaction.updateMany({ where: { id, userId }, data: toData(input) });
  if (count === 0) throw new DomainError("Transação não encontrada", "NOT_FOUND");
}

export async function deleteTransaction(userId: string, id: string) {
  const { count } = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (count === 0) throw new DomainError("Transação não encontrada", "NOT_FOUND");
}

export async function getTransaction(userId: string, id: string) {
  return prisma.transaction.findFirst({ where: { id, userId }, include: { category: { select: { name: true } } } });
}

export async function listTransactions(userId: string, f: TransactionFilters) {
  const where = buildTransactionWhere(userId, f);
  const [items, total] = await Promise.all([
    prisma.transaction.findMany({ where, orderBy: buildOrderBy(f), skip: (f.page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { category: { select: { name: true } } } }),
    prisma.transaction.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}
