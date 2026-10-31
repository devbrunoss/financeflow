import { Suspense } from "react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/session";

async function AuthGate({ children }: { children: React.ReactNode }) {
  await requireUser(); // as páginas também chamam requireUser(): defesa em profundidade
  return <>{children}</>;
}

const links = [["/dashboard", "Dashboard"], ["/transactions", "Transações"], ["/categories", "Categorias"], ["/budgets", "Orçamentos"], ["/goals", "Metas"]];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav aria-label="Principal" className="border-b border-slate-200">
        <ul className="mx-auto flex max-w-5xl flex-wrap gap-x-6 gap-y-1 px-4 py-3 text-sm font-medium">
          {links.map(([href, label]) => <li key={href}><Link href={href} className="underline-offset-4 hover:underline">{label}</Link></li>)}
        </ul>
      </nav>
      <Suspense fallback={<p className="p-4" role="status">Carregando...</p>}><AuthGate>{children}</AuthGate></Suspense>
    </>
  );
}
