"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/auth-errors";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isFirebaseConfigured) {
      setError("Firebase is not configured.");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset instructions have been sent. Check your inbox and spam folder.");
    } catch (resetError) {
      setError(getAuthErrorMessage(resetError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section-shell py-12 sm:py-20">
      <div className="card mx-auto max-w-md p-6 sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-forest text-white"><KeyRound size={24} /></div>
        <h1 className="mt-5 font-display text-3xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm leading-6 text-ink/60">Enter your account email and Firebase will send a secure reset link.</p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <div>
            <label htmlFor="email" className="mb-2 block text-sm font-semibold">Email</label>
            <input id="email" required type="email" autoComplete="email" className="input-field" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {message && <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Sending…" : "Send reset link"}</button>
        </form>

        <Link href="/login" className="btn-ghost mt-5 w-full">Back to sign in</Link>
      </div>
    </div>
  );
}
