import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";
import { releaseOrderStock } from "@/lib/server/inventory-reservations";

export const LOW_STOCK_THRESHOLD = 5;
export const CLEANUP_BATCH_SIZE = 50;
export const OPPORTUNISTIC_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
export const OPPORTUNISTIC_CLEANUP_LOCK_MS = 2 * 60 * 1000;

type OrderLine = {
  productId?: unknown;
  quantity?: unknown;
};

export type OpportunisticCleanupResult =
  | {
      status: "completed";
      trigger: string;
      cleanup: Awaited<ReturnType<typeof releaseExpiredReservations>>;
    }
  | {
      status: "skipped";
      trigger: string;
      reason: "recently_run_or_locked";
    }
  | {
      status: "failed";
      trigger: string;
      message: string;
    };

export async function runOpportunisticInventoryCleanup(
  actorId: string,
  trigger: string,
): Promise<OpportunisticCleanupResult> {
  const now = Date.now();

  const gateReference = adminDb
    .collection("systemOperations")
    .doc("opportunisticInventoryCleanup");

  try {
    const acquired = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(gateReference);
      const data = snapshot.data() ?? {};

      const nextAllowedAt = Number(data.nextAllowedAt ?? 0);
      const lockedUntil = Number(data.lockedUntil ?? 0);

      if (nextAllowedAt > now || lockedUntil > now) {
        return false;
      }

      transaction.set(
        gateReference,
        {
          status: "running",
          trigger,
          actorId,
          startedAt: now,
          lockedUntil: now + OPPORTUNISTIC_CLEANUP_LOCK_MS,
          nextAllowedAt: now + OPPORTUNISTIC_CLEANUP_INTERVAL_MS,
        },
        { merge: true },
      );

      return true;
    });

    if (!acquired) {
      return {
        status: "skipped",
        trigger,
        reason: "recently_run_or_locked",
      };
    }

    const cleanup = await releaseExpiredReservations(actorId);

    const completedAt = Date.now();

    await gateReference.set(
      {
        status: cleanup.status,
        trigger,
        actorId,
        completedAt,
        lockedUntil: 0,
      },
      { merge: true },
    );

    return {
      status: "completed",
      trigger,
      cleanup,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message.slice(0, 240)
        : "Unknown cleanup failure";

    console.error("Opportunistic inventory cleanup failed", {
      actorId,
      trigger,
      error,
    });

    return {
      status: "failed",
      trigger,
      message,
    };
  }
}

export async function releaseExpiredReservations(actorId: string) {
  const startedAt = Date.now();

  const snapshot = await adminDb
    .collection("orders")
    .where("stockReservationExpiresAt", "<=", startedAt)
    .limit(CLEANUP_BATCH_SIZE)
    .get();

  let released = 0;
  let skipped = 0;

  const failures: Array<{
    orderId: string;
    message: string;
  }> = [];

  for (const document of snapshot.docs) {
    try {
      const didRelease = await adminDb.runTransaction(async (transaction) => {
        const current = await transaction.get(document.ref);

        if (!current.exists) {
          return false;
        }

        const order = current.data() ?? {};

        const isExpiredReservation =
          order.status === "pending_payment" &&
          order.stockReservationStatus === "reserved" &&
          Number(order.stockReservationExpiresAt ?? 0) <= startedAt;

        if (!isExpiredReservation) {
          return false;
        }

        const result = await releaseOrderStock(
          transaction,
          document.ref,
          order,
          "M-Pesa reservation expired before payment confirmation.",
          actorId,
          startedAt,
        );

        if (result) {
          transaction.update(document.ref, {
            status: "failed",
            failureReason: "payment_reservation_expired",
            updatedAt: startedAt,
          });
        }

        return result;
      });

      if (didRelease) {
        released += 1;
      } else {
        skipped += 1;
      }
    } catch (error) {
      failures.push({
        orderId: document.id,
        message:
          error instanceof Error
            ? error.message.slice(0, 240)
            : "Unknown cleanup error",
      });
    }
  }

  const completedAt = Date.now();
  const status = failures.length > 0 ? "degraded" : "healthy";

  const result = {
    status,
    checked: snapshot.size,
    released,
    skipped,
    failed: failures.length,
    failures,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    actorId,
  };

  await adminDb
    .collection("systemOperations")
    .doc("inventoryCleanup")
    .set(
      failures.length > 0
        ? result
        : {
            ...result,
            lastSuccessfulAt: completedAt,
          },
      { merge: true },
    );

  await adminDb.collection("inventoryCleanupRuns").add(result);

  return result;
}

export async function getInventoryOverview(productIds?: string[]) {
  const allowed = productIds ? new Set(productIds) : null;

  const productSnapshot = await adminDb.collection("products").limit(500).get();

  const products = productSnapshot.docs
    .map((document) => {
      const data: Record<string, unknown> = document.data();

      return {
        id: document.id,
        name: String(data.name ?? "Product"),
        stock: Math.max(0, Number(data.stock ?? 0)),
        active: data.active === true,
      };
    })
    .filter((product) => !allowed || allowed.has(product.id));

  const reservedSnapshot = await adminDb
    .collection("orders")
    .where("stockReservationStatus", "==", "reserved")
    .limit(500)
    .get();

  const reservedByProduct = new Map<string, number>();

  for (const document of reservedSnapshot.docs) {
    const order: Record<string, unknown> = document.data();

    const lines: OrderLine[] = Array.isArray(order.lines)
      ? (order.lines as OrderLine[])
      : [];

    for (const line of lines) {
      const productId = String(line.productId ?? "");

      if (!productId || (allowed && !allowed.has(productId))) {
        continue;
      }

      const quantityValue = Number(line.quantity ?? 0);
      const quantity = Number.isFinite(quantityValue)
        ? Math.max(0, quantityValue)
        : 0;

      reservedByProduct.set(
        productId,
        (reservedByProduct.get(productId) ?? 0) + quantity,
      );
    }
  }

  const productsWithStatus = products.map((product) => ({
    ...product,
    reserved: reservedByProduct.get(product.id) ?? 0,
    status:
      product.stock <= 0
        ? "out"
        : product.stock <= LOW_STOCK_THRESHOLD
          ? "low"
          : "healthy",
  }));

  const cleanupSnapshot = await adminDb
    .collection("systemOperations")
    .doc("inventoryCleanup")
    .get();

  return {
    threshold: LOW_STOCK_THRESHOLD,
    products: productsWithStatus,
    totals: {
      available: productsWithStatus.reduce(
        (total, product) => total + product.stock,
        0,
      ),
      reserved: productsWithStatus.reduce(
        (total, product) => total + product.reserved,
        0,
      ),
      low: productsWithStatus.filter((product) => product.status === "low")
        .length,
      out: productsWithStatus.filter((product) => product.status === "out")
        .length,
    },
    cleanup: cleanupSnapshot.exists ? cleanupSnapshot.data() : null,
  };
}

export async function getInventoryAuditCsv() {
  const snapshot = await adminDb
    .collection("inventoryMovements")
    .orderBy("createdAt", "desc")
    .limit(1000)
    .get();

  const escapeCsvValue = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows: unknown[][] = [
    [
      "Date",
      "Product",
      "Type",
      "Quantity change",
      "Stock before",
      "Stock after",
      "Order",
      "Actor",
      "Reason",
    ],
    ...snapshot.docs.map((document) => {
      const data: Record<string, unknown> = document.data();
      const createdAt = Number(data.createdAt ?? 0);

      return [
        Number.isFinite(createdAt) && createdAt > 0
          ? new Date(createdAt).toISOString()
          : "",
        data.productName,
        data.type,
        data.quantityDelta,
        data.stockBefore,
        data.stockAfter,
        data.orderId,
        data.createdBy,
        data.reason,
      ];
    }),
  ];

  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}