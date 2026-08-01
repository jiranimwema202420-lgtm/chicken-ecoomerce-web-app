"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  CheckCircle2,
  LogIn,
  PackageCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { signInOrLinkWithGoogle } from "@/lib/google-auth";

function firstName(displayName: string | null, email: string | null): string {
  const name = displayName?.trim();
  if (name) return name.split(/\s+/)[0];
  if (email) return email.split("@")[0];
  return "Customer";
}

export default function HomeCustomerLogin() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function ensureConfigured(): boolean {
    if (isFirebaseConfigured) return true;
    setError(
      "Firebase Authentication is not configured. Check the NEXT_PUBLIC_FIREBASE_* values in .env.local."
    );
    return false;
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!ensureConfigured()) return;

    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setPassword("");
      router.refresh();
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    if (!ensureConfigured()) return;

    setSubmitting(true);
    try {
      await signInOrLinkWithGoogle();
      router.refresh();
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignOut() {
    setError("");
    setSubmitting(true);
    try {
      await signOut(auth);
      router.refresh();
    } catch (signOutError) {
      setError(getAuthErrorMessage(signOutError));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="glass-panel-strong rounded-2xl p-6 text-ink">
        <div className="h-5 w-40 animate-pulse rounded bg-line" />
        <div className="mt-4 h-11 animate-pulse rounded bg-line" />
        <div className="mt-3 h-11 animate-pulse rounded bg-line" />
        <div className="mt-4 h-11 animate-pulse rounded bg-line" />
      </div>
    );
  }

  if (user && !user.isAnonymous) {
    return (
      <div className="glass-panel-strong rounded-2xl p-6 text-ink">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest/10 text-forest">
            <CheckCircle2 size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">
              Signed in
            </p>
            <h2 className="mt-1 truncate font-display text-2xl font-bold">
              Hello, {firstName(user.displayName, user.email)}
            </h2>
            <p className="mt-1 truncate text-sm text-ink/55">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Link href="/account" className="btn-primary gap-2">
            <UserRound size={17} /> My account
          </Link>
          <Link href="/account#orders" className="btn-secondary gap-2">
            <PackageCheck size={17} /> My orders
          </Link>
        </div>

        <button
          type="button"
          className="btn-ghost mt-3 w-full"
          disabled={submitting}
          onClick={handleSignOut}
        >
          {submitting ? "Signing outâ€¦" : "Sign out"}
        </button>

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div id="customer-login" className="glass-panel-strong rounded-2xl p-6 text-ink">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-forest">
        Customer login
      </p>
      <h2 className="mt-1 font-display text-2xl font-bold">Sign in to Duka</h2>
      <p className="mt-2 text-sm leading-6 text-ink/60">
        View your orders, save your details, and check out faster.
      </p>

      <button
        type="button"
        className="btn-secondary mt-5 w-full gap-2"
        disabled={submitting}
        onClick={handleGoogleLogin}
      >
        <span className="grid h-5 w-5 place-items-center rounded-full border border-line text-xs font-bold">
          G
        </span>
        Continue with Google
      </button>

      <div className="my-5 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-ink/35">
        <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
      </div>

      <form className="space-y-4" onSubmit={handleEmailLogin}>
        <div>
          <label htmlFor="home-login-email" className="mb-2 block text-sm font-semibold">
            Email
          </label>
          <input
            id="home-login-email"
            type="email"
            autoComplete="email"
            required
            className="input-field"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-4">
            <label htmlFor="home-login-password" className="text-sm font-semibold">
              Password
            </label>
            <Link href="/forgot-password" className="text-xs font-semibold text-forest hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="home-login-password"
            type="password"
            autoComplete="current-password"
            required
            className="input-field"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full gap-2" disabled={submitting}>
          <LogIn size={17} /> {submitting ? "Signing inâ€¦" : "Sign in"}
        </button>
      </form>

      <Link href="/register" className="btn-secondary mt-3 w-full gap-2">
        <UserPlus size={17} /> Create account
      </Link>

      <p className="mt-3 text-center text-xs leading-5 text-ink/45">
        Guest checkout remains available.
      </p>
    </div>
  );
}
