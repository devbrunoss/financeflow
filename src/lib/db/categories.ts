import { prisma } from "./client";

const DEFAULTS = [
  ...["Salário", "Freelance", "Investimentos", "Outras receitas"].map((name) => ({ name, type: "INCOME" as const })),
  ...["Moradia", "Mercado", "Transporte", "Saúde", "Lazer", "Educação", "Outras despesas"].map((name) => ({ name, type: "EXPENSE" as const })),
];

/** Cria as categorias iniciais na primeira vez; idempotente. */
export async function ensureDefaultCategories(userId: string) {
  if ((await prisma.category.count({ where: { userId } })) > 0) return;
  await prisma.category.createMany({ data: DEFAULTS.map((c) => ({ ...c, userId })), skipDuplicates: true });
}

export function listActiveCategories(userId: string) {
  return prisma.category.findMany({ where: { userId, isArchived: false }, orderBy: [{ type: "asc" }, { name: "asc" }] });
}
