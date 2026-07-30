"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isFirebaseConfigured) {
      setError("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values to .env.local first.");
      return;
    }

    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const tokenResult = await credential.user.getIdTokenResult(true);

      if (tokenResult.claims.admin !== true && tokenResult.claims.role !== "admin") {
        await signOut(auth);
        setError("This account does not have administrator access.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch (loginError) {
      console.error("Admin sign-in failed:", loginError);
      setError("Sign-in failed. Check your email, password, and Firebase configuration.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-shell py-16 sm:py-24">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-forest text-white">
          <ShieldCheck size={24} />
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold">Admin sign in</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">
          Use an account with the Firebase custom claim <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">admin: true</code>.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email</label>
            <input
              id="email"
              required
              type="email"
              autoComplete="email"
              className="input-field"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold">Password</label>
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
            {loading ? "Signing inâ€¦" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
