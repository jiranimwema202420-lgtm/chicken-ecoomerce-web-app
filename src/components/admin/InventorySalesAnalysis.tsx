"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  BarChart3,
  Banknote,
  RefreshCw,
  ShoppingCart,
  Store,
  TrendingUp,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import type { Product, SupplyRequest } from "@/lib/types";

interface InventorySalesAnalysisProps {
  products: Product[];
  loading: boolean;
}

type MovementType =
  | "supplier_receipt"
  | "manual_adjustment"
  | "manual_set"
  | "online_sale"
  | "offline_sale";

interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  type: MovementType;
  channel?: "online" | "offline" | null;
  quantityDelta: number;
  saleQuantity?: number;
  shortageQuantity?: number;
  stockBefore: number;
  stockAfter: number;
  unitPrice?: number;
  saleAmount?: number;
  orderId?: string | null;
  offlineSaleId?: string | null;
  supplierName?: string | null;
  customerName?: string | null;
  paymentMethod?: string | null;
  paymentReference?: string | null;
  reason: string;
  createdAt: number;
}

interface OfflineSaleResult {
  movement?: InventoryMovement;
  error?: string;
}

const currencyFormatter = new Intl.NumberFormat("en-KE", {
  style: "currency",
  currency: "KES",
  maximumFractionDigits: 0,
});

function formatDate(value: number): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function movementSaleQuantity(movement: InventoryMovement): number {
  return Math.max(
    0,
    Math.trunc(
      Number(
        movement.saleQuantity ??
          (movement.quantityDelta < 0
            ? Math.abs(movement.quantityDelta)
            : 0)
      )
    )
  );
}

export default function InventorySalesAnalysis({
  products,
  loading,
}: InventorySalesAnalysisProps) {
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [contextLoading, setContextLoading] = useState(true);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitPrice, setUnitPrice] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadAnalysis = useCallback(async (silent = false) => {
    if (!silent) setContextLoading(true);

    try {
      const response = await authenticatedFetch("/api/admin/inventory");
      const data = (await response.json()) as {
        movements?: InventoryMovement[];
        requests?: SupplyRequest[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error || "Inventory sales analysis could not be loaded."
        );
      }

      setMovements(data.movements ?? []);
      setRequests(data.requests ?? []);

      if (!silent) setError("");
    } catch (loadError) {
      if (!silent) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Inventory sales analysis could not be loaded."
        );
      }
    } finally {
      if (!silent) setContextLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAnalysis();

    const intervalId = window.setInterval(() => {
      void loadAnalysis(true);
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, [loadAnalysis]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === productId) ?? null,
    [productId, products]
  );

  useEffect(() => {
    if (selectedProduct) {
      setUnitPrice(selectedProduct.price);
      setQuantity((current) =>
        Math.max(1, Math.min(selectedProduct.stock || 1, current))
      );
    }
  }, [selectedProduct]);

  const salesMovements = useMemo(
    () =>
      movements.filter(
        (movement) =>
          movement.type === "online_sale" ||
          movement.type === "offline_sale"
      ),
    [movements]
  );

  const analysis = useMemo(() => {
    let onlineUnits = 0;
    let offlineUnits = 0;
    let onlineRevenue = 0;
    let offlineRevenue = 0;
    let shortageUnits = 0;

    for (const movement of salesMovements) {
      const units = movementSaleQuantity(movement);
      const revenue = Math.max(0, Number(movement.saleAmount ?? 0));
      shortageUnits += Math.max(
        0,
        Number(movement.shortageQuantity ?? 0)
      );

      if (movement.type === "online_sale") {
        onlineUnits += units;
        onlineRevenue += revenue;
      } else {
        offlineUnits += units;
        offlineRevenue += revenue;
      }
    }

    const supplierUnitsReceived = requests
      .filter((request) => request.status === "received")
      .reduce(
        (sum, request) => sum + Math.max(0, request.quantity),
        0
      );
    const approvedIncoming = requests
      .filter((request) => request.status === "approved")
      .reduce(
        (sum, request) => sum + Math.max(0, request.quantity),
        0
      );
    const currentStock = products.reduce(
      (sum, product) => sum + Math.max(0, product.stock),
      0
    );

    return {
      onlineUnits,
      offlineUnits,
      totalUnits: onlineUnits + offlineUnits,
      onlineRevenue,
      offlineRevenue,
      totalRevenue: onlineRevenue + offlineRevenue,
      supplierUnitsReceived,
      approvedIncoming,
      currentStock,
      shortageUnits,
    };
  }, [products, requests, salesMovements]);

  const productAnalysis = useMemo(() => {
    return products
      .map((product) => {
        const productMovements = salesMovements.filter(
          (movement) => movement.productId === product.id
        );
        const onlineMovements = productMovements.filter(
          (movement) => movement.type === "online_sale"
        );
        const offlineMovements = productMovements.filter(
          (movement) => movement.type === "offline_sale"
        );
        const onlineUnits = onlineMovements.reduce(
          (sum, movement) =>
            sum + movementSaleQuantity(movement),
          0
        );
        const offlineUnits = offlineMovements.reduce(
          (sum, movement) =>
            sum + movementSaleQuantity(movement),
          0
        );
        const onlineRevenue = onlineMovements.reduce(
          (sum, movement) =>
            sum + Math.max(0, Number(movement.saleAmount ?? 0)),
          0
        );
        const offlineRevenue = offlineMovements.reduce(
          (sum, movement) =>
            sum + Math.max(0, Number(movement.saleAmount ?? 0)),
          0
        );
        const supplierReceived = requests
          .filter(
            (request) =>
              request.productId === product.id &&
              request.status === "received"
          )
          .reduce(
            (sum, request) => sum + Math.max(0, request.quantity),
            0
          );
        const totalSold = onlineUnits + offlineUnits;
        const sellThroughBase = product.stock + totalSold;
        const sellThrough =
          sellThroughBase > 0
            ? (totalSold / sellThroughBase) * 100
            : 0;

        return {
          product,
          onlineUnits,
          offlineUnits,
          totalSold,
          onlineRevenue,
          offlineRevenue,
          totalRevenue: onlineRevenue + offlineRevenue,
          supplierReceived,
          sellThrough,
        };
      })
      .sort((a, b) => b.totalSold - a.totalSold);
  }, [products, requests, salesMovements]);

  async function recordOfflineSale(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!selectedProduct) {
      setError("Select a product.");
      return;
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > selectedProduct.stock
    ) {
      setError(
        `Enter a quantity between 1 and ${selectedProduct.stock}.`
      );
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setError("Enter a valid selling price.");
      return;
    }

    setSaving(true);

    try {
      const response = await authenticatedFetch(
        "/api/admin/offline-sales",
        {
          method: "POST",
          body: JSON.stringify({
            productId: selectedProduct.id,
            quantity,
            unitPrice,
            customerName,
            paymentMethod,
            paymentReference,
            notes,
          }),
        }
      );
      const data = (await response.json()) as OfflineSaleResult;

      if (!response.ok || !data.movement) {
        throw new Error(
          data.error || "The off-app sale could not be recorded."
        );
      }

      setMovements((current) => [
        data.movement as InventoryMovement,
        ...current,
      ]);
      setMessage(
        `${selectedProduct.name}: ${quantity} unit${
          quantity === 1 ? "" : "s"
        } sold off-app and deducted from stock.`
      );
      setQuantity(1);
      setCustomerName("");
      setPaymentReference("");
      setNotes("");
      await loadAnalysis(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The off-app sale could not be recorded."
      );
    } finally {
      setSaving(false);
    }
  }

  const metrics = [
    {
      label: "Total units sold",
      value: analysis.totalUnits.toLocaleString("en-KE"),
      note: `${analysis.onlineUnits} online Â· ${analysis.offlineUnits} off-app`,
      icon: TrendingUp,
    },
    {
      label: "Sales revenue",
      value: currencyFormatter.format(analysis.totalRevenue),
      note: `${currencyFormatter.format(
        analysis.onlineRevenue
      )} online Â· ${currencyFormatter.format(
        analysis.offlineRevenue
      )} off-app`,
      icon: Banknote,
    },
    {
      label: "Current stock",
      value: analysis.currentStock.toLocaleString("en-KE"),
      note: `${analysis.approvedIncoming} approved incoming`,
      icon: BarChart3,
    },
    {
      label: "Supplier units received",
      value: analysis.supplierUnitsReceived.toLocaleString("en-KE"),
      note: "Received deliveries added to stock",
      icon: Store,
    },
    {
      label: "Online cart units",
      value: analysis.onlineUnits.toLocaleString("en-KE"),
      note: "Paid M-PESA orders",
      icon: ShoppingCart,
    },
    {
      label: "Stock shortage units",
      value: analysis.shortageUnits.toLocaleString("en-KE"),
      note:
        analysis.shortageUnits > 0
          ? "Review paid orders with inventory shortages"
          : "No recorded checkout shortage",
      icon: AlertTriangle,
    },
  ];

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Sales reconciliation</p>
          <h2 className="mt-2 font-display text-2xl font-bold">
            Inventory and sales analysis
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
            Paid online cart orders and administrator-recorded off-app
            sales deduct from the same available product stock. Supplier
            receipts add stock through the same movement ledger.
          </p>
        </div>

        <button
          type="button"
          className="btn-secondary gap-2"
          onClick={() => void loadAnalysis()}
          disabled={contextLoading}
        >
          <RefreshCw
            size={16}
            className={contextLoading ? "animate-spin" : ""}
          />
          Refresh analysis
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-ink/55">
                {label}
              </p>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-forest/10 text-forest">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-4 font-display text-2xl font-bold">
              {loading || contextLoading ? "..." : value}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink/45">
              {note}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[380px_1fr]">
        <form
          onSubmit={recordOfflineSale}
          className="card h-fit p-5"
        >
          <div className="flex items-center gap-2">
            <Store size={19} className="text-forest" />
            <h3 className="font-display text-xl font-bold">
              Record off-app sale
            </h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/55">
            Use this for counter, phone, WhatsApp, or other sales that
            were not created through the online cart.
          </p>

          {(error || message) && (
            <p
              className={`mt-4 rounded-md border p-3 text-sm ${
                error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              {error || message}
            </p>
          )}

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="offline-product"
                className="mb-2 block text-sm font-semibold"
              >
                Product
              </label>
              <select
                id="offline-product"
                required
                className="input-field"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                disabled={saving}
              >
                <option value="">Select product...</option>
                {products
                  .filter((product) => product.stock > 0)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} Â· {product.stock} available
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="offline-quantity"
                  className="mb-2 block text-sm font-semibold"
                >
                  Quantity
                </label>
                <input
                  id="offline-quantity"
                  required
                  type="number"
                  min={1}
                  max={selectedProduct?.stock ?? 1}
                  step={1}
                  className="input-field"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Number(event.target.value))
                  }
                  disabled={saving || !selectedProduct}
                />
              </div>

              <div>
                <label
                  htmlFor="offline-price"
                  className="mb-2 block text-sm font-semibold"
                >
                  Unit price
                </label>
                <input
                  id="offline-price"
                  required
                  type="number"
                  min={1}
                  max={500000}
                  step={1}
                  className="input-field"
                  value={unitPrice}
                  onChange={(event) =>
                    setUnitPrice(Number(event.target.value))
                  }
                  disabled={saving || !selectedProduct}
                />
              </div>
            </div>

            {selectedProduct && (
              <div className="rounded-md border border-line bg-canvas/60 p-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-ink/55">Available stock</span>
                  <span className="font-bold">
                    {selectedProduct.stock}
                  </span>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-ink/55">Sale total</span>
                  <span className="font-bold text-forest">
                    {currencyFormatter.format(
                      Math.max(0, quantity * unitPrice)
                    )}
                  </span>
                </div>
                <div className="mt-2 flex justify-between gap-4">
                  <span className="text-ink/55">Stock after sale</span>
                  <span className="font-bold">
                    {Math.max(0, selectedProduct.stock - quantity)}
                  </span>
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="offline-customer"
                className="mb-2 block text-sm font-semibold"
              >
                Customer name
              </label>
              <input
                id="offline-customer"
                className="input-field"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
                placeholder="Optional"
                disabled={saving}
              />
            </div>

            <div>
              <label
                htmlFor="offline-payment"
                className="mb-2 block text-sm font-semibold"
              >
                Payment method
              </label>
              <select
                id="offline-payment"
                className="input-field"
                value={paymentMethod}
                onChange={(event) =>
                  setPaymentMethod(event.target.value)
                }
                disabled={saving}
              >
                <option value="cash">Cash</option>
                <option value="mpesa">M-PESA</option>
                <option value="bank">Bank transfer</option>
                <option value="credit">Credit</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="offline-reference"
                className="mb-2 block text-sm font-semibold"
              >
                Payment reference
              </label>
              <input
                id="offline-reference"
                className="input-field"
                value={paymentReference}
                onChange={(event) =>
                  setPaymentReference(event.target.value)
                }
                placeholder="Receipt or transaction reference"
                disabled={saving}
              />
            </div>

            <div>
              <label
                htmlFor="offline-notes"
                className="mb-2 block text-sm font-semibold"
              >
                Notes
              </label>
              <textarea
                id="offline-notes"
                className="input-field min-h-24"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional sale notes"
                disabled={saving}
              />
            </div>

            <button
              type="submit"
              className="btn-primary w-full"
              disabled={
                saving ||
                !selectedProduct ||
                selectedProduct.stock <= 0
              }
            >
              {saving ? "Recording sale..." : "Record and deduct stock"}
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h3 className="font-display text-lg font-bold">
                Product sales performance
              </h3>
              <p className="mt-1 text-xs text-ink/50">
                Sell-through uses recorded sales and current available
                stock since sales-ledger tracking was enabled.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-canvas/80 text-xs uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-right">Online sold</th>
                    <th className="px-4 py-3 text-right">Off-app sold</th>
                    <th className="px-4 py-3 text-right">Total sold</th>
                    <th className="px-4 py-3 text-right">Revenue</th>
                    <th className="px-4 py-3 text-right">Supplier received</th>
                    <th className="px-4 py-3 text-right">Sell-through</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {productAnalysis.map((item) => (
                    <tr key={item.product.id}>
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {item.product.name}
                        </p>
                        <p className="mt-1 text-xs text-ink/45">
                          {item.product.category || "Uncategorised"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {item.product.stock}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.onlineUnits}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.offlineUnits}
                      </td>
                      <td className="px-4 py-4 text-right font-bold">
                        {item.totalSold}
                      </td>
                      <td className="px-4 py-4 text-right font-semibold text-forest">
                        {currencyFormatter.format(item.totalRevenue)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.supplierReceived}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {item.sellThrough.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-line px-5 py-4">
              <h3 className="font-display text-lg font-bold">
                Recent sales ledger
              </h3>
              <p className="mt-1 text-xs text-ink/50">
                Both sales channels persist in Firestore after refresh.
              </p>
            </div>

            {salesMovements.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-ink/55">
                No online or off-app sales have been recorded since
                ledger tracking was enabled.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-canvas/80 text-xs uppercase tracking-wide text-ink/50">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Channel</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Quantity</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Customer / reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {salesMovements.slice(0, 20).map((movement) => (
                      <tr key={movement.id}>
                        <td className="px-4 py-4 text-xs text-ink/55">
                          {formatDate(movement.createdAt)}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              movement.type === "online_sale"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-violet-100 text-violet-700"
                            }`}
                          >
                            {movement.type === "online_sale"
                              ? "Online cart"
                              : "Off-app"}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-semibold">
                          {movement.productName}
                        </td>
                        <td className="px-4 py-4 text-right font-bold">
                          {movementSaleQuantity(movement)}
                        </td>
                        <td className="px-4 py-4 text-right font-semibold text-forest">
                          {currencyFormatter.format(
                            Math.max(
                              0,
                              Number(movement.saleAmount ?? 0)
                            )
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs leading-5 text-ink/55">
                          <p>
                            {movement.customerName || "Walk-in / account customer"}
                          </p>
                          <p>
                            {movement.paymentMethod || "payment"}{" "}
                            {movement.paymentReference
                              ? `Â· ${movement.paymentReference}`
                              : ""}
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}