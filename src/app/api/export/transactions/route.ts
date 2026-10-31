import type { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { listForExport } from "@/lib/db/export";
import { transactionsToCsv } from "@/lib/finance/csv";
import { todayInTimeZone } from "@/lib/finance/periods";
import { parseFilters } from "@/lib/validation/transaction";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new Response("Não autenticado", { status: 401 });
  const rows = await listForExport(user.id, parseFilters(Object.fromEntries(req.nextUrl.searchParams)));
  return new Response(transactionsToCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transacoes-${todayInTimeZone()}.csv"`,
      "X-Row-Count": String(rows.length),
      "Cache-Control": "no-store",
    },
  });
}
