import Link from "next/link";

export default function NotFound() {
  return (
    <main className="section-shell py-20 text-center">
      <p className="eyebrow">404 error</p>

      <h1 className="mt-3 font-display text-4xl font-bold">
        Page not found
      </h1>

      <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-ink/60">
        The page you requested does not exist or may have been moved.
      </p>

      <Link href="/" className="btn-primary mt-7">
        Return to Duka
      </Link>
    </main>
  );
}