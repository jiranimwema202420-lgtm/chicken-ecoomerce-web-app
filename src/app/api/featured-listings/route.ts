import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";
export async function GET(): Promise<NextResponse> {
  const snapshot = await adminDb.collection("featuredListings").where("status", "==", "active").limit(100).get();
  const now = Date.now();
  const listings = snapshot.docs.map((doc) => doc.data()).filter((item) => Number(item.expiresAt) > now).map((item) => ({ productId: String(item.productId), supplierName: String(item.supplierName ?? "Supplier"), expiresAt: Number(item.expiresAt) }));
  return NextResponse.json({ listings }, { headers: { "Cache-Control": "public, max-age=30, s-maxage=60" } });
}
