"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function RequireSupplier({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isSupplier, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isSupplier)) {
      router.replace("/supplier/login");
    }
  }, [loading, user, isSupplier, router]);

  if (loading || !user || !isSupplier) {
    return (
      <p className="mx-auto max-w-6xl px-4 py-10 text-sm text-ink/60">
        Checking supplier accessâ€¦
      </p>
    );
  }

  return <>{children}</>;
}