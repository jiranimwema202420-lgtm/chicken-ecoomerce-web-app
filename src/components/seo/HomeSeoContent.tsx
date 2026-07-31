import Link from "next/link";
import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  MapPin,
  Smartphone,
  Truck,
} from "lucide-react";

const buyerQuestions = [
  {
    question: "Who can order wholesale broiler chicken?",
    answer:
      "Duka Broilers is designed for commercial buyers such as hotels, restaurants, supermarkets, caterers, food vendors, schools, hospitals and other institutions. Buyers can review available products and place orders based on current stock.",
  },
  {
    question: "How are wholesale chicken prices displayed?",
    answer:
      "Current product prices are shown in Kenyan shillings on the shop and product pages. Confirm the product description, quantity and order total before completing checkout because availability and pricing can change when inventory is updated.",
  },
  {
    question: "Can business customers pay using M-Pesa?",
    answer:
      "M-Pesa checkout is available where shown during the ordering process. Pay on delivery may also be offered for eligible orders. The available payment options are displayed before an order is submitted.",
  },
  {
    question: "How do I confirm that broiler chicken is in stock?",
    answer:
      "The catalogue displays current availability received from the inventory system. For a large or time-sensitive order, confirm the required quantity early so fulfilment and delivery can be coordinated before your service date.",
  },
  {
    question: "Where does Duka Broilers deliver?",
    answer:
      "Delivery availability depends on the buyer location, order quantity and fulfilment schedule. Enter accurate delivery details during checkout and confirm any special access, timing or handling requirements before dispatch.",
  },
  {
    question: "What happens if there is an order or delivery concern?",
    answer:
      "Keep the order number, payment reference, delivery details and supporting information. Duka Broilers can use those records to review concerns involving quantity, quality, payment or fulfilment and document the agreed resolution.",
  },
];

export default function HomeSeoContent(): React.ReactElement {
  return (
    <>
      <section className="border-y border-line bg-white/70 py-16 sm:py-20">
        <div className="section-shell">
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <div>
              <p className="eyebrow">Wholesale chicken supply in Kenya</p>
              <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold leading-tight text-[#113d24] sm:text-5xl">
                Plan dependable broiler chicken orders for your business
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-ink/70">
                Duka Broilers helps commercial kitchens and food retailers
                compare available broiler products, review prices in Kenyan
                shillings and place structured bulk orders. The platform is
                built for buyers who need clearer stock information, payment
                records and fulfilment details before committing to a purchase.
              </p>
              <p className="mt-4 max-w-3xl text-base leading-8 text-ink/70">
                Before ordering, confirm the product specification, required
                quantity, delivery location and date the chicken is needed.
                Early planning is especially important for hotels, restaurants,
                caterers, supermarkets and institutions preparing recurring or
                high-volume meals.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="btn-primary min-h-12">
                  View wholesale chicken stock
                </Link>
                <Link href="/register" className="btn-secondary min-h-12">
                  Create a business buyer account
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {[
                {
                  icon: Building2,
                  title: "Built for commercial demand",
                  text: "Order for restaurants, hotels, supermarkets, caterers, vendors and institutional kitchens.",
                },
                {
                  icon: ClipboardCheck,
                  title: "Plan quantities before checkout",
                  text: "Match stock, portions, menu demand and service dates before submitting a bulk order.",
                },
                {
                  icon: Smartphone,
                  title: "Clear Kenyan payment options",
                  text: "Review the final amount and use the payment method presented during checkout, including M-Pesa where available.",
                },
                {
                  icon: Truck,
                  title: "Coordinate fulfilment details",
                  text: "Provide an accurate location, contact person and timing information so delivery arrangements can be confirmed.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-line bg-[#f8faf7] p-6 shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest/10 text-forest">
                      <Icon size={22} />
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

          <div className="mt-12 rounded-2xl border border-forest/15 bg-forest/5 p-6 sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-forest text-white">
                <MapPin size={23} />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-[#113d24]">
                  Delivery coverage and order timing
                </h3>
                <p className="mt-2 max-w-4xl text-sm leading-7 text-ink/70 sm:text-base">
                  Duka Broilers serves buyers in Kenya subject to confirmed
                  delivery coverage, stock and scheduling. Large orders,
                  recurring supply and deliveries with restricted access should
                  be discussed early. Accurate contact and destination details
                  help reduce delays and make fulfilment expectations clearer.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Wholesale broiler ordering questions</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-[#113d24] sm:text-5xl">
            Frequently asked questions from commercial buyers
          </h2>
          <p className="mt-4 text-base leading-8 text-ink/65">
            Review these practical answers before placing a fresh chicken order
            for your kitchen, outlet, retail branch or institution.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-5xl gap-4">
          {buyerQuestions.map(({ question, answer }) => (
            <details
              key={question}
              className="group rounded-2xl border border-line bg-white p-5 shadow-sm open:border-forest/25 open:shadow-md sm:p-6"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-bold text-[#113d24]">
                {question}
                <BadgeCheck
                  size={20}
                  className="shrink-0 text-forest transition group-open:scale-110"
                />
              </summary>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-ink/70 sm:text-base">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
