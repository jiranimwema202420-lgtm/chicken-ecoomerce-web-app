import "server-only";
import { adminDb } from "@/lib/firebaseAdmin";

export type FeaturedListingSettings = { enabled: boolean; price: number; durationDays: number; updatedAt: number };
const defaults: FeaturedListingSettings = { enabled: false, price: 0, durationDays: 30, updatedAt: 0 };

export async function loadFeaturedListingSettings(): Promise<FeaturedListingSettings> {
  const doc = await adminDb.collection("commerceSettings").doc("featuredListings").get();
  const data = doc.data();
  if (!data) return defaults;
  const price = Number(data.price);
  const durationDays = Number(data.durationDays);
  return { enabled: data.enabled === true && Number.isFinite(price) && price > 0, price: Number.isFinite(price) && price >= 0 ? Math.round(price * 100) / 100 : 0, durationDays: Number.isInteger(durationDays) && durationDays >= 1 && durationDays <= 365 ? durationDays : 30, updatedAt: Number(data.updatedAt ?? 0) };
}

export type FeaturedAttribution = { listingId: string; supplierId: string; supplierName: string; productId: string; listingFee: number; listingExpiresAt: number };
export async function loadActiveFeaturedAttribution(productIds: string[]): Promise<FeaturedAttribution[]> {
  const wanted = new Set(productIds);
  if (wanted.size === 0) return [];
  const snapshot = await adminDb.collection("featuredListings").where("status", "==", "active").limit(100).get();
  const now = Date.now();
  const requestIds = snapshot.docs.filter((doc) => wanted.has(String(doc.data().productId)) && Number(doc.data().expiresAt) > now).map((doc) => doc.id);
  const requests = requestIds.length ? await adminDb.getAll(...requestIds.map((id) => adminDb.collection("featuredListingRequests").doc(id))) : [];
  const fees = new Map(requests.map((doc) => [doc.id, Number(doc.data()?.amount ?? 0)]));
  return snapshot.docs.flatMap((doc): FeaturedAttribution[] => { const data = doc.data(); if (!wanted.has(String(data.productId)) || Number(data.expiresAt) <= now) return []; return [{ listingId: doc.id, supplierId: String(data.supplierId), supplierName: String(data.supplierName ?? "Supplier"), productId: String(data.productId), listingFee: fees.get(doc.id) ?? 0, listingExpiresAt: Number(data.expiresAt) }]; });
}

export type FeaturedPerformance = { orders: number; attributedRevenue: number; supplierCommission: number };
export async function loadFeaturedPerformance(): Promise<Map<string, FeaturedPerformance>> {
  const orders = await adminDb.collection("orders").orderBy("createdAt", "desc").limit(500).get();
  const performance = new Map<string, FeaturedPerformance>();
  for (const document of orders.docs) {
    const order = document.data();
    if (!["paid", "fulfilled"].includes(String(order.status))) continue;
    const attribution = Array.isArray(order.featuredAttribution) ? order.featuredAttribution : [];
    const lines = Array.isArray(order.lines) ? order.lines : [];
    const breakdown = order.pricingBreakdown as Record<string, unknown> | undefined;
    const commissions = Array.isArray(breakdown?.supplierCommissions) ? breakdown.supplierCommissions : [];
    for (const raw of attribution) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>; const listingId = String(item.listingId ?? ""); const productId = String(item.productId ?? ""); if (!listingId) continue;
      const revenue = lines.filter((line: Record<string, unknown>) => String(line.productId) === productId).reduce((sum: number, line: Record<string, unknown>) => sum + (Number(line.price) || 0) * (Number(line.quantity) || 0), 0);
      const supplierCommission = commissions.filter((entry: unknown) => entry && typeof entry === "object" && String((entry as Record<string, unknown>).supplierId) === String(item.supplierId) && String((entry as Record<string, unknown>).productId) === productId).reduce((sum: number, entry: unknown) => sum + (Number((entry as Record<string, unknown>).commissionAmount) || 0), 0);
      const current = performance.get(listingId) ?? { orders: 0, attributedRevenue: 0, supplierCommission: 0 };
      current.orders += 1; current.attributedRevenue += revenue; current.supplierCommission += supplierCommission; performance.set(listingId, current);
    }
  }
  return performance;
}
