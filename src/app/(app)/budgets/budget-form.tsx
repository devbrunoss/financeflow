"use client";
import { FormError } from "@/components/form-error";
import { fieldClass, useActionForm } from "@/lib/ui/use-action-form";
import { setBudgetAction } from "@/server/actions/budgets";

export function BudgetForm({ categories, month }: { categories: { id: string; name: string }[]; month: string }) {
  const { onSubmit, error, pending } = useActionForm(setBudgetAction);
  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-wrap items-end gap-3" aria-label="Definir orçamento">
      <input type="hidden" name="month" value={month} />
      <label className="flex flex-col text-sm">Categoria de despesa<select name="categoryId" className={fieldClass}><option value="">Selecione...</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="flex flex-col text-sm">Limite do mês (R$)<input name="limit" inputMode="decimal" placeholder="0,00" className={fieldClass} /></label>
      <button disabled={pending} className="rounded-md bg-emerald-700 px-4 py-1.5 font-medium text-white disabled:opacity-60">Salvar orçamento</button>
      <FormError error={error} />
    </form>
  );
}
