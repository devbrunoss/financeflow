"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteTransactionAction } from "@/server/actions/transactions";

export function DeleteButton({ id, description }: { id: string; description: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className="text-red-800 underline disabled:opacity-50"
      aria-label={`Excluir ${description}`}
      onClick={() => {
        if (!confirm(`Excluir "${description}"? Esta ação não pode ser desfeita.`)) return;
        start(async () => {
          const r = await deleteTransactionAction(id);
          if (!r.ok) alert(r.message ?? "Não foi possível excluir.");
          router.refresh();
        });
      }}
    >
      Excluir
    </button>
  );
}
