"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  CircleDollarSign,
  Download,
  Minus,
  PackageCheck,
  Plus,
  Search,
  TriangleAlert,
} from "lucide-react";
import { doc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Product } from "@/lib/types";

interface StockInventoryTrackerProps {
  products: Product[];
  loading: boolean;
}

type StockFilter = "all" | "healthy" | "low" | "out";
type SortOption = "stock-asc" | "stock-desc" | "name";

const LOW_STOCK_THRESHOLD = 5;
const MAX_STOCK = 100_000;

const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function getStockStatus(stock: number) {
  if (stock <= 0) {
    return {
      label: "Out of stock",
      className: "border-red-200 bg-red-50 text-red-700",
    };
  }

  if (stock <= LOW_STOCK_THRESHOLD) {
    return {
      label: "Low stock",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Healthy",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };
}

function formatUpdatedAt(timestamp: number | undefined): string {
  if (!timestamp) return "Not recorded";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function escapeCsv(value: string | number | boolean): string {
  const text = String(value);

  if (!/[",\n]/.test(text)) return text;

  return `"${text.replace(/"/g, '""')}"`;
}

export default function StockInventoryTracker({
  products,
  loading,
}: StockInventoryTrackerProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("all");
  const [sort, setSort] = useState<SortOption>("stock-asc");
  const [draftStock, setDraftStock] = useState<Record<string, string>>({});
  const [busyProductId, setBusyProductId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const inventorySummary = useMemo(() => {
    const totalUnits = products.reduce(
      (sum, product) => sum + Math.max(0, Number(product.stock) || 0),
      0
    );
    const retailValue = products.reduce(
      (sum, product) =>
        sum +
        Math.max(0, Number(product.stock) || 0) *
          Math.max(0, Number(product.price) || 0),
      0
    );
    const lowStock = products.filter(
      (product) =>
        product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD
    ).length;
    const outOfStock = products.filter((product) => product.stock <= 0).length;

    return {
      totalUnits,
      retailValue,
      lowStock,
      outOfStock,
    };
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const matches = products.filter((product) => {
      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        product.category.toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) return false;

      if (filter === "healthy") return product.stock > LOW_STOCK_THRESHOLD;
      if (filter === "low") {
        return product.stock > 0 && product.stock <= LOW_STOCK_THRESHOLD;
      }
      if (filter === "out") return product.stock <= 0;

      return true;
    });

    return matches.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "stock-desc") return b.stock - a.stock;

      return a.stock - b.stock;
    });
  }, [filter, products, search, sort]);

  async function setProductStock(product: Product, nextStock: number) {
    const normalizedStock = Math.max(
      0,
      Math.min(MAX_STOCK, Math.trunc(nextStock))
    );

    setBusyProductId(product.id);
    setError("");
    setMessage("");

    try {
      const productRef = doc(db, "products", product.id);

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(productRef);

        if (!snapshot.exists()) {
          throw new Error("This product no longer exists.");
        }

        transaction.update(productRef, {
          stock: normalizedStock,
          updatedAt: Date.now(),
        });
      });

      setDraftStock((current) => ({
        ...current,
        [product.id]: String(normalizedStock),
      }));
      setMessage(`${product.name} stock updated to ${normalizedStock}.`);
    } catch (updateError) {
      console.error("Inventory update failed:", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The stock quantity could not be updated."
      );
    } finally {
      setBusyProductId("");
    }
  }

  async function adjustProductStock(product: Product, delta: number) {
    setBusyProductId(product.id);
    setError("");
    setMessage("");

    try {
      const productRef = doc(db, "products", product.id);
      let resultingStock = product.stock;

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(productRef);

        if (!snapshot.exists()) {
          throw new Error("This product no longer exists.");
        }

        const currentStock = Math.max(
          0,
          Number(snapshot.data().stock ?? 0)
        );
        resultingStock = Math.max(
          0,
          Math.min(MAX_STOCK, Math.trunc(currentStock + delta))
        );

        transaction.update(productRef, {
          stock: resultingStock,
          updatedAt: Date.now(),
        });
      });

      setDraftStock((current) => ({
        ...current,
        [product.id]: String(resultingStock),
      }));
      setMessage(`${product.name} stock updated to ${resultingStock}.`);
    } catch (updateError) {
      console.error("Inventory adjustment failed:", updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The stock quantity could not be adjusted."
      );
    } finally {
      setBusyProductId("");
    }
  }

  function applyDraftStock(product: Product) {
    const rawValue = draftStock[product.id] ?? String(product.stock);
    const parsedValue = Number(rawValue);

    if (!Number.isInteger(parsedValue) || parsedValue < 0) {
      setMessage("");
      setError("Stock must be a whole number of zero or more.");
      return;
    }

    void setProductStock(product, parsedValue);
  }

  function exportInventoryCsv() {
    const rows = [
      [
        "Product",
        "Category",
        "Stock",
        "Status",
        "Unit price (KES)",
        "Retail stock value (KES)",
        "Storefront active",
        "Last updated",
      ],
      ...visibleProducts.map((product) => [
        product.name,
        product.category,
        product.stock,
        getStockStatus(product.stock).label,
        product.price,
        product.price * product.stock,
        product.active,
        formatUpdatedAt(product.updatedAt),
      ]),
    ];

    const csv = rows
      .map((row) => row.map((value) => escapeCsv(value)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `duka-inventory-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  const metrics = [
    {
      label: "Units in stock",
      value: inventorySummary.totalUnits.toLocaleString("en-KE"),
      icon: Boxes,
    },
    {
      label: "Retail stock value",
      value: currencyFormatter.format(inventorySummary.retailValue),
      icon: CircleDollarSign,
    },
    {
      label: "Low-stock products",
      value: inventorySummary.lowStock.toLocaleString("en-KE"),
      icon: TriangleAlert,
    },
    {
      label: "Out of stock",
      value: inventorySummary.outOfStock.toLocaleString("en-KE"),
      icon: PackageCheck,
    },
  ];

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Inventory control</p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            Stock inventory tracker
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Monitor stock levels, identify products that need replenishment,
            and make controlled quantity adjustments.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary gap-2"
          onClick={exportInventoryCsv}
          disabled={loading || visibleProducts.length === 0}
        >
          <Download size={16} />
          Export CSV
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-ink/55">{label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-forest/10 text-forest">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-bold">
              {loading ? "..." : value}
            </p>
          </div>
        ))}
      </div>

      <div className="card mt-5 overflow-hidden">
        <div className="grid gap-3 border-b border-line p-4 md:grid-cols-[1fr_180px_180px_auto]">
          <label className="relative">
            <span className="sr-only">Search inventory</span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
            />
            <input
              type="search"
              className="input-field pl-10"
              placeholder="Search product or category..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            className="input-field"
            value={filter}
            onChange={(event) => setFilter(event.target.value as StockFilter)}
            aria-label="Filter inventory status"
          >
            <option value="all">All stock levels</option>
            <option value="healthy">Healthy stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </select>

          <select
            className="input-field"
            value={sort}
            onChange={(event) => setSort(event.target.value as SortOption)}
            aria-label="Sort inventory"
          >
            <option value="stock-asc">Lowest stock first</option>
            <option value="stock-desc">Highest stock first</option>
            <option value="name">Product name</option>
          </select>

          <div className="flex items-center justify-end text-sm font-semibold text-ink/55">
            {visibleProducts.length} product
            {visibleProducts.length === 1 ? "" : "s"}
          </div>
        </div>

        {(message || error) && (
          <div
            className={`border-b px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
            role="status"
          >
            {error || message}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-canvas/80 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Product</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Unit price
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Stock value
                </th>
                <th className="px-4 py-3 font-semibold">Quick adjustment</th>
                <th className="px-4 py-3 font-semibold">Set stock</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/55">
                    Loading inventory...
                  </td>
                </tr>
              ) : visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-ink/55">
                    No products match the selected inventory filters.
                  </td>
                </tr>
              ) : (
                visibleProducts.map((product) => {
                  const status = getStockStatus(product.stock);
                  const isBusy = busyProductId === product.id;
                  const inputValue =
                    draftStock[product.id] ?? String(product.stock);

                  return (
                    <tr key={product.id} className="align-middle">
                      <td className="px-4 py-4">
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="font-semibold text-ink hover:text-forest hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="mt-1 text-xs text-ink/50">
                          {product.category || "Uncategorised"} Ã‚Â·{" "}
                          {product.active ? "Visible" : "Hidden"}
                        </p>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${status.className}`}
                        >
                          {status.label}: {product.stock}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-medium">
                        {currencyFormatter.format(product.price)}
                      </td>

                      <td className="px-4 py-4 text-right font-semibold">
                        {currencyFormatter.format(product.price * product.stock)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="inline-flex items-center rounded-md border border-line bg-white p-1">
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded hover:bg-canvas disabled:opacity-35"
                            aria-label={`Remove five units from ${product.name}`}
                            disabled={isBusy || product.stock <= 0}
                            onClick={() => void adjustProductStock(product, -5)}
                          >
                            <span className="text-xs font-bold">-5</span>
                          </button>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded hover:bg-canvas disabled:opacity-35"
                            aria-label={`Remove one unit from ${product.name}`}
                            disabled={isBusy || product.stock <= 0}
                            onClick={() => void adjustProductStock(product, -1)}
                          >
                            <Minus size={15} />
                          </button>
                          <span className="min-w-12 px-2 text-center font-bold">
                            {product.stock}
                          </span>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded hover:bg-canvas disabled:opacity-35"
                            aria-label={`Add one unit to ${product.name}`}
                            disabled={isBusy || product.stock >= MAX_STOCK}
                            onClick={() => void adjustProductStock(product, 1)}
                          >
                            <Plus size={15} />
                          </button>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded hover:bg-canvas disabled:opacity-35"
                            aria-label={`Add five units to ${product.name}`}
                            disabled={isBusy || product.stock >= MAX_STOCK}
                            onClick={() => void adjustProductStock(product, 5)}
                          >
                            <span className="text-xs font-bold">+5</span>
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex min-w-44 items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={MAX_STOCK}
                            step={1}
                            className="input-field h-10 w-24"
                            value={inputValue}
                            disabled={isBusy}
                            onChange={(event) =>
                              setDraftStock((current) => ({
                                ...current,
                                [product.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                applyDraftStock(product);
                              }
                            }}
                            aria-label={`Set ${product.name} stock quantity`}
                          />
                          <button
                            type="button"
                            className="btn-secondary min-h-10 px-3 py-2"
                            disabled={isBusy}
                            onClick={() => applyDraftStock(product)}
                          >
                            {isBusy ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs leading-5 text-ink/50">
                        {formatUpdatedAt(product.updatedAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-line bg-canvas/50 px-4 py-3 text-xs leading-5 text-ink/50">
          Products with {LOW_STOCK_THRESHOLD} units or fewer are marked as low
          stock. All adjustments are constrained to whole numbers between 0 and{" "}
          {MAX_STOCK.toLocaleString("en-KE")}.
        </div>
      </div>
    </section>
  );
}