"use server";
import { z } from "zod";
import { createCategory, deleteCategory, renameCategory, setCategoryArchived } from "@/lib/db/category-admin";
import { categoryInputSchema, categoryRenameSchema } from "@/lib/validation/modules";
import { idSchema, run } from "./helpers";

const P = ["/categories", "/transactions", "/budgets"];
export const createCategoryAction = async (raw: unknown) => run(categoryInputSchema, raw, P, (u, d) => createCategory(u, d));
export const renameCategoryAction = async (id: string, raw: unknown) => run(categoryRenameSchema, raw, P, (u, d) => renameCategory(u, idSchema.parse(id), d.name));
export const archiveCategoryAction = async (id: string, archived: boolean) => run(z.object({}), {}, P, (u) => setCategoryArchived(u, idSchema.parse(id), archived));
export const deleteCategoryAction = async (id: string) => run(z.object({}), {}, P, (u) => deleteCategory(u, idSchema.parse(id)));
