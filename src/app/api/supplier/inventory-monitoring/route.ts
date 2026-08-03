import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { getSupplierRequestUser } from "@/lib/role-auth";
import {
  getInventoryOverview,
  runOpportunisticInventoryCleanup,
} from "@/lib/server/inventory-monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await getSupplierRequestUser(request);

  if (!user) {
    return NextResponse.json(
      {
        error: "Supplier access is required.",
      },
      {
        status: 403,
      },
    );
  }

  const supplier = await adminDb.collection("suppliers").doc(user.uid).get();

  const supplierData = supplier.data();

  if (!supplier.exists || supplierData?.active !== true) {
    return NextResponse.json(
      {
        error: "An active supplier profile is required.",
      },
      {
        status: 403,
      },
    );
  }

  const productIds = Array.isArray(supplierData.productIds)
    ? supplierData.productIds.map(String)
    : [];

  await runOpportunisticInventoryCleanup(
    user.uid,
    "supplier_inventory_monitoring",
  );

  return NextResponse.json(await getInventoryOverview(productIds));
}

