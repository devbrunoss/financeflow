import { prisma } from "./client";
import { formatDateOnly } from "@/lib/finance/periods";
import type { TransactionFilters } from "@/lib/validation/transaction";
import { buildOrderBy, buildTransactionWhere } from "./transaction-filters";

export const EXPORT_LIMIT = 50_000;

/** Mesmo where/orderBy da listagem (sem paginação): respeita filtros e isolamento por userId. */
export async function listForExport(userId: string, f: TransactionFilters) {
  const rows = await prisma.transaction.findMany({ where: buildTransactionWhere(userId, f), orderBy: buildOrderBy(f), take: EXPORT_LIMIT, include: { category: { select: { name: true } } } });
  return rows.map((r) => ({ date: formatDateOnly(r.date), type: r.type, category: r.category.name, description: r.description, amount: r.amount.toString(), notes: r.notes }));
}
