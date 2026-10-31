import { requireUser } from "@/lib/auth/session";
import { ActionButton } from "@/components/action-button";
import { listGoals } from "@/lib/db/goals";
import { goalProgress } from "@/lib/finance/goals";
import { formatBRL } from "@/lib/finance/money";
import { formatDateOnly, todayInTimeZone } from "@/lib/finance/periods";
import { cancelGoalAction, deleteGoalAction } from "@/server/actions/goals";
import { ContributionForm, GoalForm } from "./goal-forms";

const STATUS = { ACTIVE: "Em andamento", COMPLETED: "Concluída", CANCELED: "Cancelada" } as const;

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await listGoals(user.id);
  const today = todayInTimeZone();
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold">Metas financeiras</h1>
      <p className="mt-1 text-sm text-slate-600">Metas são um planejamento: aportes e retiradas aqui <strong>não alteram seu saldo</strong> nem geram transações. O valor acumulado é a soma dos aportes registrados.</p>
      <GoalForm />
      {goals.length === 0 ? <p className="mt-6 rounded-md border border-dashed p-6 text-center">Nenhuma meta criada.</p> : (
        <ul className="mt-6 space-y-4">
          {goals.map((g) => {
            const p = goalProgress(g.targetAmount.toString(), g.contributions.map((c) => c.amount.toString()));
            return (
              <li key={g.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap justify-between gap-2">
                  <strong>{g.name}</strong>
                  <span>{STATUS[g.status]}{g.targetDate ? ` · alvo ${formatDateOnly(g.targetDate).split("-").reverse().join("/")}` : ""}</span>
                </div>
                <p className="mt-1 tabular-nums">{formatBRL(p.accumulated)} de {formatBRL(g.targetAmount.toString())} ({p.percent.toString().replace(".", ",")}%) · faltam {formatBRL(p.remaining)}</p>
                <div className="mt-2 h-2 rounded bg-slate-200" aria-hidden="true"><div className="h-2 rounded bg-emerald-700" style={{ width: `${Math.min(100, p.percent.toNumber())}%` }} /></div>
                {g.status !== "CANCELED" && <ContributionForm goalId={g.id} today={today} name={g.name} />}
                <div className="mt-3 space-x-4 text-sm">
                  <ActionButton label={g.status === "CANCELED" ? "Reativar" : "Cancelar meta"} ariaLabel={`${g.status === "CANCELED" ? "Reativar" : "Cancelar"} meta ${g.name}`} action={cancelGoalAction.bind(null, g.id, g.status !== "CANCELED")} />
                  <ActionButton danger label="Excluir" ariaLabel={`Excluir meta ${g.name}`} action={deleteGoalAction.bind(null, g.id)} confirmText={`Excluir a meta "${g.name}" e todos os seus aportes?`} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
