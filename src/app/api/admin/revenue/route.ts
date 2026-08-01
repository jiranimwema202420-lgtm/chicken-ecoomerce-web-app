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

  const [settings, productsSnapshot, ordersSnapshot, suppliersSnapshot] = await Promise.all([
    loadRevenueSettings(),
    adminDb.collection("products").orderBy("name").limit(200).get(),
    adminDb.collection("orders").orderBy("createdAt", "desc").limit(500).get(),
    adminDb.collection("suppliers").limit(200).get(),
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
  const suppliers = suppliersSnapshot.docs.map((document) => ({
    id: document.id,
    name: String(document.data().businessName ?? "Supplier"),
    active: document.data().active === true,
    productIds: Array.isArray(document.data().productIds) ? document.data().productIds : [],
  })).sort((a, b) => a.name.localeCompare(b.name));
  const commissionsBySupplier = new Map<string, { supplierId: string; supplierName: string; sales: number; commission: number }>();

  const completedOrdersByCustomer = new Map<string, number>();
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
      result.supplierCommissions += money(breakdown?.estimatedSupplierCommission) ?? 0;
      const commissions = Array.isArray(breakdown?.supplierCommissions) ? breakdown.supplierCommissions : [];
      for (const item of commissions) {
        if (!item || typeof item !== "object") continue;
        const commission = item as Record<string, unknown>;
        const supplierId = String(commission.supplierId ?? "");
        if (!supplierId) continue;
        const current = commissionsBySupplier.get(supplierId) ?? { supplierId, supplierName: String(commission.supplierName ?? "Supplier"), sales: 0, commission: 0 };
        current.sales += money(commission.salesAmount) ?? 0;
        current.commission += money(commission.commissionAmount) ?? 0;
        commissionsBySupplier.set(supplierId, current);
      }
      const userId = typeof order.userId === "string" ? order.userId : "";
      if (userId) completedOrdersByCustomer.set(userId, (completedOrdersByCustomer.get(userId) ?? 0) + 1);
      return result;
    },
    { orders: 0, revenue: 0, deliveryRevenue: 0, paymentCosts: 0, supplierCommissions: 0, estimatedGrossProfit: 0 },
  );

  const uniqueCustomers = completedOrdersByCustomer.size;
  const repeatCustomers = [...completedOrdersByCustomer.values()].filter((count) => count >= 2).length;
  const repeatCustomerRate = uniqueCustomers ? Math.round((repeatCustomers / uniqueCustomers) * 10_000) / 100 : 0;

  const commissionSummary = [...commissionsBySupplier.values()].sort((a, b) => b.commission - a.commission);
  return NextResponse.json({ settings, products, suppliers, commissionSummary, summary: { ...summary, uniqueCustomers, repeatCustomers, repeatCustomerRate } });
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
    const commissionSupplierId = String(body.commissionSupplierId ?? "").trim();
    const commissionRatePercent = Number(body.commissionRatePercent ?? 0);
    if (!/^[A-Za-z0-9_-]{6,128}$/.test(productId) || landedCost === null || packagingCost === null) {
      return NextResponse.json({ error: "Enter valid product cost values." }, { status: 400 });
    }
    const product = await adminDb.collection("products").doc(productId).get();
    if (!product.exists) return NextResponse.json({ error: "Product not found." }, { status: 404 });

    if (!Number.isFinite(commissionRatePercent) || commissionRatePercent < 0 || commissionRatePercent > 100) {
      return NextResponse.json({ error: "Commission rate must be between 0 and 100 percent." }, { status: 400 });
    }
    let commissionSupplierName = "";
    if (commissionSupplierId) {
      if (!/^[A-Za-z0-9_-]{6,128}$/.test(commissionSupplierId)) return NextResponse.json({ error: "Choose a valid supplier." }, { status: 400 });
      const supplier = await adminDb.collection("suppliers").doc(commissionSupplierId).get();
      if (!supplier.exists || supplier.data()?.active !== true || !Array.isArray(supplier.data()?.productIds) || !supplier.data()?.productIds.includes(productId)) {
        return NextResponse.json({ error: "The selected active supplier must be assigned to this product." }, { status: 400 });
      }
      commissionSupplierName = String(supplier.data()?.businessName ?? "Supplier");
    } else if (commissionRatePercent > 0) {
      return NextResponse.json({ error: "Choose a supplier before setting a commission rate." }, { status: 400 });
    }
    const commissionRate = Math.round(commissionRatePercent * 100) / 10_000;
    await adminDb.collection("productEconomics").doc(productId).set({
      productId,
      landedCost,
      packagingCost,
      commissionSupplierId,
      commissionSupplierName,
      commissionRate,
      updatedAt: now,
      updatedBy: admin.uid,
    });
    return NextResponse.json({ productId, landedCost, packagingCost, commissionSupplierId, commissionSupplierName, commissionRate });
  }

  return NextResponse.json({ error: "Unsupported revenue update." }, { status: 400 });
}
