import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getSupplierRequestUser } from "@/lib/role-auth";
import { Product, SupplierProfile } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getSupplierRequestUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Supplier access is required." },
      { status: 403 }
    );
  }

  const supplierSnapshot = await adminDb
    .collection("suppliers")
    .doc(user.uid)
    .get();

  if (!supplierSnapshot.exists) {
    return NextResponse.json(
      { error: "Your supplier profile has not been configured." },
      { status: 404 }
    );
  }

  const supplier = {
    id: supplierSnapshot.id,
    ...supplierSnapshot.data(),
  } as SupplierProfile;

  if (!supplier.active) {
    return NextResponse.json(
      { error: "Your supplier profile is inactive." },
      { status: 403 }
    );
  }

  const productIds = Array.isArray(supplier.productIds)
    ? supplier.productIds
    : [];

  const productSnapshots =
    productIds.length > 0
      ? await adminDb.getAll(
          ...productIds.map((productId) =>
            adminDb.collection("products").doc(productId)
          )
        )
      : [];

  const products = productSnapshots
    .filter((snapshot) => snapshot.exists)
    .map(
      (snapshot) =>
        ({ id: snapshot.id, ...snapshot.data() }) as Product
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const ordersSnapshot = await adminDb.collection("orders").orderBy("createdAt", "desc").limit(500).get();
  let attributedSales = 0;
  let accruedCommission = 0;
  let completedOrders = 0;
  for (const orderDocument of ordersSnapshot.docs) {
    const order = orderDocument.data();
    if (!["paid", "fulfilled"].includes(String(order.status))) continue;
    const breakdown = order.pricingBreakdown as Record<string, unknown> | undefined;
    const commissions = Array.isArray(breakdown?.supplierCommissions) ? breakdown.supplierCommissions : [];
    let matched = false;
    for (const entry of commissions) {
      if (!entry || typeof entry !== "object") continue;
      const commission = entry as Record<string, unknown>;
      if (String(commission.supplierId ?? "") !== supplier.id) continue;
      attributedSales += Number(commission.salesAmount) || 0;
      accruedCommission += Number(commission.commissionAmount) || 0;
      matched = true;
    }
    if (matched) completedOrders += 1;
  }

  return NextResponse.json({
    supplier,
    products,
    commissionSummary: {
      currency: "KES",
      completedOrders,
      attributedSales: Math.round(attributedSales * 100) / 100,
      accruedCommission: Math.round(accruedCommission * 100) / 100,
    },
  });
}
