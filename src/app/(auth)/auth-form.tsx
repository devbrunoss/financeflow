"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authClient } from "@/lib/auth/client";
import { loginSchema, registerSchema, type RegisterInput } from "@/lib/validation/auth";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const isRegister = mode === "register";
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(isRegister ? registerSchema : (loginSchema as unknown as typeof registerSchema)),
  });

  async function onSubmit(v: RegisterInput) {
    setFormError(null);
    const res = isRegister
      ? await authClient.signUp.email({ name: v.name, email: v.email, password: v.password })
      : await authClient.signIn.email({ email: v.email, password: v.password });
    if (res.error) {
      // Mensagem genérica no login: não revela se o e-mail existe.
      setFormError(isRegister ? "Não foi possível criar a conta. Verifique os dados." : "E-mail ou senha incorretos.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  const field = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 focus:outline-2 focus:outline-emerald-600";
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold">{isRegister ? "Criar conta" : "Entrar no FinanceFlow"}</h1>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
        {isRegister && (
          <div>
            <label htmlFor="name">Nome</label>
            <input id="name" autoComplete="name" className={field} aria-invalid={!!errors.name} {...register("name")} />
            {errors.name && <p role="alert" className="text-sm text-red-700">{errors.name.message}</p>}
          </div>
        )}
        <div>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="email" className={field} aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <p role="alert" className="text-sm text-red-700">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} className={field} aria-invalid={!!errors.password} {...register("password")} />
          {errors.password && <p role="alert" className="text-sm text-red-700">{errors.password.message}</p>}
        </div>
        {formError && <p role="alert" className="rounded-md border border-red-700 p-2 text-sm text-red-800">Erro: {formError}</p>}
        <button disabled={isSubmitting} className="w-full rounded-md bg-emerald-700 px-3 py-2 font-medium text-white disabled:opacity-60">
          {isSubmitting ? "Enviando..." : isRegister ? "Cadastrar" : "Entrar"}
        </button>
      </form>
      <p className="mt-4 text-sm">
        {isRegister ? <>Já tem conta? <Link className="underline" href="/login">Entrar</Link></> : <>Novo por aqui? <Link className="underline" href="/register">Criar conta</Link></>}
      </p>
    </main>
  );
}
