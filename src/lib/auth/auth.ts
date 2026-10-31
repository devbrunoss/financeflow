import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db/client";
import { authOptions } from "./options";

export const auth = betterAuth({
  ...authOptions,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  plugins: [nextCookies()],
});
