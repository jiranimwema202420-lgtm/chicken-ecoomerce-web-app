import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";

const MAX_QUANTITY = 10_000;
const MAX_PRICE = 500_000;
const PAYMENT_METHODS = [
  "cash",
  "mpesa",
  "bank",
  "credit",
  "other",
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export async function POST(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const productId = String(body.productId ?? "").trim();
    const quantity = Number(body.quantity);
    const unitPrice = Number(body.unitPrice);
    const customerName = String(body.customerName ?? "")
      .trim()
      .slice(0, 120);
    const paymentMethod = String(
      body.paymentMethod ?? ""
    ).trim() as PaymentMethod;
    const paymentReference = String(
      body.paymentReference ?? ""
    )
      .trim()
      .slice(0, 120);
    const notes = String(body.notes ?? "").trim().slice(0, 500);

    if (
      !/^[A-Za-z0-9_-]{6,128}$/.test(productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0 ||
      unitPrice > MAX_PRICE ||
      !PAYMENT_METHODS.includes(paymentMethod)
    ) {
      return NextResponse.json(
        { error: "Enter valid off-app sale details." },
        { status: 400 }
      );
    }

    const productRef = adminDb.collection("products").doc(productId);
    const saleRef = adminDb.collection("offlineSales").doc();
    const movementRef = adminDb
      .collection("inventoryMovements")
      .doc();
    const now = Date.now();

    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(productRef);

      if (!snapshot.exists) {
        throw new Error("Product not found.");
      }

      const product = {
        id: snapshot.id,
        ...snapshot.data(),
      } as Product;
      const stockBefore = Math.max(
        0,
        Math.trunc(Number(product.stock ?? 0))
      );

      if (quantity > stockBefore) {
        throw new Error(
          `${product.name} has only ${stockBefore} unit${
            stockBefore === 1 ? "" : "s"
          } available.`
        );
      }

      const stockAfter = stockBefore - quantity;
      const saleAmount = Math.round(unitPrice * quantity);
      const saleNumber = `OFF-${new Date(now)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, "")}-${saleRef.id.slice(0, 6).toUpperCase()}`;

      const sale = {
        saleNumber,
        channel: "offline",
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice: Math.round(unitPrice),
        total: saleAmount,
        customerName: customerName || null,
        paymentMethod,
        paymentReference: paymentReference || null,
        notes,
        soldBy: admin.uid,
        createdAt: now,
        updatedAt: now,
      };

      const movement = {
        productId: product.id,
        productName: product.name,
        type: "offline_sale",
        channel: "offline",
        quantityDelta: -quantity,
        saleQuantity: quantity,
        shortageQuantity: 0,
        stockBefore,
        stockAfter,
        unitPrice: Math.round(unitPrice),
        saleAmount,
        orderId: null,
        offlineSaleId: saleRef.id,
        supplierId: null,
        supplierName: null,
        supplyRequestId: null,
        customerName: customerName || null,
        customerEmail: null,
        paymentMethod,
        paymentReference: paymentReference || null,
        reason: notes || "Off-app sale recorded by administrator.",
        createdBy: admin.uid,
        createdAt: now,
      };

      transaction.update(productRef, {
        stock: stockAfter,
        updatedAt: now,
      });
      transaction.set(saleRef, sale);
      transaction.set(movementRef, movement);

      return {
        product: {
          ...product,
          stock: stockAfter,
          updatedAt: now,
        },
        sale: {
          id: saleRef.id,
          ...sale,
        },
        movement: {
          id: movementRef.id,
          ...movement,
        },
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The off-app sale could not be recorded.";

    console.error("Off-app sale failed:", error);

    return NextResponse.json(
      { error: message },
      {
        status:
          message.includes("available") ||
          message.includes("not found")
            ? 409
            : 500,
      }
    );
  }
}