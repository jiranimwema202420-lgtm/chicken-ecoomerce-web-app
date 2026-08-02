"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  ArrowRight,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  Truck,
  X,
} from "lucide-react";
import ProductCard from "@/components/ProductCard";
import CustomerAccessPanel from "@/components/CustomerAccessPanel";
import { useActiveProducts } from "@/lib/useProducts";
import {
  buildSearchSuggestions,
  searchProducts,
  type ProductSort,
  type StockFilter,
} from "@/lib/product-search";

export default function HomePage() {
  const { products, loading, error } = useActiveProducts();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState("All");
  const [stockFilter, setStockFilter] =
    useState<StockFilter>("all");
  const [sort, setSort] = useState<ProductSort>("relevance");
  const [featuredSuppliers, setFeaturedSuppliers] = useState<Record<string, string>>({});

  useEffect(() => {
    void fetch("/api/featured-listings")
      .then(async (response) => response.ok ? response.json() as Promise<{ listings: Array<{ productId: string; supplierName: string }> }> : { listings: [] })
      .then((data) => setFeaturedSuppliers(Object.fromEntries(data.listings.map((item) => [item.productId, item.supplierName]))))
      .catch(() => setFeaturedSuppliers({}));
  }, []);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          products
            .map((product) => product.category.trim())
            .filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    ],
    [products]
  );

  useEffect(() => {
    if (
      category !== "All" &&
      !categories.includes(category)
    ) {
      setCategory("All");
    }
  }, [categories, category]);

  useEffect(() => {
    function handleKeyboardShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "/" && !typing) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }

      if (
        event.key === "Escape" &&
        document.activeElement === searchInputRef.current
      ) {
        setQuery("");
        searchInputRef.current?.blur();
      }
    }

    window.addEventListener("keydown", handleKeyboardShortcut);

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyboardShortcut
      );
  }, []);

  const results = useMemo(
    () =>
      searchProducts(products, {
        query: deferredQuery,
        category,
        stockFilter,
        sort,
      }),
    [
      category,
      deferredQuery,
      products,
      sort,
      stockFilter,
    ]
  );

  const suggestions = useMemo(
    () =>
      buildSearchSuggestions(
        products,
        deferredQuery
      ),
    [deferredQuery, products]
  );
  const displayedResults = useMemo(() => {
    if (sort !== "relevance") return results;
    return [...results].sort((left, right) => Number(Boolean(featuredSuppliers[right.product.id])) - Number(Boolean(featuredSuppliers[left.product.id])));
  }, [featuredSuppliers, results, sort]);

  const activeFilterCount =
    Number(query.trim().length > 0) +
    Number(category !== "All") +
    Number(stockFilter !== "all") +
    Number(sort !== "relevance");

  function clearSearch() {
    setQuery("");
    setCategory("All");
    setStockFilter("all");
    setSort("relevance");
    searchInputRef.current?.focus();
  }

  return (
    <>
      <section className="section-shell py-6 sm:py-8 lg:py-10">
        <div className="hero-glass rounded-[30px] text-white">
          <div className="relative z-10 grid gap-8 px-6 py-9 sm:px-10 sm:py-11 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-14 lg:py-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-marigold-light">
                Duka wholesale catalogue
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.5rem]">
                Fresh wholesale broilers, ready to order.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
                Compare current stock and pricing, add the quantity you need,
                then choose M-Pesa or pay on delivery where available.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#products"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-marigold px-6 py-3 text-sm font-bold text-ink transition hover:bg-marigold-light"
                >
                  Browse products <ArrowRight size={18} />
                </Link>
                <Link
                  href="/cart"
                  className="inline-flex min-h-12 items-center justify-center rounded-md border border-white/25 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  View cart
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <CustomerAccessPanel />

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    icon: Smartphone,
                    title: "M-Pesa checkout",
                    text: "Approve payment securely on your phone.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Protected orders",
                    text: "Order totals are verified on the server.",
                  },
                  {
                    icon: Truck,
                    title: "Ready to fulfil",
                    text: "Stock and payment status stay synchronized.",
                  },
                ].map(({ icon: Icon, title, text }) => (
                  <div
                    key={title}
                    className="glass-dark-tile rounded-xl p-4"
                  >
                    <Icon
                      size={21}
                      className="text-marigold-light"
                    />
                    <h2 className="mt-3 font-display text-sm font-bold sm:text-base">
                      {title}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-white/65 sm:text-sm">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="products"
        className="section-shell scroll-mt-24 pb-16 sm:pb-24"
      >
        <div className="border-b border-white/60 pb-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">Current collection</p>
              <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                Find the right product
              </h2>
              <p className="mt-2 text-sm text-ink/60">
                {loading
                  ? "Loading the catalogue..."
                  : `${results.length} of ${products.length} product${
                      products.length === 1 ? "" : "s"
                    } shown`}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-ink/45">
              <Search size={14} />
              Search names, categories, descriptions and close spellings
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-line bg-white/55 p-4 shadow-sm backdrop-blur">
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_190px_170px_180px]">
              <label className="relative">
                <span className="sr-only">Search products</span>
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
                  size={18}
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  className="input-field pr-16 pl-10"
                  placeholder="Search products, categories or descriptions"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  list="product-search-suggestions"
                  autoComplete="off"
                />
                {query ? (
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-ink/45 transition hover:bg-canvas hover:text-ink"
                    aria-label="Clear search query"
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-line bg-canvas px-2 py-1 text-[10px] font-bold text-ink/45">
                    /
                  </kbd>
                )}
                <datalist id="product-search-suggestions">
                  {suggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </label>

              <label>
                <span className="sr-only">Filter by category</span>
                <select
                  className="input-field"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value)
                  }
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item === "All"
                        ? "All categories"
                        : item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="sr-only">Filter by stock</span>
                <select
                  className="input-field"
                  value={stockFilter}
                  onChange={(event) =>
                    setStockFilter(
                      event.target.value as StockFilter
                    )
                  }
                >
                  <option value="all">Any availability</option>
                  <option value="in-stock">In stock</option>
                  <option value="low-stock">Low stock</option>
                  <option value="out-of-stock">Out of stock</option>
                </select>
              </label>

              <label>
                <span className="sr-only">Sort products</span>
                <select
                  className="input-field"
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as ProductSort)
                  }
                >
                  <option value="relevance">Best match</option>
                  <option value="newest">Newest</option>
                  <option value="price-asc">
                    Price: low to high
                  </option>
                  <option value="price-desc">
                    Price: high to low
                  </option>
                  <option value="name">Name: A to Z</option>
                </select>
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {query.trim() &&
                  suggestions.slice(0, 4).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink/65 transition hover:border-forest/30 hover:text-forest"
                      onClick={() => setQuery(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
              </div>

              {activeFilterCount > 0 && (
                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-xs font-bold text-forest hover:underline"
                  onClick={clearSearch}
                >
                  <SlidersHorizontal size={14} />
                  Clear {activeFilterCount} active filter
                  {activeFilterCount === 1 ? "" : "s"}
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div
            className={`mt-8 grid gap-5 ${
              results.length === 1
                ? "max-w-xl"
                : results.length === 2
                  ? "max-w-5xl sm:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="card overflow-hidden">
                <div className="aspect-[4/3] animate-pulse bg-white/35" />
                <div className="space-y-3 p-4">
                  <div className="h-5 w-2/3 animate-pulse rounded bg-line" />
                  <div className="h-4 w-full animate-pulse rounded bg-line" />
                  <div className="h-7 w-1/3 animate-pulse rounded bg-line" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="card mt-8 px-6 py-14 text-center">
            <Search
              className="mx-auto text-ink/25"
              size={38}
            />
            <h3 className="mt-4 font-display text-xl font-bold">
              No matching products
            </h3>
            <p className="mt-2 text-sm text-ink/60">
              Check the spelling, use fewer words, or remove a filter.
            </p>
            {suggestions.length > 0 && (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold hover:text-forest"
                    onClick={() => setQuery(suggestion)}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              className="btn-secondary mt-5"
              onClick={clearSearch}
            >
              Clear search and filters
            </button>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {displayedResults.map(({ product }) => (
              <ProductCard key={product.id} product={product} featuredSupplier={featuredSuppliers[product.id]} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
