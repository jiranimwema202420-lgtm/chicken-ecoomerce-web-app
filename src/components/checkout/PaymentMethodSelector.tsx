"use client";

import {
  Banknote,
  CheckCircle2,
  Smartphone,
  Truck,
} from "lucide-react";

export type CheckoutPaymentMethod =
  | "mpesa"
  | "pay_on_delivery";

interface PaymentMethodSelectorProps {
  value: CheckoutPaymentMethod;
  onChange: (method: CheckoutPaymentMethod) => void;
  disabled?: boolean;
}

const methods: Array<{
  value: CheckoutPaymentMethod;
  title: string;
  description: string;
  badge: string;
  icon: typeof Smartphone;
}> = [
  {
    value: "mpesa",
    title: "Pay now with M-Pesa",
    description:
      "Receive an STK prompt and confirm payment securely on your phone.",
    badge: "Immediate payment",
    icon: Smartphone,
  },
  {
    value: "pay_on_delivery",
    title: "Pay when products arrive",
    description:
      "Place the order now and pay the delivery representative after receiving the products.",
    badge: "Pay on arrival",
    icon: Truck,
  },
];

export default function PaymentMethodSelector({
  value,
  onChange,
  disabled = false,
}: PaymentMethodSelectorProps) {
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-3 text-sm font-semibold">
        Choose payment method
      </legend>

      <div className="grid gap-3">
        {methods.map((method) => {
          const selected = value === method.value;
          const Icon = method.icon;

          return (
            <label
              key={method.value}
              className={`relative cursor-pointer rounded-xl border p-4 transition ${
                selected
                  ? "border-forest bg-forest/5 shadow-sm"
                  : "border-line bg-white/60 hover:border-forest/35"
              } ${disabled ? "cursor-not-allowed opacity-65" : ""}`}
            >
              <input
                type="radio"
                name="payment-method"
                value={method.value}
                checked={selected}
                onChange={() => onChange(method.value)}
                className="sr-only"
              />

              <div className="flex items-start gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${
                    selected
                      ? "bg-forest text-white"
                      : "bg-canvas text-forest"
                  }`}
                >
                  <Icon size={20} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{method.title}</p>
                    <span className="rounded-full bg-marigold/15 px-2 py-1 text-[11px] font-bold text-marigold-dark">
                      {method.badge}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-ink/55">
                    {method.description}
                  </p>
                </div>

                {selected ? (
                  <CheckCircle2
                    size={20}
                    className="shrink-0 text-forest"
                  />
                ) : (
                  <span className="h-5 w-5 shrink-0 rounded-full border-2 border-line" />
                )}
              </div>
            </label>
          );
        })}
      </div>

      {value === "pay_on_delivery" && (
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <Banknote size={18} className="mt-0.5 shrink-0" />
          <p className="text-xs leading-5">
            Stock is reserved when the order is placed. Payment is due
            in full on delivery. Repeated refused deliveries may make
            this option unavailable for an account.
          </p>
        </div>
      )}
    </fieldset>
  );
}