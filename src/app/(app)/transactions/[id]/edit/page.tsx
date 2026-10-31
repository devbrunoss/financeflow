import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { listActiveCategories } from "@/lib/db/categories";
import { getTransaction } from "@/lib/db/transactions";
import { formatDateOnly } from "@/lib/finance/periods";
import { TransactionForm } from "../../transaction-form";

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const t = await getTransaction(user.id, id); // filtra por userId: id de outro usuário => 404
  if (!t) notFound();
  const categories = await listActiveCategories(user.id);
  return (
    <main className="mx-auto max-w-5xl p-4">
      <h1 className="text-2xl font-semibold">Editar transação</h1>
      <TransactionForm id={t.id} categories={categories} initial={{ type: t.type, description: t.description, amount: t.amount.toFixed(2).replace(".", ","), date: formatDateOnly(t.date), categoryId: t.categoryId, notes: t.notes ?? "" }} />
    </main>
  );
}
