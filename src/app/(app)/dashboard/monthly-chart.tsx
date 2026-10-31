"use client";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartRow = { label: string; Receitas: number; Despesas: number };
// Number() é usado apenas para desenhar o gráfico; nenhum cálculo é feito com ele.
const brl = (v: unknown) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v));

export function MonthlyChart({ data }: { data: ChartRow[] }) {
  return (
    <>
      <div className="h-64 w-full" role="img" aria-label="Gráfico de barras com receitas e despesas dos últimos 6 meses. Os mesmos dados estão na tabela abaixo.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" />
            <YAxis tickFormatter={(v) => brl(v).replace(",00", "")} width={90} />
            <Tooltip formatter={(v) => brl(v)} />
            <Legend />
            <Bar dataKey="Receitas" fill="#047857" />
            <Bar dataKey="Despesas" fill="#b45309" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer underline">Ver dados em tabela</summary>
        <table className="mt-2 w-full text-left">
          <thead><tr><th scope="col">Mês</th><th scope="col" className="text-right">Receitas</th><th scope="col" className="text-right">Despesas</th></tr></thead>
          <tbody>{data.map((r) => <tr key={r.label}><th scope="row" className="font-normal">{r.label}</th><td className="text-right tabular-nums">{brl(r.Receitas)}</td><td className="text-right tabular-nums">{brl(r.Despesas)}</td></tr>)}</tbody>
        </table>
      </details>
    </>
  );
}
