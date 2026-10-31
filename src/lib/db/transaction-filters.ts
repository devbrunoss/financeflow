import { parseDateOnly } from "@/lib/finance/periods";
import type { TransactionFilters } from "@/lib/validation/transaction";

export const PAGE_SIZE = 20;

/** Sempre começa por userId: é a barreira de isolamento de todas as listagens e exportações. */
export function buildTransactionWhere(userId: string, f: TransactionFilters) {
  return {
    userId,
    ...(f.from || f.to
      ? { date: { ...(f.from && { gte: parseDateOnly(f.from) }), ...(f.to && { lte: parseDateOnly(f.to) }) } }
      : {}),
    ...(f.type && { type: f.type }),
    ...(f.categoryId && { categoryId: f.categoryId }),
    ...(f.q && { description: { contains: f.q, mode: "insensitive" as const } }),
  };
}

export function buildOrderBy(f: TransactionFilters) {
  const main = f.sort === "amount" ? { amount: f.dir } : f.sort === "description" ? { description: f.dir } : { date: f.dir };
  return [main, { createdAt: "desc" as const }, { id: "desc" as const }];
}
