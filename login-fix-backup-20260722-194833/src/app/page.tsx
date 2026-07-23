"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Search, ShieldCheck, Smartphone, Truck } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { useActiveProducts } from "@/lib/useProducts";

export default function HomePage() {
  const { products, loading, error } = useActiveProducts();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(products.map((product) => product.category.trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b)),
    ],
    [products]
  );

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.description.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery);
      return matchesCategory && matchesQuery;
    });
  }, [category, products, query]);

  return (
    <>
      <section className="section-shell py-10 sm:py-14 lg:py-20">
        <div className="overflow-hidden rounded-[28px] bg-forest text-white shadow-[0_30px_80px_rgba(14,75,54,0.22)]">
          <div className="grid gap-8 px-6 py-10 sm:px-10 sm:py-14 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:px-16 lg:py-20">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-marigold-light">
                Simple Kenyan commerce
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
                Quality products. Fast checkout. Pay with M-Pesa.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                Discover carefully selected products, add them to your cart, and complete payment securely from your phone.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="#products" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-marigold px-6 py-3 text-sm font-bold text-ink transition hover:bg-marigold-light">
                  Browse products <ArrowRight size={18} />
                </Link>
                <Link href="/cart" className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                  View cart
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { icon: Smartphone, title: "M-Pesa checkout", text: "Approve payment securely on your phone." },
                { icon: ShieldCheck, title: "Protected orders", text: "Order totals are verified on the server." },
                { icon: Truck, title: "Ready to fulfil", text: "Stock and payment status stay synchronized." },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-xl border border-white/12 bg-white/8 p-4 backdrop-blur">
                  <Icon size={21} className="text-marigold-light" />
                  <h2 className="mt-3 font-display text-base font-bold">{title}</h2>
                  <p className="mt-1 text-sm leading-5 text-white/65">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="section-shell scroll-mt-24 pb-16 sm:pb-24">
        <div className="flex flex-col gap-5 border-b border-line pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Current collection</p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Shop what you need</h2>
            <p className="mt-2 text-sm text-ink/60">
              {loading ? "Loading the catalogue…" : `${visibleProducts.length} product${visibleProducts.length === 1 ? "" : "s"} available`}
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:max-w-2xl">
            <label className="relative flex-1">
              <span className="sr-only">Search products</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
              <input
                type="search"
                className="input-field pl-10"
                placeholder="Search products"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label>
              <span className="sr-only">Filter by category</span>
              <select className="input-field min-w-44" value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card overflow-hidden">
                <div className="aspect-[4/3] animate-pulse bg-line" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-line" />
                  <div className="h-4 w-full animate-pulse rounded bg-line" />
                  <div className="h-7 w-1/3 animate-pulse rounded bg-line" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && visibleProducts.length === 0 && (
          <div className="card mt-8 px-6 py-14 text-center">
            <h3 className="font-display text-xl font-bold">No matching products</h3>
            <p className="mt-2 text-sm text-ink/60">Try a different search term or category.</p>
            <button type="button" className="btn-secondary mt-5" onClick={() => { setQuery(""); setCategory("All"); }}>
              Clear filters
            </button>
          </div>
        )}

        {!loading && visibleProducts.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
