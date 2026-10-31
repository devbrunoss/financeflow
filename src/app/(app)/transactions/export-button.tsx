"use client";
import { useState } from "react";

export function ExportButton({ query }: { query: string }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true); setStatus(null);
    try {
      const r = await fetch(`/api/export/transactions?${query}`);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      const name = /filename="([^"]+)"/.exec(r.headers.get("Content-Disposition") ?? "")?.[1] ?? "transacoes.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      setStatus(`Arquivo ${name} gerado com ${r.headers.get("X-Row-Count") ?? "?"} transações (respeitando os filtros atuais).`);
    } catch { setStatus("Erro: não foi possível gerar o arquivo."); }
    finally { setBusy(false); }
  }
  return (
    <div className="flex flex-col items-end">
      <button onClick={run} disabled={busy} className="rounded-md border px-4 py-2 disabled:opacity-60">{busy ? "Gerando..." : "Exportar CSV"}</button>
      <p role="status" aria-live="polite" className="mt-1 text-right text-sm">{status}</p>
    </div>
  );
}
