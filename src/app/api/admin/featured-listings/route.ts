import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import { loadFeaturedListingSettings } from "@/lib/server/featured-listings";

export const dynamic = "force-dynamic";
const validId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request); if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const [settings, requests, listings] = await Promise.all([loadFeaturedListingSettings(), adminDb.collection("featuredListingRequests").orderBy("createdAt", "desc").limit(200).get(), adminDb.collection("featuredListings").where("status", "==", "active").limit(100).get()]);
  const now = Date.now();
  const items = requests.docs.map((doc) => { const data = doc.data(); return { id: doc.id, supplierName: String(data.supplierName ?? "Supplier"), productName: String(data.productName ?? "Product"), mpesaReceipt: String(data.mpesaReceipt ?? ""), amount: Number(data.amount ?? 0), status: String(data.status ?? "pending"), createdAt: Number(data.createdAt ?? 0) }; });
  return NextResponse.json({ settings, requests: items, summary: { pending: items.filter((item) => item.status === "pending").length, active: listings.docs.filter((doc) => Number(doc.data().expiresAt) > now).length, approvedRevenue: items.filter((item) => item.status === "approved").reduce((sum, item) => sum + Number(item.amount ?? 0), 0) } });
}
export async function PUT(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request); if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>; const price = Number(body.price); const durationDays = Number(body.durationDays); const enabled = body.enabled === true;
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000 || !Number.isInteger(durationDays) || durationDays < 1 || durationDays > 365 || (enabled && price <= 0)) return NextResponse.json({ error: "Enter a valid positive fee and duration before enabling listings." }, { status: 400 });
  const settings = { enabled, price: Math.round(price * 100) / 100, durationDays, updatedAt: Date.now(), updatedBy: admin.uid };
  await adminDb.collection("commerceSettings").doc("featuredListings").set(settings);
  return NextResponse.json({ settings });
}
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request); if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>; const requestId = body.requestId; const decision = String(body.decision);
  if (!validId(requestId) || !["approved", "rejected"].includes(decision)) return NextResponse.json({ error: "Choose a valid request and decision." }, { status: 400 });
  const requestRef = adminDb.collection("featuredListingRequests").doc(requestId);
  const result = await adminDb.runTransaction(async (transaction) => {
    const requestDoc = await transaction.get(requestRef); const data = requestDoc.data(); if (!requestDoc.exists || data?.status !== "pending") return null;
    const now = Date.now();
    if (decision === "rejected") { transaction.update(requestRef, { status: "rejected", reviewedAt: now, reviewedBy: admin.uid, updatedAt: now }); return { status: "rejected" }; }
    const expiresAt = now + Number(data.durationDays) * 86_400_000;
    transaction.set(adminDb.collection("featuredListings").doc(requestId), { requestId, supplierId: data.supplierId, supplierName: data.supplierName, productId: data.productId, productName: data.productName, status: "active", startsAt: now, expiresAt, createdAt: now });
    transaction.update(requestRef, { status: "approved", startsAt: now, expiresAt, reviewedAt: now, reviewedBy: admin.uid, updatedAt: now }); return { status: "approved", expiresAt };
  });
  if (!result) return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  return NextResponse.json({ success: true, ...result });
}
