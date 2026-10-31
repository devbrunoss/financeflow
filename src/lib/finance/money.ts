import Decimal from "decimal.js";

export const ZERO = new Decimal(0);
/** Limite de DECIMAL(14,2): 12 dígitos inteiros. */
export const MAX_AMOUNT = new Decimal("999999999999.99");

export function sum(values: Decimal.Value[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v), ZERO);
}

/**
 * Interpreta valor digitado: "1234.56", "1234,56" ou "1.234,56" (pt-BR).
 * Rejeita zero, negativos, mais de 2 casas e formatos ambíguos como "1.234".
 */
export function parseMoney(input: string): Decimal | null {
  let s = input.trim().replace(/^R\$\s*/, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const d = new Decimal(s);
  return d.lte(0) || d.gt(MAX_AMOUNT) ? null : d;
}

/** Apenas para exibição: a conversão para number nunca é usada em cálculo. */
export function formatBRL(value: Decimal.Value): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    Number(new Decimal(value).toFixed(2)),
  );
}

/** Valor com sinal explícito (+/−), para não depender só de cor. Zero não leva sinal. */
export function formatSignedBRL(value: Decimal.Value): string {
  const d = new Decimal(value);
  if (d.isZero()) return formatBRL(0);
  return `${d.isNegative() ? "−" : "+"} ${formatBRL(d.abs())}`;
}
