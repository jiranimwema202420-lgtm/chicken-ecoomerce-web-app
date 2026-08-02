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
import { paymentApiRateLimit } from "@/lib/server/rate-limit";
import { applySpamGuard } from "@/lib/server/spam-guard";
import {
  calculatePricing,
  loadProductEconomics,
  loadRevenueSettings,
  type PricingBreakdown,
} from "@/lib/server/order-pricing";
import { loadMembershipBenefits } from "@/lib/server/membership";
import { loadActiveFeaturedAttribution } from "@/lib/server/featured-listings";
import { reserveOrderStock } from "@/lib/server/inventory-reservations";

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

function orderDocumentId(uid: string, idempotencyKey: string): string {
  return createHash("sha256")
    .update(`${uid}:${idempotencyKey}`)
    .digest("hex");
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
    const blockedResponse = await applySpamGuard(request, {
      rateLimit: paymentApiRateLimit,
      namespace: "pay-on-delivery",
    });

    if (blockedResponse) return blockedResponse;

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
    const idempotencyKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const requestedLines = parseRequestedLines(body.lines);
    const deliveryName = cleanString(body.deliveryName, 160);
    const phone = cleanString(body.phone, 40);
    const deliveryAddress = cleanString(body.deliveryAddress, 500);
    const deliveryNotes = cleanString(body.deliveryNotes, 500);
    const deliveryZoneId = cleanString(body.deliveryZoneId, 64);

    if (
      !requestedLines ||
      !/^[A-Fa-f0-9-]{16,64}$/.test(idempotencyKey) ||
      deliveryName.length < 2 ||
      deliveryAddress.length < 8 ||
      !isValidKenyanMobile(phone) ||
      !/^[a-z0-9-]{3,64}$/.test(deliveryZoneId)
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
    const orderRef = adminDb
      .collection("orders")
      .doc(orderDocumentId(authenticatedUser.uid, idempotencyKey));
    const statusToken = randomBytes(32).toString("hex");
    const now = Date.now();
    let verifiedTotal = 0;
    let verifiedLines: CartLine[] = [];
    let verifiedPricing: PricingBreakdown | null = null;
    const settings = await loadRevenueSettings();
    const membership = await loadMembershipBenefits(authenticatedUser.uid);
    const featuredAttribution = await loadActiveFeaturedAttribution(requestedLines.map((line) => line.productId));

    await adminDb.runTransaction(async (transaction) => {
      const existingOrder = await transaction.get(orderRef);
      if (existingOrder.exists) {
        throw new Error("This checkout attempt has already been submitted.");
      }

      const productRefs = requestedLines.map(({ productId }) =>
        adminDb.collection("products").doc(productId)
      );
      const productSnapshots = await Promise.all(
        productRefs.map((reference) => transaction.get(reference))
      );

      const lines: CartLine[] = [];

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
      }

      const economics = await loadProductEconomics(
        lines.map((line) => line.productId),
      );
      const pricingBreakdown = calculatePricing(
        lines,
        deliveryZoneId,
        settings,
        economics,
        "pay_on_delivery",
        membership,
      );
      const total = pricingBreakdown.total;

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

      await reserveOrderStock(
        transaction,
        orderRef,
        lines,
        authenticatedUser.uid,
        "pay_on_delivery",
        now,
      );

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
        deliveryZoneId: pricingBreakdown.deliveryZoneId,
        deliveryZoneName: pricingBreakdown.deliveryZoneName,
        pricingBreakdown,
        featuredAttribution,
        status: "pending_payment",
        stockReserved: true,
        stockReservationStatus: "reserved",
        stockReservedAt: now,
        statusTokenHash: tokenHash(statusToken),
        createdAt: now,
        updatedAt: now,
      });

      verifiedTotal = total;
      verifiedLines = lines;
      verifiedPricing = pricingBreakdown;
    });

    return NextResponse.json({
      orderId: orderRef.id,
      orderNumber: orderNumber(orderRef.id, now),
      statusToken,
      total: verifiedTotal,
      lines: verifiedLines,
      pricingBreakdown: verifiedPricing,
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
    const invalidPricing =
      message.includes("minimum order") ||
      message.includes("delivery zone") ||
      message.includes("limited to KES");
    const duplicate = message.includes("already been submitted");

    return NextResponse.json(
      { error: message },
      { status: conflict || duplicate ? 409 : invalidPricing ? 400 : 500 }
    );
  }
}
