import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getSupplierRequestUser } from "@/lib/role-auth";
import {
  Product,
  SupplierProfile,
  SupplyRequest,
} from "@/lib/types";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function GET(request: NextRequest) {
  const user = await getSupplierRequestUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Supplier access is required." },
      { status: 403 }
    );
  }

  const snapshot = await adminDb
    .collection("supplyRequests")
    .where("supplierId", "==", user.uid)
    .get();

  const requests = snapshot.docs
    .map(
      (document) =>
        ({ id: document.id, ...document.data() }) as SupplyRequest
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ requests });
}

export async function POST(request: NextRequest) {
  const user = await getSupplierRequestUser(request);

  if (!user) {
    return NextResponse.json(
      { error: "Supplier access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const productId = cleanText(body.productId, 128);
    const quantity = Number(body.quantity);
    const unitCost = Number(body.unitCost);
    const expectedDeliveryDate = cleanText(body.expectedDeliveryDate, 10);
    const notes = cleanText(body.notes, 1000);

    if (
      !/^[A-Za-z0-9_-]{6,128}$/.test(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100000 ||
      !Number.isFinite(unitCost) ||
      unitCost <= 0 ||
      unitCost > 500000 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)
    ) {
      return NextResponse.json(
        { error: "Review the product, quantity, unit cost, and delivery date." },
        { status: 400 }
      );
    }

    const supplierRef = adminDb.collection("suppliers").doc(user.uid);
    const supplierSnapshot = await supplierRef.get();

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

    const assignedProductIds = Array.isArray(supplier.productIds)
      ? supplier.productIds
      : [];

    if (!assignedProductIds.includes(productId)) {
      return NextResponse.json(
        { error: "This product is not assigned to your supplier account." },
        { status: 403 }
      );
    }

    const productSnapshot = await adminDb
      .collection("products")
      .doc(productId)
      .get();

    if (!productSnapshot.exists) {
      return NextResponse.json(
        { error: "The selected product no longer exists." },
        { status: 404 }
      );
    }

    const product = {
      id: productSnapshot.id,
      ...productSnapshot.data(),
    } as Product;

    const now = Date.now();
    const requestRef = adminDb.collection("supplyRequests").doc();

    const supplyRequest: Omit<SupplyRequest, "id"> = {
      supplierId: user.uid,
      supplierName: supplier.businessName,
      supplierEmail: supplier.email,
      productId,
      productName: product.name,
      quantity,
      unitCost,
      expectedDeliveryDate,
      notes,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
      receivedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await requestRef.set(supplyRequest);

    return NextResponse.json(
      {
        request: { id: requestRef.id, ...supplyRequest },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Supply-request creation failed:", error);
    return NextResponse.json(
      { error: "The supply request could not be submitted." },
      { status: 500 }
    );
  }
}