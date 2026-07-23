"use client";

import Link from "next/link";
import { LogIn, PackageCheck, UserPlus, UserRound } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

function customerName(displayName: string | null, email: string | null): string {
  const trimmedName = displayName?.trim();
  if (trimmedName) return trimmedName.split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "Customer";
}

export default function CustomerAccessPanel() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur" aria-label="Loading customer account">
        <div className="h-5 w-36 animate-pulse rounded bg-white/15" />
        <div className="mt-3 h-4 w-full animate-pulse rounded bg-white/10" />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="h-11 animate-pulse rounded-md bg-white/15" />
          <div className="h-11 animate-pulse rounded-md bg-white/15" />
        </div>
      </div>
    );
  }

  if (user && !user.isAnonymous) {
    return (
      <div className="rounded-xl border border-white/15 bg-white p-5 text-ink shadow-lg">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
            <UserRound size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Customer account</p>
            <h2 className="mt-1 truncate font-display text-xl font-bold">
              Welcome, {customerName(user.displayName, user.email)}
            </h2>
            <p className="mt-1 truncate text-sm text-ink/55">{user.email}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Link href="/account" className="btn-primary gap-2">
            <UserRound size={17} /> My account
          </Link>
          <Link href="/account#orders" className="btn-secondary gap-2">
            <PackageCheck size={17} /> My orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/15 bg-white p-5 text-ink shadow-lg">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-marigold/20 text-forest">
          <UserRound size={21} aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">Customer login</p>
          <h2 className="mt-1 font-display text-xl font-bold">
            {user?.isAnonymous ? "Shopping as a guest" : "Your Duka account"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Sign in to view orders, save your details, and move through checkout faster.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Link href="/login" className="btn-primary gap-2">
          <LogIn size={17} /> Sign in
        </Link>
        <Link href="/register" className="btn-secondary gap-2">
          <UserPlus size={17} /> Create account
        </Link>
      </div>
      <p className="mt-3 text-center text-xs leading-5 text-ink/45">
        Guest checkout remains available.
      </p>
    </div>
  );
}
