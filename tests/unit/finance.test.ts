import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { parseMoney, sum } from "../../src/lib/finance/money";
import { isValidDateString, monthRange, todayInTimeZone } from "../../src/lib/finance/periods";
import { balance, summarize } from "../../src/lib/finance/totals";

describe("dinheiro", () => {
  it("soma sem erro de ponto flutuante", () => {
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(sum(["0.1", "0.2"]).toString()).toBe("0.3");
  });
  it("interpreta formatos válidos", () => {
    expect(parseMoney("1234.56")?.toString()).toBe("1234.56");
    expect(parseMoney("1.234,56")?.toString()).toBe("1234.56");
    expect(parseMoney("R$ 10,5")?.toString()).toBe("10.5");
    expect(parseMoney("999999999999,99")?.toString()).toBe("999999999999.99");
  });
  it("rejeita zero, negativo, lixo, 3 casas, ambíguo e acima do limite", () => {
    for (const v of ["0", "0,00", "-5", "abc", "", "1e5", "1,234", "1.234", "10,999", "1000000000000"]) {
      expect(parseMoney(v), v).toBeNull();
    }
  });
});

describe("datas e períodos", () => {
  it("valida datas de calendário", () => {
    expect(isValidDateString("2028-02-29")).toBe(true);
    expect(isValidDateString("2026-02-29")).toBe(false);
    expect(isValidDateString("2026-13-01")).toBe(false);
    expect(isValidDateString("2026-4-1")).toBe(false);
    expect(isValidDateString("1899-12-31")).toBe(false);
  });
  it("limites do mês são inclusivos", () => {
    expect(monthRange(2026, 10)).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(monthRange(2028, 2)).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthRange(2026, 12)).toEqual({ start: "2026-12-01", end: "2026-12-31" });
  });
  it("'hoje' usa o fuso do usuário, não o UTC", () => {
    const now = new Date("2026-11-01T01:30:00Z");
    expect(todayInTimeZone("America/Sao_Paulo", now)).toBe("2026-10-31");
    expect(todayInTimeZone("UTC", now)).toBe("2026-11-01");
  });
});

describe("saldo, receitas e despesas", () => {
  it("calcula com precisão", () => {
    const s = summarize([{ type: "INCOME", amount: "100.10" }, { type: "EXPENSE", amount: "0.10" }, { type: "EXPENSE", amount: new Decimal("0.20") }]);
    expect([s.income, s.expense, s.result].map(String)).toEqual(["100.1", "0.3", "99.8"]);
  });
  it("período sem transações resulta em zero", () => {
    expect(summarize([]).result.isZero()).toBe(true);
    expect(balance([]).isZero()).toBe(true);
  });
  it("saldo pode ser negativo", () => {
    expect(balance([{ type: "EXPENSE", amount: "50" }]).toString()).toBe("-50");
  });
});
