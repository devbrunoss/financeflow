import { requireUser } from "@/lib/auth/session";
import { ActionButton } from "@/components/action-button";
import { ensureDefaultCategories } from "@/lib/db/categories";
import { listCategoriesWithCounts } from "@/lib/db/category-admin";
import { archiveCategoryAction, deleteCategoryAction } from "@/server/actions/categories";
import { CreateCategoryForm, RenameForm } from "./category-forms";

export default async function CategoriesPage() {
  const user = await requireUser();
  await ensureDefaultCategories(user.id);
  const cats = await listCategoriesWithCounts(user.id);
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold">Categorias</h1>
      <p className="mt-1 text-sm text-slate-600">Renomear é sempre permitido. Categorias usadas em transações não podem ser excluídas: arquive-as para escondê-las dos formulários e manter o histórico. O tipo não pode ser alterado.</p>
      <CreateCategoryForm />
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Categorias</caption>
          <thead><tr className="border-b"><th scope="col" className="py-2">Nome</th><th scope="col">Tipo</th><th scope="col">Transações</th><th scope="col">Orçamentos</th><th scope="col">Situação</th><th scope="col"><span className="sr-only">Ações</span></th></tr></thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.id} className="border-b align-middle">
                <td className="py-2"><RenameForm id={c.id} name={c.name} /></td>
                <td>{c.type === "INCOME" ? "Receita" : "Despesa"}</td>
                <td>{c._count.transactions}</td><td>{c._count.budgets}</td>
                <td>{c.isArchived ? "Arquivada" : "Ativa"}</td>
                <td className="space-x-3 text-right">
                  <ActionButton label={c.isArchived ? "Reativar" : "Arquivar"} ariaLabel={`${c.isArchived ? "Reativar" : "Arquivar"} ${c.name}`} action={archiveCategoryAction.bind(null, c.id, !c.isArchived)} />
                  <ActionButton danger label="Excluir" ariaLabel={`Excluir ${c.name}`} action={deleteCategoryAction.bind(null, c.id)} confirmText={`Excluir a categoria "${c.name}"?${c._count.budgets ? " Seus orçamentos também serão removidos." : ""}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
