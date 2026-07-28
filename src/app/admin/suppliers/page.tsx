"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCircle2,
  RefreshCw,
  Truck,
  UserPlus,
  X,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";
import { useAllProducts } from "@/lib/useProducts";
import {
  SupplierProfile,
  SupplyRequest,
  SupplyRequestStatus,
} from "@/lib/types";

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

export default function AdminSuppliersPage() {
  const { products, loading: productsLoading } = useAllProducts();
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [requests, setRequests] = useState<SupplyRequest[]>([]);
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [manualSupplier, setManualSupplier] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadData = useCallback(async () => {
    setError("");

    try {
      const [supplierResponse, requestResponse] = await Promise.all([
        authenticatedFetch("/api/admin/suppliers"),
        authenticatedFetch("/api/admin/supply-requests"),
      ]);

      const supplierData = (await supplierResponse.json()) as
        | { suppliers: SupplierProfile[] }
        | { error?: string };
      const requestData = (await requestResponse.json()) as
        | { requests: SupplyRequest[] }
        | { error?: string };

      if (!supplierResponse.ok) {
        throw new Error(
          "error" in supplierData
            ? supplierData.error || "Suppliers could not be loaded."
            : "Suppliers could not be loaded."
        );
      }

      if (!requestResponse.ok) {
        throw new Error(
          "error" in requestData
            ? requestData.error || "Supply requests could not be loaded."
            : "Supply requests could not be loaded."
        );
      }

      setSuppliers(
        "suppliers" in supplierData ? supplierData.suppliers : []
      );
      setRequests("requests" in requestData ? requestData.requests : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Supplier data could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pendingCount = useMemo(
    () => requests.filter((item) => item.status === "pending").length,
    [requests]
  );

  async function handleSupplierSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingSupplier(true);

    try {
      const response = await authenticatedFetch("/api/admin/suppliers", {
        method: "POST",
        body: JSON.stringify({
          email,
          businessName,
          contactName,
          phone,
          manual: manualSupplier,
          productIds: selectedProductIds,
        }),
      });

      const data = (await response.json()) as {
        supplier?: SupplierProfile;
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "The supplier could not be onboarded.");
      }

      setMessage(
        data.message ||
          "Supplier access saved. Ask the supplier to sign in again."
      );
      setEmail("");
      setBusinessName("");
      setContactName("");
      setPhone("");
      setManualSupplier(false);
      setSelectedProductIds([]);
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "The supplier could not be onboarded."
      );
    } finally {
      setSavingSupplier(false);
    }
  }

  async function updateRequest(
    requestId: string,
    status: "approved" | "rejected" | "received"
  ) {
    if (
      status === "received" &&
      !window.confirm(
        "Mark this delivery as received and add its quantity to product stock?"
      )
    ) {
      return;
    }

    setActionId(requestId);
    setError("");
    setMessage("");

    try {
      const response = await authenticatedFetch(
        "/api/admin/supply-requests",
        {
          method: "PATCH",
          body: JSON.stringify({ requestId, status }),
        }
      );

      const data = (await response.json()) as {
        request?: SupplyRequest;
        error?: string;
      };

      if (!response.ok || !data.request) {
        throw new Error(data.error || "The request could not be updated.");
      }

      const updatedRequest = data.request;

      setRequests((current) =>
        current.map((item) =>
          item.id === updatedRequest.id ? updatedRequest : item
        )
      );

      setMessage(
        status === "received"
          ? "Delivery received and product stock updated."
          : `Supply request ${status}.`
      );
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The request could not be updated."
      );
    } finally {
      setActionId("");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Supply operations</p>
          <h1 className="mt-2 font-display text-3xl font-bold">
            Suppliers
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Approve supplier access, assign products, and receive stock safely.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadData()}
          className="btn-secondary gap-2"
        >
          <RefreshCw size={17} /> Refresh
        </button>
      </div>

      {(error || message) && (
        <p
          className={`mt-6 rounded-md border p-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-forest/20 bg-forest/10 text-forest"
          }`}
        >
          {error || message}
        </p>
      )}

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active suppliers", value: suppliers.filter((item) => item.active).length },
          { label: "Pending requests", value: pendingCount },
          { label: "Total requests", value: requests.length },
        ].map((metric) => (
          <div key={metric.label} className="card p-5">
            <p className="text-sm font-semibold text-ink/55">
              {metric.label}
            </p>
            <p className="mt-5 font-display text-3xl font-bold">
              {loading ? "Ã¢â‚¬Â¦" : metric.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <form onSubmit={handleSupplierSubmit} className="card p-6">
          <div className="flex items-center gap-2">
            <UserPlus size={20} className="text-forest" />
            <h2 className="font-display text-xl font-bold">
              Add or update supplier
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-ink/60">
            Select Manual supplier to add a supplier without a Firebase account. Leave it off to grant portal access to a registered Duka user.
          </p>

          <div className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="supplier-admin-email"
                className="mb-2 block text-sm font-semibold"
              >
                Account email
              </label>
              <input
                id="supplier-admin-email"
                required
                type="email"
                className="input-field"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="supplier-business"
                className="mb-2 block text-sm font-semibold"
              >
                Business name
              </label>
              <input
                id="supplier-business"
                required
                className="input-field"
                value={businessName}
                onChange={(event) => setBusinessName(event.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="supplier-contact"
                className="mb-2 block text-sm font-semibold"
              >
                Contact person
              </label>
              <input
                id="supplier-contact"
                required
                className="input-field"
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="supplier-phone"
                className="mb-2 block text-sm font-semibold"
              >
                Phone
              </label>
              <input
                id="supplier-phone"
                type="tel"
                className="input-field"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>

            <label
              htmlFor="manual-supplier"
              className="flex cursor-pointer gap-3 rounded-xl border border-white/65 bg-white/35 p-4"
            >
              <input
                id="manual-supplier"
                type="checkbox"
                checked={manualSupplier}
                onChange={(event) =>
                  setManualSupplier(event.target.checked)
                }
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-semibold">
                  Manual supplier
                </span>
                <span className="mt-1 block text-xs leading-5 text-ink/55">
                  Add this supplier to the admin list without
                  requiring a Firebase login. The same email can be
                  converted to portal access later.
                </span>
              </span>
            </label>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">
                Assigned products
              </legend>

              <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/65 bg-white/35 p-3">
                {productsLoading ? (
                  <p className="text-sm text-ink/55">Loading productsÃ¢â‚¬Â¦</p>
                ) : products.length === 0 ? (
                  <p className="text-sm text-ink/55">No products available.</p>
                ) : (
                  products.map((product) => (
                    <label
                      key={product.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 transition hover:bg-white/55"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() =>
                          setSelectedProductIds((current) =>
                            current.includes(product.id)
                              ? current.filter((id) => id !== product.id)
                              : [...current, product.id]
                          )
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">
                          {product.name}
                        </span>
                        <span className="text-xs text-ink/50">
                          Stock {product.stock}
                        </span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={savingSupplier}
              className="btn-primary w-full gap-2"
            >
              <UserPlus size={17} />
              {savingSupplier ? "SavingÃ¢â‚¬Â¦" : "Save supplier"}
            </button>
          </div>
        </form>

        <section className="card overflow-hidden">
          <div className="border-b border-white/60 px-6 py-5">
            <div className="flex items-center gap-2">
              <Truck size={20} className="text-forest" />
              <h2 className="font-display text-xl font-bold">
                Supply requests
              </h2>
            </div>
          </div>

          {requests.length === 0 && !loading ? (
            <div className="px-6 py-12 text-center text-sm text-ink/60">
              No supply requests yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="border-b border-white/60 bg-white/35 text-xs uppercase tracking-wide text-ink/50">
                  <tr>
                    <th className="px-5 py-4">Supplier</th>
                    <th className="px-5 py-4">Product</th>
                    <th className="px-5 py-4">Quantity</th>
                    <th className="px-5 py-4">Unit cost</th>
                    <th className="px-5 py-4">Delivery</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/55">
                  {requests.map((item) => (
                    <tr key={item.id} className="hover:bg-white/30">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{item.supplierName}</p>
                        <p className="mt-1 text-xs text-ink/50">
                          {item.supplierEmail}
                        </p>
                      </td>
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
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {item.status === "pending" && (
                            <>
                              <button
                                type="button"
                                disabled={actionId === item.id}
                                onClick={() =>
                                  void updateRequest(item.id, "approved")
                                }
                                className="grid h-9 w-9 place-items-center rounded-md border border-forest/20 bg-forest/10 text-forest transition hover:bg-forest hover:text-white disabled:opacity-40"
                                aria-label="Approve request"
                              >
                                <Check size={16} />
                              </button>
                              <button
                                type="button"
                                disabled={actionId === item.id}
                                onClick={() =>
                                  void updateRequest(item.id, "rejected")
                                }
                                className="grid h-9 w-9 place-items-center rounded-md border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
                                aria-label="Reject request"
                              >
                                <X size={16} />
                              </button>
                            </>
                          )}

                          {item.status === "approved" && (
                            <button
                              type="button"
                              disabled={actionId === item.id}
                              onClick={() =>
                                void updateRequest(item.id, "received")
                              }
                              className="btn-primary min-h-9 gap-2 px-3 py-1.5 text-xs"
                            >
                              <CheckCircle2 size={15} /> Receive
                            </button>
                          )}

                          {(item.status === "received" ||
                            item.status === "rejected") && (
                            <span className="text-xs text-ink/45">Complete</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-white/60 px-6 py-5">
          <h2 className="font-display text-xl font-bold">
            Updated supplier list
          </h2>
        </div>

        {suppliers.length === 0 && !loading ? (
          <div className="px-6 py-12 text-center text-sm text-ink/60">
            No suppliers have been approved.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-left text-sm">
              <thead className="border-b border-white/60 bg-white/35 text-xs uppercase tracking-wide text-ink/50">
                <tr>
                  <th className="px-5 py-4">Business</th>
                  <th className="px-5 py-4">Contact</th>
                  <th className="px-5 py-4">Email</th>
                  <th className="px-5 py-4">Products</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/55">
                {suppliers.map((supplier) => (
                  <tr key={supplier.id} className="hover:bg-white/30">
                    <td className="px-5 py-4 font-semibold">
                      {supplier.businessName}
                    </td>
                    <td className="px-5 py-4">
                      <p>{supplier.contactName}</p>
                      <p className="mt-1 text-xs text-ink/50">
                        {supplier.phone || "No phone"}
                      </p>
                    </td>
                    <td className="px-5 py-4">{supplier.email}</td>
                    <td className="px-5 py-4">
                      {supplier.productIds.length}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          supplier.active
                            ? "bg-forest/10 text-forest"
                            : "bg-ink/5 text-ink/45"
                        }`}
                      >
                        {supplier.manual || !supplier.uid ? "Manual" : "Portal"} Â· {supplier.active ? "Active" : "Inactive"}
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
  );
}