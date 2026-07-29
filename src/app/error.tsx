"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => console.error("Route error", error), [error]);

  return (
    <section className="section-shell py-16">
      <div className="mx-auto max-w-2xl rounded-2xl border border-red-200 bg-red-50 p-7 text-red-950 shadow-sm dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100">
        <AlertTriangle size={34} />
        <h1 className="mt-5 font-display text-3xl font-bold">We could not load this page</h1>
        <p className="mt-3 text-sm leading-7 opacity-80">The application encountered an unexpected error. Try again or return to the homepage.</p>
        {error.digest && <p className="mt-4 text-xs opacity-60">Reference: {error.digest}</p>}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-bold text-white hover:bg-red-800">
            <RefreshCcw size={17} /> Try again
          </button>
          <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 px-5 py-3 text-sm font-bold dark:border-red-800">
            <Home size={17} /> Return home
          </Link>
        </div>
      </div>
    </section>
  );
}