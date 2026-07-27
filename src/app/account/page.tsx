"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  LogOut,
  MailCheck,
  Package,
  RefreshCw,
  UserRound,
} from "lucide-react";
import {
  sendEmailVerification,
  signOut,
  updateProfile,
} from "firebase/auth";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { getAuthErrorMessage } from "@/lib/auth-errors";
import posthog from "posthog-js";
import type { CartLine, OrderStatus } from "@/lib/types";

interface CustomerOrder {
  id: string;
  lines: CartLine[];
  total: number;
  phone: string;
  status: OrderStatus;
  mpesaReceiptNumber: string | null;
  createdAt: number;
  updatedAt: number;
}

const statusLabels: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid",
  failed: "Payment failed",
  cancelled: "Cancelled",
  fulfilled: "Fulfilled",
};

function dateLabel(timestamp: number): string {
  if (!timestamp) return "Date unavailable";
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export default function AccountPage() {
  const router = useRouter();
  const { user, isGuest, loading: authLoading } = useAuth();
  const [name, setName] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      if (
        typeof window !== "undefined" &&
        window.sessionStorage.getItem("dukaSigningOut") === "1"
      ) {
        window.sessionStorage.removeItem("dukaSigningOut");
        window.location.replace("/");
        return;
      }

      router.replace("/login?next=/account");
      return;
    }
    if (user) setName(user.displayName ?? "");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return;

    let active = true;
    setOrdersLoading(true);

    void (async () => {
      try {
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", user.uid),
          limit(100)
        );
        const snapshot = await getDocs(ordersQuery);
        const customerOrders = snapshot.docs
          .map((document) => {
            const data = document.data();
            return {
              id: document.id,
              lines: Array.isArray(data.lines) ? data.lines : [],
              total: Number(data.total ?? 0),
              phone: String(data.phone ?? ""),
              status: String(data.status ?? "pending_payment") as OrderStatus,
              mpesaReceiptNumber:
                typeof data.mpesaReceiptNumber === "string"
                  ? data.mpesaReceiptNumber
                  : null,
              createdAt: Number(data.createdAt ?? 0),
              updatedAt: Number(data.updatedAt ?? 0),
            } satisfies CustomerOrder;
          })
          .sort((a, b) => b.createdAt - a.createdAt);

        if (active) setOrders(customerOrders);
      } catch (ordersError) {
        if (active) {
          setError(
            ordersError instanceof Error
              ? ordersError.message
              : "Orders could not be loaded."
          );
        }
      } finally {
        if (active) setOrdersLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [user]);

  async function handleProfileSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isGuest) return;

    setProfileLoading(true);
    setError("");
    setMessage("");

    try {
      if (name.trim().length < 2) throw new Error("Enter your full name.");
      await updateProfile(user, { displayName: name.trim() });
      await user.reload();
      setMessage("Your account details have been updated.");
    } catch (profileError) {
      setError(getAuthErrorMessage(profileError));
    } finally {
      setProfileLoading(false);
    }
  }

  async function handleVerification() {
    if (!user || user.isAnonymous) return;
    setError("");
    setMessage("");

    try {
      await sendEmailVerification(user);
      setMessage("A new verification email has been sent.");
    } catch (verificationError) {
      setError(getAuthErrorMessage(verificationError));
    }
  }

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setError("");
    setMessage("");

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("dukaSigningOut", "1");
    }

    try {
      await signOut(auth);
      window.location.replace("/");
    } catch (signOutError) {
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem("dukaSigningOut");
      }

      setSigningOut(false);
      setError(getAuthErrorMessage(signOutError));
    }
  }

  if (authLoading || !user) {
    return (
      <div className="section-shell py-20 text-center">
        <RefreshCw className="mx-auto animate-spin text-forest" size={32} />
        <p className="mt-3 text-sm text-ink/60">Loading your accountâ€¦</p>
      </div>
    );
  }

  return (
    <div className="section-shell py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Customer account</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
            {isGuest ? "Guest account" : `Hello, ${user.displayName || "shopper"}`}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Manage your identity and review orders placed with this account.
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary gap-2"
          disabled={signingOut}
          onClick={handleSignOut}
        >
          <LogOut size={17} />
          {signingOut ? "Signing outâ€¦" : "Sign out"}
        </button>
      </div>

      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <section className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-forest/10 text-forest"><UserRound size={20} /></span>
            <div>
              <h2 className="font-display text-xl font-bold">Profile</h2>
              <p className="text-xs text-ink/50">Firebase Authentication</p>
            </div>
          </div>

          {isGuest ? (
            <div className="mt-6 rounded-lg border border-marigold/40 bg-marigold/10 p-5">
              <h3 className="font-semibold">Keep your guest order history</h3>
              <p className="mt-2 text-sm leading-6 text-ink/60">
                Create an email or Google account now. Firebase will link it to this guest identity so your orders remain attached.
              </p>
              <Link href="/register" className="btn-primary mt-5 w-full">Create permanent account</Link>
            </div>
          ) : (
            <form onSubmit={handleProfileSave} className="mt-6 space-y-5">
              <div>
                <label htmlFor="profile-name" className="mb-2 block text-sm font-semibold">Full name</label>
                <input id="profile-name" required className="input-field" value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold">Email</label>
                <div className="input-field flex items-center bg-canvas/60 text-ink/60">{user.email}</div>
              </div>
              <div className="rounded-md border border-line bg-canvas/60 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {user.emailVerified ? <CheckCircle2 className="text-forest" size={18} /> : <MailCheck className="text-marigold-dark" size={18} />}
                  {user.emailVerified ? "Email verified" : "Email verification pending"}
                </div>
                {!user.emailVerified && (
                  <button type="button" className="mt-3 text-sm font-semibold text-forest hover:underline" onClick={handleVerification}>
                    Resend verification email
                  </button>
                )}
              </div>
              <button type="submit" disabled={profileLoading} className="btn-primary w-full">
                {profileLoading ? "Savingâ€¦" : "Save profile"}
              </button>
            </form>
          )}
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-forest/10 text-forest"><Package size={20} /></span>
            <div>
              <h2 className="font-display text-xl font-bold">Order history</h2>
              <p className="text-xs text-ink/50">Orders linked to your Firebase user ID</p>
            </div>
          </div>

          {ordersLoading ? (
            <div className="py-14 text-center text-sm text-ink/55"><RefreshCw className="mx-auto mb-3 animate-spin" size={24} />Loading ordersâ€¦</div>
          ) : orders.length === 0 ? (
            <div className="mt-6 rounded-lg border border-dashed border-line p-8 text-center">
              <Package className="mx-auto text-ink/30" size={32} />
              <h3 className="mt-3 font-semibold">No orders yet</h3>
              <p className="mt-1 text-sm text-ink/55">Your paid and pending orders will appear here.</p>
              <Link href="/#products" className="btn-primary mt-5">Start shopping</Link>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {orders.map((order) => (
                <article key={order.id} className="rounded-lg border border-line p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-ink/40">Order {order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="mt-1 text-sm text-ink/55">{dateLabel(order.createdAt)}</p>
                    </div>
                    <span className="rounded-full bg-forest/10 px-3 py-1 text-xs font-bold text-forest">{statusLabels[order.status] ?? order.status}</span>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-line pt-4">
                    {order.lines.map((line) => (
                      <div key={line.productId} className="flex justify-between gap-4 text-sm">
                        <span className="text-ink/65">{line.quantity} Ã— {line.name}</span>
                        <span className="font-semibold">KES {(line.price * line.quantity).toLocaleString("en-KE")}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
                    <span className="text-sm font-semibold text-ink/55">Total</span>
                    <span className="font-display text-lg font-bold text-forest">KES {order.total.toLocaleString("en-KE")}</span>
                  </div>
                  {order.mpesaReceiptNumber && <p className="mt-2 text-xs text-ink/50">M-Pesa receipt: {order.mpesaReceiptNumber}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
