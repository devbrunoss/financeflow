"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";
import { createTransaction, deleteTransaction, updateTransaction } from "@/lib/db/transactions";
import { transactionInputSchema } from "@/lib/validation/transaction";

export type ActionResult = { ok: true } | { ok: false; message?: string; fieldErrors?: Record<string, string[] | undefined> };

async function run(fn: (userId: string) => Promise<void>): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await fn(user.id);
    revalidatePath("/transactions");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    console.error("Erro em ação de transação", e); // detalhes só no servidor
    return { ok: false, message: "Erro inesperado. Tente novamente." };
  }
}

export async function createTransactionAction(raw: unknown): Promise<ActionResult> {
  const parsed = transactionInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  return run(async (userId) => void (await createTransaction(userId, parsed.data)));
}

export async function updateTransactionAction(id: string, raw: unknown): Promise<ActionResult> {
  const parsed = transactionInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  return run((userId) => updateTransaction(userId, id, parsed.data));
}

export async function deleteTransactionAction(id: string): Promise<ActionResult> {
  return run((userId) => deleteTransaction(userId, id));
}
