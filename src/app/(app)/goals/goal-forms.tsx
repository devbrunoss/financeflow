"use client";
import { FormError } from "@/components/form-error";
import { fieldClass, useActionForm } from "@/lib/ui/use-action-form";
import { contributeAction, createGoalAction } from "@/server/actions/goals";

export function GoalForm() {
  const { onSubmit, error, pending } = useActionForm(createGoalAction);
  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-wrap items-end gap-3" aria-label="Nova meta">
      <label className="flex flex-col text-sm">Nome<input name="name" maxLength={80} className={fieldClass} /></label>
      <label className="flex flex-col text-sm">Valor desejado (R$)<input name="targetAmount" inputMode="decimal" placeholder="0,00" className={fieldClass} /></label>
      <label className="flex flex-col text-sm">Data-alvo (opcional)<input name="targetDate" type="date" className={fieldClass} /></label>
      <button disabled={pending} className="rounded-md bg-emerald-700 px-4 py-1.5 font-medium text-white disabled:opacity-60">Criar meta</button>
      <FormError error={error} />
    </form>
  );
}
export function ContributionForm({ goalId, today, name }: { goalId: string; today: string; name: string }) {
  const { onSubmit, error, pending } = useActionForm((raw) => contributeAction(goalId, raw));
  return (
    <form onSubmit={onSubmit} noValidate className="mt-2 flex flex-wrap items-end gap-2" aria-label={`Registrar movimento da meta ${name}`}>
      <label className="flex flex-col text-xs">Movimento<select name="kind" className={fieldClass}><option value="DEPOSIT">Aporte</option><option value="WITHDRAWAL">Retirada</option></select></label>
      <label className="flex flex-col text-xs">Valor (R$)<input name="amount" inputMode="decimal" placeholder="0,00" className={`${fieldClass} w-28`} /></label>
      <label className="flex flex-col text-xs">Data<input name="date" type="date" defaultValue={today} className={fieldClass} /></label>
      <label className="flex flex-col text-xs">Nota<input name="note" maxLength={200} className={fieldClass} /></label>
      <button disabled={pending} className="rounded-md border px-3 py-1 text-sm">Registrar</button>
      <FormError error={error} />
    </form>
  );
}
