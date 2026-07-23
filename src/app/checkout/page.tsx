"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronLeft, LoaderCircle, Smartphone, UserRound, XCircle } from "lucide-react";
import { signInAnonymously } from "firebase/auth";
import { useCartStore } from "@/store/cart-store";
import { useAuth } from "@/lib/auth-context";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { getAuthErrorMessage } from "@/lib/auth-errors";

type Step = "form" | "waiting" | "success" | "error";

interface OrderStatusResponse {
  status: "pending_payment" | "paid" | "failed" | "cancelled" | "fulfilled";
  total: number;
  mpesaReceiptNumber: string | null;
  resultDescription: string | null;
}

const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export default function CheckoutPage() {
  const { lines, total, clear } = useCartStore();
  const { user, isGuest, loading: authLoading } = useAuth();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [message, setMessage] = useState("");
  const [verifiedTotal, setVerifiedTotal] = useState<number | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  async function pollOrder(orderId: string, statusToken: string) {
    for (let attempt = 0; attempt < 45; attempt += 1) {
      if (cancelledRef.current) return;
      await sleep(attempt === 0 ? 1_500 : 2_000);

      const response = await fetch(
        `/api/orders/${encodeURIComponent(orderId)}?token=${encodeURIComponent(statusToken)}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error("The payment status could not be checked.");
      }

      const order = (await response.json()) as OrderStatusResponse;
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

      if (order.status === "failed" || order.status === "cancelled") {
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

  async function handlePay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStep("waiting");
    setMessage("Sending an M-Pesa prompt to your phone…");

    try {
      if (!isFirebaseConfigured) {
        throw new Error("Firebase is not configured for checkout.");
      }

      const checkoutUser =
        auth.currentUser ?? (await signInAnonymously(auth)).user;
      const idToken = await checkoutUser.getIdToken();

      const response = await fetch("/api/mpesa/stkpush", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          phone,
          lines: lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
          })),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Payment could not be started.");
      }

      setVerifiedTotal(Number(data.total));
      setMessage(
        data.customerMessage ||
          "Check your phone and enter your M-Pesa PIN to complete payment."
      );
      await pollOrder(data.orderId, data.statusToken);
    } catch (error) {
      if (cancelledRef.current) return;
      setStep("error");
      setMessage(getAuthErrorMessage(error));
    }
  }

  if (lines.length === 0 && step === "form") {
    return (
      <div className="section-shell py-20 text-center">
        <div className="card mx-auto max-w-lg p-10">
          <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-ink/60">Add products before starting checkout.</p>
          <Link href="/#products" className="btn-primary mt-6">Browse products</Link>
        </div>
      </div>
    );
  }

  const displayedTotal = verifiedTotal ?? total();

  return (
    <div className="section-shell py-10 sm:py-14">
      <Link href="/cart" className="btn-ghost -ml-3 gap-2">
        <ChevronLeft size={18} /> Back to cart
      </Link>

      <div className="mx-auto mt-5 max-w-lg">
        <div className="text-center">
          <p className="eyebrow">Secure payment</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Checkout with M-Pesa</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">
            Your final total is recalculated from live product prices before the prompt is sent.
          </p>
        </div>

        <div className="card mt-8 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-line bg-canvas/70 px-6 py-5">
            <span className="text-sm font-semibold text-ink/60">Amount due</span>
            <span className="font-display text-2xl font-bold text-forest">
              KES {displayedTotal.toLocaleString("en-KE")}
            </span>
          </div>

          {step === "form" && (
            <form onSubmit={handlePay} className="space-y-5 p-6">
              <div className="rounded-md border border-line bg-canvas/60 p-4">
                <div className="flex items-start gap-3">
                  <UserRound className="mt-0.5 text-forest" size={19} />
                  <div>
                    <p className="text-sm font-semibold">
                      {authLoading
                        ? "Checking your account…"
                        : user && !user.isAnonymous
                          ? `Ordering as ${user.email || user.displayName || "customer"}`
                          : user?.isAnonymous
                            ? "Continuing with your guest account"
                            : "Guest checkout is available"}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-ink/50">
                      {user && !user.isAnonymous
                        ? "This order will appear in your account history."
                        : "A secure guest identity will be created so this order is not public."}
                    </p>
                    {!user && !authLoading && (
                      <Link href="/login?next=/checkout" className="mt-2 inline-block text-xs font-semibold text-forest hover:underline">
                        Sign in instead
                      </Link>
                    )}
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="phone" className="mb-2 block text-sm font-semibold">
                  M-Pesa phone number
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" size={18} />
                  <input
                    id="phone"
                    required
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="07XXXXXXXX"
                    className="input-field pl-10"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </div>
                <p className="mt-2 text-xs leading-5 text-ink/50">
                  Accepted formats include 07XXXXXXXX, 01XXXXXXXX, or +254XXXXXXXXX.
                </p>
              </div>
              <button type="submit" className="btn-primary w-full">
                Send M-Pesa prompt
              </button>
            </form>
          )}

          {step !== "form" && (
            <div className="p-8 text-center">
              {step === "waiting" && (
                <LoaderCircle className="mx-auto animate-spin text-forest" size={44} />
              )}
              {step === "success" && (
                <CheckCircle2 className="mx-auto text-forest" size={48} />
              )}
              {step === "error" && (
                <XCircle className="mx-auto text-red-600" size={48} />
              )}
              <h2 className="mt-5 font-display text-xl font-bold">
                {step === "waiting"
                  ? "Complete payment on your phone"
                  : step === "success"
                    ? "Payment complete"
                    : "Payment not completed"}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/60">{message}</p>

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
                  <Link href="/" className="btn-primary">Continue shopping</Link>
                  {isGuest && (
                    <Link href="/register" className="btn-secondary">
                      Create account and keep this order
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
