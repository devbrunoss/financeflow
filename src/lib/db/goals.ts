import Decimal from "decimal.js";
import { prisma } from "./client";
import { DomainError } from "@/lib/errors";
import { nextStatus } from "@/lib/finance/goals";
import { parseDateOnly } from "@/lib/finance/periods";

const NF = () => new DomainError("Meta não encontrada", "NOT_FOUND");

export function createGoal(userId: string, i: { name: string; targetAmount: Decimal; targetDate?: string }) {
  return prisma.goal.create({ data: { userId, name: i.name, targetAmount: i.targetAmount.toFixed(2), targetDate: i.targetDate ? parseDateOnly(i.targetDate) : null } });
}

/** Aporte (+) ou retirada (−), atômico: valida o saldo da meta e atualiza o status na mesma transação. Não gera transação financeira. */
export async function addContribution(userId: string, goalId: string, signed: Decimal, date: string, note?: string) {
  await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw NF();
    if (goal.status === "CANCELED") throw new DomainError("Meta cancelada não aceita aportes");
    const agg = await tx.goalContribution.aggregate({ where: { goalId, userId }, _sum: { amount: true } });
    const next = new Decimal(agg._sum.amount?.toString() ?? 0).plus(signed);
    if (next.isNegative()) throw new DomainError("A retirada excede o valor acumulado da meta");
    await tx.goalContribution.create({ data: { goalId, userId, amount: signed.toFixed(2), date: parseDateOnly(date), note: note ?? null } });
    const status = nextStatus(goal.status, next.gte(goal.targetAmount.toString()));
    if (status !== goal.status) await tx.goal.update({ where: { id: goalId }, data: { status } });
  }, { isolationLevel: "Serializable" });
}

export async function setGoalCanceled(userId: string, goalId: string, canceled: boolean) {
  await prisma.$transaction(async (tx) => {
    const goal = await tx.goal.findFirst({ where: { id: goalId, userId } });
    if (!goal) throw NF();
    const agg = await tx.goalContribution.aggregate({ where: { goalId, userId }, _sum: { amount: true } });
    const reached = new Decimal(agg._sum.amount?.toString() ?? 0).gte(goal.targetAmount.toString());
    await tx.goal.update({ where: { id: goalId }, data: { status: canceled ? "CANCELED" : nextStatus("ACTIVE", reached) } });
  });
}
export async function deleteGoal(userId: string, id: string) {
  if ((await prisma.goal.deleteMany({ where: { id, userId } })).count === 0) throw NF();
}
export const listGoals = (userId: string) => prisma.goal.findMany({ where: { userId }, orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { contributions: { select: { amount: true } } } });
