import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { ensureDefaultCategories, listActiveCategories } from "@/lib/db/categories";
import { listTransactions } from "@/lib/db/transactions";
import { formatBRL } from "@/lib/finance/money";
import { formatDateOnly } from "@/lib/finance/periods";
import { parseFilters, type TransactionFilters } from "@/lib/validation/transaction";
import { DeleteButton } from "./delete-button";
import { ExportButton } from "./export-button";

type SP = Promise<Record<string, string | string[] | undefined>>;

function href(f: TransactionFilters, over: Partial<TransactionFilters>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...over })) if (v !== undefined && v !== "") p.set(k, String(v));
  return `/transactions?${p}`;
}
const br = (d: Date) => formatDateOnly(d).split("-").reverse().join("/");

export default async function TransactionsPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  await ensureDefaultCategories(user.id);
  const f = parseFilters(await searchParams);
  const [{ items, total, pageCount }, categories] = await Promise.all([listTransactions(user.id, f), listActiveCategories(user.id)]);
  const sortLink = (field: TransactionFilters["sort"], label: string) => (
    <Link href={href(f, { sort: field, dir: f.sort === field && f.dir === "desc" ? "asc" : "desc", page: 1 })} className="underline-offset-4 hover:underline">
      {label}{f.sort === field ? (f.dir === "asc" ? " ▲" : " ▼") : ""}
    </Link>
  );
  const field = "mt-1 rounded-md border border-slate-300 px-2 py-1";
  return (
    <main className="mx-auto max-w-5xl p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Transações</h1>
        <div className="flex items-start gap-3"><ExportButton query={href(f, {}).split("?")[1] ?? ""} /><Link href="/transactions/new" className="rounded-md bg-emerald-700 px-4 py-2 font-medium text-white">Nova transação</Link></div>
      </div>

      <form method="get" className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Filtros">
        <label className="flex flex-col text-sm">Busca<input name="q" defaultValue={f.q} className={field} /></label>
        <label className="flex flex-col text-sm">De<input type="date" name="from" defaultValue={f.from} className={field} /></label>
        <label className="flex flex-col text-sm">Até<input type="date" name="to" defaultValue={f.to} className={field} /></label>
        <label className="flex flex-col text-sm">Tipo
          <select name="type" defaultValue={f.type ?? ""} className={field}><option value="">Todos</option><option value="INCOME">Receita</option><option value="EXPENSE">Despesa</option></select></label>
        <label className="flex flex-col text-sm">Categoria
          <select name="categoryId" defaultValue={f.categoryId ?? ""} className={field}><option value="">Todas</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <div className="flex items-end gap-2">
          <button className="rounded-md border px-3 py-1">Filtrar</button>
          <Link href="/transactions" className="px-2 py-1 underline">Limpar</Link>
        </div>
      </form>

      <p className="mt-4 text-sm text-slate-600" aria-live="polite">{total} {total === 1 ? "transação" : "transações"}</p>
      {items.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed p-6 text-center">Nenhuma transação encontrada.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Lista de transações</caption>
            <thead><tr className="border-b">
              <th scope="col" className="py-2">{sortLink("date", "Data")}</th>
              <th scope="col">{sortLink("description", "Descrição")}</th>
              <th scope="col">Categoria</th><th scope="col">Tipo</th>
              <th scope="col" className="text-right">{sortLink("amount", "Valor")}</th>
              <th scope="col"><span className="sr-only">Ações</span></th>
            </tr></thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2">{br(t.date)}</td>
                  <td>{t.description}</td>
                  <td>{t.category.name}</td>
                  <td>{t.type === "INCOME" ? "Receita" : "Despesa"}</td>
                  <td className="text-right font-medium tabular-nums">{t.type === "INCOME" ? "+ " : "− "}{formatBRL(t.amount.toString())}</td>
                  <td className="space-x-3 text-right">
                    <Link href={`/transactions/${t.id}/edit`} className="underline" aria-label={`Editar ${t.description}`}>Editar</Link>
                    <DeleteButton id={t.id} description={t.description} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pageCount > 1 && (
        <nav aria-label="Paginação" className="mt-4 flex items-center gap-4 text-sm">
          {f.page > 1 && <Link href={href(f, { page: f.page - 1 })} className="underline">Anterior</Link>}
          <span>Página {f.page} de {pageCount}</span>
          {f.page < pageCount && <Link href={href(f, { page: f.page + 1 })} className="underline">Próxima</Link>}
        </nav>
      )}
    </main>
  );
}
