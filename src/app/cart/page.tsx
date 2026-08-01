"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Minus, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useCartStore } from "@/store/cart-store";
import posthog from "posthog-js";

export default function CartPage() {
  const { lines, removeItem, setQuantity, total } = useCartStore();
  const router = useRouter();

  if (lines.length === 0) {
    return (
      <div className="section-shell py-20 text-center">
        <div className="card mx-auto max-w-xl px-6 py-14">
          <h1 className="font-display text-3xl font-bold">Your cart is empty</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">
            Browse the collection and add products before checking out.
          </p>
          <Link href="/shop#products" className="btn-primary mt-6 gap-2">
            <ArrowLeft size={17} /> Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  const cartTotal = total();

  return (
    <div className="section-shell py-10 sm:py-14">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Your selection</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Shopping cart</h1>
        </div>
        <Link href="/shop#products" className="btn-ghost -ml-3 gap-2 sm:ml-0">
          <ArrowLeft size={17} /> Keep shopping
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="card overflow-hidden">
          <div className="divide-y divide-line">
            {lines.map((line) => (
              <article key={line.productId} className="grid gap-4 p-4 sm:grid-cols-[88px_1fr_auto] sm:items-center sm:p-5">
                <div className="relative h-24 w-24 overflow-hidden rounded-lg bg-line sm:h-[88px] sm:w-[88px]">
                  <Image
                    src={line.imageUrl || "/placeholder.svg"}
                    alt={line.name}
                    fill
                    className="object-cover"
                    sizes="88px"
                  />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">{line.name}</h2>
                  <p className="mt-1 text-sm text-ink/55">KES {line.price.toLocaleString("en-KE")} each</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700"
                    onClick={() => {
                      posthog.capture("cart_item_removed", {
                        product_id: line.productId,
                        product_price: line.price,
                        quantity: line.quantity,
                      });
                      removeItem(line.productId);
                    }}
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end">
                  <div className="inline-flex h-11 items-center rounded-md border border-line bg-white p-1">
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded hover:bg-canvas"
                      aria-label={`Decrease ${line.name} quantity`}
                      onClick={() => setQuantity(line.productId, line.quantity - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={line.maxQuantity}
                      value={line.quantity}
                      aria-label={`${line.name} quantity`}
                      onChange={(event) => setQuantity(line.productId, Number(event.target.value))}
                      className="w-10 border-0 bg-transparent text-center text-sm font-bold outline-none"
                    />
                    <button
                      type="button"
                      className="grid h-9 w-9 place-items-center rounded hover:bg-canvas disabled:opacity-35"
                      aria-label={`Increase ${line.name} quantity`}
                      disabled={Boolean(line.maxQuantity && line.quantity >= line.maxQuantity)}
                      onClick={() => setQuantity(line.productId, line.quantity + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <p className="font-display text-lg font-bold text-forest">
                    KES {(line.price * line.quantity).toLocaleString("en-KE")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="card h-fit p-6 lg:sticky lg:top-24">
          <h2 className="font-display text-xl font-bold">Order summary</h2>
          <div className="mt-5 space-y-3 border-b border-line pb-5 text-sm">
            <div className="flex justify-between gap-4 text-ink/60">
              <span>Items</span>
              <span>{lines.reduce((sum, line) => sum + line.quantity, 0)}</span>
            </div>
            <div className="flex justify-between gap-4 text-ink/60">
              <span>Subtotal</span>
              <span>KES {cartTotal.toLocaleString("en-KE")}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4 py-5">
            <span className="font-display text-lg font-bold">Total</span>
            <span className="font-display text-2xl font-bold text-forest">KES {cartTotal.toLocaleString("en-KE")}</span>
          </div>
          <button
            className="btn-primary w-full"
            onClick={() => {
              posthog.capture("checkout_started", {
                item_count: lines.reduce((sum, line) => sum + line.quantity, 0),
                cart_total: cartTotal,
              });
              router.push("/checkout");
            }}
          >
            Proceed to checkout
          </button>
          <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/50">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-forest" />
            Product prices and stock are verified securely before the M-Pesa prompt is sent.
          </p>
        </aside>
      </div>
    </div>
  );
}
