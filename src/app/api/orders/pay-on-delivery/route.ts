import {
  createHash,
  randomBytes,
} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  isValidKenyanMobile,
  normalizeMsisdn,
} from "@/lib/mpesa";
import type {
  CartLine,
  Product,
} from "@/lib/types";
import { getRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";

interface RequestedLine {
  productId: string;
  quantity: number;
}

function cleanString(value: unknown, maximum: number): string {
  return String(value ?? "").trim().slice(0, maximum);
}

function parseRequestedLines(value: unknown): RequestedLine[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    return null;
  }

  const quantities = new Map<string, number>();

  for (const rawLine of value) {
    if (!rawLine || typeof rawLine !== "object") return null;

    const candidate = rawLine as Record<string, unknown>;
    const productId = cleanString(candidate.productId, 128);
    const quantity = Number(candidate.quantity);

    if (
      !/^[A-Za-z0-9_-]{6,128}$/.test(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      return null;
    }

    const combined = (quantities.get(productId) ?? 0) + quantity;

    if (combined > 20) return null;

    quantities.set(productId, combined);
  }

  return Array.from(quantities, ([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function orderNumber(orderId: string, timestamp: number): string {
  const date = new Date(timestamp)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");

  return `POD-${date}-${orderId.slice(0, 8).toUpperCase()}`;
}

export async function POST(request: NextRequest) {
  try {
    if (process.env.PAY_ON_DELIVERY_ENABLED === "false") {
      return NextResponse.json(
        { error: "Pay on delivery is currently unavailable." },
        { status: 503 }
      );
    }

    const authenticatedUser = await getRequestUser(request);

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Sign in or continue as a guest before checkout." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const requestedLines = parseRequestedLines(body.lines);
    const deliveryName = cleanString(body.deliveryName, 160);
    const phone = cleanString(body.phone, 40);
    const deliveryAddress = cleanString(body.deliveryAddress, 500);
    const deliveryNotes = cleanString(body.deliveryNotes, 500);

    if (
      !requestedLines ||
      deliveryName.length < 2 ||
      deliveryAddress.length < 8 ||
      !isValidKenyanMobile(phone)
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid customer name, Kenyan phone number, delivery address, and review your cart.",
        },
        { status: 400 }
      );
    }

    const maximumTotal = Math.max(
      1,
      Number(process.env.PAY_ON_DELIVERY_MAX_TOTAL ?? 100000)
    );
    const orderRef = adminDb.collection("orders").doc();
    const statusToken = randomBytes(32).toString("hex");
    const now = Date.now();
    let verifiedTotal = 0;
    let verifiedLines: CartLine[] = [];

    await adminDb.runTransaction(async (transaction) => {
      const productRefs = requestedLines.map(({ productId }) =>
        adminDb.collection("products").doc(productId)
      );
      const productSnapshots = await Promise.all(
        productRefs.map((reference) => transaction.get(reference))
      );

      const lines: CartLine[] = [];
      let total = 0;

      for (
        let index = 0;
        index < productSnapshots.length;
        index += 1
      ) {
        const snapshot = productSnapshots[index];
        const requested = requestedLines[index];

        if (!snapshot.exists) {
          throw new Error(
            "A product in your cart is no longer available."
          );
        }

        const product = {
          id: snapshot.id,
          ...snapshot.data(),
        } as Product;

        if (!product.active || product.stock < requested.quantity) {
          throw new Error(
            `${product.name} does not have enough stock.`
          );
        }

        if (!Number.isFinite(product.price) || product.price <= 0) {
          throw new Error(`${product.name} has an invalid price.`);
        }

        lines.push({
          productId: product.id,
          name: product.name,
          price: product.price,
          imageUrl: product.imageUrl,
          quantity: requested.quantity,
        });
        total += product.price * requested.quantity;
      }

      if (!Number.isFinite(total) || total <= 0) {
        throw new Error("The order total is invalid.");
      }

      if (total > maximumTotal) {
        throw new Error(
          `Pay on delivery is limited to KES ${maximumTotal.toLocaleString(
            "en-KE"
          )} per order.`
        );
      }

      for (
        let index = 0;
        index < productSnapshots.length;
        index += 1
      ) {
        const snapshot = productSnapshots[index];
        const requested = requestedLines[index];
        const data = snapshot.data() as Product;
        const before = Number(data.stock ?? 0);
        const after = before - requested.quantity;
        const movementRef = adminDb
          .collection("inventoryMovements")
          .doc();

        transaction.update(snapshot.ref, {
          stock: after,
          updatedAt: now,
        });

        transaction.set(movementRef, {
          type: "manual_adjustment",
          movementSubType: "pay_on_delivery_reservation",
          productId: snapshot.id,
          productName: cleanString(data.name, 160),
          quantityDelta: -requested.quantity,
          stockBefore: before,
          stockAfter: after,
          reason: `Stock reserved for ${orderNumber(orderRef.id, now)}`,
          orderId: orderRef.id,
          channel: "online",
          createdBy: authenticatedUser.uid,
          createdAt: now,
        });
      }

      transaction.set(orderRef, {
        orderNumber: orderNumber(orderRef.id, now),
        userId: authenticatedUser.uid,
        customerEmail:
          typeof authenticatedUser.email === "string"
            ? authenticatedUser.email
            : null,
        customerName: deliveryName,
        isGuest:
          authenticatedUser.firebase?.sign_in_provider === "anonymous",
        lines,
        total,
        phone: normalizeMsisdn(phone),
        paymentMethod: "pay_on_delivery",
        paymentStatus: "unpaid",
        deliveryStatus: "pending",
        deliveryName,
        deliveryAddress,
        deliveryNotes,
        status: "pending_payment",
        stockReserved: true,
        stockReservedAt: now,
        statusTokenHash: tokenHash(statusToken),
        createdAt: now,
        updatedAt: now,
      });

      verifiedTotal = total;
      verifiedLines = lines;
    });

    return NextResponse.json({
      orderId: orderRef.id,
      orderNumber: orderNumber(orderRef.id, now),
      statusToken,
      total: verifiedTotal,
      lines: verifiedLines,
      message:
        "Your order has been placed. Pay the delivery representative when the products arrive.",
    });
  } catch (error) {
    console.error("Pay-on-delivery checkout failed:", error);

    const message =
      error instanceof Error
        ? error.message
        : "The pay-on-delivery order could not be placed.";

    const conflict =
      message.includes("stock") ||
      message.includes("no longer available") ||
      message.includes("invalid price");

    return NextResponse.json(
      { error: message },
      { status: conflict ? 409 : 500 }
    );
  }
}