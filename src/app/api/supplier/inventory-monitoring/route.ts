import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getSupplierRequestUser } from "@/lib/role-auth";
import { getInventoryOverview } from "@/lib/server/inventory-monitoring";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const user = await getSupplierRequestUser(request);
  if (!user) return NextResponse.json({ error: "Supplier access is required." }, { status: 403 });
  const supplier = await adminDb.collection("suppliers").doc(user.uid).get();
  if (!supplier.exists || supplier.data()?.active !== true) return NextResponse.json({ error: "An active supplier profile is required." }, { status: 403 });
  const ids = Array.isArray(supplier.data()?.productIds) ? supplier.data()?.productIds.map(String) : [];
  return NextResponse.json(await getInventoryOverview(ids));
}
