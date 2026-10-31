import { z } from "zod";
import { parseMoney } from "@/lib/finance/money";
import { isValidDateString } from "@/lib/finance/periods";

export const transactionInputSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"], { message: "Tipo inválido" }),
  description: z.string().trim().min(1, "Informe a descrição").max(120, "Máximo de 120 caracteres"),
  amount: z.string().refine((s) => parseMoney(s) !== null, "Valor inválido (use ex.: 1234,56; deve ser maior que zero)").transform((s) => parseMoney(s)!),
  date: z.string().refine(isValidDateString, "Data inválida (AAAA-MM-DD)"),
  categoryId: z.string().min(1, "Selecione a categoria").max(64),
  notes: z.string().trim().max(500, "Máximo de 500 caracteres").optional().transform((v) => (v ? v : undefined)),
});
export type TransactionInput = z.infer<typeof transactionInputSchema>;

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const dateField = z.preprocess(blank, z.string().refine(isValidDateString).optional());

export const filtersSchema = z
  .object({
    from: dateField,
    to: dateField,
    type: z.preprocess(blank, z.enum(["INCOME", "EXPENSE"]).optional()),
    categoryId: z.preprocess(blank, z.string().max(64).optional()),
    q: z.preprocess(blank, z.string().trim().max(100).optional()),
    sort: z.preprocess(blank, z.enum(["date", "amount", "description"]).default("date")),
    dir: z.preprocess(blank, z.enum(["asc", "desc"]).default("desc")),
    page: z.preprocess(blank, z.coerce.number().int().min(1).max(10000).default(1)),
  })
  .refine((f) => !f.from || !f.to || f.from <= f.to, { message: "Período inválido", path: ["to"] });
export type TransactionFilters = z.infer<typeof filtersSchema>;

/** Nunca lança: parâmetros inválidos da URL voltam aos padrões. */
export function parseFilters(raw: Record<string, string | string[] | undefined>): TransactionFilters {
  const flat = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const parsed = filtersSchema.safeParse(flat);
  return parsed.success ? parsed.data : filtersSchema.parse({});
}
