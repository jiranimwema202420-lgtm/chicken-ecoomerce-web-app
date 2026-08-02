"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Boxes, Clock3, Download, RefreshCw, ShieldCheck, type LucideIcon } from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type Row = { id: string; name: string; stock: number; reserved: number; active: boolean; status: "healthy" | "low" | "out" };
type Overview = { threshold: number; products: Row[]; totals: { available: number; reserved: number; low: number; out: number }; cleanup: { status?: string; lastSuccessfulAt?: number; completedAt?: number; released?: number; failed?: number } | null };

export default function InventoryMonitoringClient({ supplier = false }: { supplier?: boolean }) {
  const endpoint = supplier ? "/api/supplier/inventory-monitoring" : "/api/admin/inventory-monitoring";
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true); setError("");
    try { const response = await authenticatedFetch(endpoint); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Inventory status could not be loaded."); setData(body); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Inventory status could not be loaded."); }
    finally { setBusy(false); }
  }, [endpoint]);
  useEffect(() => { void load(); }, [load]);

  async function cleanup() {
    setBusy(true); setMessage(""); setError("");
    try { const response = await authenticatedFetch(endpoint, { method: "POST" }); const body = await response.json(); if (!response.ok) throw new Error(body.error ?? "Cleanup failed."); setMessage(`Cleanup checked ${body.checked} orders and released ${body.released}.`); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Cleanup failed."); setBusy(false); }
  }

  async function exportCsv() {
    const response = await authenticatedFetch(`${endpoint}?format=csv`); if (!response.ok) { setError("Audit export failed."); return; }
    const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "duka-inventory-audit.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  const lastCleanup = data?.cleanup?.lastSuccessfulAt ?? data?.cleanup?.completedAt;
  const metrics: Array<{ label: string; value: string | number; icon: LucideIcon }> = [
    { label: "Available units", value: data?.totals.available ?? 0, icon: Boxes },
    { label: "Reserved units", value: data?.totals.reserved ?? 0, icon: Clock3 },
    { label: "Low stock", value: data?.totals.low ?? 0, icon: AlertTriangle },
    { label: "Out of stock", value: data?.totals.out ?? 0, icon: AlertTriangle },
    { label: "Cleanup", value: data?.cleanup?.status ?? "Not run", icon: ShieldCheck },
  ];
  return <div>
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="eyebrow">Stock operations</p><h1 className="mt-2 font-display text-3xl font-bold">Inventory monitoring</h1><p className="mt-2 text-sm text-ink/60">Available and reserved stock, low-stock alerts, and reservation cleanup health.</p></div>
      <div className="flex flex-wrap gap-2"><button className="btn-secondary gap-2" onClick={() => void load()} disabled={busy}><RefreshCw size={16}/> Refresh</button>{!supplier && <><button className="btn-secondary gap-2" onClick={() => void exportCsv()}><Download size={16}/> Audit CSV</button><button className="btn-primary gap-2" onClick={() => void cleanup()} disabled={busy}><ShieldCheck size={16}/> Release expired</button></>}</div>
    </div>
    {(error || message) && <p role="status" className={`mt-5 rounded-md border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{error || message}</p>}
    <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {metrics.map(({ label, value, icon: Icon }) => <div key={label} className="card p-5"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-ink/55">{label}</p><Icon size={18} className="text-forest"/></div><p className="mt-4 font-display text-2xl font-bold">{busy && !data ? "..." : String(value)}</p></div>)}
    </div>
    <p className="mt-4 text-xs text-ink/55">Last successful cleanup: {lastCleanup ? new Date(lastCleanup).toLocaleString("en-KE") : "No successful run recorded"}. Low-stock threshold: {data?.threshold ?? 5} units.</p>
    <div className="card mt-6 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-canvas/80 text-xs uppercase tracking-wide text-ink/50"><tr><th className="px-4 py-3">Product</th><th className="px-4 py-3 text-right">Available</th><th className="px-4 py-3 text-right">Reserved</th><th className="px-4 py-3">Alert</th></tr></thead><tbody className="divide-y divide-line">{data?.products.map((row) => <tr key={row.id}><td className="px-4 py-3 font-semibold">{row.name}</td><td className="px-4 py-3 text-right">{row.stock}</td><td className="px-4 py-3 text-right">{row.reserved}</td><td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.status === "out" ? "bg-red-100 text-red-700" : row.status === "low" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>{row.status === "out" ? "Out of stock" : row.status === "low" ? "Low stock" : "Healthy"}</span></td></tr>)}</tbody></table></div>
  </div>;
}
