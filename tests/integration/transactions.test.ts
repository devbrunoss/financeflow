import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/db/client";
import { createTransaction, deleteTransaction, getTransaction, listTransactions, updateTransaction } from "../../src/lib/db/transactions";
import { ensureDefaultCategories, listActiveCategories } from "../../src/lib/db/categories";
import { summarize } from "../../src/lib/finance/totals";
import { parseFilters, transactionInputSchema } from "../../src/lib/validation/transaction";

const tag = `txtest-${Date.now()}`;
let a = "", b = "", aExpense = "", aIncome = "", bExpense = "";
const input = (categoryId: string, over: Record<string, string> = {}) =>
  transactionInputSchema.parse({ type: "EXPENSE", description: "Teste", amount: "10,10", date: "2026-10-15", categoryId, ...over });

beforeAll(async () => {
  a = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@x.com` } })).id;
  b = (await prisma.user.create({ data: { name: "B", email: `${tag}-b@x.com` } })).id;
  await ensureDefaultCategories(a);
  await ensureDefaultCategories(b);
  const ca = await listActiveCategories(a);
  aExpense = ca.find((c) => c.type === "EXPENSE")!.id;
  aIncome = ca.find((c) => c.type === "INCOME")!.id;
  bExpense = (await listActiveCategories(b)).find((c) => c.type === "EXPENSE")!.id;
});
afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { startsWith: tag } } }); // também testa a exclusão em cascata
  await prisma.$disconnect();
});

describe("transações no banco real", () => {
  it("cria e soma com precisão decimal", async () => {
    await createTransaction(a, input(aExpense, { amount: "0,10" }));
    await createTransaction(a, input(aExpense, { amount: "0,20" }));
    await createTransaction(a, input(aIncome, { type: "INCOME", amount: "100" }));
    const { items } = await listTransactions(a, parseFilters({}));
    const s = summarize(items.map((t) => ({ type: t.type, amount: t.amount.toString() })));
    expect(s.expense.toString()).toBe("0.3");
    expect(s.result.toString()).toBe("99.7");
  });
  it("rejeita categoria de outro usuário e tipo incompatível", async () => {
    await expect(createTransaction(a, input(bExpense))).rejects.toThrow();
    await expect(createTransaction(a, input(aIncome))).rejects.toThrow(); // EXPENSE em categoria INCOME
  });
  it("isolamento: B não lista, lê, edita nem exclui dados de A", async () => {
    const t = await createTransaction(a, input(aExpense, { description: "Secreta" }));
    expect((await listTransactions(b, parseFilters({}))).total).toBe(0);
    expect(await getTransaction(b, t.id)).toBeNull();
    await expect(updateTransaction(b, t.id, input(bExpense, { description: "Hack" }))).rejects.toThrow();
    await expect(deleteTransaction(b, t.id)).rejects.toThrow();
    expect((await getTransaction(a, t.id))?.description).toBe("Secreta");
  });
  it("filtros: período inclusivo, tipo, busca; período vazio retorna zero", async () => {
    await createTransaction(a, input(aExpense, { description: "Limite início", date: "2026-09-01" }));
    await createTransaction(a, input(aExpense, { description: "Limite fim", date: "2026-09-30" }));
    const sep = await listTransactions(a, parseFilters({ from: "2026-09-01", to: "2026-09-30" }));
    expect(sep.items.map((t) => t.description).sort()).toEqual(["Limite fim", "Limite início"]);
    expect((await listTransactions(a, parseFilters({ q: "limite", type: "INCOME" }))).total).toBe(0);
    expect((await listTransactions(a, parseFilters({ from: "2020-01-01", to: "2020-01-31" }))).total).toBe(0);
  });
  it("excluir a própria transação funciona; categoria em uso não pode ser excluída", async () => {
    const t = await createTransaction(a, input(aExpense));
    await deleteTransaction(a, t.id);
    expect(await getTransaction(a, t.id)).toBeNull();
    await expect(prisma.category.delete({ where: { id: aExpense } })).rejects.toThrow();
  });
});
