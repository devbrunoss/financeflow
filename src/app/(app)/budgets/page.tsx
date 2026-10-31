import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { ActionButton } from "@/components/action-button";
import { listBudgetsWithSpent } from "@/lib/db/budgets";
import { ensureDefaultCategories, listActiveCategories } from "@/lib/db/categories";
import { isYearMonth, shiftMonth } from "@/lib/finance/dashboard";
import { STATE_LABEL } from "@/lib/finance/budget";
import { formatBRL } from "@/lib/finance/money";
import { todayInTimeZone } from "@/lib/finance/periods";
import { deleteBudgetAction } from "@/server/actions/budgets";
import { BudgetForm } from "./budget-form";

const ICON = { OK: "✓", NEAR: "⚠", EXCEEDED: "✕" } as const;
const BAR = { OK: "bg-emerald-700", NEAR: "bg-amber-600", EXCEEDED: "bg-red-800" } as const;

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  await ensureDefaultCategories(user.id);
  const raw = (await searchParams).month;
  const p = Array.isArray(raw) ? raw[0] : raw;
  const ym = p && isYearMonth(p) ? p : todayInTimeZone().slice(0, 7);
  const [budgets, cats] = await Promise.all([listBudgetsWithSpent(user.id, ym), listActiveCategories(user.id)]);
  const label = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold">Orçamentos</h1>
      <p className="mt-1 text-sm text-slate-600">O gasto de um orçamento é a soma das despesas da categoria com data dentro do mês. Alerta a partir de 80% do limite; acima de 100% o limite está ultrapassado.</p>
      <nav aria-label="Período" className="mt-4 flex items-center gap-4 text-sm">
        <Link href={`/budgets?month=${shiftMonth(ym, -1)}`} className="underline">← Mês anterior</Link>
        <strong className="capitalize" aria-live="polite">{label}</strong>
        <Link href={`/budgets?month=${shiftMonth(ym, 1)}`} className="underline">Próximo mês →</Link>
      </nav>
      <BudgetForm key={ym} month={ym} categories={cats.filter((c) => c.type === "EXPENSE")} />
      {budgets.length === 0 ? <p className="mt-6 rounded-md border border-dashed p-6 text-center">Nenhum orçamento definido para este mês.</p> : (
        <ul className="mt-6 space-y-4">
          {budgets.map((b) => (
            <li key={b.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{b.categoryName}</strong>
                <span className="tabular-nums">{formatBRL(b.spent)} de {formatBRL(b.limit)} ({b.percent.toString().replace(".", ",")}%)</span>
              </div>
              <div className="mt-2 h-2 rounded bg-slate-200" aria-hidden="true"><div className={`h-2 rounded ${BAR[b.state]}`} style={{ width: `${Math.min(100, b.percent.toNumber())}%` }} /></div>
              <p className="mt-2 text-sm" role={b.state === "OK" ? undefined : "status"}>{ICON[b.state]} {STATE_LABEL[b.state]} · {b.remaining.isNegative() ? `excedido em ${formatBRL(b.remaining.abs())}` : `restam ${formatBRL(b.remaining)}`}</p>
              <div className="mt-1 text-sm"><ActionButton danger label="Remover orçamento" ariaLabel={`Remover orçamento de ${b.categoryName}`} action={deleteBudgetAction.bind(null, b.id)} confirmText="Remover este orçamento?" /></div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
