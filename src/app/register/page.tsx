"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  linkWithPopup,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import posthog from "posthog-js";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !user.isAnonymous) router.replace("/account");
  }, [authLoading, router, user]);

  function ensureConfigured(): boolean {
    if (isFirebaseConfigured) return true;
    setError("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local.");
    return false;
  }

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!ensureConfigured()) return;
    if (name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (password.length < 6) {
      setError("Use a password with at least six characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const currentUser = auth.currentUser;
      const credential = EmailAuthProvider.credential(normalizedEmail, password);
      const registeredUser = currentUser?.isAnonymous
        ? (await linkWithCredential(currentUser, credential)).user
        : (await createUserWithEmailAndPassword(auth, normalizedEmail, password)).user;

      await updateProfile(registeredUser, { displayName: name.trim() });
      await sendEmailVerification(registeredUser);
      posthog.identify(registeredUser.uid, {
        name: name.trim(),
        email: normalizedEmail,
      });
      posthog.capture("user_registered", { method: "email" });
      router.replace("/account?registered=1");
      router.refresh();
    } catch (registerError) {
      setError(getAuthErrorMessage(registerError));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
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
      posthog.capture("user_registered", { method: "google" });
      router.replace("/account");
      router.refresh();
    } catch (registerError) {
      setError(getAuthErrorMessage(registerError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-shell py-12 sm:py-20">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-forest text-white">
          <UserPlus size={24} />
        </div>
        <p className="eyebrow mt-5">Create your account</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Join Duka</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          Save your identity for future orders and keep any guest orders made in this browser.
        </p>

        <button
          type="button"
          className="btn-secondary mt-7 w-full gap-2"
          disabled={loading}
          onClick={handleGoogleRegister}
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border border-line text-xs font-bold">G</span>
          Sign up with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink/35">
          <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-semibold">Full name</label>
            <input id="name" required autoComplete="name" className="input-field" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email</label>
            <input id="email" required type="email" autoComplete="email" className="input-field" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold">Password</label>
            <input id="password" required minLength={6} type="password" autoComplete="new-password" className="input-field" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <div>
            <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold">Confirm password</label>
            <input id="confirm-password" required minLength={6} type="password" autoComplete="new-password" className="input-field" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-forest hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
