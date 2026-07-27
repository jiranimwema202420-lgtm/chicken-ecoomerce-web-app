"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Eye,
  Handshake,
  Package,
  Plus,
} from "lucide-react";
import { useAllProducts } from "@/lib/useProducts";

export default function AdminDashboard() {
  const { products, loading, error } = useAllProducts();
  const activeCount = products.filter((product) => product.active).length;
  const outOfStock = products.filter((product) => product.stock <= 0).length;

  const metrics = [
    { label: "Total products", value: products.length, icon: Package },
    { label: "Live on storefront", value: activeCount, icon: Eye },
    { label: "Out of stock", value: outOfStock, icon: AlertTriangle },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Store management</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Dashboard</h1>
          <p className="mt-2 text-sm text-ink/60">
            Monitor your catalogue, supplier pipeline, and product availability.
          </p>
        </div>
        <Link href="/admin/products/new" className="btn-primary gap-2">
          <Plus size={17} /> Add product
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
            <p className="mt-5 font-display text-3xl font-bold">
              {loading ? "â€¦" : value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold">
            Catalogue actions
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Add new stock, edit pricing and descriptions, or hide products from
            the public storefront.
          </p>
          <Link href="/admin/products" className="btn-secondary mt-5">
            Manage products
          </Link>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2">
            <Handshake size={20} className="text-forest" />
            <h2 className="font-display text-xl font-bold">
              Supplier operations
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-ink/60">
            Approve supplier accounts, assign products, review supply requests,
            and receive deliveries into stock.
          </p>
          <Link href="/admin/suppliers" className="btn-secondary mt-5">
            Manage suppliers
          </Link>
        </div>
      </div>
    </div>
  );
}