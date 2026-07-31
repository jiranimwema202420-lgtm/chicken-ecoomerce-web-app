"use client";

import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  LoaderCircle,
  MapPin,
  PackageCheck,
  Smartphone,
  UserRound,
  XCircle,
} from "lucide-react";
import { signInAnonymously } from "firebase/auth";

import PaymentMethodSelector, {
  type CheckoutPaymentMethod,
} from "@/components/checkout/PaymentMethodSelector";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import { useAuth } from "@/lib/auth-context";
import {
  auth,
  isFirebaseConfigured,
} from "@/lib/firebase";
import { useCartStore } from "@/store/cart-store";

type Step = "form" | "waiting" | "success" | "error";

interface OrderStatusResponse {
  status:
    | "pending_payment"
    | "paid"
    | "failed"
    | "cancelled"
    | "fulfilled";
  total: number;
  mpesaReceiptNumber: string | null;
  resultDescription: string | null;
}

interface MpesaCheckoutResponse {
  error?: string;
  total: number;
  customerMessage?: string;
  orderId: string;
  statusToken: string;
}

interface PayOnDeliveryResponse {
  error?: string;
  total: number;
  orderNumber?: string;
  message?: string;
}

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

export default function CheckoutPage(): React.ReactElement {
  const { lines, total, clear } = useCartStore();

  const {
    user,
    isGuest,
    loading: authLoading,
  } = useAuth();

  const [paymentMethod, setPaymentMethod] =
    useState<CheckoutPaymentMethod>("mpesa");

  const [phone, setPhone] = useState("");
  const [deliveryName, setDeliveryName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");

  // Honeypot field. Real customers should never complete this field.
  const [companyWebsite, setCompanyWebsite] = useState("");

  const [orderNumber, setOrderNumber] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [message, setMessage] = useState("");
  const [verifiedTotal, setVerifiedTotal] =
    useState<number | null>(null);

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    if (!deliveryName && user?.displayName) {
      setDeliveryName(user.displayName);
    }
  }, [deliveryName, user]);

  async function getCheckoutIdentity(): Promise<{
    idToken: string;
  }> {
    if (!isFirebaseConfigured) {
      throw new Error(
        "Firebase is not configured for checkout."
      );
    }

    const checkoutUser =
      auth.currentUser ??
      (await signInAnonymously(auth)).user;

    const idToken = await checkoutUser.getIdToken();

    return {
      idToken,
    };
  }

  async function pollOrder(
    orderId: string,
    statusToken: string
  ): Promise<void> {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      if (cancelledRef.current) {
        return;
      }

      await sleep(attempt === 0 ? 1_500 : 2_000);

      const response = await fetch(
        `/api/orders/${encodeURIComponent(
          orderId
        )}?token=${encodeURIComponent(statusToken)}`,
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          "The payment status could not be checked."
        );
      }

      const order =
        (await response.json()) as OrderStatusResponse;

      if (order.status === "paid") {
        clear();
        setVerifiedTotal(order.total);
        setStep("success");

        setMessage(
          order.mpesaReceiptNumber
            ? `Payment received. M-Pesa receipt: ${order.mpesaReceiptNumber}`
            : "Payment received successfully."
        );

        return;
      }

      if (
        order.status === "failed" ||
        order.status === "cancelled"
      ) {
        setStep("error");

        setMessage(
          order.resultDescription ||
            "The payment was not completed. You can try again."
        );

        return;
      }
    }

    setStep("error");

    setMessage(
      "The M-Pesa confirmation took too long. Check your phone or M-Pesa messages before trying again."
    );
  }

  async function handleCheckout(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    setStep("waiting");

    setMessage(
      paymentMethod === "mpesa"
        ? "Sending an M-Pesa prompt to your phone..."
        : "Reserving stock and placing your delivery order..."
    );

    try {
      const { idToken } = await getCheckoutIdentity();

      if (paymentMethod === "mpesa") {
        const response = await fetch(
          "/api/mpesa/stkpush",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              phone,
              companyWebsite,
              lines: lines.map((line) => ({
                productId: line.productId,
                quantity: line.quantity,
              })),
            }),
          }
        );

        const data =
          (await response.json()) as MpesaCheckoutResponse;

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Payment could not be started."
          );
        }

        setVerifiedTotal(Number(data.total));

        setMessage(
          data.customerMessage ||
            "Check your phone and enter your M-Pesa PIN to complete payment."
        );

        await pollOrder(
          data.orderId,
          data.statusToken
        );

        return;
      }

      const response = await fetch(
        "/api/orders/pay-on-delivery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            phone,
            deliveryName,
            deliveryAddress,
            deliveryNotes,
            companyWebsite,
            lines: lines.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
            })),
          }),
        }
      );

      const data =
        (await response.json()) as PayOnDeliveryResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "The pay-on-delivery order could not be placed."
        );
      }

      clear();
      setVerifiedTotal(Number(data.total));
      setOrderNumber(
        String(data.orderNumber ?? "")
      );
      setStep("success");

      setMessage(
        data.message ||
          "Your order has been placed. Pay when it arrives."
      );
    } catch (error) {
      if (cancelledRef.current) {
        return;
      }

      setStep("error");
      setMessage(getAuthErrorMessage(error));
    }
  }

  if (
    lines.length === 0 &&
    step === "form"
  ) {
    return (
      <div className="section-shell py-20 text-center">
        <div className="card mx-auto max-w-lg p-10">
          <h1 className="font-display text-2xl font-bold">
            Your cart is empty
          </h1>

          <p className="mt-2 text-sm text-ink/60">
            Add products before starting checkout.
          </p>

          <Link
            href="/#products"
            className="btn-primary mt-6"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  const displayedTotal =
    verifiedTotal ?? total();

  const payOnDelivery =
    paymentMethod === "pay_on_delivery";

  return (
    <div className="section-shell py-10 sm:py-14">
      <Link
        href="/cart"
        className="btn-ghost -ml-3 gap-2"
      >
        <ChevronLeft size={18} />
        Back to cart
      </Link>

      <div className="mx-auto mt-5 max-w-xl">
        <div className="text-center">
          <p className="eyebrow">
            Secure checkout
          </p>

          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            Choose how to pay
          </h1>

          <p className="mt-3 text-sm leading-6 text-ink/60">
            Your total and stock are verified from the
            live catalogue before an order is accepted.
          </p>
        </div>

        <div className="card mt-8 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-canvas/70 px-6 py-5">
            <span className="text-sm font-semibold text-ink/60">
              Order total
            </span>

            <span className="font-display text-2xl font-bold text-forest">
              KES{" "}
              {displayedTotal.toLocaleString(
                "en-KE"
              )}
            </span>
          </div>

          {step === "form" && (
            <form
              onSubmit={handleCheckout}
              className="relative space-y-5 p-6"
            >
              <div
                aria-hidden="true"
                className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
              >
                <label htmlFor="companyWebsite">
                  Company website
                </label>

                <input
                  id="companyWebsite"
                  name="companyWebsite"
                  type="text"
                  value={companyWebsite}
                  onChange={(event) =>
                    setCompanyWebsite(
                      event.target.value
                    )
                  }
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>

              <div className="rounded-md border border-line bg-canvas/60 p-4">
                <div className="flex items-start gap-3">
                  <UserRound
                    className="mt-0.5 text-forest"
                    size={19}
                  />

                  <div>
                    <p className="text-sm font-semibold">
                      {authLoading
                        ? "Checking your account..."
                        : user &&
                            !user.isAnonymous
                          ? `Ordering as ${
                              user.email ||
                              user.displayName ||
                              "customer"
                            }`
                          : user?.isAnonymous
                            ? "Continuing with your guest account"
                            : "Guest checkout is available"}
                    </p>

                    <p className="mt-1 text-xs leading-5 text-ink/50">
                      {user &&
                      !user.isAnonymous
                        ? "This order will appear in your account history."
                        : "A secure guest identity will be created so this order is not public."}
                    </p>

                    {!user &&
                      !authLoading && (
                        <Link
                          href="/login?next=/checkout"
                          className="mt-2 inline-block text-xs font-semibold text-forest hover:underline"
                        >
                          Sign in instead
                        </Link>
                      )}
                  </div>
                </div>
              </div>

              <PaymentMethodSelector
                value={paymentMethod}
                onChange={setPaymentMethod}
              />

              {payOnDelivery && (
                <div className="space-y-4 rounded-xl border border-line bg-canvas/45 p-4">
                  <div>
                    <label
                      htmlFor="delivery-name"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Recipient name
                    </label>

                    <input
                      id="delivery-name"
                      required
                      className="input-field"
                      autoComplete="name"
                      value={deliveryName}
                      onChange={(event) =>
                        setDeliveryName(
                          event.target.value
                        )
                      }
                      placeholder="Full name"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="delivery-address"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Delivery address
                    </label>

                    <div className="relative">
                      <MapPin
                        className="absolute left-3 top-3 text-ink/35"
                        size={18}
                      />

                      <textarea
                        id="delivery-address"
                        required
                        className="input-field min-h-24 pl-10"
                        autoComplete="street-address"
                        value={deliveryAddress}
                        onChange={(event) =>
                          setDeliveryAddress(
                            event.target.value
                          )
                        }
                        placeholder="Building, street, estate, town and county"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="delivery-notes"
                      className="mb-2 block text-sm font-semibold"
                    >
                      Delivery notes{" "}
                      <span className="font-normal text-ink/45">
                        (optional)
                      </span>
                    </label>

                    <input
                      id="delivery-notes"
                      className="input-field"
                      value={deliveryNotes}
                      onChange={(event) =>
                        setDeliveryNotes(
                          event.target.value
                        )
                      }
                      placeholder="Landmark, preferred time or instructions"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold"
                >
                  {payOnDelivery
                    ? "Delivery phone number"
                    : "M-Pesa phone number"}
                </label>

                <div className="relative">
                  <Smartphone
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35"
                    size={18}
                  />

                  <input
                    id="phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="07XXXXXXXX"
                    className="input-field pl-10"
                    value={phone}
                    onChange={(event) =>
                      setPhone(
                        event.target.value
                      )
                    }
                  />
                </div>

                <p className="mt-2 text-xs leading-5 text-ink/50">
                  Accepted formats include
                  07XXXXXXXX, 01XXXXXXXX, or
                  +254XXXXXXXXX.
                </p>
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
              >
                {payOnDelivery
                  ? "Place pay-on-delivery order"
                  : "Send M-Pesa prompt"}
              </button>
            </form>
          )}

          {step !== "form" && (
            <div className="p-8 text-center">
              {step === "waiting" && (
                <LoaderCircle
                  className="mx-auto animate-spin text-forest"
                  size={44}
                />
              )}

              {step === "success" &&
                (payOnDelivery ? (
                  <PackageCheck
                    className="mx-auto text-forest"
                    size={48}
                  />
                ) : (
                  <CheckCircle2
                    className="mx-auto text-forest"
                    size={48}
                  />
                ))}

              {step === "error" && (
                <XCircle
                  className="mx-auto text-red-600"
                  size={48}
                />
              )}

              <h2 className="mt-5 font-display text-xl font-bold">
                {step === "waiting"
                  ? payOnDelivery
                    ? "Placing your order"
                    : "Complete payment on your phone"
                  : step === "success"
                    ? payOnDelivery
                      ? "Delivery order confirmed"
                      : "Payment complete"
                    : "Checkout not completed"}
              </h2>

              {orderNumber && (
                <p className="mt-2 text-xs font-bold uppercase tracking-wider text-forest">
                  Order {orderNumber}
                </p>
              )}

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/60">
                {message}
              </p>

              {step === "error" && (
                <button
                  type="button"
                  className="btn-secondary mt-6"
                  onClick={() => {
                    setStep("form");
                    setMessage("");
                  }}
                >
                  Try again
                </button>
              )}

              {step === "success" && (
                <div className="mt-6 flex flex-col gap-3">
                  <Link
                    href="/"
                    className="btn-primary"
                  >
                    Continue shopping
                  </Link>

                  {user &&
                    !user.isAnonymous && (
                      <Link
                        href="/account"
                        className="btn-secondary"
                      >
                        View order history
                      </Link>
                    )}

                  {isGuest && (
                    <Link
                      href="/register"
                      className="btn-secondary"
                    >
                      Create account and keep this
                      order
                    </Link>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
