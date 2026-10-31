import { prisma } from "./client";
import { DomainError } from "@/lib/errors";

const isUnique = (e: unknown) => (e as { code?: string })?.code === "P2002";
const DUP = "Já existe uma categoria com esse nome e tipo";
const NOT_FOUND = () => new DomainError("Categoria não encontrada", "NOT_FOUND");

export async function createCategory(userId: string, input: { name: string; type: "INCOME" | "EXPENSE" }) {
  try { return await prisma.category.create({ data: { userId, ...input } }); }
  catch (e) { throw isUnique(e) ? new DomainError(DUP) : e; }
}
/** Renomear é sempre permitido (as transações referenciam o id). O tipo não pode ser alterado. */
export async function renameCategory(userId: string, id: string, name: string) {
  try { if ((await prisma.category.updateMany({ where: { id, userId }, data: { name } })).count === 0) throw NOT_FOUND(); }
  catch (e) { throw isUnique(e) ? new DomainError(DUP) : e; }
}
/** Arquivar esconde a categoria dos formulários e mantém todo o histórico. */
export async function setCategoryArchived(userId: string, id: string, isArchived: boolean) {
  if ((await prisma.category.updateMany({ where: { id, userId }, data: { isArchived } })).count === 0) throw NOT_FOUND();
}
/** Excluir só é permitido sem transações. Orçamentos da categoria são removidos junto (cascata no banco). */
export async function deleteCategory(userId: string, id: string) {
  const used = await prisma.transaction.count({ where: { userId, categoryId: id } });
  if (used > 0) throw new DomainError(`Categoria usada em ${used} transação(ões). Arquive-a em vez de excluir.`);
  if ((await prisma.category.deleteMany({ where: { id, userId } })).count === 0) throw NOT_FOUND();
}
export function listCategoriesWithCounts(userId: string) {
  return prisma.category.findMany({ where: { userId }, orderBy: [{ type: "asc" }, { name: "asc" }], include: { _count: { select: { transactions: true, budgets: true } } } });
}
