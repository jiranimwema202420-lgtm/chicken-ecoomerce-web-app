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
