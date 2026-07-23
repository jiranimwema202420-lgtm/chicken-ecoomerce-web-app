"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace("/admin/login");
    }
  }, [loading, user, isAdmin, router]);

  if (loading || !user || !isAdmin) {
    return <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink/60">Checking access…</p>;
  }

  return <>{children}</>;
}
