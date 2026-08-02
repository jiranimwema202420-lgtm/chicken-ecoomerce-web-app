import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { releaseOrderStock } from "@/lib/server/inventory-reservations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = Date.now();
  const snapshot = await adminDb
    .collection("orders")
    .where("stockReservationExpiresAt", "<=", now)
    .limit(50)
    .get();
  let released = 0;

  for (const document of snapshot.docs) {
    const didRelease = await adminDb.runTransaction(async (transaction) => {
      const current = await transaction.get(document.ref);
      if (!current.exists) return false;
      const order = current.data() ?? {};

      if (
        order.status !== "pending_payment" ||
        order.stockReservationStatus !== "reserved" ||
        Number(order.stockReservationExpiresAt ?? 0) > now
      ) {
        return false;
      }

      const result = await releaseOrderStock(
        transaction,
        document.ref,
        order,
        "M-Pesa reservation expired before payment confirmation.",
        "reservation-expiry-cron",
        now,
      );

      if (result) {
        transaction.update(document.ref, {
          status: "failed",
          failureReason: "payment_reservation_expired",
          updatedAt: now,
        });
      }

      return result;
    });

    if (didRelease) released += 1;
  }

  return NextResponse.json({ checked: snapshot.size, released, generatedAt: now });
}
