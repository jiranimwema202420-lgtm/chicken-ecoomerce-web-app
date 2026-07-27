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

  return NextResponse.json({ supplier, products });
}