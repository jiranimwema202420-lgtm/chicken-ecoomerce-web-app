import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Handshake,
  HeartPulse,
  Hotel,
  MessageCircle,
  PackageCheck,
  Phone,
  Scale,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  Utensils,
  UsersRound,
} from "lucide-react";

import OrganizationJsonLd from "@/components/seo/OrganizationJsonLd";

export const metadata: Metadata = {
  title: "Wholesale Broiler Chickens in Kenya",
  description:
    "Order fresh broiler chickens at wholesale prices for hotels, restaurants, supermarkets, street vendors, hospitals, schools and institutions across Kenya.",
  keywords: [
    "broiler chickens Kenya",
    "wholesale chicken Kenya",
    "fresh chicken supplier",
    "hotel chicken supplier",
    "restaurant chicken supplier",
    "supermarket chicken supplier",
    "institutional poultry supplier",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    title: "Duka Broilers | Wholesale Fresh Chicken",
    description:
      "Fresh broiler chickens at wholesale prices for businesses and institutions across Kenya.",
    type: "website",
    images: [
      {
        url: "/images/duka-broilers-hero.png",
        width: 1536,
        height: 1024,
        alt: "Fresh broiler chickens supplied by Duka Broilers",
      },
    ],
  },
};

const buyerSegments = [
  {
    icon: Hotel,
    title: "Hotels",
    text: "Reliable bulk supply for breakfast, buffet and banquet operations.",
  },
  {
    icon: Utensils,
    title: "Restaurants",
    text: "Consistent sizes and dependable delivery for daily kitchen demand.",
  },
  {
    icon: ShoppingBasket,
    title: "Supermarkets",
    text: "Wholesale poultry supply for retail shelves, butcheries and branches.",
  },
  {
    icon: Store,
    title: "Street vendors",
    text: "Competitive bulk prices that help vendors protect their margins.",
  },
  {
    icon: Building2,
    title: "Institutions",
    text: "Structured ordering for schools, colleges, caterers and organisations.",
  },
  {
    icon: HeartPulse,
    title: "Hospitals",
    text: "Dependable supply for kitchens that require planned meal preparation.",
  },
];

const serviceStandards = [
  {
    icon: PackageCheck,
    title: "Clear before you order",
    text: "See product details, live availability and pricing before adding stock to your cart.",
  },
  {
    icon: ClipboardCheck,
    title: "Recorded after checkout",
    text: "Keep an order trail with payment references, fulfilment status, invoices and receipts.",
  },
  {
    icon: ShieldCheck,
    title: "Supported when issues arise",
    text: "Use the order record to report and resolve quantity, quality, delivery or payment concerns.",
  },
];

const resolutionSteps = [
  {
    icon: MessageCircle,
    number: "01",
    title: "Raise the issue",
    text: "Share the order number, concern and supporting details through the support channel.",
  },
  {
    icon: ClipboardCheck,
    number: "02",
    title: "Review",
    text: "The order, delivery, payment and communication records are reviewed.",
  },
  {
    icon: Handshake,
    number: "03",
    title: "Resolution",
    text: "A practical remedy is agreed, such as correction, replacement, refund or follow-up.",
  },
  {
    icon: CheckCircle2,
    number: "04",
    title: "Close and follow up",
    text: "The outcome is recorded and the customer is contacted to confirm closure.",
  },
];

export default function LandingPage() {
  const supportPhone = process.env.NEXT_PUBLIC_STORE_PHONE?.trim();
  const supportEmail = process.env.NEXT_PUBLIC_STORE_EMAIL?.trim();
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");

  return (
    <div className="overflow-hidden bg-[#f8faf7] text-ink">
      <OrganizationJsonLd />

      <section className="relative overflow-hidden border-b border-[#173d2a] bg-[#071d13] text-white">
        <div aria-hidden="true" className="absolute inset-0 opacity-70" style={{backgroundImage:"radial-gradient(circle at 8% 12%, rgba(226,167,62,0.18), transparent 24rem), radial-gradient(circle at 88% 82%, rgba(22,107,78,0.28), transparent 28rem)"}} />
        <div className="section-shell relative py-8 sm:py-10 lg:py-14">
          <div className="grid min-h-[640px] overflow-hidden rounded-[28px] border border-white/10 bg-[#0b2b1d] shadow-[0_32px_90px_rgba(0,0,0,0.34)] lg:grid-cols-[0.92fr_1.08fr]">
            <div className="relative z-10 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#f2a317]/35 bg-[#f2a317]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#ffd47c]">
                <PackageCheck size={16} />
                Wholesale poultry supply
              </div>
              <h1 className="mt-7 max-w-2xl font-display text-4xl font-bold leading-[1.02] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">
                Fresh broiler chickens for <span className="text-[#f2a317]">serious food businesses.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-white/72 sm:text-lg">
                Wholesale supply for hotels, restaurants, supermarkets, street vendors, hospitals and institutions across Kenya. Order with clear pricing, visible stock and dependable fulfilment.
              </p>
              <div className="mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                {[["Bulk","pricing"],["Fresh","stock"],["M-Pesa","checkout"],["POD","available"]].map(([value,label])=>(
                  <div key={value} className="rounded-xl border border-white/10 bg-white/[0.055] px-4 py-3">
                    <p className="font-display text-lg font-bold text-white">{value}</p>
                    <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/48">{label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link href="/shop" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg bg-[#f2a317] px-7 py-4 text-sm font-bold text-[#102d1e] shadow-[0_14px_30px_rgba(242,163,23,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffb323]">
                  Browse wholesale stock <ArrowRight size={18} />
                </Link>
                <Link href="/register" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-lg border border-white/18 bg-white/[0.06] px-7 py-4 text-sm font-bold text-white transition hover:border-white/30 hover:bg-white/[0.10]">
                  <UsersRound size={18} /> Open buyer account
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-white/62">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#f2a317]" />Transparent order records</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={16} className="text-[#f2a317]" />Conflict-resolution support</span>
              </div>
            </div>
            <div className="relative min-h-[390px] overflow-hidden lg:min-h-full">
              <Image src="/images/duka-broilers-hero.jpg" alt="Healthy white broiler chickens ready for wholesale supply" fill priority className="object-cover object-center" sizes="(min-width: 1024px) 54vw, 100vw" />
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/15 bg-black/45 p-5 text-white shadow-xl backdrop-blur-md sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-sm">
                <div className="flex items-start gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2a317] text-[#102d1e]"><Truck size={23} /></span>
                  <div>
                    <p className="font-display text-lg font-bold">Built for recurring bulk orders</p>
                    <p className="mt-1 text-sm leading-6 text-white/70">Keep kitchens, outlets and supermarket branches supplied with a clearer ordering workflow.</p>
                  </div>
                </div>
              </div>
              <div className="absolute right-5 top-5 rounded-full border border-white/20 bg-[#0b2b1d]/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-white backdrop-blur-md sm:right-7 sm:top-7">Kenya wholesale supply</div>
            </div>
          </div>
        </div>
      </section>

      <section id="buyers" className="section-shell py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Built for commercial buyers</p>
          <h2 className="mt-3 font-display text-3xl font-bold text-[#113d24] sm:text-5xl">
            Poultry supply that fits your operation
          </h2>
          <p className="mt-4 text-sm leading-7 text-ink/60 sm:text-base">
            Whether you buy for one kitchen or multiple branches, Duka
            Broilers gives you a practical way to order, pay, track and
            resolve supply concerns.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buyerSegments.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-forest/10 text-forest">
                <Icon size={23} />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-ink/60">{text}</p>
            </article>
          ))}
        </div>
      </section>


      <section className="duka-benefits-section border-y border-line py-16 sm:py-20">
        <div className="section-shell">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <p className="eyebrow">Why Duka Broilers</p>

              <h2 className="mt-3 max-w-xl font-display text-3xl font-bold leading-tight sm:text-5xl">
                Better control over every wholesale order
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 sm:text-base">
                Duka Broilers brings product availability, customer ordering,
                payments, invoices, receipts and delivery records into one
                clear purchasing workflow.
              </p>

              <div className="mt-7 space-y-3">
                {[
                  "Know what is in stock before placing an order",
                  "Track purchases, payments and delivery status",
                  "Access invoices, receipts and order history",
                  "Resolve quantity, quality or payment concerns transparently",
                ].map((item) => (
                  <div key={item} className="benefits-check-row">
                    <CheckCircle2 size={18} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/shop"
                className="mt-8 inline-flex items-center gap-2 rounded-lg bg-forest px-5 py-3 text-sm font-bold text-white transition hover:bg-forest-light"
              >
                View current products
                <ArrowRight size={17} />
              </Link>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {[
                {
                  icon: BadgeCheck,
                  title: "Consistent quality",
                  description:
                    "Broilers are selected and prepared to support reliable portioning, menu planning and repeat purchasing.",
                  bullets: [
                    "Commercial kitchen suitability",
                    "Clear product information",
                    "Better consistency across orders",
                  ],
                },
                {
                  icon: Scale,
                  title: "Wholesale savings",
                  description:
                    "Bulk pricing helps restaurants, hotels, supermarkets and institutions manage food costs more effectively.",
                  bullets: [
                    "Volume-based buying",
                    "Improved cost control",
                    "Better margin planning",
                  ],
                },
                {
                  icon: Truck,
                  title: "Reliable fulfilment",
                  description:
                    "Stock visibility, order status and delivery coordination help buyers avoid last-minute supply disruption.",
                  bullets: [
                    "Visible stock availability",
                    "Order status tracking",
                    "Delivery coordination",
                  ],
                },
                {
                  icon: ShieldCheck,
                  title: "Transparent records",
                  description:
                    "Every purchase can be supported by structured order records, payment references, invoices and receipts.",
                  bullets: [
                    "Invoices and receipts",
                    "Payment and order history",
                    "Clear dispute documentation",
                  ],
                },
              ].map(({ icon: Icon, title, description, bullets }) => (
                <article key={title} className="benefit-card">
                  <div className="benefit-card-icon">
                    <Icon size={24} />
                  </div>

                  <h3 className="mt-5 font-display text-xl font-bold">
                    {title}
                  </h3>

                  <p className="mt-3 text-sm leading-7">
                    {description}
                  </p>

                  <ul className="mt-5 space-y-3">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="benefit-card-bullet">
                        <CheckCircle2 size={15} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="service-standards" className="section-shell py-16 sm:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Service standards</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-[#113d24] sm:text-5xl">
              What buyers can expect
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-7 text-ink/60">
            The ordering experience is designed around clear information,
            traceable records and practical support—not unverified claims.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {serviceStandards.map(({ icon: Icon, title, text }) => (
            <article
              key={title}
              className="rounded-2xl border border-line bg-white p-7 shadow-sm"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-forest/10 text-forest">
                <Icon size={23} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-xl font-bold text-[#113d24]">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-ink/65">{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="resolution"
        className="border-y border-[#124c2a]/10 bg-[#123f25] py-16 text-white sm:py-20"
      >
        <div className="section-shell">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#f2a317]">
              Fair and transparent support
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold sm:text-5xl">
              A clear conflict-resolution mechanism
            </h2>
            <p className="mt-5 text-sm leading-7 text-white/70 sm:text-base">
              Concerns involving product quality, quantity, delivery,
              invoices or payments should follow a documented review
              process with a recorded outcome.
            </p>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {resolutionSteps.map(
              ({ icon: Icon, number, title, text }) => (
                <article
                  key={number}
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#f2a317] text-[#123f25]">
                      <Icon size={22} />
                    </span>
                    <span className="font-display text-2xl font-bold text-white/20">
                      {number}
                    </span>
                  </div>
                  <h3 className="mt-5 font-display text-xl font-bold">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    {text}
                  </p>
                </article>
              )
            )}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {supportEmail ? (
              <a
                href={`mailto:${supportEmail}?subject=Duka%20Broilers%20Order%20Concern`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#f2a317] px-6 py-3 text-sm font-bold text-[#123f25] transition hover:bg-[#ffb31a]"
              >
                <MessageCircle size={18} /> Report an issue
              </a>
            ) : (
              <Link
                href="/login?next=/account"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#f2a317] px-6 py-3 text-sm font-bold text-[#123f25] transition hover:bg-[#ffb31a]"
              >
                <MessageCircle size={18} /> Open customer support
              </Link>
            )}

            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                <Phone size={18} /> WhatsApp support
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="section-shell py-16 sm:py-20">
        <div className="overflow-hidden rounded-[28px] bg-gradient-to-br from-[#f2a317] to-[#dd7900] px-7 py-10 text-[#143d24] shadow-xl sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em]">
              Ready to order?
            </p>
            <h2 className="mt-3 max-w-3xl font-display text-3xl font-bold sm:text-5xl">
              Get wholesale broiler supply for your business.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#143d24]/75">
              Browse live products, create a buyer account and choose
              M-Pesa or pay on delivery where available.
            </p>
          </div>

          <div className="mt-7 flex shrink-0 flex-col gap-3 sm:flex-row lg:mt-0">
            <Link
              href="/shop"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#123f25] px-6 py-3 text-sm font-bold text-white"
            >
              Shop products
              <ArrowRight size={17} />
            </Link>
            {supportPhone ? (
              <a
                href={`tel:${supportPhone.replace(/\s/g, "")}`}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#123f25]/25 bg-white/25 px-6 py-3 text-sm font-bold"
              >
                <Phone size={17} /> {supportPhone}
              </a>
            ) : (
              <Link
                href="/register"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#123f25]/25 bg-white/25 px-6 py-3 text-sm font-bold"
              >
                <UsersRound size={17} /> Open buyer account
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
