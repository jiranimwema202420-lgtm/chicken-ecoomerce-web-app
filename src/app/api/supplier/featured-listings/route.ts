import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getSupplierRequestUser } from "@/lib/role-auth";
import { loadFeaturedListingSettings } from "@/lib/server/featured-listings";
import { paymentApiRateLimit } from "@/lib/server/rate-limit";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getSupplierRequestUser(request);
  if (!user) return NextResponse.json({ error: "Supplier access is required." }, { status: 403 });
  const [settings, supplier, requests] = await Promise.all([loadFeaturedListingSettings(), adminDb.collection("suppliers").doc(user.uid).get(), adminDb.collection("featuredListingRequests").where("supplierId", "==", user.uid).limit(50).get()]);
  const productIds = Array.isArray(supplier.data()?.productIds) ? supplier.data()!.productIds : [];
  const products = productIds.length ? await adminDb.getAll(...productIds.slice(0, 100).map((id: string) => adminDb.collection("products").doc(id))) : [];
  const requestItems = requests.docs.map((doc) => { const data = doc.data(); return { id: doc.id, productName: String(data.productName ?? "Product"), amount: Number(data.amount ?? 0), status: String(data.status ?? "pending"), createdAt: Number(data.createdAt ?? 0) }; }).sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ settings, products: products.filter((doc) => doc.exists).map((doc) => ({ id: doc.id, name: String(doc.data()?.name ?? "Product") })), requests: requestItems });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getSupplierRequestUser(request);
  if (!user) return NextResponse.json({ error: "Supplier access is required." }, { status: 403 });
  if (paymentApiRateLimit && !(await paymentApiRateLimit.limit(`featured:${user.uid}`)).success) return NextResponse.json({ error: "Too many submissions. Try again later." }, { status: 429 });
  const settings = await loadFeaturedListingSettings();
  if (!settings.enabled || settings.price <= 0) return NextResponse.json({ error: "Featured listings are not currently available." }, { status: 409 });
  const body = (await request.json()) as Record<string, unknown>;
  const productId = String(body.productId ?? "").trim();
  const receipt = String(body.mpesaReceipt ?? "").trim().toUpperCase();
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(productId) || !/^[A-Z0-9]{8,20}$/.test(receipt)) return NextResponse.json({ error: "Choose a product and enter a valid M-Pesa receipt." }, { status: 400 });
  const supplier = await adminDb.collection("suppliers").doc(user.uid).get();
  if (!supplier.exists || supplier.data()?.active !== true || !Array.isArray(supplier.data()?.productIds) || !supplier.data()?.productIds.includes(productId)) return NextResponse.json({ error: "This product is not assigned to your supplier account." }, { status: 403 });
  const product = await adminDb.collection("products").doc(productId).get();
  if (!product.exists || product.data()?.active !== true) return NextResponse.json({ error: "The selected product is unavailable." }, { status: 409 });
  const id = createHash("sha256").update(receipt).digest("hex");
  const ref = adminDb.collection("featuredListingRequests").doc(id);
  if ((await ref.get()).exists) return NextResponse.json({ error: "This receipt has already been submitted." }, { status: 409 });
  const now = Date.now();
  await ref.create({ supplierId: user.uid, supplierName: String(supplier.data()?.businessName ?? "Supplier"), productId, productName: String(product.data()?.name ?? "Product"), mpesaReceipt: receipt, amount: settings.price, durationDays: settings.durationDays, status: "pending", createdAt: now, updatedAt: now });
  return NextResponse.json({ success: true }, { status: 201 });
}
