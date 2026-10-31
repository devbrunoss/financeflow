// Datas de calendário são strings "YYYY-MM-DD", sem horário nem fuso. No banco: DATE (UTC 00:00).
const RE = /^(\d{4})-(\d{2})-(\d{2})$/;
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

export function isValidDateString(s: string): boolean {
  const m = RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1900 || y > 2100) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

export function parseDateOnly(s: string): Date {
  if (!isValidDateString(s)) throw new Error(`Data inválida: ${s}`);
  return new Date(`${s}T00:00:00.000Z`);
}

export function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Primeiro e último dia do mês, ambos inclusivos. */
export function monthRange(year: number, month: number): { start: string; end: string } {
  return {
    start: formatDateOnly(new Date(Date.UTC(year, month - 1, 1))),
    end: formatDateOnly(new Date(Date.UTC(year, month, 0))),
  };
}

/** "Hoje" no fuso do usuário, não do servidor. */
export function todayInTimeZone(tz = DEFAULT_TIME_ZONE, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
