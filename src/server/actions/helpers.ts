import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import { DomainError } from "@/lib/errors";

export type ActionResult = { ok: true } | { ok: false; message?: string; fieldErrors?: Record<string, string[] | undefined> };

export async function run<T>(schema: z.ZodType<T>, raw: unknown, paths: string[], fn: (userId: string, data: T) => Promise<unknown>): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, fieldErrors: z.flattenError(parsed.error as z.ZodError).fieldErrors as Record<string, string[]> };
  try {
    await fn(user.id, parsed.data);
    paths.forEach((p) => revalidatePath(p));
    return { ok: true };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, message: e.message };
    console.error("Erro em ação", e); // detalhes só no servidor
    return { ok: false, message: "Erro inesperado. Tente novamente." };
  }
}
export const idSchema = z.string().min(1).max(64);
