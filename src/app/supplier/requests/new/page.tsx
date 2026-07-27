"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { Product, SupplierProfile } from "@/lib/types";

interface ProfileResponse {
  supplier: SupplierProfile;
  products: Product[];
}

export default function NewSupplyRequestPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const response = await authenticatedFetch("/api/supplier/profile");
        const data = (await response.json()) as
          | ProfileResponse
          | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in data
              ? data.error || "Supplier profile could not be loaded."
              : "Supplier profile could not be loaded."
          );
        }

        if (active) {
          const nextProfile = data as ProfileResponse;
          setProfile(nextProfile);
          setProductId(nextProfile.products[0]?.id ?? "");
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Supplier profile could not be loaded."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await authenticatedFetch("/api/supplier/requests", {
        method: "POST",
        body: JSON.stringify({
          productId,
          quantity: Number(quantity),
          unitCost: Number(unitCost),
          expectedDeliveryDate,
          notes,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "The supply request could not be submitted.");
      }

      router.push("/supplier");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "The supply request could not be submitted."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-ink/60">Loading assigned productsâ€¦</p>;
  }

  return (
    <div>
      <Link href="/supplier" className="btn-ghost -ml-3 gap-2">
        <ArrowLeft size={17} /> Back to dashboard
      </Link>

      <div className="mt-5">
        <p className="eyebrow">Stock proposal</p>
        <h1 className="mt-2 font-display text-3xl font-bold">
          New supply request
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          Admin must approve the request before delivery is recorded.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card mt-7 max-w-2xl space-y-5 p-6">
        <div>
          <label
            htmlFor="supply-product"
            className="mb-2 block text-sm font-semibold"
          >
            Product
          </label>
          <select
            id="supply-product"
            required
            className="input-field"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            disabled={!profile?.products.length}
          >
            {profile?.products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} â€” current stock {product.stock}
              </option>
            ))}
          </select>
        </div>

        {!profile?.products.length && (
          <p className="rounded-md border border-marigold/30 bg-marigold/10 p-3 text-sm text-marigold-dark">
            No products are assigned to your account. Contact the administrator.
          </p>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label
              htmlFor="supply-quantity"
              className="mb-2 block text-sm font-semibold"
            >
              Quantity
            </label>
            <input
              id="supply-quantity"
              required
              min="1"
              max="100000"
              type="number"
              className="input-field"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="supply-cost"
              className="mb-2 block text-sm font-semibold"
            >
              Unit cost (KES)
            </label>
            <input
              id="supply-cost"
              required
              min="0.01"
              max="500000"
              step="0.01"
              type="number"
              className="input-field"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="supply-date"
            className="mb-2 block text-sm font-semibold"
          >
            Expected delivery date
          </label>
          <input
            id="supply-date"
            required
            type="date"
            className="input-field"
            value={expectedDeliveryDate}
            onChange={(event) =>
              setExpectedDeliveryDate(event.target.value)
            }
          />
        </div>

        <div>
          <label
            htmlFor="supply-notes"
            className="mb-2 block text-sm font-semibold"
          >
            Notes
          </label>
          <textarea
            id="supply-notes"
            rows={4}
            maxLength={1000}
            className="input-field min-h-28 resize-y"
            placeholder="Packaging, delivery window, batch details, or other information."
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={
            submitting ||
            !profile?.products.length ||
            !productId
          }
          className="btn-primary w-full gap-2 sm:w-auto"
        >
          <Send size={17} />
          {submitting ? "Submittingâ€¦" : "Submit supply request"}
        </button>
      </form>
    </div>
  );
}