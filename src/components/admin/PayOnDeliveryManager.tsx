"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Banknote,
  CheckCircle2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

interface DeliveryLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface DeliveryOrder {
  id: string;
  orderNumber?: string;
  customerName?: string | null;
  customerEmail?: string | null;
  phone?: string;
  lines?: DeliveryLine[];
  total?: number;
  status?: string;
  paymentStatus?: string;
  deliveryStatus?: string;
  deliveryName?: string;
  deliveryAddress?: string;
  deliveryNotes?: string;
  paymentCollectionMethod?: string;
  paymentReference?: string | null;
  cancellationReason?: string;
  createdAt?: number;
  updatedAt?: number;
}

type DeliveryFilter =
  | "active"
  | "pending"
  | "out_for_delivery"
  | "paid"
  | "cancelled"
  | "all";

const money = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function dateLabel(value?: number): string {
  if (!value) return "Date unavailable";

  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function titleCase(value?: string): string {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function PayOnDeliveryManager() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<DeliveryFilter>("active");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<
    Record<string, string>
  >({});
  const [paymentReference, setPaymentReference] = useState<
    Record<string, string>
  >({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    try {
      const response = await authenticatedFetch(
        "/api/admin/pay-on-delivery"
      );
      const data = (await response.json()) as {
        orders?: DeliveryOrder[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Delivery orders could not be loaded."
        );
      }

      setOrders(data.orders ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Delivery orders could not be loaded."
      );
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();

    const interval = window.setInterval(() => {
      void loadOrders(true);
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !normalized ||
        String(order.orderNumber ?? order.id)
          .toLowerCase()
          .includes(normalized) ||
        String(order.deliveryName ?? order.customerName ?? "")
          .toLowerCase()
          .includes(normalized) ||
        String(order.phone ?? "")
          .toLowerCase()
          .includes(normalized) ||
        String(order.deliveryAddress ?? "")
          .toLowerCase()
          .includes(normalized);

      if (!matchesSearch) return false;

      if (filter === "all") return true;
      if (filter === "active") {
        return (
          order.status !== "cancelled" &&
          order.paymentStatus !== "paid"
        );
      }
      if (filter === "paid") {
        return order.paymentStatus === "paid";
      }
      if (filter === "cancelled") {
        return order.status === "cancelled";
      }

      return order.deliveryStatus === filter;
    });
  }, [filter, orders, search]);

  const metrics = useMemo(() => {
    const active = orders.filter(
      (order) =>
        order.status !== "cancelled" &&
        order.paymentStatus !== "paid"
    );
    const paid = orders.filter(
      (order) => order.paymentStatus === "paid"
    );

    return {
      active: active.length,
      outstanding: active.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0
      ),
      outForDelivery: orders.filter(
        (order) => order.deliveryStatus === "out_for_delivery"
      ).length,
      collected: paid.reduce(
        (sum, order) => sum + Number(order.total ?? 0),
        0
      ),
    };
  }, [orders]);

  async function updateOrder(
    order: DeliveryOrder,
    action:
      | "out_for_delivery"
      | "delivered_and_paid"
      | "cancel"
  ) {
    let cancellationReason = "";

    if (action === "cancel") {
      cancellationReason =
        window.prompt(
          "Why is this delivery order being cancelled?",
          "Customer cancelled the order"
        )?.trim() ?? "";

      if (!cancellationReason) return;
    }

    if (
      action === "delivered_and_paid" &&
      !window.confirm(
        `Confirm that ${order.orderNumber ?? order.id} was delivered and full payment was received?`
      )
    ) {
      return;
    }

    setUpdatingId(order.id);
    setError("");
    setMessage("");

    try {
      const response = await authenticatedFetch(
        "/api/admin/pay-on-delivery",
        {
          method: "PATCH",
          body: JSON.stringify({
            orderId: order.id,
            action,
            paymentMethod:
              paymentMethod[order.id] || "cash",
            paymentReference:
              paymentReference[order.id] || "",
            cancellationReason,
          }),
        }
      );
      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "The delivery order could not be updated."
        );
      }

      setMessage(
        action === "out_for_delivery"
          ? "Order marked out for delivery."
          : action === "delivered_and_paid"
            ? "Delivery and payment recorded. A receipt can now be created from the customer record."
            : "Order cancelled and reserved stock restored."
      );
      await loadOrders(true);
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "The delivery order could not be updated."
      );
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Fulfilment and collection</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Pay on delivery
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
            Dispatch reserved orders, confirm payment on arrival, or
            cancel an order and automatically restore its stock.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary gap-2"
          disabled={loading}
          onClick={() => void loadOrders()}
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Active deliveries",
            value: metrics.active,
            icon: Truck,
          },
          {
            label: "Outstanding collection",
            value: money.format(metrics.outstanding),
            icon: Banknote,
          },
          {
            label: "Out for delivery",
            value: metrics.outForDelivery,
            icon: PackageCheck,
          },
          {
            label: "Collected revenue",
            value: money.format(metrics.collected),
            icon: CheckCircle2,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink/55">
                {label}
              </p>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-forest/10 text-forest">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-bold">
              {loading ? "..." : value}
            </p>
          </div>
        ))}
      </div>

      {(error || message) && (
        <p
          className={`mt-5 rounded-md border p-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || message}
        </p>
      )}

      <div className="card mt-6 overflow-hidden">
        <div className="grid gap-3 border-b border-line p-4 sm:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">
              Search pay-on-delivery orders
            </span>
            <Search
              size={17}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40"
            />
            <input
              className="input-field pl-10"
              type="search"
              placeholder="Search order, customer, phone or address..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <select
            className="input-field"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as DeliveryFilter)
            }
          >
            <option value="active">Active deliveries</option>
            <option value="pending">Pending dispatch</option>
            <option value="out_for_delivery">
              Out for delivery
            </option>
            <option value="paid">Delivered and paid</option>
            <option value="cancelled">Cancelled</option>
            <option value="all">All orders</option>
          </select>
        </div>

        {loading ? (
          <p className="p-12 text-center text-sm text-ink/55">
            Loading delivery orders...
          </p>
        ) : visibleOrders.length === 0 ? (
          <p className="p-12 text-center text-sm text-ink/55">
            No pay-on-delivery orders match this view.
          </p>
        ) : (
          <div className="divide-y divide-line">
            {visibleOrders.map((order) => {
              const paid = order.paymentStatus === "paid";
              const cancelled = order.status === "cancelled";
              const disabled =
                updatingId === order.id || paid || cancelled;

              return (
                <article key={order.id} className="p-5 sm:p-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-xl font-bold">
                          {order.orderNumber ?? order.id}
                        </h2>
                        <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-bold text-forest">
                          {titleCase(order.deliveryStatus || "pending")}
                        </span>
                        <span className="rounded-full bg-marigold/15 px-2.5 py-1 text-xs font-bold text-marigold-dark">
                          {titleCase(order.paymentStatus || "unpaid")}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-ink/45">
                        Placed {dateLabel(order.createdAt)}
                      </p>
                    </div>

                    <p className="font-display text-2xl font-bold text-forest">
                      {money.format(Number(order.total ?? 0))}
                    </p>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr_0.8fr]">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/40">
                        Customer
                      </p>
                      <p className="mt-2 font-semibold">
                        {order.deliveryName ||
                          order.customerName ||
                          "Customer"}
                      </p>
                      <p className="mt-1 text-sm text-ink/55">
                        {order.phone || "No phone"}
                      </p>
                      {order.customerEmail && (
                        <p className="mt-1 text-sm text-ink/55">
                          {order.customerEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/40">
                        Delivery
                      </p>
                      <div className="mt-2 flex items-start gap-2 text-sm text-ink/65">
                        <MapPin size={16} className="mt-0.5 shrink-0" />
                        <span>
                          {order.deliveryAddress ||
                            "Address unavailable"}
                        </span>
                      </div>
                      {order.deliveryNotes && (
                        <p className="mt-2 text-xs leading-5 text-ink/50">
                          Note: {order.deliveryNotes}
                        </p>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/40">
                        Products
                      </p>
                      <div className="mt-2 space-y-1.5 text-sm">
                        {(order.lines ?? []).map((line) => (
                          <div
                            key={line.productId}
                            className="flex justify-between gap-3"
                          >
                            <span className="text-ink/60">
                              {line.quantity} Ã— {line.name}
                            </span>
                            <span className="font-semibold">
                              {money.format(
                                line.price * line.quantity
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {!paid && !cancelled && (
                    <div className="mt-5 grid gap-3 border-t border-line pt-5 lg:grid-cols-[170px_1fr_auto]">
                      <select
                        className="input-field"
                        value={paymentMethod[order.id] || "cash"}
                        onChange={(event) =>
                          setPaymentMethod((current) => ({
                            ...current,
                            [order.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="cash">Cash on delivery</option>
                        <option value="mpesa">
                          M-Pesa on delivery
                        </option>
                        <option value="bank">Bank transfer</option>
                      </select>

                      <input
                        className="input-field"
                        placeholder="Payment reference, optional"
                        value={paymentReference[order.id] || ""}
                        onChange={(event) =>
                          setPaymentReference((current) => ({
                            ...current,
                            [order.id]: event.target.value,
                          }))
                        }
                      />

                      <div className="flex flex-wrap gap-2">
                        {order.deliveryStatus !==
                          "out_for_delivery" && (
                          <button
                            type="button"
                            className="btn-secondary gap-2"
                            disabled={disabled}
                            onClick={() =>
                              void updateOrder(
                                order,
                                "out_for_delivery"
                              )
                            }
                          >
                            <Truck size={16} />
                            Dispatch
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn-primary gap-2"
                          disabled={disabled}
                          onClick={() =>
                            void updateOrder(
                              order,
                              "delivered_and_paid"
                            )
                          }
                        >
                          <CheckCircle2 size={16} />
                          Delivered and paid
                        </button>

                        <button
                          type="button"
                          className="btn-secondary gap-2 text-red-600"
                          disabled={disabled}
                          onClick={() =>
                            void updateOrder(order, "cancel")
                          }
                        >
                          <XCircle size={16} />
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {cancelled && order.cancellationReason && (
                    <p className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      Cancellation: {order.cancellationReason}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}