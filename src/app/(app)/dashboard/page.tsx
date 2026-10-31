import Link from "next/link";
import type Decimal from "decimal.js";
import { requireUser } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/db/dashboard";
import { isYearMonth, percentChange, shiftMonth } from "@/lib/finance/dashboard";
import { formatBRL, formatSignedBRL } from "@/lib/finance/money";
import { formatDateOnly, todayInTimeZone } from "@/lib/finance/periods";
import { MonthlyChart } from "./monthly-chart";
import { SignOutButton } from "./sign-out";

type SP = Promise<Record<string, string | string[] | undefined>>;
const monthName = (ym: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { ...opts, timeZone: "UTC" }).format(new Date(`${ym}-01T00:00:00Z`));

function Comparison({ pct, hasPrev }: { pct: Decimal | null; hasPrev: boolean }) {
  if (!hasPrev) return <p className="text-xs text-slate-600">Sem dados do mês anterior para comparar</p>;
  if (pct === null) return <p className="text-xs text-slate-600">Sem base de comparação no mês anterior</p>;
  const n = pct.toNumber();
  const txt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(n);
  return <p className="text-xs text-slate-600">{n > 0 ? "▲" : n < 0 ? "▼" : "="} {txt}% em relação ao mês anterior</p>;
}

export default async function DashboardPage({ searchParams }: { searchParams: SP }) {
  const user = await requireUser();
  const raw = (await searchParams).month;
  const param = Array.isArray(raw) ? raw[0] : raw;
  const ym = param && isYearMonth(param) ? param : todayInTimeZone().slice(0, 7);
  const d = await getDashboardData(user.id, ym);
  const hasPrev = !d.previous.income.isZero() || !d.previous.expense.isZero();
  const card = "rounded-lg border border-slate-200 p-4";

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">Olá, {user.name}</h1>
        <SignOutButton />
      </div>

      <nav aria-label="Período" className="flex items-center gap-4 text-sm">
        <Link href={`/dashboard?month=${shiftMonth(ym, -1)}`} className="underline">← Mês anterior</Link>
        <strong className="capitalize" aria-live="polite">{monthName(ym, { month: "long", year: "numeric" })}</strong>
        <Link href={`/dashboard?month=${shiftMonth(ym, 1)}`} className="underline">Próximo mês →</Link>
        <Link href="/dashboard" className="underline">Mês atual</Link>
      </nav>

      {!d.hasAny ? (
        <p className="rounded-lg border border-dashed p-8 text-center">
          Você ainda não tem transações. <Link href="/transactions/new" className="underline">Registre a primeira</Link> para ver seus indicadores.
        </p>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={card}><dt className="text-sm">Saldo (todas as transações)</dt><dd className="text-xl font-semibold tabular-nums">{formatSignedBRL(d.balance)}</dd></div>
            <div className={card}><dt className="text-sm">Receitas do mês</dt><dd className="text-xl font-semibold tabular-nums">{formatBRL(d.current.income)}</dd><Comparison hasPrev={hasPrev} pct={percentChange(d.current.income, d.previous.income)} /></div>
            <div className={card}><dt className="text-sm">Despesas do mês</dt><dd className="text-xl font-semibold tabular-nums">{formatBRL(d.current.expense)}</dd><Comparison hasPrev={hasPrev} pct={percentChange(d.current.expense, d.previous.expense)} /></div>
            <div className={card}><dt className="text-sm">Resultado do mês</dt><dd className="text-xl font-semibold tabular-nums">{formatSignedBRL(d.current.result)}</dd><p className="text-xs text-slate-600">{d.current.result.isNegative() ? "Despesas maiores que receitas" : d.current.result.isZero() ? "Receitas iguais às despesas" : "Receitas maiores que despesas"}</p></div>
          </dl>

          <section aria-labelledby="evo" className={card}>
            <h2 id="evo" className="mb-2 font-semibold">Evolução mensal (6 meses)</h2>
            <MonthlyChart data={d.series.map((p) => ({ label: monthName(p.month, { month: "short", year: "2-digit" }), Receitas: p.income.toNumber(), Despesas: p.expense.toNumber() }))} />
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section aria-labelledby="cat" className={card}>
              <h2 id="cat" className="mb-2 font-semibold">Despesas por categoria</h2>
              {d.byCategory.length === 0 ? <p className="text-sm">Sem despesas neste mês.</p> : (
                <ul className="space-y-3">
                  {d.byCategory.map((c) => (
                    <li key={c.categoryId}>
                      <div className="flex justify-between text-sm"><span>{c.name}</span><span className="tabular-nums">{formatBRL(c.total)} ({c.percent.toString().replace(".", ",")}%)</span></div>
                      <div className="mt-1 h-2 rounded bg-slate-200" aria-hidden="true"><div className="h-2 rounded bg-amber-700" style={{ width: `${c.percent.toNumber()}%` }} /></div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="rec" className={card}>
              <h2 id="rec" className="mb-2 font-semibold">Transações recentes</h2>
              <ul className="divide-y text-sm">
                {d.recent.map((t) => (
                  <li key={t.id} className="flex justify-between gap-2 py-2">
                    <span>{formatDateOnly(t.date).split("-").reverse().join("/")} · {t.description} <span className="text-slate-600">({t.type === "INCOME" ? "Receita" : "Despesa"}, {t.category.name})</span></span>
                    <span className="whitespace-nowrap font-medium tabular-nums">{t.type === "INCOME" ? "+" : "−"} {formatBRL(t.amount.toString())}</span>
                  </li>
                ))}
              </ul>
              <Link href="/transactions" className="mt-2 inline-block text-sm underline">Ver todas</Link>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
