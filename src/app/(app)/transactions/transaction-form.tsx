"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTransactionAction, updateTransactionAction } from "@/server/actions/transactions";

type Cat = { id: string; name: string; type: "INCOME" | "EXPENSE" };
export type FormInitial = { type: "INCOME" | "EXPENSE"; description: string; amount: string; date: string; categoryId: string; notes: string };

export function TransactionForm({ categories, initial, id }: { categories: Cat[]; initial: FormInitial; id?: string }) {
  const router = useRouter();
  const [type, setType] = useState(initial.type);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setErrors({}); setMessage(null);
    const raw = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const res = id ? await updateTransactionAction(id, raw) : await createTransactionAction(raw);
    setPending(false);
    if (res.ok) { router.push("/transactions"); router.refresh(); return; }
    setErrors(res.fieldErrors ?? {});
    setMessage(res.message ?? "Corrija os campos indicados.");
  }

  const input = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-2 focus:outline-emerald-600";
  const err = (k: string) => errors[k]?.[0] && <p role="alert" className="text-sm text-red-800">Erro: {errors[k]![0]}</p>;
  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 max-w-lg space-y-4">
      <fieldset>
        <legend className="font-medium">Tipo</legend>
        <div className="mt-1 flex gap-6">
          {(["EXPENSE", "INCOME"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2">
              <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} />
              {t === "EXPENSE" ? "Despesa" : "Receita"}
            </label>
          ))}
        </div>
        {err("type")}
      </fieldset>
      <div><label htmlFor="description">Descrição</label>
        <input id="description" name="description" defaultValue={initial.description} maxLength={120} className={input} />{err("description")}</div>
      <div><label htmlFor="amount">Valor (R$)</label>
        <input id="amount" name="amount" inputMode="decimal" defaultValue={initial.amount} placeholder="0,00" className={input} />{err("amount")}</div>
      <div><label htmlFor="date">Data</label>
        <input id="date" name="date" type="date" defaultValue={initial.date} className={input} />{err("date")}</div>
      <div><label htmlFor="categoryId">Categoria</label>
        <select id="categoryId" name="categoryId" key={type} defaultValue={categories.some((c) => c.id === initial.categoryId && c.type === type) ? initial.categoryId : ""} className={input}>
          <option value="">Selecione...</option>
          {categories.filter((c) => c.type === type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>{err("categoryId")}</div>
      <div><label htmlFor="notes">Observações (opcional)</label>
        <textarea id="notes" name="notes" defaultValue={initial.notes} maxLength={500} rows={3} className={input} />{err("notes")}</div>
      {message && <p role="alert" className="rounded-md border border-red-800 p-2 text-sm text-red-900">Erro: {message}</p>}
      <div className="flex gap-3">
        <button disabled={pending} className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white disabled:opacity-60">{pending ? "Salvando..." : "Salvar"}</button>
        <button type="button" onClick={() => router.push("/transactions")} className="rounded-md border px-4 py-2">Cancelar</button>
      </div>
    </form>
  );
}
