import Link from "next/link";
import {
  ClipboardCheck,
  MapPin,
  ReceiptText,
  ShoppingBasket,
} from "lucide-react";

import type { Product } from "@/lib/types";

type ProductBuyingGuideProps = {
  product: Product;
};

export default function ProductBuyingGuide({
  product,
}: ProductBuyingGuideProps): React.ReactElement {
  const category = product.category.trim() || "broiler chicken";

  return (
    <section className="border-t border-line bg-white/65 py-14 sm:py-20">
      <div className="section-shell">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div>
            <p className="eyebrow">Commercial buyer information</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-[#113d24] sm:text-4xl">
              Buying {product.name} for your business
            </h2>
            <p className="mt-5 text-base leading-8 text-ink/70">
              {product.name} is listed in the {category} category for buyers
              comparing wholesale chicken products in Kenya. Review the product
              description, current price and available stock together before
              choosing a quantity for your restaurant, hotel, retail outlet,
              catering operation or institutional kitchen.
            </p>
            <p className="mt-4 text-base leading-8 text-ink/70">
              Estimate the portions or resale units required, allow for your
              expected demand and confirm that you have suitable receiving and
              storage arrangements. For a large or time-sensitive purchase,
              place the order early enough for stock and delivery details to be
              confirmed.
            </p>
            <Link href="/shop" className="btn-secondary mt-7 min-h-12">
              Compare other wholesale products
            </Link>
          </div>

          <div className="grid gap-4">
            {[
              {
                icon: ShoppingBasket,
                title: "Plan the order quantity",
                text: "Match the number of units to menu demand, bookings, branch requirements or expected retail sales.",
              },
              {
                icon: MapPin,
                title: "Confirm delivery information",
                text: "Use an accurate destination, reachable contact person and clear timing or access instructions.",
              },
              {
                icon: ReceiptText,
                title: "Keep the transaction record",
                text: "Retain the order number, payment reference, invoice or receipt for reconciliation and support.",
              },
              {
                icon: ClipboardCheck,
                title: "Check the order on receipt",
                text: "Confirm the delivered quantity and product details promptly, then report any concern with supporting information.",
              },
            ].map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-line bg-[#f8faf7] p-5 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-[#113d24]">
                      {title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-ink/65">
                      {text}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
