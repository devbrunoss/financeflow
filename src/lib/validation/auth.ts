import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80, "Máximo de 80 caracteres"),
  email: z.string().trim().toLowerCase().email("E-mail inválido").max(254),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(128, "Máximo de 128 caracteres"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha").max(128),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
