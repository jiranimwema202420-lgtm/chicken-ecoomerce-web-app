import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import {
  Product,
  SupplyRequest,
  SupplyRequestStatus,
} from "@/lib/types";

export const runtime = "nodejs";

const allowedStatuses: SupplyRequestStatus[] = [
  "approved",
  "rejected",
  "received",
];

export async function GET(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  const snapshot = await adminDb.collection("supplyRequests").get();
  const requests = snapshot.docs
    .map(
      (document) =>
        ({ id: document.id, ...document.data() }) as SupplyRequest
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ requests });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const requestId = String(body.requestId ?? "").trim();
    const status = String(body.status ?? "").trim() as SupplyRequestStatus;

    if (
      !/^[A-Za-z0-9_-]{6,128}$/.test(requestId) ||
      !allowedStatuses.includes(status)
    ) {
      return NextResponse.json(
        { error: "Invalid supply-request update." },
        { status: 400 }
      );
    }

    const requestRef = adminDb.collection("supplyRequests").doc(requestId);
    const now = Date.now();

    if (status === "received") {
      await adminDb.runTransaction(async (transaction) => {
        const requestSnapshot = await transaction.get(requestRef);

        if (!requestSnapshot.exists) {
          throw new Error("Supply request not found.");
        }

        const supplyRequest = {
          id: requestSnapshot.id,
          ...requestSnapshot.data(),
        } as SupplyRequest;

        if (supplyRequest.status === "received") {
          return;
        }

        if (supplyRequest.status !== "approved") {
          throw new Error(
            "Approve the supply request before marking it as received."
          );
        }

        const productRef = adminDb
          .collection("products")
          .doc(supplyRequest.productId);
        const productSnapshot = await transaction.get(productRef);

        if (!productSnapshot.exists) {
          throw new Error("The linked product no longer exists.");
        }

        const product = {
          id: productSnapshot.id,
          ...productSnapshot.data(),
        } as Product;

        transaction.update(productRef, {
          stock: Number(product.stock ?? 0) + supplyRequest.quantity,
          updatedAt: now,
        });

        transaction.update(requestRef, {
          status: "received",
          reviewedBy: admin.uid,
          reviewedAt: now,
          receivedAt: now,
          updatedAt: now,
        });
      });
    } else {
      const requestSnapshot = await requestRef.get();

      if (!requestSnapshot.exists) {
        return NextResponse.json(
          { error: "Supply request not found." },
          { status: 404 }
        );
      }

      const current = requestSnapshot.data() as SupplyRequest;

      if (current.status === "received") {
        return NextResponse.json(
          { error: "A received request cannot be changed." },
          { status: 409 }
        );
      }

      if (status === "approved" && current.status !== "pending") {
        return NextResponse.json(
          { error: "Only pending requests can be approved." },
          { status: 409 }
        );
      }

      await requestRef.update({
        status,
        reviewedBy: admin.uid,
        reviewedAt: now,
        updatedAt: now,
      });
    }

    const updated = await requestRef.get();

    return NextResponse.json({
      request: { id: updated.id, ...updated.data() },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The request could not be updated.";

    console.error("Supply-request update failed:", error);

    return NextResponse.json(
      { error: message },
      { status: message.includes("not found") ? 404 : 409 }
    );
  }
}