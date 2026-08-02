import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { orderStatusRateLimit } from "@/lib/server/rate-limit";
import { applySpamGuard } from "@/lib/server/spam-guard";
import { releaseOrderStock } from "@/lib/server/inventory-reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashToken(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

function tokenMatches(token: string, expectedHash: unknown): boolean {
  if (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash)) {
    return false;
  }

  const actual = hashToken(token);
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const blockedResponse = await applySpamGuard(req, {
    rateLimit: orderStatusRateLimit,
    namespace: "order-status",
  });

  if (blockedResponse) return blockedResponse;

  const { id } = await context.params;
  const token = req.nextUrl.searchParams.get("token") ?? "";

  if (!/^[A-Za-z0-9_-]{6,128}$/.test(id) || token.length < 32) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  const orderRef = adminDb.collection("orders").doc(id);
  let snapshot = await orderRef.get();
  if (!snapshot.exists) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  let order = snapshot.data();
  if (!order || !tokenMatches(token, order.statusTokenHash)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  if (
    order.status === "pending_payment" &&
    order.stockReservationStatus === "reserved" &&
    Number(order.stockReservationExpiresAt ?? 0) <= Date.now()
  ) {
    await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(orderRef);
      if (!current.exists) return;
      const currentOrder = current.data() ?? {};
      const now = Date.now();

      if (
        currentOrder.status !== "pending_payment" ||
        currentOrder.stockReservationStatus !== "reserved" ||
        Number(currentOrder.stockReservationExpiresAt ?? 0) > now
      ) {
        return;
      }

      const released = await releaseOrderStock(
        transaction,
        orderRef,
        currentOrder,
        "M-Pesa reservation expired before payment confirmation.",
        "order-status-expiry",
        now,
      );

      if (released) {
        transaction.update(orderRef, {
          status: "failed",
          failureReason: "payment_reservation_expired",
          updatedAt: now,
        });
      }
    });
    snapshot = await orderRef.get();
    order = snapshot.data();
  }

  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }

  return NextResponse.json(
    {
      status: order.status,
      total: order.total,
      mpesaReceiptNumber: order.mpesaReceiptNumber ?? null,
      resultDescription: order.mpesaResultDescription ?? null,
      updatedAt: order.updatedAt,
    },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
