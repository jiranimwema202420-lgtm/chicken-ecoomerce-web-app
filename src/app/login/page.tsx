"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogIn, Mail } from "lucide-react";
import {
  GoogleAuthProvider,
  linkWithPopup,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import posthog from "posthog-js";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorMessage } from "@/lib/auth-errors";

function destination(): string {
  if (typeof window === "undefined") return "/account";
  const next = new URLSearchParams(window.location.search).get("next");
  return next?.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

export default function CustomerLoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !user.isAnonymous) {
      router.replace(destination());
    }
  }, [authLoading, router, user]);

  function ensureConfigured(): boolean {
    if (isFirebaseConfigured) return true;
    setError("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local.");
    return false;
  }

  async function handleEmailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!ensureConfigured()) return;

    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email.trim(), password);
      posthog.identify(result.user.uid, {
        name: result.user.displayName ?? undefined,
        email: result.user.email ?? undefined,
      });
      posthog.capture("user_logged_in", { method: "email" });
      router.replace(destination());
      router.refresh();
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    if (!ensureConfigured()) return;

    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });

      let result;
      if (auth.currentUser?.isAnonymous) {
        result = await linkWithPopup(auth.currentUser, provider);
      } else {
        result = await signInWithPopup(auth, provider);
      }
      posthog.identify(result.user.uid, {
        name: result.user.displayName ?? undefined,
        email: result.user.email ?? undefined,
      });
      posthog.capture("user_logged_in", { method: "google" });
      router.replace(destination());
      router.refresh();
    } catch (loginError) {
      setError(getAuthErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-shell py-12 sm:py-20">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-forest text-white">
          <LogIn size={24} />
        </div>
        <p className="eyebrow mt-5">Customer account</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          Sign in to view your orders, manage your profile, and check out faster.
        </p>

        <button
          type="button"
          className="btn-secondary mt-7 w-full gap-2"
          disabled={loading}
          onClick={handleGoogleLogin}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border border-line text-xs font-bold">G</span>
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink/35">
          <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" size={17} />
              <input
                id="email"
                required
                type="email"
                autoComplete="email"
                className="input-field pl-10"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label htmlFor="password" className="text-sm font-semibold">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-forest hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              required
              type="password"
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          New to Duka?{" "}
          <Link href="/register" className="font-semibold text-forest hover:underline">Create an account</Link>
        </p>
        <p className="mt-3 text-center text-xs leading-5 text-ink/45">
          You can also continue to checkout as a guest.
        </p>
      </div>
    </div>
  );
}
