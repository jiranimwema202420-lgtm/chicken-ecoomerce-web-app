import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AdminAction =
  | "out_for_delivery"
  | "delivered_and_paid"
  | "cancel";

interface OrderLine {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

function cleanString(value: unknown, maximum: number): string {
  return String(value ?? "").trim().slice(0, maximum);
}

function safeLines(value: unknown): OrderLine[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((raw) => {
      const line =
        raw && typeof raw === "object"
          ? (raw as Record<string, unknown>)
          : {};

      return {
        productId: cleanString(line.productId, 128),
        name: cleanString(line.name, 160) || "Product",
        price: Math.max(0, Number(line.price ?? 0)),
        quantity: Math.max(
          0,
          Math.trunc(Number(line.quantity ?? 0))
        ),
      };
    })
    .filter(
      (line) =>
        /^[A-Za-z0-9_-]{6,128}$/.test(line.productId) &&
        line.quantity > 0
    );
}

export async function GET(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  try {
    const snapshot = await adminDb
      .collection("orders")
      .where("paymentMethod", "==", "pay_on_delivery")
      .limit(300)
      .get();

    const orders = snapshot.docs
      .map((document) => {
        const data = document.data() as Record<string, unknown>;

        return {
          id: document.id,
          ...data,
          createdAt: Number(data.createdAt ?? 0),
        };
      })
      .sort(
        (left, right) => right.createdAt - left.createdAt
      );

    return NextResponse.json({
      orders,
      generatedAt: Date.now(),
    });
  } catch (error) {
    console.error("Pay-on-delivery admin load failed:", error);

    return NextResponse.json(
      { error: "Pay-on-delivery orders could not be loaded." },
      { status: 500 }
    );
  }
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
    const orderId = cleanString(body.orderId, 128);
    const action = cleanString(body.action, 40) as AdminAction;
    const paymentMethod =
      cleanString(body.paymentMethod, 40) || "cash";
    const paymentReference = cleanString(
      body.paymentReference,
      120
    );
    const cancellationReason =
      cleanString(body.cancellationReason, 500) ||
      "Cancelled by administrator";

    if (
      !/^[A-Za-z0-9_-]{6,128}$/.test(orderId) ||
      ![
        "out_for_delivery",
        "delivered_and_paid",
        "cancel",
      ].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid order action." },
        { status: 400 }
      );
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const now = Date.now();

    await adminDb.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists) {
        throw new Error("Order not found.");
      }

      const order = orderSnapshot.data() as Record<string, unknown>;

      if (order.paymentMethod !== "pay_on_delivery") {
        throw new Error("This is not a pay-on-delivery order.");
      }

      if (action === "out_for_delivery") {
        if (
          order.status === "cancelled" ||
          order.paymentStatus === "paid"
        ) {
          throw new Error("This order can no longer be dispatched.");
        }

        transaction.update(orderRef, {
          deliveryStatus: "out_for_delivery",
          dispatchedAt: now,
          dispatchedBy: admin.uid,
          updatedAt: now,
        });
        return;
      }

      if (action === "delivered_and_paid") {
        if (order.status === "cancelled") {
          throw new Error("A cancelled order cannot be marked paid.");
        }

        if (order.paymentStatus === "paid") return;

        const lines = safeLines(order.lines);
        const productSnapshots = await Promise.all(
          lines.map((line) =>
            transaction.get(
              adminDb.collection("products").doc(line.productId)
            )
          )
        );

        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index];
          const productSnapshot = productSnapshots[index];
          const currentStock = productSnapshot.exists
            ? Number(productSnapshot.data()?.stock ?? 0)
            : 0;

          transaction.set(
            adminDb.collection("inventoryMovements").doc(),
            {
              type: "online_sale",
              movementSubType: "pay_on_delivery_paid",
              channel: "online",
              productId: line.productId,
              productName: line.name,
              quantityDelta: 0,
              saleQuantity: line.quantity,
              shortageQuantity: 0,
              stockBefore: currentStock,
              stockAfter: currentStock,
              unitPrice: line.price,
              saleAmount: line.price * line.quantity,
              orderId,
              paymentMethod,
              paymentReference,
              reason: "Pay-on-delivery order delivered and paid",
              createdBy: admin.uid,
              createdAt: now,
            }
          );
        }

        transaction.update(orderRef, {
          status: "paid",
          paymentStatus: "paid",
          deliveryStatus: "delivered",
          paymentCollectionMethod: paymentMethod,
          paymentReference: paymentReference || null,
          paidAt: now,
          deliveredAt: now,
          fulfilledAt: now,
          paymentReceivedBy: admin.uid,
          updatedAt: now,
        });
        return;
      }

      if (order.status === "cancelled") return;
      if (order.paymentStatus === "paid") {
        throw new Error("A paid order cannot be cancelled.");
      }

      const lines = safeLines(order.lines);
      const productSnapshots = await Promise.all(
        lines.map((line) =>
          transaction.get(
            adminDb.collection("products").doc(line.productId)
          )
        )
      );

      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const productSnapshot = productSnapshots[index];

        if (!productSnapshot.exists) continue;

        const before = Number(productSnapshot.data()?.stock ?? 0);
        const after = before + line.quantity;

        transaction.update(productSnapshot.ref, {
          stock: after,
          updatedAt: now,
        });

        transaction.set(
          adminDb.collection("inventoryMovements").doc(),
          {
            type: "manual_adjustment",
            movementSubType: "pay_on_delivery_cancellation",
            productId: line.productId,
            productName: line.name,
            quantityDelta: line.quantity,
            stockBefore: before,
            stockAfter: after,
            orderId,
            channel: "online",
            reason: `Stock restored: ${cancellationReason}`,
            createdBy: admin.uid,
            createdAt: now,
          }
        );
      }

      transaction.update(orderRef, {
        status: "cancelled",
        paymentStatus: "cancelled",
        deliveryStatus: "cancelled",
        cancellationReason,
        cancelledAt: now,
        cancelledBy: admin.uid,
        stockRestoredAt: now,
        updatedAt: now,
      });
    });

    return NextResponse.json({
      success: true,
      orderId,
      action,
    });
  } catch (error) {
    console.error("Pay-on-delivery admin action failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The order could not be updated.",
      },
      { status: 400 }
    );
  }
}