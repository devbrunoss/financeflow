import { describe, expect, it } from "vitest";
import { CSV_BOM, csvCell, transactionsToCsv } from "../../src/lib/finance/csv";
import { budgetStatus } from "../../src/lib/finance/budget";
import { goalProgress, nextStatus } from "../../src/lib/finance/goals";
import { budgetInputSchema, categoryInputSchema, contributionSchema, goalInputSchema } from "../../src/lib/validation/modules";

describe("CSV", () => {
  it("neutraliza fórmulas (inclusive com espaço antes)", () => {
    for (const v of ["=1+1", "+55 11", "-5", "@SUM(A1)", "\tcmd", "\rx", " =1+1"]) expect(csvCell(v).replace(/^"/, ""), v).toMatch(/^'/); // com CR/TAB a célula também é citada
    expect(csvCell("=1+1")).toBe("'=1+1");
  });
  it("escapa ;, aspas e quebras de linha; preserva texto comum e acentos", () => {
    expect(csvCell("a;b")).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("l1\nl2")).toBe('"l1\nl2"');
    expect(csvCell("Mercado açaí")).toBe("Mercado açaí");
    expect(csvCell("")).toBe("");
  });
  it("gera BOM, cabeçalho, CRLF, valor com vírgula e lista vazia só com cabeçalho", () => {
    const csv = transactionsToCsv([{ date: "2026-10-31", type: "EXPENSE", category: "Mercado", description: "=HYPERLINK(1)", amount: "1234.5", notes: null }]);
    expect(csv.startsWith(CSV_BOM + "Data;Tipo;Categoria;Descrição;Valor;Observações\r\n")).toBe(true);
    expect(csv).toContain("2026-10-31;Despesa;Mercado;'=HYPERLINK(1);1234,50;\r\n");
    expect(transactionsToCsv([]).split("\r\n").filter(Boolean)).toHaveLength(1);
  });
});

describe("limites de orçamento", () => {
  it.each([["0", "OK"], ["79.99", "OK"], ["80", "NEAR"], ["99.99", "NEAR"], ["100", "NEAR"], ["100.01", "EXCEEDED"]])("gasto %s de 100 => %s", (spent, state) => {
    expect(budgetStatus(spent, "100").state).toBe(state);
  });
  it("percentual e restante; limite zero não quebra", () => {
    const r = budgetStatus("25", "200");
    expect([r.percent.toString(), r.remaining.toString()]).toEqual(["12.5", "175"]);
    expect(budgetStatus("10", "0").percent.isZero()).toBe(true);
    expect(budgetStatus("150", "100").remaining.toString()).toBe("-50");
  });
});

describe("metas", () => {
  it("progresso é a soma das contribuições, com retiradas", () => {
    const p = goalProgress("1000", ["300.10", "200", "-100.10"]);
    expect([p.accumulated.toString(), p.percent.toString(), p.remaining.toString(), p.reached]).toEqual(["400", "40", "600", false]);
  });
  it("sem contribuições = 0%; atingir o alvo conclui; meta cancelada não muda", () => {
    expect(goalProgress("500", []).percent.isZero()).toBe(true);
    expect(goalProgress("500", ["500"]).reached).toBe(true);
    expect(nextStatus("ACTIVE", true)).toBe("COMPLETED");
    expect(nextStatus("COMPLETED", false)).toBe("ACTIVE");
    expect(nextStatus("CANCELED", true)).toBe("CANCELED");
  });
});

describe("validação dos módulos", () => {
  it("categoria, orçamento, meta e aporte", () => {
    expect(categoryInputSchema.safeParse({ name: "  ", type: "EXPENSE" }).success).toBe(false);
    expect(categoryInputSchema.safeParse({ name: "a".repeat(41), type: "EXPENSE" }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ categoryId: "c", month: "2026-13", limit: "10" }).success).toBe(false);
    expect(budgetInputSchema.safeParse({ categoryId: "c", month: "2026-10", limit: "0" }).success).toBe(false);
    expect(budgetInputSchema.parse({ categoryId: "c", month: "2026-10", limit: "1.000,50" }).limit.toString()).toBe("1000.5");
    expect(goalInputSchema.safeParse({ name: "Viagem", targetAmount: "-1" }).success).toBe(false);
    expect(goalInputSchema.safeParse({ name: "Viagem", targetAmount: "10", targetDate: "2026-02-30" }).success).toBe(false);
    expect(goalInputSchema.parse({ name: "Viagem", targetAmount: "10", targetDate: "" }).targetDate).toBeUndefined();
    expect(contributionSchema.safeParse({ kind: "DEPOSIT", amount: "0", date: "2026-10-01" }).success).toBe(false);
    expect(contributionSchema.safeParse({ kind: "X", amount: "5", date: "2026-10-01" }).success).toBe(false);
  });
});
