import "server-only";

import type {
  DocumentData,
  DocumentReference,
  Transaction,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import type { CartLine, Product } from "@/lib/types";

export const STOCK_RESERVATION_MINUTES = 15;

function quantity(value: unknown): number {
  return Math.max(0, Math.trunc(Number(value ?? 0)));
}

export async function reserveOrderStock(
  transaction: Transaction,
  orderRef: DocumentReference<DocumentData>,
  lines: CartLine[],
  actorId: string,
  paymentMethod: "mpesa" | "pay_on_delivery",
  now: number,
): Promise<number | null> {
  const productRefs = lines.map((line) =>
    adminDb.collection("products").doc(line.productId),
  );
  const snapshots = await Promise.all(
    productRefs.map((reference) => transaction.get(reference)),
  );
  const expiresAt = paymentMethod === "mpesa"
    ? now + STOCK_RESERVATION_MINUTES * 60_000
    : null;

  snapshots.forEach((snapshot, index) => {
    const line = lines[index];

    if (!snapshot.exists) {
      throw new Error("A product in your cart is no longer available.");
    }

    const product = { id: snapshot.id, ...snapshot.data() } as Product;
    const stockBefore = quantity(product.stock);

    if (!product.active || stockBefore < line.quantity) {
      throw new Error(`${product.name} does not have enough stock.`);
    }

    if (!Number.isFinite(product.price) || product.price !== line.price) {
      throw new Error(`${product.name} changed price. Refresh your cart and try again.`);
    }
  });

  snapshots.forEach((snapshot, index) => {
    const line = lines[index];
    const product = snapshot.data() as Product;
    const stockBefore = quantity(product.stock);
    const stockAfter = stockBefore - line.quantity;

    transaction.update(snapshot.ref, { stock: stockAfter, updatedAt: now });
    transaction.set(adminDb.collection("inventoryMovements").doc(), {
      type: "reservation",
      movementSubType: `${paymentMethod}_reservation`,
      productId: line.productId,
      productName: line.name,
      quantityDelta: -line.quantity,
      stockBefore,
      stockAfter,
      orderId: orderRef.id,
      channel: "online",
      paymentMethod,
      reason: `Stock reserved for order ${orderRef.id}.`,
      createdBy: actorId,
      createdAt: now,
    });
  });

  return expiresAt;
}

export async function releaseOrderStock(
  transaction: Transaction,
  orderRef: DocumentReference<DocumentData>,
  order: DocumentData,
  reason: string,
  actorId: string,
  now: number,
): Promise<boolean> {
  const isCurrentReservation = order.stockReservationStatus === "reserved";
  const isLegacyPodReservation =
    order.stockReservationStatus == null &&
    order.stockReserved === true &&
    !order.stockRestoredAt;

  if (!isCurrentReservation && !isLegacyPodReservation) return false;

  const lines = Array.isArray(order.lines) ? (order.lines as CartLine[]) : [];
  const refs = lines.map((line) =>
    adminDb.collection("products").doc(line.productId),
  );
  const snapshots = await Promise.all(
    refs.map((reference) => transaction.get(reference)),
  );

  snapshots.forEach((snapshot, index) => {
    if (!snapshot.exists) return;
    const line = lines[index];
    const stockBefore = quantity(snapshot.data()?.stock);
    const stockAfter = stockBefore + quantity(line.quantity);

    transaction.update(snapshot.ref, { stock: stockAfter, updatedAt: now });
    transaction.set(adminDb.collection("inventoryMovements").doc(), {
      type: "reservation_release",
      movementSubType: `${order.paymentMethod ?? "order"}_reservation_release`,
      productId: line.productId,
      productName: line.name,
      quantityDelta: quantity(line.quantity),
      stockBefore,
      stockAfter,
      orderId: orderRef.id,
      channel: "online",
      paymentMethod: order.paymentMethod ?? null,
      reason,
      createdBy: actorId,
      createdAt: now,
    });
  });

  transaction.update(orderRef, {
    stockReserved: false,
    stockReservationStatus: "released",
    stockReservationExpiresAt: null,
    stockReservationReleasedAt: now,
    stockReservationReleaseReason: reason,
    updatedAt: now,
  });
  return true;
}

export async function releaseOrderReservation(
  orderRef: DocumentReference<DocumentData>,
  reason: string,
  actorId: string,
): Promise<boolean> {
  return adminDb.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(orderRef);
    if (!snapshot.exists) return false;
    return releaseOrderStock(
      transaction,
      orderRef,
      snapshot.data() ?? {},
      reason,
      actorId,
      Date.now(),
    );
  });
}
