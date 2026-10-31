"use server";
import { z } from "zod";
import { addContribution, createGoal, deleteGoal, setGoalCanceled } from "@/lib/db/goals";
import { contributionSchema, goalInputSchema } from "@/lib/validation/modules";
import { idSchema, run } from "./helpers";

const P = ["/goals"], none = z.object({});
export const createGoalAction = async (raw: unknown) => run(goalInputSchema, raw, P, (u, d) => createGoal(u, d));
export const contributeAction = async (goalId: string, raw: unknown) =>
  run(contributionSchema, raw, P, (u, d) => addContribution(u, idSchema.parse(goalId), d.kind === "WITHDRAWAL" ? d.amount.neg() : d.amount, d.date, d.note));
export const cancelGoalAction = async (id: string, canceled: boolean) => run(none, {}, P, (u) => setGoalCanceled(u, idSchema.parse(id), canceled));
export const deleteGoalAction = async (id: string) => run(none, {}, P, (u) => deleteGoal(u, idSchema.parse(id)));
