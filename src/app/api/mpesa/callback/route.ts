import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { CartLine } from "@/lib/types";
import { getPostHogClient } from "@/lib/posthog-server";

export const runtime = "nodejs";

interface CallbackItem {
  Name: string;
  Value?: string | number;
}

/**
 * Safaricom posts here after the customer accepts, rejects, or times out on
 * the STK prompt. Always acknowledge the callback to prevent repeated retries.
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

    if (!checkoutRequestId) {
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const ordersSnapshot = await adminDb
      .collection("orders")
      .where("mpesaCheckoutRequestId", "==", checkoutRequestId)
      .limit(1)
      .get();

    if (ordersSnapshot.empty) {
      console.warn("No matching order for CheckoutRequestID:", checkoutRequestId);
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Ignored" });
    }

    const orderRef = ordersSnapshot.docs[0].ref;
    const preOrderData = ordersSnapshot.docs[0].data();
    const metadataItems: CallbackItem[] = callback.CallbackMetadata?.Item ?? [];
    const metadataValue = (name: string) =>
      metadataItems.find((item) => item.Name === name)?.Value;

    let transactionProcessed = false;

    await adminDb.runTransaction(async (transaction) => {
      const orderSnapshot = await transaction.get(orderRef);
      if (!orderSnapshot.exists) return;

      const order = orderSnapshot.data();
      if (!order || order.status === "paid") return;

      transactionProcessed = true;

      if (resultCode !== 0) {
        transaction.update(orderRef, {
          status: "failed",
          mpesaResultCode: resultCode,
          mpesaResultDescription: resultDescription,
          updatedAt: Date.now(),
        });
        return;
      }

      const lines = Array.isArray(order.lines) ? (order.lines as CartLine[]) : [];
      const productRefs = lines.map((line) =>
        adminDb.collection("products").doc(line.productId)
      );
      const productSnapshots = [];

      for (const productRef of productRefs) {
        productSnapshots.push(await transaction.get(productRef));
      }

      productSnapshots.forEach((productSnapshot, index) => {
        if (!productSnapshot.exists) return;
        const currentStock = Number(productSnapshot.data()?.stock ?? 0);
        const purchased = Number(lines[index]?.quantity ?? 0);
        transaction.update(productSnapshot.ref, {
          stock: Math.max(0, currentStock - purchased),
          updatedAt: Date.now(),
        });
      });

      transaction.update(orderRef, {
        status: "paid",
        mpesaResultCode: resultCode,
        mpesaResultDescription: resultDescription,
        mpesaReceiptNumber: metadataValue("MpesaReceiptNumber") ?? null,
        mpesaPaidAmount: Number(metadataValue("Amount") ?? order.total),
        mpesaTransactionDate: metadataValue("TransactionDate") ?? null,
        paidAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    if (transactionProcessed && preOrderData) {
      const posthogClient = getPostHogClient();
      if (resultCode !== 0) {
        posthogClient?.capture({
          distinctId: preOrderData.userId,
          event: "payment_failed",
          properties: {
            order_id: orderRef.id,
            result_code: resultCode,
            result_description: resultDescription,
          },
        });
      } else {
        posthogClient?.capture({
          distinctId: preOrderData.userId,
          event: "order_paid",
          properties: {
            order_id: orderRef.id,
            total: preOrderData.total,
            mpesa_receipt: metadataValue("MpesaReceiptNumber") ?? null,
            mpesa_amount: Number(metadataValue("Amount") ?? preOrderData.total),
          },
        });
      }
      await posthogClient?.flush();
    }

    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  } catch (error) {
    console.error("M-Pesa callback error:", error);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
  }
}
