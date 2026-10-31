import { describe, expect, it } from "vitest";
import { buildTransactionWhere } from "../../src/lib/db/transaction-filters";
import { parseFilters, transactionInputSchema } from "../../src/lib/validation/transaction";

const ok = { type: "EXPENSE", description: " Mercado ", amount: "19,90", date: "2026-10-31", categoryId: "c1", notes: "" };

describe("validação de transação", () => {
  it("aceita e normaliza", () => {
    const r = transactionInputSchema.parse(ok);
    expect(r.description).toBe("Mercado");
    expect(r.amount.toString()).toBe("19.9");
    expect(r.notes).toBeUndefined();
  });
  it.each([
    ["valor zero", { amount: "0" }], ["valor negativo", { amount: "-1" }], ["valor texto", { amount: "x" }],
    ["data inexistente", { date: "2026-02-30" }], ["descrição vazia", { description: "  " }],
    ["tipo inválido", { type: "OUTRO" }], ["sem categoria", { categoryId: "" }], ["observação longa", { notes: "a".repeat(501) }],
  ])("rejeita %s", (_n, patch) => {
    expect(transactionInputSchema.safeParse({ ...ok, ...patch }).success).toBe(false);
  });
});

describe("filtros", () => {
  it("padrões para parâmetros ausentes ou vazios", () => {
    expect(parseFilters({ from: "", q: "" })).toMatchObject({ sort: "date", dir: "desc", page: 1 });
  });
  it("valores inválidos ou período invertido voltam aos padrões", () => {
    expect(parseFilters({ sort: "senha", page: "-3" })).toMatchObject({ sort: "date", page: 1 });
    expect(parseFilters({ from: "2026-10-31", to: "2026-10-01" }).from).toBeUndefined();
  });
  it("where sempre contém userId e usa limites inclusivos", () => {
    const f = parseFilters({ from: "2026-10-01", to: "2026-10-31", type: "EXPENSE", q: "mer" });
    const w = buildTransactionWhere("u1", f);
    expect(w.userId).toBe("u1");
    expect(w.date).toEqual({ gte: new Date("2026-10-01T00:00:00Z"), lte: new Date("2026-10-31T00:00:00Z") });
    expect(buildTransactionWhere("u2", parseFilters({})).userId).toBe("u2");
  });
});
