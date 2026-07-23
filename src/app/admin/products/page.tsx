"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { deleteDoc, doc } from "firebase/firestore";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAllProducts } from "@/lib/useProducts";
import { useAuth } from "@/lib/auth-context";

export default function AdminProductsPage() {
  const { products, loading, error: loadError } = useAllProducts();
  const { isAdmin } = useAuth();
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  async function handleDelete(id: string, name: string) {
    if (!isAdmin) {
      setActionError("Administrator access is required.");
      return;
    }

    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;

    setDeletingId(id);
    setActionError("");
    try {
      await deleteDoc(doc(db, "products", id));
    } catch (error) {
      console.error("Product deletion failed:", error);
      setActionError("The product could not be deleted.");
    } finally {
      setDeletingId("");
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Catalogue</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Products</h1>
        </div>
        <Link href="/admin/products/new" className="btn-primary gap-2">
          <Plus size={17} /> Add product
        </Link>
      </div>

      {(loadError || actionError) && (
        <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actionError || loadError}
        </p>
      )}

      {loading && <p className="mt-6 text-sm text-ink/60">Loading products…</p>}

      {!loading && products.length === 0 && !loadError && (
        <div className="card mt-6 p-10 text-center">
          <h2 className="font-display text-xl font-bold">No products yet</h2>
          <p className="mt-2 text-sm text-ink/60">Create the first product for your storefront.</p>
          <Link href="/admin/products/new" className="btn-primary mt-5">Add product</Link>
        </div>
      )}

      {products.length > 0 && (
        <div className="card mt-6 overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="border-b border-line bg-canvas/70 text-xs uppercase tracking-wide text-ink/50">
              <tr>
                <th className="px-5 py-4">Product</th>
                <th className="px-5 py-4">Price</th>
                <th className="px-5 py-4">Stock</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line bg-white">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-canvas/40">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-line">
                        <Image
                          src={product.imageUrl || "/placeholder.svg"}
                          alt={product.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-0.5 text-xs text-ink/50">{product.category || "Uncategorized"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold">KES {product.price.toLocaleString("en-KE")}</td>
                  <td className="px-5 py-4">
                    <span className={product.stock <= 0 ? "font-semibold text-red-600" : ""}>{product.stock}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${product.active ? "bg-forest/10 text-forest" : "bg-ink/5 text-ink/45"}`}>
                      {product.active ? "Live" : "Hidden"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-ink/55 transition hover:border-forest hover:text-forest"
                        aria-label={`Edit ${product.name}`}
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        type="button"
                        disabled={deletingId === product.id}
                        onClick={() => handleDelete(product.id, product.name)}
                        className="grid h-9 w-9 place-items-center rounded-md border border-line bg-white text-ink/55 transition hover:border-red-300 hover:text-red-600 disabled:opacity-40"
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
