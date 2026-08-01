"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/authenticated-fetch";

type RenewalRequest = { id: string; customerName?: string; customerEmail?: string; phone: string; mpesaReceipt: string; amount: number; status: string; createdAt: number };
type ResponseData = { requests: RenewalRequest[]; summary: { activeMembers: number; pendingRequests: number; approvedRevenue: number; monthlyPrice: number } };
const money = (value: number) => `KES ${value.toLocaleString("en-KE")}`;

export default function AdminMembershipsPage() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const response = await authenticatedFetch("/api/admin/memberships");
    const body = (await response.json()) as ResponseData & { error?: string };
    if (!response.ok) throw new Error(body.error || "Memberships could not be loaded.");
    setData(body);
  }, []);
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : "Memberships could not be loaded.")); }, [load]);

  async function review(requestId: string, decision: "approved" | "rejected") {
    if (decision === "approved" && !window.confirm("Confirm that this M-Pesa receipt was verified before activating one membership month.")) return;
    setBusy(requestId); setMessage("");
    try {
      const response = await authenticatedFetch("/api/admin/memberships", { method: "PATCH", body: JSON.stringify({ requestId, decision }) });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "The request could not be reviewed.");
      setMessage(decision === "approved" ? "Membership activated for one month." : "Membership request rejected.");
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "The request could not be reviewed."); }
    finally { setBusy(""); }
  }

  if (!data) return <div className="card grid min-h-52 place-items-center"><LoaderCircle className="animate-spin text-forest" /></div>;
  return <div className="space-y-7">
    <header><p className="eyebrow">Recurring revenue</p><h1 className="mt-2 font-display text-3xl font-bold">Business memberships</h1><p className="mt-2 text-sm text-ink/60">Verify manual M-Pesa renewals and manage the KES 1,000 monthly plan.</p></header>
    {message && <p role="status" className="rounded-lg border border-line bg-white p-3 text-sm font-semibold">{message}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Monthly price", money(data.summary.monthlyPrice)], ["Active members", data.summary.activeMembers], ["Pending verification", data.summary.pendingRequests], ["Approved membership revenue", money(data.summary.approvedRevenue)]].map(([label, value]) => <article key={label} className="card p-5"><p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p><p className="mt-2 font-display text-2xl font-bold">{value}</p></article>)}
    </section>
    <section className="card overflow-hidden"><div className="border-b border-line p-5"><h2 className="font-display text-xl font-bold">Renewal requests</h2></div>
      {data.requests.length === 0 ? <p className="p-6 text-sm text-ink/55">No membership requests yet.</p> : <div className="overflow-x-auto"><table className="min-w-[850px] w-full text-left text-sm"><thead className="border-b border-line bg-canvas/60 text-xs uppercase text-ink/50"><tr><th className="p-4">Customer</th><th className="p-4">Phone</th><th className="p-4">Receipt</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-line">{data.requests.map((item) => <tr key={item.id}><td className="p-4"><p className="font-semibold">{item.customerName || "Customer"}</p><p className="text-xs text-ink/50">{item.customerEmail}</p></td><td className="p-4">{item.phone}</td><td className="p-4 font-mono">{item.mpesaReceipt}</td><td className="p-4">{money(item.amount)}</td><td className="p-4 capitalize">{item.status}</td><td className="p-4"><div className="flex justify-end gap-2">{item.status === "pending" ? <><button aria-label="Approve membership" className="btn-primary px-3 py-2" disabled={busy === item.id} onClick={() => void review(item.id, "approved")}><Check size={16} /></button><button aria-label="Reject membership" className="btn-secondary px-3 py-2 text-red-600" disabled={busy === item.id} onClick={() => void review(item.id, "rejected")}><X size={16} /></button></> : <span className="text-xs text-ink/45">Reviewed</span>}</div></td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
