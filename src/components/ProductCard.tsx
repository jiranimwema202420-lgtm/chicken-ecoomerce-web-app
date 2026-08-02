"use client";

import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, Eye, Minus, Plus, ShoppingBag } from "lucide-react";
import { Product } from "@/lib/types";
import { useCartStore } from "@/store/cart-store";
import posthog from "posthog-js";

export default function ProductCard({ product, featuredSupplier }: { product: Product; featuredSupplier?: string }) {
  const cartLine = useCartStore((state) =>
    state.lines.find((line) => line.productId === product.id)
  );
  const addItem = useCartStore((state) => state.addItem);
  const removeItem = useCartStore((state) => state.removeItem);
  const setQuantity = useCartStore((state) => state.setQuantity);

  const soldOut = product.stock <= 0;
  const quantity = cartLine?.quantity ?? 0;
  const atStockLimit = quantity >= product.stock;
  const lowStock = product.stock > 0 && product.stock <= 5;

  function increaseQuantity() {
    if (soldOut || atStockLimit) return;

    addItem(product, 1);

    posthog.capture(
      quantity === 0 ? "product_added_to_cart" : "product_quantity_increased",
      {
        product_id: product.id,
        product_category: product.category,
        product_price: product.price,
        quantity: Math.min(product.stock, quantity + 1),
      }
    );
  }

  function decreaseQuantity() {
    if (quantity <= 0) return;

    if (quantity === 1) {
      removeItem(product.id);
    } else {
      setQuantity(product.id, quantity - 1);
    }

    posthog.capture("product_quantity_decreased", {
      product_id: product.id,
      product_category: product.category,
      product_price: product.price,
      quantity: Math.max(0, quantity - 1),
    });
  }

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-white/90 hover:shadow-[0_22px_56px_rgba(20,23,18,0.13)]">
      <Link
        href={`/product/${product.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-white/30"
      >
        <Image
          src={product.imageUrl || "/placeholder.svg"}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        <span className="glass-badge absolute left-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide">
          {featuredSupplier ? "Sponsored · Featured supplier" : product.category || "Product"}
        </span>

        {!soldOut && (
          <span
            className={`absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
              lowStock
                ? "bg-amber-50 text-amber-800"
                : "bg-emerald-50 text-emerald-800"
            }`}
          >
            <CheckCircle2 size={13} aria-hidden="true" />
            {lowStock ? `Only ${product.stock} left` : "In stock"}
          </span>
        )}

        {soldOut && (
          <span className="absolute inset-0 grid place-items-center bg-ink/45 text-sm font-bold uppercase tracking-[0.18em] text-white">
            Sold out
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <Link href={`/product/${product.id}`}>
          <h2 className="font-display text-lg font-bold leading-snug transition group-hover:text-forest">
            {product.name}
          </h2>
        </Link>

        <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/60">
          {product.description}
        </p>

        <div className="mt-auto pt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs text-ink/45">Price</p>
              <p className="font-display text-xl font-bold text-forest">
                KES {product.price.toLocaleString("en-KE")}
              </p>
            </div>

            {quantity > 0 ? (
            <div
              className="inline-flex h-11 items-center rounded-md border border-line bg-white p-1"
              aria-label={`${product.name} quantity controls`}
            >
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded transition hover:bg-canvas"
                aria-label={`Decrease ${product.name} quantity`}
                onClick={decreaseQuantity}
              >
                <Minus size={16} />
              </button>

              <span
                className="w-9 text-center text-sm font-bold"
                aria-live="polite"
                aria-label={`${quantity} in cart`}
              >
                {quantity}
              </span>

              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-35"
                aria-label={`Increase ${product.name} quantity`}
                disabled={soldOut || atStockLimit}
                onClick={increaseQuantity}
              >
                <Plus size={16} />
              </button>
            </div>
            ) : (
              <button
                type="button"
                className="btn-primary gap-2 px-4"
                disabled={soldOut}
                aria-label={`Add ${product.name} to cart`}
                onClick={increaseQuantity}
              >
                <ShoppingBag size={17} aria-hidden="true" />
                {soldOut ? "Unavailable" : "Add to cart"}
              </button>
            )}
          </div>

          <Link
            href={`/product/${product.id}`}
            className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-white/55 px-4 py-2.5 text-sm font-semibold text-ink/70 transition hover:border-forest/25 hover:bg-white hover:text-forest"
          >
            <Eye size={17} aria-hidden="true" />
            View product details
          </Link>
        </div>

        {!soldOut && quantity > 0 && (
          <p className="mt-2 text-right text-xs text-ink/45">
            {atStockLimit
              ? "Maximum available quantity reached"
              : `${product.stock - quantity} more available`}
          </p>
        )}
      </div>
    </article>
  );
}
