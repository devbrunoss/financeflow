import { describe, expect, it } from "vitest";
import { expenseByCategory, isYearMonth, monthBounds, monthlySeries, monthsEndingAt, percentChange, shiftMonth } from "../../src/lib/finance/dashboard";
import { formatSignedBRL } from "../../src/lib/finance/money";

describe("meses", () => {
  it("valida AAAA-MM", () => {
    expect(isYearMonth("2026-10")).toBe(true);
    for (const v of ["2026-13", "2026-00", "2026-1", "26-10", "1899-12", "abc", ""]) expect(isYearMonth(v), v).toBe(false);
  });
  it("navega entre anos", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthsEndingAt("2026-02", 4)).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(monthBounds("2028-02")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
  });
});

describe("comparação com período anterior", () => {
  it("calcula a variação e trata base zero", () => {
    expect(percentChange("150", "100")?.toString()).toBe("50");
    expect(percentChange("50", "100")?.toString()).toBe("-50");
    expect(percentChange("0", "100")?.toString()).toBe("-100");
    expect(percentChange("10", "0")).toBeNull();
    expect(percentChange("0", "0")).toBeNull();
  });
});

describe("evolução mensal", () => {
  const txs = [
    { type: "EXPENSE" as const, amount: "10.10", date: "2026-09-30" },
    { type: "EXPENSE" as const, amount: "0.20", date: "2026-10-01" },
    { type: "INCOME" as const, amount: "100", date: "2026-10-31" },
    { type: "INCOME" as const, amount: "5", date: "2026-11-01" },
  ];
  it("atribui cada data ao seu mês, com limites exatos, e zera meses vazios", () => {
    const s = monthlySeries(["2026-08", "2026-09", "2026-10"], txs);
    expect(s.map((p) => p.result.toFixed(2))).toEqual(["0.00", "-10.10", "99.80"]);
    expect(s[0].income.isZero() && s[0].expense.isZero()).toBe(true);
  });
});

describe("despesas por categoria", () => {
  it("agrupa, ordena e calcula percentuais", () => {
    const r = expenseByCategory([
      { amount: "30", categoryId: "a", categoryName: "Mercado" },
      { amount: "10", categoryId: "b", categoryName: "Lazer" },
      { amount: "60", categoryId: "a", categoryName: "Mercado" },
    ]);
    expect(r.map((x) => [x.name, x.total.toString(), x.percent.toString()])).toEqual([["Mercado", "90", "90"], ["Lazer", "10", "10"]]);
  });
  it("sem despesas retorna lista vazia", () => expect(expenseByCategory([])).toEqual([]));
});

describe("formatação com sinal", () => {
  it("usa +, − e nada para zero", () => {
    expect(formatSignedBRL("10")).toMatch(/^\+ R\$\s10,00$/);
    expect(formatSignedBRL("-10.5")).toMatch(/^− R\$\s10,50$/);
    expect(formatSignedBRL(0)).not.toMatch(/[+−]/);
  });
});
