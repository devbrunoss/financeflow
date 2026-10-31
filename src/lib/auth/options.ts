import type { BetterAuthOptions } from "better-auth";

/** Opções compartilhadas (sem `database`), reutilizadas nos testes de integração. */
export const authOptions = {
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128, autoSignIn: true },
  user: { modelName: "User" },
  session: { modelName: "Session", expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  account: { modelName: "Account" },
  verification: { modelName: "Verification" },
  advanced: { useSecureCookies: process.env.NODE_ENV === "production" },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 5 } },
  },
} satisfies BetterAuthOptions;
