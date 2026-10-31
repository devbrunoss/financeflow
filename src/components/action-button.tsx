"use client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { actionMessage } from "@/lib/ui/use-action-form";
import type { ActionResult } from "@/server/actions/helpers";

export function ActionButton({ label, ariaLabel, action, confirmText, danger }: { label: string; ariaLabel?: string; action: () => Promise<ActionResult>; confirmText?: string; danger?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} aria-label={ariaLabel ?? label} className={`underline disabled:opacity-50 ${danger ? "text-red-800" : ""}`}
      onClick={() => { if (confirmText && !confirm(confirmText)) return; start(async () => { const r = await action(); if (!r.ok) alert(actionMessage(r)); router.refresh(); }); }}>
      {label}
    </button>
  );
}
