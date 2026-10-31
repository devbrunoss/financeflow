import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { betterAuth } from "better-auth";
import { authOptions } from "../../src/lib/auth/options";
import { loginSchema, registerSchema } from "../../src/lib/validation/auth";

// Usa o mesmo conjunto de opções de produção, mas com pg direto (o Prisma CLI não roda neste sandbox).
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const auth = betterAuth({ ...authOptions, database: pool, secret: "x".repeat(40), baseURL: "http://localhost:3000" });
const email = `teste-${Date.now()}@exemplo.com`;
const password = "senha-segura-123";

const cookieFrom = (h: Headers) => h.getSetCookie().map((c) => c.split(";")[0]).join("; ");

beforeAll(async () => { await pool.query(`DELETE FROM "User" WHERE email LIKE 'teste-%'`); });
afterAll(async () => { await pool.query(`DELETE FROM "User" WHERE email LIKE 'teste-%'`); await pool.end(); });

describe("validação Zod", () => {
  it("normaliza e-mail e rejeita senha curta/longa", () => {
    expect(registerSchema.parse({ name: " Ana ", email: " ANA@X.COM ", password }).email).toBe("ana@x.com");
    expect(registerSchema.safeParse({ name: "Ana", email: "a@x.com", password: "123" }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "Ana", email: "a@x.com", password: "a".repeat(129) }).success).toBe(false);
    expect(registerSchema.safeParse({ name: "", email: "a@x.com", password }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "invalido", password: "x" }).success).toBe(false);
  });
});

describe("autenticação (Better Auth + PostgreSQL)", () => {
  it("cadastra, normaliza e-mail e não guarda a senha em texto", async () => {
    await auth.api.signUpEmail({ body: { name: "Teste", email: email.toUpperCase(), password } });
    const u = await pool.query(`SELECT id, email FROM "User" WHERE email = $1`, [email]);
    expect(u.rowCount).toBe(1);
    const a = await pool.query(`SELECT password FROM "Account" WHERE "userId" = $1`, [u.rows[0].id]);
    expect(a.rows[0].password).toBeTruthy();
    expect(a.rows[0].password).not.toContain(password);
  });
  it("rejeita e-mail duplicado", async () => {
    await expect(auth.api.signUpEmail({ body: { name: "Outro", email, password } })).rejects.toThrow();
  });
  it("rejeita senha errada e e-mail inexistente", async () => {
    await expect(auth.api.signInEmail({ body: { email, password: "errada-12345" } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email: "nao-existe@x.com", password } })).rejects.toThrow();
  });
  it("login cria sessão válida; sem cookie ou com token inválido não há sessão; logout invalida", async () => {
    const { headers } = await auth.api.signInEmail({ body: { email, password }, returnHeaders: true });
    const cookie = cookieFrom(headers);
    const s = await auth.api.getSession({ headers: new Headers({ cookie }) });
    expect(s?.user.email).toBe(email);
    expect(await auth.api.getSession({ headers: new Headers() })).toBeNull();
    expect(await auth.api.getSession({ headers: new Headers({ cookie: "better-auth.session_token=forjado" }) })).toBeNull();
    await auth.api.signOut({ headers: new Headers({ cookie }) });
    expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
  });
});
