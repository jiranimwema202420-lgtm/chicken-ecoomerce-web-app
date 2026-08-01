import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { CartLine, Product } from "@/lib/types";

export const runtime = "nodejs";

interface CallbackItem {
  Name: string;
  Value?: string | number;
}

/**
 * Safaricom posts here after the customer accepts, rejects, or times out on
 * the STK prompt. Stock and sales-ledger writes are performed in the same
 * Firestore transaction as the paid-order update, making the callback
 * idempotent when Safaricom retries it.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const callback = body?.Body?.stkCallback;

    if (!callback) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const checkoutRequestId = String(callback.CheckoutRequestID ?? "");
    const resultCode = Number(callback.ResultCode);
    const resultDescription = String(callback.ResultDesc ?? "");

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(checkoutRequestId)) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const ordersSnapshot = await adminDb
      .collection("orders")
      .where("mpesaCheckoutRequestId", "==", checkoutRequestId)
      .limit(1)
      .get();

    if (ordersSnapshot.empty) {
      console.warn(
        "No matching order for CheckoutRequestID:",
        checkoutRequestId
      );
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const orderRef = ordersSnapshot.docs[0].ref;
    const metadataItems: CallbackItem[] =
      callback.CallbackMetadata?.Item ?? [];
    const metadataValue = (name: string) =>
      metadataItems.find((item) => item.Name === name)?.Value;

    await adminDb.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);

      if (!orderSnapshot.exists) return;

      const order = orderSnapshot.data();

      // A paid order has already had its stock and ledger applied.
      if (!order || order.status === "paid") return;

      const now = Date.now();

      if (resultCode !== 0) {
        transaction.update(orderRef, {
          status: "failed",
          mpesaResultCode: resultCode,
          mpesaResultDescription: resultDescription,
          updatedAt: now,
        });
        return;
      }

      const receiptNumber = String(
        metadataValue("MpesaReceiptNumber") ?? ""
      ).trim();
      const paidAmount = Number(metadataValue("Amount"));
      const paidPhone = String(metadataValue("PhoneNumber") ?? "")
        .replace(/\D/g, "");
      const expectedPhone = String(order.phone ?? "").replace(/\D/g, "");
      const expectedTotal = Number(order.total);

      if (
        !/^[A-Za-z0-9]{6,64}$/.test(receiptNumber) ||
        !Number.isFinite(paidAmount) ||
        !Number.isFinite(expectedTotal) ||
        Math.abs(paidAmount - expectedTotal) > 0.01 ||
        (expectedPhone && paidPhone !== expectedPhone)
      ) {
        throw new Error("M-Pesa callback metadata did not match the order.");
      }

      const receiptRef = adminDb
        .collection("mpesaReceipts")
        .doc(receiptNumber);

      transaction.create(receiptRef, {
        orderId: orderRef.id,
        checkoutRequestId,
        amount: paidAmount,
        phone: paidPhone || null,
        createdAt: now,
      });

      const lines = Array.isArray(order.lines)
        ? (order.lines as CartLine[])
        : [];
      const productRefs = lines.map((line) =>
        adminDb.collection("products").doc(line.productId)
      );
      const productSnapshots = [];

      for (const productRef of productRefs) {
        productSnapshots.push(await transaction.get(productRef));
      }

      const shortageLines: Array<{
        productId: string;
        productName: string;
        requested: number;
        deducted: number;
        shortage: number;
      }> = [];

      productSnapshots.forEach((productSnapshot, index) => {
        if (!productSnapshot.exists) return;

        const line = lines[index];
        const product = {
          id: productSnapshot.id,
          ...productSnapshot.data(),
        } as Product;
        const stockBefore = Math.max(
          0,
          Math.trunc(Number(product.stock ?? 0))
        );
        const purchased = Math.max(
          0,
          Math.trunc(Number(line?.quantity ?? 0))
        );
        const deducted = Math.min(stockBefore, purchased);
        const shortage = Math.max(0, purchased - deducted);
        const stockAfter = stockBefore - deducted;
        const movementRef = adminDb
          .collection("inventoryMovements")
          .doc();

        transaction.update(productSnapshot.ref, {
          stock: stockAfter,
          updatedAt: now,
        });

        transaction.set(movementRef, {
          productId: product.id,
          productName: line?.name || product.name,
          type: "online_sale",
          channel: "online",
          quantityDelta: -deducted,
          saleQuantity: purchased,
          shortageQuantity: shortage,
          stockBefore,
          stockAfter,
          unitPrice: Number(line?.price ?? product.price ?? 0),
          saleAmount:
            Number(line?.price ?? product.price ?? 0) * purchased,
          orderId: orderRef.id,
          offlineSaleId: null,
          supplierId: null,
          supplierName: null,
          supplyRequestId: null,
          customerName: order.customerName ?? null,
          customerEmail: order.customerEmail ?? null,
          paymentMethod: "mpesa",
          paymentReference: receiptNumber || null,
          reason: "Paid online cart order.",
          createdBy: order.userId ?? "mpesa-callback",
          createdAt: now,
        });

        if (shortage > 0) {
          shortageLines.push({
            productId: product.id,
            productName: line?.name || product.name,
            requested: purchased,
            deducted,
            shortage,
          });
        }
      });

      transaction.update(orderRef, {
        status: "paid",
        channel: "online",
        inventoryAppliedAt: now,
        inventoryShortage: shortageLines.length > 0,
        inventoryShortageLines: shortageLines,
        mpesaResultCode: resultCode,
        mpesaResultDescription: resultDescription,
        mpesaReceiptNumber: receiptNumber || null,
        mpesaPaidAmount: paidAmount,
        mpesaTransactionDate:
          metadataValue("TransactionDate") ?? null,
        paidAt: now,
        updatedAt: now,
      });
    });

    return NextResponse.json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  } catch (error) {
    console.error("M-Pesa callback error:", error);

    return NextResponse.json(
      {
        ResultCode: 1,
        ResultDesc: "Processing failed",
      },
      { status: 500 }
    );
  }
}
