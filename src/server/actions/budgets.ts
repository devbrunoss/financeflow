"use server";
import { z } from "zod";
import { deleteBudget, setBudget } from "@/lib/db/budgets";
import { budgetInputSchema } from "@/lib/validation/modules";
import { idSchema, run } from "./helpers";

export const setBudgetAction = async (raw: unknown) => run(budgetInputSchema, raw, ["/budgets"], (u, d) => setBudget(u, d));
export const deleteBudgetAction = async (id: string) => run(z.object({}), {}, ["/budgets"], (u) => deleteBudget(u, idSchema.parse(id)));
