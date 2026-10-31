import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/db/client";
import { ensureDefaultCategories, listActiveCategories } from "../../src/lib/db/categories";
import { createCategory, deleteCategory, renameCategory, setCategoryArchived } from "../../src/lib/db/category-admin";
import { deleteBudget, listBudgetsWithSpent, setBudget } from "../../src/lib/db/budgets";
import { addContribution, createGoal, setGoalCanceled } from "../../src/lib/db/goals";
import { listForExport } from "../../src/lib/db/export";
import { createTransaction } from "../../src/lib/db/transactions";
import { transactionsToCsv } from "../../src/lib/finance/csv";
import { transactionInputSchema, parseFilters } from "../../src/lib/validation/transaction";
import Decimal from "decimal.js";

const tag = `modtest-${Date.now()}`;
let a = "", b = "", expA = "", incA = "", expB = "";
const tx = (categoryId: string, type: "INCOME" | "EXPENSE", amount: string, date: string, description = "t") =>
  transactionInputSchema.parse({ type, description, amount, date, categoryId });
const D = (v: string) => new Decimal(v);

beforeAll(async () => {
  a = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@x.com` } })).id;
  b = (await prisma.user.create({ data: { name: "B", email: `${tag}-b@x.com` } })).id;
  await ensureDefaultCategories(a); await ensureDefaultCategories(b);
  const ca = await listActiveCategories(a);
  expA = ca.find((c) => c.type === "EXPENSE")!.id; incA = ca.find((c) => c.type === "INCOME")!.id;
  expB = (await listActiveCategories(b)).find((c) => c.type === "EXPENSE")!.id;
});
afterAll(async () => { await prisma.user.deleteMany({ where: { email: { startsWith: tag } } }); await prisma.$disconnect(); });

describe("categorias", () => {
  it("rejeita duplicada (mesmo nome e tipo) mas aceita o mesmo nome em outro tipo", async () => {
    await createCategory(a, { name: "Extra", type: "EXPENSE" });
    await expect(createCategory(a, { name: "Extra", type: "EXPENSE" })).rejects.toThrow(/Já existe/);
    await expect(createCategory(a, { name: "Extra", type: "INCOME" })).resolves.toBeTruthy();
  });
  it("outro usuário não renomeia, arquiva nem exclui; renomear para nome existente falha", async () => {
    await expect(renameCategory(b, expA, "Hack")).rejects.toThrow();
    await expect(setCategoryArchived(b, expA, true)).rejects.toThrow();
    await expect(deleteCategory(b, expA)).rejects.toThrow();
    const c = await createCategory(a, { name: "Renomear", type: "EXPENSE" });
    await expect(renameCategory(a, c.id, "Extra")).rejects.toThrow(/Já existe/);
    await renameCategory(a, c.id, "Renomeada");
  });
  it("categoria em uso não é excluída; vazia é; arquivada some dos formulários e não aceita novas transações", async () => {
    await createTransaction(a, tx(expA, "EXPENSE", "10", "2026-10-10"));
    await expect(deleteCategory(a, expA)).rejects.toThrow(/Arquive/);
    const vazia = await createCategory(a, { name: "Vazia", type: "EXPENSE" });
    await deleteCategory(a, vazia.id);
    const arq = await createCategory(a, { name: "Arquivar", type: "EXPENSE" });
    await setCategoryArchived(a, arq.id, true);
    expect((await listActiveCategories(a)).some((c) => c.id === arq.id)).toBe(false);
    await expect(createTransaction(a, tx(arq.id, "EXPENSE", "5", "2026-10-10"))).rejects.toThrow();
  });
});

describe("orçamentos", () => {
  it("só aceita categoria de despesa própria; atualizar não duplica", async () => {
    await expect(setBudget(a, { categoryId: incA, month: "2026-10", limit: D("100") })).rejects.toThrow();
    await expect(setBudget(a, { categoryId: expB, month: "2026-10", limit: D("100") })).rejects.toThrow();
    await setBudget(a, { categoryId: expA, month: "2026-10", limit: D("100") });
    await setBudget(a, { categoryId: expA, month: "2026-10", limit: D("200") });
    const l = await listBudgetsWithSpent(a, "2026-10");
    expect(l).toHaveLength(1);
    expect(l[0].limit.toFixed(2)).toBe("200.00");
  });
  it("gasto pertence ao mês da data (30/09 fora, 01/10 e 31/10 dentro) e calcula estado", async () => {
    await createTransaction(a, tx(expA, "EXPENSE", "999", "2026-09-30"));
    await createTransaction(a, tx(expA, "EXPENSE", "150", "2026-10-01"));
    await createTransaction(a, tx(expA, "EXPENSE", "10", "2026-10-31"));
    await createTransaction(a, tx(expA, "EXPENSE", "7", "2026-11-01"));
    const [x] = await listBudgetsWithSpent(a, "2026-10"); // 10 (da etapa anterior) + 150 + 10 = 170 de 200
    expect(x.spent.toFixed(2)).toBe("170.00");
    expect(x.state).toBe("NEAR");
    await setBudget(a, { categoryId: expA, month: "2026-10", limit: D("100") });
    expect((await listBudgetsWithSpent(a, "2026-10"))[0].state).toBe("EXCEEDED");
  });
  it("isolamento", async () => {
    expect(await listBudgetsWithSpent(b, "2026-10")).toEqual([]);
    const [x] = await listBudgetsWithSpent(a, "2026-10");
    await expect(deleteBudget(b, x.id)).rejects.toThrow();
    await deleteBudget(a, x.id);
  });
});

describe("metas", () => {
  it("aportes somam, concluem ao atingir o alvo, retirada reabre e não passa do acumulado", async () => {
    const g = await createGoal(a, { name: "Viagem", targetAmount: D("1000") });
    await addContribution(a, g.id, D("600"), "2026-10-01");
    await addContribution(a, g.id, D("400"), "2026-10-02");
    expect((await prisma.goal.findUnique({ where: { id: g.id } }))!.status).toBe("COMPLETED");
    await addContribution(a, g.id, D("-100"), "2026-10-03");
    expect((await prisma.goal.findUnique({ where: { id: g.id } }))!.status).toBe("ACTIVE");
    await expect(addContribution(a, g.id, D("-901"), "2026-10-04")).rejects.toThrow(/excede/);
  });
  it("meta cancelada não aceita aporte; outro usuário não mexe; não cria transações", async () => {
    const before = await prisma.transaction.count({ where: { userId: a } });
    const g = await createGoal(a, { name: "Carro", targetAmount: D("500") });
    await expect(addContribution(b, g.id, D("10"), "2026-10-01")).rejects.toThrow();
    await expect(setGoalCanceled(b, g.id, true)).rejects.toThrow();
    await addContribution(a, g.id, D("10"), "2026-10-01");
    await setGoalCanceled(a, g.id, true);
    await expect(addContribution(a, g.id, D("10"), "2026-10-02")).rejects.toThrow(/cancelada/);
    expect(await prisma.transaction.count({ where: { userId: a } })).toBe(before);
  });
});

describe("exportação", () => {
  it("respeita filtros e usuário, e neutraliza fórmulas na descrição", async () => {
    await createTransaction(a, tx(expA, "EXPENSE", "12,34", "2026-12-15", "=CMD()"));
    await createTransaction(b, tx(expB, "EXPENSE", "99", "2026-12-15", "do B"));
    const rows = await listForExport(a, parseFilters({ from: "2026-12-01", to: "2026-12-31" }));
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe("12.34");
    expect(transactionsToCsv(rows)).toContain("'=CMD()");
    expect(await listForExport(a, parseFilters({ from: "2020-01-01", to: "2020-01-31" }))).toEqual([]);
  });
});
