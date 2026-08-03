import Link from "next/link";

import { getInventoryOverview } from "@/lib/server/inventory-monitoring";

export const dynamic = "force-dynamic";

const numberFormatter = new Intl.NumberFormat("en-KE");

function formatDate(value: unknown) {
  const timestamp = Number(value);

  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return "No successful cleanup recorded";
  }

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Nairobi",
  }).format(new Date(timestamp));
}

function getStatusClasses(status: string) {
  switch (status) {
    case "out":
      return "bg-red-100 text-red-800 ring-red-200";
    case "low":
      return "bg-amber-100 text-amber-800 ring-amber-200";
    default:
      return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
}

export default async function InventoryMonitoringPage() {
  const inventory = await getInventoryOverview();
  const cleanup = inventory.cleanup ?? {};

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-700">
              Admin operations
            </p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Inventory monitoring
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Review available stock, active reservations, low-stock products,
              and inventory cleanup health.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/api/admin/inventory-monitoring?format=csv"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-100"
            >
              Export audit CSV
            </Link>

            <Link
              href="/admin"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700"
            >
              Back to admin
            </Link>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Available stock
            </p>

            <p className="mt-2 text-3xl font-bold">
              {numberFormatter.format(inventory.totals.available)}
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Reserved stock
            </p>

            <p className="mt-2 text-3xl font-bold">
              {numberFormatter.format(inventory.totals.reserved)}
            </p>
          </article>

          <article className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-800">
              Low-stock products
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-950">
              {numberFormatter.format(inventory.totals.low)}
            </p>
          </article>

          <article className="rounded-2xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-red-800">
              Out-of-stock products
            </p>

            <p className="mt-2 text-3xl font-bold text-red-950">
              {numberFormatter.format(inventory.totals.out)}
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-semibold">Product inventory</h2>

            <p className="mt-1 text-sm text-slate-600">
              Products with {inventory.threshold} units or fewer are marked as
              low stock.
            </p>
          </div>

          {inventory.products.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <p className="font-medium text-slate-800">
                No products were found.
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Add products to the catalogue to begin monitoring inventory.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Product
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Available
                    </th>

                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Reserved
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Catalogue
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {inventory.products.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-5 py-4">
                        <p className="font-medium text-slate-900">
                          {product.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {product.id}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right font-semibold">
                        {numberFormatter.format(product.stock)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4 text-right">
                        {numberFormatter.format(product.reserved)}
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={
                            product.active
                              ? "text-emerald-700"
                              : "text-slate-500"
                          }
                        >
                          {product.active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ring-inset ${getStatusClasses(
                            product.status,
                          )}`}
                        >
                          {product.status === "out"
                            ? "Out of stock"
                            : product.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Reservation cleanup</h2>

              <p className="mt-1 text-sm text-slate-600">
                Last successful run:{" "}
                {formatDate(cleanup.lastSuccessfulAt)}
              </p>
            </div>

            <span className="inline-flex w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold capitalize text-slate-700">
              {String(cleanup.status ?? "Not run")}
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
