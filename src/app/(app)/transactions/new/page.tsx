import { requireUser } from "@/lib/auth/session";
import { ensureDefaultCategories, listActiveCategories } from "@/lib/db/categories";
import { todayInTimeZone } from "@/lib/finance/periods";
import { TransactionForm } from "../transaction-form";

export default async function NewTransactionPage() {
  const user = await requireUser();
  await ensureDefaultCategories(user.id);
  const categories = await listActiveCategories(user.id);
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold">Nova transação</h1>
      <TransactionForm categories={categories} initial={{ type: "EXPENSE", description: "", amount: "", date: todayInTimeZone(), categoryId: "", notes: "" }} />
    </main>
  );
}
