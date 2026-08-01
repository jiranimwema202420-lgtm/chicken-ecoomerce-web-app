"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Save, TrendingUp } from "lucide-react";

import { authenticatedFetch } from "@/lib/authenticated-fetch";

type DeliveryZone = {
  id: string;
  name: string;
  deliveryFee: number;
  internalDeliveryCost: number;
  minimumOrder: number;
  freeDeliveryThreshold: number;
  active: boolean;
};

type RevenueSettings = {
  currency: "KES";
  defaultMinimumOrder: number;
  mpesaFeeRate: number;
  mpesaFeeCap: number;
  zones: DeliveryZone[];
  updatedAt: number;
};

type RevenueProduct = {
  id: string;
  name: string;
  price: number;
  landedCost?: number;
  packagingCost?: number;
};

type RevenueResponse = {
  settings: RevenueSettings;
  products: RevenueProduct[];
  summary: {
    orders: number;
    revenue: number;
    deliveryRevenue: number;
    paymentCosts: number;
    estimatedGrossProfit: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatCustomerRate: number;
  };
};

const formatMoney = (value: number) => `KES ${value.toLocaleString("en-KE")}`;

export default function RevenuePage(): React.ReactElement {
  const [data, setData] = useState<RevenueResponse | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState("");

  const load = useCallback(async () => {
    const response = await authenticatedFetch("/api/admin/revenue");
    const body = (await response.json()) as RevenueResponse & { error?: string };
    if (!response.ok) throw new Error(body.error || "Revenue data could not be loaded.");
    setData(body);
  }, []);

  useEffect(() => {
    void load().catch((error) => setMessage(error instanceof Error ? error.message : "Revenue data could not be loaded."));
  }, [load]);

  async function saveSettings(): Promise<void> {
    if (!data) return;
    setSaving("settings");
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/admin/revenue", {
        method: "PUT",
        body: JSON.stringify({ action: "settings", settings: data.settings }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Pricing settings could not be saved.");
      setMessage("Delivery pricing settings saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pricing settings could not be saved.");
    } finally {
      setSaving("");
    }
  }

  async function saveProduct(product: RevenueProduct): Promise<void> {
    setSaving(product.id);
    setMessage("");
    try {
      const response = await authenticatedFetch("/api/admin/revenue", {
        method: "PUT",
        body: JSON.stringify({
          action: "product-cost",
          productId: product.id,
          landedCost: product.landedCost ?? 0,
          packagingCost: product.packagingCost ?? 0,
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "Product costs could not be saved.");
      setMessage(`${product.name} costs saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Product costs could not be saved.");
    } finally {
      setSaving("");
    }
  }

  function updateZone(index: number, field: keyof DeliveryZone, value: string | boolean): void {
    if (!data) return;
    const zones = data.settings.zones.map((zone, zoneIndex) =>
      zoneIndex === index
        ? { ...zone, [field]: typeof value === "boolean" ? value : field === "name" ? value : Number(value) }
        : zone,
    );
    setData({ ...data, settings: { ...data.settings, zones } });
  }

  if (!data) {
    return <div className="card flex min-h-52 items-center justify-center"><LoaderCircle className="animate-spin text-forest" /></div>;
  }

  const cards = [
    ["Completed orders", data.summary.orders.toLocaleString("en-KE")],
    ["Revenue", formatMoney(data.summary.revenue)],
    ["Delivery revenue", formatMoney(data.summary.deliveryRevenue)],
    ["Estimated payment costs", formatMoney(data.summary.paymentCosts)],
    ["Estimated gross profit", formatMoney(data.summary.estimatedGrossProfit)],
    ["Unique customers", data.summary.uniqueCustomers.toLocaleString("en-KE")],
    ["Repeat customers", `${data.summary.repeatCustomers.toLocaleString("en-KE")} (${data.summary.repeatCustomerRate.toFixed(1)}%)`],
  ];

  return (
    <div className="space-y-7">
      <header>
        <p className="eyebrow">Monetization</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Revenue and profitability</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink/60">
          Configure minimum orders, delivery economics and private product costs. Profit figures are estimates until every product cost is completed.
        </p>
      </header>

      {message && <p role="status" className="rounded-lg border border-line bg-white p-3 text-sm font-semibold">{message}</p>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="card p-5">
            <TrendingUp size={18} className="text-forest" />
            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
            <p className="mt-1 font-display text-2xl font-bold">{value}</p>
          </article>
        ))}
      </section>

      <section className="card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-bold">Delivery and minimum orders</h2>
            <p className="mt-1 text-sm text-ink/55">Customer fees and internal delivery costs are stored separately.</p>
          </div>
          <button type="button" className="btn-primary gap-2" disabled={saving === "settings"} onClick={() => void saveSettings()}>
            {saving === "settings" ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />} Save pricing
          </button>
        </div>

        <div className="mt-5 grid max-w-2xl gap-4 sm:grid-cols-3">
          {([
            ["defaultMinimumOrder", "Default minimum order"],
            ["mpesaFeeRate", "M-Pesa fee rate (decimal)"],
            ["mpesaFeeCap", "M-Pesa fee cap"],
          ] as const).map(([field, label]) => (
            <label key={field} className="block text-sm font-semibold">
              {label}
              <input
                className="input-field mt-2"
                type="number"
                min="0"
                step={field === "mpesaFeeRate" ? "0.001" : "1"}
                value={data.settings[field]}
                onChange={(event) => setData({ ...data, settings: { ...data.settings, [field]: Number(event.target.value) } })}
              />
            </label>
          ))}
        </div>

        <div className="mt-5 space-y-4">
          {data.settings.zones.map((zone, index) => (
            <fieldset key={zone.id} className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-2 xl:grid-cols-5">
              <legend className="px-2 text-sm font-bold">{zone.name}</legend>
              {([
                ["name", "Zone name"],
                ["deliveryFee", "Customer fee"],
                ["internalDeliveryCost", "Internal cost"],
                ["minimumOrder", "Minimum order"],
                ["freeDeliveryThreshold", "Free delivery from"],
              ] as const).map(([field, label]) => (
                <label key={field} className="text-xs font-semibold text-ink/60">
                  {label}
                  <input
                    className="input-field mt-1"
                    type={field === "name" ? "text" : "number"}
                    min={field === "name" ? undefined : "0"}
                    value={zone[field] as string | number}
                    onChange={(event) => updateZone(index, field, event.target.value)}
                  />
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line p-5 sm:p-6">
          <h2 className="font-display text-xl font-bold">Private product costs</h2>
          <p className="mt-1 text-sm text-ink/55">These values are kept outside public product documents.</p>
        </div>
        <div className="divide-y divide-line">
          {data.products.map((product, index) => {
            const cost = (product.landedCost ?? 0) + (product.packagingCost ?? 0);
            const margin = product.price - cost;
            return (
              <div key={product.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(180px,1fr)_130px_130px_150px_auto] sm:items-end">
                <div>
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-ink/50">Selling price {formatMoney(product.price)} · Margin {formatMoney(margin)}</p>
                </div>
                {(["landedCost", "packagingCost"] as const).map((field) => (
                  <label key={field} className="text-xs font-semibold text-ink/60">
                    {field === "landedCost" ? "Landed cost" : "Packaging"}
                    <input
                      className="input-field mt-1"
                      type="number"
                      min="0"
                      value={product[field] ?? 0}
                      onChange={(event) => {
                        const products = data.products.map((item, productIndex) => productIndex === index ? { ...item, [field]: Number(event.target.value) } : item);
                        setData({ ...data, products });
                      }}
                    />
                  </label>
                ))}
                <p className={`pb-3 text-sm font-bold ${margin < 0 ? "text-red-600" : "text-forest"}`}>
                  {product.price > 0 ? `${((margin / product.price) * 100).toFixed(1)}% margin` : "No price"}
                </p>
                <button type="button" className="btn-secondary gap-2" disabled={saving === product.id} onClick={() => void saveProduct(product)}>
                  {saving === product.id ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />} Save
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
