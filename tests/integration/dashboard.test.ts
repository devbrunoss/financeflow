import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/db/client";
import { ensureDefaultCategories, listActiveCategories } from "../../src/lib/db/categories";
import { getDashboardData } from "../../src/lib/db/dashboard";
import { createTransaction } from "../../src/lib/db/transactions";
import { transactionInputSchema } from "../../src/lib/validation/transaction";

const tag = `dashtest-${Date.now()}`;
let a = "", b = "", catA = "", incA = "", catB = "";
const tx = (categoryId: string, type: "INCOME" | "EXPENSE", amount: string, date: string) =>
  transactionInputSchema.parse({ type, description: "t", amount, date, categoryId });

beforeAll(async () => {
  a = (await prisma.user.create({ data: { name: "A", email: `${tag}-a@x.com` } })).id;
  b = (await prisma.user.create({ data: { name: "B", email: `${tag}-b@x.com` } })).id;
  await ensureDefaultCategories(a); await ensureDefaultCategories(b);
  const ca = await listActiveCategories(a);
  catA = ca.find((c) => c.type === "EXPENSE")!.id; incA = ca.find((c) => c.type === "INCOME")!.id;
  catB = (await listActiveCategories(b)).find((c) => c.type === "EXPENSE")!.id;
  await createTransaction(a, tx(incA, "INCOME", "1000", "2026-10-31"));
  await createTransaction(a, tx(catA, "EXPENSE", "200,10", "2026-10-01"));
  await createTransaction(a, tx(catA, "EXPENSE", "0,20", "2026-10-15"));
  await createTransaction(a, tx(catA, "EXPENSE", "100", "2026-09-30"));
  await createTransaction(a, tx(catA, "EXPENSE", "50", "2025-01-10")); // fora da janela de 6 meses
  await createTransaction(b, tx(catB, "EXPENSE", "999", "2026-10-10"));
});
afterAll(async () => { await prisma.user.deleteMany({ where: { email: { startsWith: tag } } }); await prisma.$disconnect(); });

describe("dashboard no banco real", () => {
  it("calcula saldo, mês atual, mês anterior e categorias só com dados do usuário", async () => {
    const d = await getDashboardData(a, "2026-10");
    expect(d.balance.toFixed(2)).toBe("649.70");                 // 1000 - 200,30 - 100 - 50
    expect(d.current.income.toFixed(2)).toBe("1000.00");
    expect(d.current.expense.toFixed(2)).toBe("200.30");
    expect(d.current.result.toFixed(2)).toBe("799.70");
    expect(d.previous.expense.toFixed(2)).toBe("100.00");        // 30/09 pertence a setembro
    expect(d.series).toHaveLength(6);
    expect(d.byCategory).toHaveLength(1);
    expect(d.byCategory[0].total.toFixed(2)).toBe("200.30");
    expect(d.recent.length).toBeLessThanOrEqual(5);
  });
  it("isolamento: B não enxerga nada de A", async () => {
    const d = await getDashboardData(b, "2026-10");
    expect(d.balance.toFixed(2)).toBe("-999.00");
    expect(d.current.income.isZero()).toBe(true);
    expect(d.recent.every((t) => t.userId === b)).toBe(true);
  });
  it("mês sem transações retorna zeros e estado vazio para usuário novo", async () => {
    const d = await getDashboardData(a, "2030-01");
    expect(d.current.result.isZero()).toBe(true);
    expect(d.byCategory).toEqual([]);
    const c = (await prisma.user.create({ data: { name: "C", email: `${tag}-c@x.com` } })).id;
    expect((await getDashboardData(c, "2026-10")).hasAny).toBe(false);
  });
});
