import Decimal from "decimal.js";

export const CSV_BOM = "\uFEFF"; // faz o Excel reconhecer UTF-8 (acentos)
const DANGEROUS = /^[=+\-@\t\r]/;

/** Escapa uma célula. Texto que começa com = + - @ TAB CR recebe ' para não virar fórmula. Separador: ';' (Excel pt-BR). */
export function csvCell(value: string): string {
  const s = DANGEROUS.test(value) || DANGEROUS.test(value.trimStart()) ? `'${value}` : value;
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: string[][]): string {
  return CSV_BOM + rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";
}

export type ExportRow = { date: string; type: "INCOME" | "EXPENSE"; category: string; description: string; amount: Decimal.Value; notes: string | null };

export function transactionsToCsv(rows: ExportRow[]): string {
  return toCsv([
    ["Data", "Tipo", "Categoria", "Descrição", "Valor", "Observações"],
    ...rows.map((r) => [r.date, r.type === "INCOME" ? "Receita" : "Despesa", r.category, r.description, new Decimal(r.amount).toFixed(2).replace(".", ","), r.notes ?? ""]),
  ]);
}
