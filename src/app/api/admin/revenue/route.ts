import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import {
  loadProductEconomics,
  loadRevenueSettings,
  normalizeRevenueSettings,
} from "@/lib/server/order-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 && amount <= 10_000_000
    ? Math.round(amount * 100) / 100
    : null;
}

function signedAmount(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request);
  if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const [settings, productsSnapshot, ordersSnapshot] = await Promise.all([
    loadRevenueSettings(),
    adminDb.collection("products").orderBy("name").limit(200).get(),
    adminDb.collection("orders").orderBy("createdAt", "desc").limit(500).get(),
  ]);
  const productIds = productsSnapshot.docs.map((document) => document.id);
  const economics = await loadProductEconomics(productIds);
  const products = productsSnapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      name: String(data.name ?? "Product"),
      price: money(data.price) ?? 0,
      ...economics.get(document.id),
    };
  });

  const summary = ordersSnapshot.docs.reduce(
    (result, document) => {
      const order = document.data();
      if (!["paid", "fulfilled"].includes(String(order.status))) return result;
      const breakdown = order.pricingBreakdown as Record<string, unknown> | undefined;
      result.orders += 1;
      result.revenue += money(order.total) ?? 0;
      result.deliveryRevenue += money(breakdown?.deliveryFee) ?? 0;
      result.paymentCosts += money(breakdown?.estimatedPaymentCost) ?? 0;
      result.estimatedGrossProfit += signedAmount(breakdown?.estimatedGrossProfit);
      return result;
    },
    { orders: 0, revenue: 0, deliveryRevenue: 0, paymentCosts: 0, estimatedGrossProfit: 0 },
  );

  return NextResponse.json({ settings, products, summary });
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request);
  if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });

  const body = (await request.json()) as Record<string, unknown>;
  const action = String(body.action ?? "");
  const now = Date.now();

  if (action === "settings") {
    const settings = normalizeRevenueSettings(body.settings);
    await adminDb.collection("commerceSettings").doc("revenue").set({
      ...settings,
      updatedAt: now,
      updatedBy: admin.uid,
    });
    return NextResponse.json({ settings: { ...settings, updatedAt: now } });
  }

  if (action === "product-cost") {
    const productId = String(body.productId ?? "").trim();
    const landedCost = money(body.landedCost);
    const packagingCost = money(body.packagingCost);
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(productId) || landedCost === null || packagingCost === null) {
      return NextResponse.json({ error: "Enter valid product cost values." }, { status: 400 });
    }
    const product = await adminDb.collection("products").doc(productId).get();
    if (!product.exists) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    await adminDb.collection("productEconomics").doc(productId).set({
      productId,
      landedCost,
      packagingCost,
      updatedAt: now,
      updatedBy: admin.uid,
    });
    return NextResponse.json({ productId, landedCost, packagingCost });
  }

  return NextResponse.json({ error: "Unsupported revenue update." }, { status: 400 });
}
