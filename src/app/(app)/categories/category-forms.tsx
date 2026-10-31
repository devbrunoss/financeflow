"use client";
import { FormError } from "@/components/form-error";
import { fieldClass, useActionForm } from "@/lib/ui/use-action-form";
import { createCategoryAction, renameCategoryAction } from "@/server/actions/categories";

export function CreateCategoryForm() {
  const { onSubmit, error, pending } = useActionForm(createCategoryAction);
  return (
    <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-wrap items-end gap-3" aria-label="Nova categoria">
      <label className="flex flex-col text-sm">Nome<input name="name" maxLength={40} className={fieldClass} /></label>
      <label className="flex flex-col text-sm">Tipo<select name="type" className={fieldClass}><option value="EXPENSE">Despesa</option><option value="INCOME">Receita</option></select></label>
      <button disabled={pending} className="rounded-md bg-emerald-700 px-4 py-1.5 font-medium text-white disabled:opacity-60">Adicionar</button>
      <FormError error={error} />
    </form>
  );
}
export function RenameForm({ id, name }: { id: string; name: string }) {
  const { onSubmit, error, pending } = useActionForm((raw) => renameCategoryAction(id, raw));
  return (
    <form onSubmit={onSubmit} noValidate className="flex items-center gap-2">
      <label className="sr-only" htmlFor={`n-${id}`}>Nome da categoria {name}</label>
      <input id={`n-${id}`} name="name" defaultValue={name} maxLength={40} className={fieldClass} />
      <button disabled={pending} className="underline">Renomear</button>
      <FormError error={error} />
    </form>
  );
}
