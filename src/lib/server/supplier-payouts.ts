import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";

export async function loadAccruedSupplierCommissions(): Promise<Map<string, number>> {
  const orders = await adminDb.collection("orders").orderBy("createdAt", "desc").limit(500).get();
  const totals = new Map<string, number>();
  for (const document of orders.docs) {
    const order = document.data();
    if (!["paid", "fulfilled"].includes(String(order.status))) continue;
    const breakdown = order.pricingBreakdown as Record<string, unknown> | undefined;
    const entries = Array.isArray(breakdown?.supplierCommissions) ? breakdown.supplierCommissions : [];
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const data = entry as Record<string, unknown>;
      const supplierId = String(data.supplierId ?? "");
      const amount = Number(data.commissionAmount);
      if (!supplierId || !Number.isFinite(amount) || amount <= 0) continue;
      totals.set(supplierId, Math.round(((totals.get(supplierId) ?? 0) + amount) * 100) / 100);
    }
  }
  return totals;
}
