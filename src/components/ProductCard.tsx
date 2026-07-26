"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShoppingBag } from "lucide-react";
import { Product } from "@/lib/types";
import { useCartStore } from "@/store/cart-store";
import posthog from "posthog-js";

export default function ProductCard({ product }: { product: Product }) {
  const addItem = useCartStore((state) => state.addItem);
  const soldOut = product.stock <= 0;

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
          {product.category || "Featured"}
        </span>

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

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xs text-ink/45">Price</p>
            <p className="font-display text-xl font-bold text-forest">
              KES {product.price.toLocaleString("en-KE")}
            </p>
          </div>

          <button
            type="button"
            className="grid h-11 w-11 place-items-center rounded-md bg-forest text-white transition hover:bg-forest-light disabled:cursor-not-allowed disabled:bg-ink/20"
            disabled={soldOut}
            aria-label={`Add ${product.name} to cart`}
            onClick={() => {
              addItem(product);
              posthog.capture("product_added_to_cart", {
                product_id: product.id,
                product_category: product.category,
                product_price: product.price,
              });
            }}
          >
            {soldOut ? <ArrowRight size={18} /> : <ShoppingBag size={18} />}
          </button>
        </div>
      </div>
    </article>
  );
}
