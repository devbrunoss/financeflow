import { z } from "zod";
import { parseMoney } from "@/lib/finance/money";
import { isYearMonth } from "@/lib/finance/dashboard";
import { isValidDateString } from "@/lib/finance/periods";

const money = z.string().refine((s) => parseMoney(s) !== null, "Valor inválido (use ex.: 1234,56; deve ser maior que zero)").transform((s) => parseMoney(s)!);
const optional = (max: number) => z.string().trim().max(max, `Máximo de ${max} caracteres`).optional().transform((v) => v || undefined);

export const categoryInputSchema = z.object({ name: z.string().trim().min(1, "Informe o nome").max(40, "Máximo de 40 caracteres"), type: z.enum(["INCOME", "EXPENSE"], { message: "Tipo inválido" }) });
export const categoryRenameSchema = categoryInputSchema.pick({ name: true });
export const budgetInputSchema = z.object({ categoryId: z.string().min(1, "Selecione a categoria").max(64), month: z.string().refine(isYearMonth, "Mês inválido"), limit: money });
export const goalInputSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80, "Máximo de 80 caracteres"),
  targetAmount: money,
  targetDate: z.string().optional().transform((v) => v || undefined).refine((v) => v === undefined || isValidDateString(v), "Data inválida"),
});
export const contributionSchema = z.object({
  kind: z.enum(["DEPOSIT", "WITHDRAWAL"], { message: "Tipo inválido" }),
  amount: money,
  date: z.string().refine(isValidDateString, "Data inválida"),
  note: optional(200),
});
