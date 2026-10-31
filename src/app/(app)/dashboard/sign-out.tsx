"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth/client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button className="rounded-md border px-3 py-1" onClick={async () => { await authClient.signOut(); router.replace("/login"); router.refresh(); }}>
      Sair
    </button>
  );
}
