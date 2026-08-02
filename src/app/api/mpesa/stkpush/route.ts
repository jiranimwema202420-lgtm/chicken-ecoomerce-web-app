import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  initiateStkPush,
  isValidKenyanMobile,
  normalizeMsisdn,
} from "@/lib/mpesa";
import { CartLine, Product } from "@/lib/types";
import { getRequestUser } from "@/lib/server-auth";
import { paymentApiRateLimit } from "@/lib/server/rate-limit";
import { applySpamGuard } from "@/lib/server/spam-guard";
import {
  calculatePricing,
  loadProductEconomics,
  loadRevenueSettings,
} from "@/lib/server/order-pricing";
import { loadMembershipBenefits } from "@/lib/server/membership";
import { loadActiveFeaturedAttribution } from "@/lib/server/featured-listings";
import {
  releaseOrderReservation,
  reserveOrderStock,
} from "@/lib/server/inventory-reservations";

export const runtime = "nodejs";

interface RequestedLine {
  productId: string;
  quantity: number;
}

function parseRequestedLines(value: unknown): RequestedLine[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    return null;
  }

  const quantities = new Map<string, number>();

  for (const rawLine of value) {
    if (!rawLine || typeof rawLine !== "object") return null;
    const candidate = rawLine as Record<string, unknown>;
    const productId = String(candidate.productId ?? "").trim();
    const quantity = Number(candidate.quantity);

    if (
      !/^[A-Za-z0-9_-]{6,128}$/.test(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) {
      return null;
    }

    const nextQuantity = (quantities.get(productId) ?? 0) + quantity;
    if (nextQuantity > 20) return null;
    quantities.set(productId, nextQuantity);
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

function cleanString(value: unknown, maximum: number): string {
  return String(value ?? "").trim().slice(0, maximum);
}

export async function POST(req: NextRequest) {
  let orderId: string | null = null;

  try {
    const blockedResponse = await applySpamGuard(req, {
      rateLimit: paymentApiRateLimit,
      namespace: "mpesa-stkpush",
    });

    if (blockedResponse) return blockedResponse;

    const authenticatedUser = await getRequestUser(req);
    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Sign in or continue as a guest before checkout." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const idempotencyKey = req.headers.get("idempotency-key")?.trim() ?? "";
    const phone = String(body.phone ?? "").trim();
    const requestedLines = parseRequestedLines(body.lines);
    const deliveryName = cleanString(body.deliveryName, 160);
    const deliveryAddress = cleanString(body.deliveryAddress, 500);
    const deliveryNotes = cleanString(body.deliveryNotes, 500);
    const deliveryZoneId = cleanString(body.deliveryZoneId, 64);

    if (
      !isValidKenyanMobile(phone) ||
      !/^[A-Fa-f0-9-]{16,64}$/.test(idempotencyKey) ||
      !requestedLines ||
      deliveryName.length < 2 ||
      deliveryAddress.length < 8 ||
      !/^[a-z0-9-]{3,64}$/.test(deliveryZoneId)
    ) {
      return NextResponse.json(
        { error: "Enter valid delivery details, select a delivery zone, and review your cart." },
        { status: 400 }
      );
    }

    const productRefs = requestedLines.map(({ productId }) =>
      adminDb.collection("products").doc(productId)
    );
    const productSnapshots = await adminDb.getAll(...productRefs);

    const lines: CartLine[] = [];

    for (let index = 0; index < productSnapshots.length; index += 1) {
      const snapshot = productSnapshots[index];
      const requested = requestedLines[index];

      if (!snapshot.exists) {
        return NextResponse.json(
          { error: "A product in your cart is no longer available." },
          { status: 409 }
        );
      }

      const product = { id: snapshot.id, ...snapshot.data() } as Product;
      if (!product.active || product.stock < requested.quantity) {
        return NextResponse.json(
          { error: `${product.name} does not have enough stock.` },
          { status: 409 }
        );
      }

      if (!Number.isFinite(product.price) || product.price <= 0) {
        return NextResponse.json(
          { error: `${product.name} has an invalid price.` },
          { status: 409 }
        );
      }

      lines.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity: requested.quantity,
      });
    }

    const [settings, economics, membership, featuredAttribution] = await Promise.all([
      loadRevenueSettings(),
      loadProductEconomics(lines.map((line) => line.productId)),
      loadMembershipBenefits(authenticatedUser.uid),
      loadActiveFeaturedAttribution(lines.map((line) => line.productId)),
    ]);
    let pricingBreakdown;
    try {
      pricingBreakdown = calculatePricing(
        lines,
        deliveryZoneId,
        settings,
        economics,
        "mpesa",
        membership,
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "The order pricing is invalid." },
        { status: 400 },
      );
    }
    const total = pricingBreakdown.total;

    if (!Number.isFinite(total) || total <= 0 || total > 500_000) {
      return NextResponse.json(
        { error: "This order total cannot be processed through M-Pesa." },
        { status: 400 }
      );
    }

    const statusToken = randomBytes(32).toString("hex");
    const orderRef = adminDb
      .collection("orders")
      .doc(orderDocumentId(authenticatedUser.uid, idempotencyKey));
    const now = Date.now();

    await adminDb.runTransaction(async (transaction) => {
      const existingOrder = await transaction.get(orderRef);
      if (existingOrder.exists) {
        throw new Error("This checkout attempt has already been submitted.");
      }

      const reservationExpiresAt = await reserveOrderStock(
        transaction,
        orderRef,
        lines,
        authenticatedUser.uid,
        "mpesa",
        now,
      );

      transaction.set(orderRef, {
      userId: authenticatedUser.uid,
      customerEmail:
        typeof authenticatedUser.email === "string"
          ? authenticatedUser.email
          : null,
      customerName:
        typeof authenticatedUser.name === "string"
          ? authenticatedUser.name
          : null,
      isGuest:
        authenticatedUser.firebase?.sign_in_provider === "anonymous",
      lines,
      total,
      phone: normalizeMsisdn(phone),
      deliveryName,
      deliveryAddress,
      deliveryNotes,
      deliveryZoneId: pricingBreakdown.deliveryZoneId,
      deliveryZoneName: pricingBreakdown.deliveryZoneName,
      pricingBreakdown,
      featuredAttribution,
      paymentMethod: "mpesa",
      status: "pending_payment",
      stockReserved: true,
      stockReservationStatus: "reserved",
      stockReservedAt: now,
      stockReservationExpiresAt: reservationExpiresAt,
      statusTokenHash: tokenHash(statusToken),
      createdAt: now,
      updatedAt: now,
      });
    });
    orderId = orderRef.id;

    const stk = await initiateStkPush({
      phone,
      amount: total,
      accountReference: orderRef.id,
      transactionDesc: "Duka order",
    });

    if (stk.ResponseCode !== "0") {
      await releaseOrderReservation(
        orderRef,
        "M-Pesa rejected the payment request.",
        "mpesa-stkpush",
      );
      await orderRef.update({
        status: "failed",
        failureReason: stk.ResponseDescription || "STK request rejected",
        updatedAt: Date.now(),
      });
      return NextResponse.json(
        { error: stk.ResponseDescription || "M-Pesa rejected the payment request." },
        { status: 502 }
      );
    }

    await orderRef.update({
      mpesaCheckoutRequestId: stk.CheckoutRequestID,
      mpesaMerchantRequestId: stk.MerchantRequestID,
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      orderId: orderRef.id,
      statusToken,
      total,
      customerMessage: stk.CustomerMessage,
    });
  } catch (error) {
    const requestError = error as {
      response?: {
        status?: number;
        data?: unknown;
      };
      config?: {
        url?: string;
        method?: string;
      };
    };

    if (
      error instanceof Error &&
      error.message === "This checkout attempt has already been submitted."
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    console.error("STK push error details:", {
      message:
        error instanceof Error
          ? error.message
          : String(error),
      status: requestError.response?.status,
      data: requestError.response?.data,
      url: requestError.config?.url,
      method: requestError.config?.method,
    });

    if (orderId) {
      await releaseOrderReservation(
        adminDb.collection("orders").doc(orderId),
        "M-Pesa payment initialization failed.",
        "mpesa-stkpush",
      ).catch((releaseError) =>
        console.error("Failed to release order reservation:", releaseError)
      );
      await adminDb
        .collection("orders")
        .doc(orderId)
        .update({
          status: "failed",
          failureReason: "stk_initialization_error",
          updatedAt: Date.now(),
        })
        .catch((updateError) =>
          console.error("Failed to mark order as failed:", updateError)
        );
    }

    return NextResponse.json(
      { error: "Payment could not be started. Please try again." },
      { status: 500 }
    );
  }
}
