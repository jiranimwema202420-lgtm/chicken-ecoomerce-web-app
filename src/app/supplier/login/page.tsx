"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Handshake } from "lucide-react";
import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export default function SupplierLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isFirebaseConfigured) {
      setError("Firebase is not configured.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const tokenResult = await credential.user.getIdTokenResult(true);

      if (tokenResult.claims.supplier !== true) {
        await signOut(auth);
        setError(
          "This account has not been approved for supplier access."
        );
        return;
      }

      router.replace("/supplier");
      router.refresh();
    } catch (loginError) {
      console.error("Supplier sign-in failed:", loginError);
      setError("Sign-in failed. Check your email and password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-shell py-16 sm:py-24">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <div className="glass-brand-mark grid h-12 w-12 place-items-center rounded-xl text-white">
          <Handshake size={24} />
        </div>
        <p className="eyebrow mt-5">Supply partner access</p>
        <h1 className="mt-2 font-display text-3xl font-bold">
          Supplier sign in
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          Sign in with the Firebase account approved by the Duka administrator.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label
              htmlFor="supplier-email"
              className="mb-2 block text-sm font-semibold"
            >
              Email
            </label>
            <input
              id="supplier-email"
              required
              type="email"
              autoComplete="email"
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="supplier-password"
              className="mb-2 block text-sm font-semibold"
            >
              Password
            </label>
            <input
              id="supplier-password"
              required
              type="password"
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? "Signing inâ€¦" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs leading-5 text-ink/50">
          Need an account first?{" "}
          <Link href="/register" className="font-semibold text-forest hover:underline">
            Create a customer account
          </Link>
          , then ask an administrator to approve supplier access.
        </p>
      </div>
    </div>
  );
}