"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import { useProduct } from "@/lib/useProducts";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cart-store";

export default function ProductDetailsClient({
  initialProduct,
}: {
  initialProduct: Product;
}): React.ReactElement {
  const router = useRouter();
  const {
    product: liveProduct,
    syncedAt,
  } = useProduct(initialProduct.id);
  const product = syncedAt === null ? initialProduct : liveProduct;
  const [quantity, setQuantity] = useState(1);
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    if (!product || product.stock <= 0) {
      setQuantity(1);
      return;
    }

    setQuantity((current) =>
      Math.min(product.stock, Math.max(1, current)),
    );
  }, [product]);

  if (!product || !product.active) {
    return (
      <div className="section-shell py-16 text-center">
        <h1 className="font-display text-2xl font-bold">
          Product unavailable
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          This product is no longer available.
        </p>
        <Link href="/shop" className="btn-primary mt-6">
          Back to shop
        </Link>
      </div>
    );
  }

  const soldOut = product.stock <= 0;

  return (
    <div className="section-shell py-8 sm:py-12">
      <Link
        href="/shop"
        className="btn-ghost -ml-3 gap-2"
      >
        <ArrowLeft size={17} />
        Back to products
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-2 lg:gap-14">
        <div className="relative aspect-square overflow-hidden rounded-[24px] border border-line bg-line shadow-sm">
          <Image
            src={product.imageUrl || "/placeholder.svg"}
            alt={product.name}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        </div>

        <div className="flex flex-col justify-center">
          <p className="eyebrow">
            {product.category || "Duka collection"}
          </p>

          <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
            {product.name}
          </h1>

          <p className="mt-4 font-display text-3xl font-bold text-forest">
            KES {product.price.toLocaleString("en-KE")}
          </p>

          <p className="mt-6 max-w-xl text-base leading-7 text-ink/70">
            {product.description}
          </p>

          <div className="mt-7 flex items-center gap-3">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                soldOut ? "bg-red-500" : "bg-forest"
              }`}
            />
            <p className="text-sm font-semibold">
              {soldOut
                ? "Currently out of stock"
                : `${product.stock} available now`}
            </p>
          </div>

          {!soldOut && (
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <div className="inline-flex h-12 items-center rounded-md border border-line bg-white p-1">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded hover:bg-canvas"
                  aria-label="Decrease quantity"
                  onClick={() =>
                    setQuantity((current) => Math.max(1, current - 1))
                  }
                >
                  <Minus size={17} />
                </button>

                <span className="w-10 text-center text-sm font-bold">
                  {quantity}
                </span>

                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center rounded hover:bg-canvas disabled:opacity-40"
                  aria-label="Increase quantity"
                  disabled={quantity >= product.stock}
                  onClick={() =>
                    setQuantity((current) =>
                      Math.min(product.stock, current + 1),
                    )
                  }
                >
                  <Plus size={17} />
                </button>
              </div>

              <button
                type="button"
                className="btn-primary min-h-12 flex-1 gap-2"
                onClick={() => {
                  addItem(product, quantity);
                  router.push("/cart");
                }}
              >
                <ShoppingBag size={18} />
                Add to cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
