"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ClipboardList,
  Scale,
  ShoppingBasket,
  Truck,
} from "lucide-react";

export default function ShopSeoContent(): React.ReactElement {
  return (
    <section className="border-t border-line bg-white/65 py-16 sm:py-20">
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="eyebrow">Wholesale broiler buying guide</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-[#113d24] sm:text-5xl">
              Choose chicken products that fit your menu and order volume
            </h2>
            <p className="mt-5 text-base leading-8 text-ink/70">
              Commercial chicken buying starts with the number of portions you
              need, the product specification, your storage capacity and the
              date of service. Use the catalogue to compare current product
              descriptions, wholesale prices and stock before adding items to
              your cart.
            </p>
            <p className="mt-4 text-base leading-8 text-ink/70">
              For recurring supply, review previous consumption and allow for
              expected changes in bookings, covers or retail demand. A planned
              quantity helps reduce emergency purchases, avoid unnecessary
              waste and make delivery coordination easier.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Scale,
                title: "Match size and quantity",
                text: "Check the product description and estimate portions or resale units before ordering.",
              },
              {
                icon: ShoppingBasket,
                title: "Compare live availability",
                text: "Use the stock indicator to identify products currently available for purchase.",
              },
              {
                icon: ClipboardList,
                title: "Keep purchasing records",
                text: "Use order, invoice, receipt and payment details to support reconciliation and repeat buying.",
              },
              {
                icon: Truck,
                title: "Prepare for delivery",
                text: "Provide a reachable contact, accurate location and any access or timing instructions.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-line bg-[#f8faf7] p-6 shadow-sm"
              >
                <Icon size={24} className="text-forest" />
                <h3 className="mt-4 font-display text-lg font-bold text-[#113d24]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink/65">{text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-5 rounded-2xl border border-line bg-white p-6 shadow-sm md:grid-cols-3 sm:p-8">
          {[
            "Confirm the product specification and quantity required.",
            "Review the total price and payment method before submission.",
            "Keep the order reference for delivery and support follow-up.",
          ].map((item, index) => (
            <div key={item} className="flex items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-forest text-sm font-bold text-white">
                {index + 1}
              </span>
              <p className="text-sm font-semibold leading-6 text-ink/75">
                {item}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[#123f25] p-7 text-white sm:flex-row sm:items-center sm:p-9">
          <div>
            <h2 className="font-display text-2xl font-bold">
              Need an account for repeat wholesale orders?
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-white/70">
              Create a buyer account to manage orders and maintain a clearer
              purchasing history for your business.
            </p>
          </div>
          <Link
            href="/register"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-marigold px-6 py-3 text-sm font-bold text-ink"
          >
            <CheckCircle2 size={18} />
            Register as a buyer
          </Link>
        </div>
      </div>
    </section>
  );
}
