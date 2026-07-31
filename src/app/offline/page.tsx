import Link from "next/link";

export default function OfflinePage(): React.ReactElement {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-2xl items-center justify-center px-6 py-16 text-center">
      <section className="rounded-3xl border border-emerald-900/10 bg-white/90 p-8 shadow-xl dark:border-white/10 dark:bg-neutral-950/90 sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Duka Broilers</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white sm:text-4xl">You are offline</h1>
        <p className="mt-4 leading-7 text-neutral-600 dark:text-neutral-300">
          Check your connection and try again. Stock, prices, checkout and account information require a live connection.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-800 px-5 py-3 font-semibold text-white hover:bg-emerald-900">Try the home page</Link>
          <Link href="/shop" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-neutral-300 px-5 py-3 font-semibold text-neutral-900 dark:border-neutral-700 dark:text-white">Try the shop</Link>
        </div>
      </section>
    </main>
  );
}
