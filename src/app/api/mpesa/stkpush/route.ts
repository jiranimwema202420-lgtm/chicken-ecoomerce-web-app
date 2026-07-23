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

export async function POST(req: NextRequest) {
  let orderId: string | null = null;

  try {
    const authenticatedUser = await getRequestUser(req);
    if (!authenticatedUser) {
      return NextResponse.json(
        { error: "Sign in or continue as a guest before checkout." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const phone = String(body.phone ?? "").trim();
    const requestedLines = parseRequestedLines(body.lines);

    if (!isValidKenyanMobile(phone) || !requestedLines) {
      return NextResponse.json(
        { error: "Enter a valid Kenyan mobile number and review your cart." },
        { status: 400 }
      );
    }

    const productRefs = requestedLines.map(({ productId }) =>
      adminDb.collection("products").doc(productId)
    );
    const productSnapshots = await adminDb.getAll(...productRefs);

    const lines: CartLine[] = [];
    let total = 0;

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
      total += product.price * requested.quantity;
    }

    if (!Number.isFinite(total) || total <= 0 || total > 500_000) {
      return NextResponse.json(
        { error: "This order total cannot be processed through M-Pesa." },
        { status: 400 }
      );
    }

    const statusToken = randomBytes(32).toString("hex");
    const orderRef = adminDb.collection("orders").doc();
    orderId = orderRef.id;
    const now = Date.now();

    await orderRef.set({
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
      status: "pending_payment",
      statusTokenHash: tokenHash(statusToken),
      createdAt: now,
      updatedAt: now,
    });

    const stk = await initiateStkPush({
      phone,
      amount: total,
      accountReference: orderRef.id,
      transactionDesc: "Duka order",
    });

    if (stk.ResponseCode !== "0") {
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
    console.error("STK push error:", error);

    if (orderId) {
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
