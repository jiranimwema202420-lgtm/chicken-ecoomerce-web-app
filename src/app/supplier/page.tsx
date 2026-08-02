"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  PackageCheck,
  Plus,
  Truck,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import {
  Product,
  SupplierProfile,
  SupplyRequest,
  SupplyRequestStatus,
} from "@/lib/types";

interface ProfileResponse {
  supplier: SupplierProfile;
  products: Product[];
  commissionSummary: {
    currency: "KES";
    completedOrders: number;
    attributedSales: number;
    accruedCommission: number;
    paidCommission: number;
    outstandingCommission: number;
    payouts: Array<{ id: string; amount: number; method: string; reference: string; status: string; createdAt: number }>;
  };
}

function statusClass(status: SupplyRequestStatus): string {
  switch (status) {
    case "approved":
      return "bg-blue-100 text-blue-700";
    case "rejected":
      return "bg-red-100 text-red-700";
    case "received":
      return "bg-forest/10 text-forest";
    default:
      return "bg-marigold/20 text-marigold-dark";
  }
}

export default function SupplierDashboardPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [profileResponse, requestsResponse] = await Promise.all([
          authenticatedFetch("/api/supplier/profile"),
          authenticatedFetch("/api/supplier/requests"),
        ]);

        const profileData = (await profileResponse.json()) as
          | ProfileResponse
          | { error?: string };
        const requestData = (await requestsResponse.json()) as
          | { requests: SupplyRequest[] }
          | { error?: string };

        if (!profileResponse.ok) {
          throw new Error(
            "error" in profileData
              ? profileData.error || "Supplier profile could not be loaded."
              : "Supplier profile could not be loaded."
          );
        }

        if (!requestsResponse.ok) {
          throw new Error(
            "error" in requestData
              ? requestData.error || "Supply requests could not be loaded."
              : "Supply requests could not be loaded."
          );
        }

        if (active) {
          setProfile(profileData as ProfileResponse);
          setRequests(
            "requests" in requestData ? requestData.requests : []
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Supplier information could not be loaded."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(
    () => [
      {
        label: "Pending",
        value: requests.filter((item) => item.status === "pending").length,
        icon: Clock3,
      },
      {
        label: "Approved",
        value: requests.filter((item) => item.status === "approved").length,
        icon: CheckCircle2,
      },
      {
        label: "Received",
        value: requests.filter((item) => item.status === "received").length,
        icon: PackageCheck,
      },
    ],
    [requests]
  );

  if (loading) {
    return <p className="text-sm text-ink/60">Loading supplier portalâ€¦</p>;
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Supply partner</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            {profile?.supplier.businessName || "Supplier dashboard"}
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Submit stock proposals and track admin approval and receipt.
          </p>
        </div>

        <Link href="/supplier/requests/new" className="btn-primary gap-2">
          <Plus size={17} /> New supply request
        </Link>
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-ink/55">{label}</p>
              <span className="grid h-9 w-9 place-items-center rounded-md bg-forest/10 text-forest">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-5 font-display text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {profile && (
        <section className="card mt-6 p-6">
          <p className="eyebrow">Commission earnings</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div><p className="text-sm text-ink/55">Completed attributed orders</p><p className="mt-1 font-display text-2xl font-bold">{profile.commissionSummary.completedOrders}</p></div>
            <div><p className="text-sm text-ink/55">Attributed product sales</p><p className="mt-1 font-display text-2xl font-bold">KES {profile.commissionSummary.attributedSales.toLocaleString("en-KE")}</p></div>
            <div><p className="text-sm text-ink/55">Accrued commission</p><p className="mt-1 font-display text-2xl font-bold text-forest">KES {profile.commissionSummary.accruedCommission.toLocaleString("en-KE")}</p></div>
            <div><p className="text-sm text-ink/55">Paid commission</p><p className="mt-1 font-display text-2xl font-bold">KES {profile.commissionSummary.paidCommission.toLocaleString("en-KE")}</p></div>
            <div><p className="text-sm text-ink/55">Outstanding balance</p><p className="mt-1 font-display text-2xl font-bold text-marigold-dark">KES {profile.commissionSummary.outstandingCommission.toLocaleString("en-KE")}</p></div>
          </div>
          <p className="mt-4 text-xs leading-5 text-ink/50">Figures include paid and fulfilled orders in the current reporting window. Payment settlement is managed separately by Duka finance.</p>
        </section>
      )}

      {profile && profile.commissionSummary.payouts.length > 0 && (
        <section className="card mt-6 divide-y divide-line"><div className="p-5"><h2 className="font-display text-xl font-bold">Commission payout history</h2></div>{profile.commissionSummary.payouts.map((payout) => <div key={payout.id} className="flex flex-wrap justify-between gap-3 p-4 text-sm"><div><p className="font-semibold">{payout.method.toUpperCase()} · {payout.reference}</p><p className="text-xs text-ink/50">{new Date(payout.createdAt).toLocaleDateString("en-KE")}</p></div><p className="font-bold text-forest">KES {payout.amount.toLocaleString("en-KE")}</p></div>)}</section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
        <section className="card p-6">
          <div className="flex items-center gap-2">
            <Truck size={20} className="text-forest" />
            <h2 className="font-display text-xl font-bold">
              Assigned products
            </h2>
          </div>

          {profile && profile.products.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {profile.products.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/60 bg-white/45 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold">{product.name}</p>
                    <p className="mt-1 text-xs text-ink/50">
                      Current stock: {product.stock}
                    </p>
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wide text-forest">
                    {product.category || "Product"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-6 text-ink/60">
              No products have been assigned. Contact the administrator.
            </p>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-white/60 px-6 py-5">
            <h2 className="font-display text-xl font-bold">
              Recent supply requests
            </h2>
          </div>

          {requests.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-ink/60">
                No supply requests have been submitted.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[700px] w-full text-left text-sm">
                <thead className="border-b border-white/60 bg-white/35 text-xs uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Quantity</th>
                    <th className="px-5 py-4">Unit cost</th>
                    <th className="px-5 py-4">Delivery</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/55">
                  {requests.slice(0, 10).map((item) => (
                    <tr key={item.id} className="hover:bg-white/30">
                      <td className="px-5 py-4 font-semibold">
                        {item.productName}
                      </td>
                      <td className="px-5 py-4">{item.quantity}</td>
                      <td className="px-5 py-4">
                        KES {item.unitCost.toLocaleString("en-KE")}
                      </td>
                      <td className="px-5 py-4">
                        {item.expectedDeliveryDate}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${statusClass(
                            item.status
                          )}`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
