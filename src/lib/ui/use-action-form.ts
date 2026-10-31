"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/server/actions/helpers";

export const actionMessage = (r: Extract<ActionResult, { ok: false }>) => r.message ?? Object.values(r.fieldErrors ?? {}).flat()[0] ?? "Erro ao processar.";

export function useActionForm(action: (raw: Record<string, string>) => Promise<ActionResult>) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true); setError(null);
    const res = await action(Object.fromEntries(new FormData(form)) as Record<string, string>);
    setPending(false);
    if (res.ok) { form.reset(); router.refresh(); } else setError(actionMessage(res));
  }
  return { onSubmit, error, pending };
}
export const fieldClass = "rounded-md border border-slate-300 px-2 py-1 focus:outline-2 focus:outline-emerald-600";

