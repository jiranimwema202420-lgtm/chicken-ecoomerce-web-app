import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import type { Product } from "@/lib/types";

export const runtime = "nodejs";

type InventoryAction =
  | "set"
  | "adjust"
  | "increase"
  | "decrease"
  | "restock"
  | "sale"
  | "correction"
  | "received";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAction(value: unknown): InventoryAction {
  const action = cleanText(value, 32).toLowerCase();

  if (["set", "adjust", "increase", "decrease", "restock", "sale", "correction", "received"].includes(action)) {
    return action as InventoryAction;
  }

  if (["add", "stock_in", "purchase", "supplier_receipt"].includes(action)) {
    return "increase";
  }

  if (["remove", "stock_out", "external_sale", "offline_sale"].includes(action)) {
    return "sale";
  }

  return "adjust";
}

function normalizeProduct(
  id: string,
  data: FirebaseFirestore.DocumentData
): Product {
  return {
    id,
    name: cleanText(data.name, 160),
    description: cleanText(data.description, 2000),
    price: Number(data.price ?? 0),
    imageUrl: cleanText(data.imageUrl, 1000),
    category: cleanText(data.category, 100),
    stock: Math.max(0, Math.trunc(Number(data.stock ?? 0))),
    active: data.active !== false,
    createdAt: Number(data.createdAt ?? 0),
    updatedAt: Number(data.updatedAt ?? 0),
  };
}

function inventoryRow(product: Product) {
  const stockValue = product.stock * product.price;

  return {
    ...product,
    productId: product.id,
    productName: product.name,
    currentStock: product.stock,
    unitPrice: product.price,
    stockValue,
    inventoryValue: stockValue,
  };
}

function adminRequired() {
  return NextResponse.json(
    { error: "Administrator access is required." },
    { status: 403 }
  );
}

export async function GET(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return adminRequired();
  }

  try {
    const [productSnapshot, movementSnapshot] = await Promise.all([
      adminDb.collection("products").get(),
      adminDb
        .collection("inventoryMovements")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get(),
    ]);

    const products = productSnapshot.docs
      .map((document) => normalizeProduct(document.id, document.data()))
      .sort((a, b) => a.name.localeCompare(b.name));

    const inventory = products.map(inventoryRow);
    const movements = movementSnapshot.docs.map((document) => ({
      id: document.id,
      ...document.data(),
    }));

    const totalUnits = products.reduce(
      (sum, product) => sum + product.stock,
      0
    );

    const totalValue = products.reduce(
      (sum, product) => sum + product.stock * product.price,
      0
    );

    return NextResponse.json({
      products,
      inventory,
      movements,
      summary: {
        totalProducts: products.length,
        activeProducts: products.filter((product) => product.active).length,
        totalUnits,
        totalValue,
        inventoryValue: totalValue,
        lowStockCount: products.filter(
          (product) => product.stock > 0 && product.stock <= 5
        ).length,
        outOfStockCount: products.filter(
          (product) => product.stock === 0
        ).length,
      },
    });
  } catch (error) {
    console.error("Inventory loading failed:", error);
    return NextResponse.json(
      { error: "Inventory data could not be loaded." },
      { status: 500 }
    );
  }
}

async function mutateInventory(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return adminRequired();
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const productId = cleanText(body.productId ?? body.id, 128);
    const action = normalizeAction(
      body.action ?? body.type ?? body.movementType ?? body.operation
    );
    const quantity = numberOrNull(
      body.quantity ?? body.adjustment ?? body.delta ?? body.units
    );
    const explicitStock = numberOrNull(
      body.newStock ?? body.stock ?? body.currentStock ?? body.targetStock
    );
    const note = cleanText(body.note ?? body.reason ?? body.notes, 1000);
    const source = cleanText(body.source ?? body.channel ?? "admin", 80);
    const referenceId =
      cleanText(
        body.referenceId ?? body.orderId ?? body.supplyRequestId,
        128
      ) || null;

    if (!/^[A-Za-z0-9_-]{6,128}$/.test(productId)) {
      return NextResponse.json(
        { error: "A valid product ID is required." },
        { status: 400 }
      );
    }

    if (quantity === null && explicitStock === null) {
      return NextResponse.json(
        { error: "Enter a quantity or the new stock balance." },
        { status: 400 }
      );
    }

    if (
      quantity !== null &&
      (!Number.isInteger(quantity) || Math.abs(quantity) > 1000000)
    ) {
      return NextResponse.json(
        { error: "Quantity must be a whole number within range." },
        { status: 400 }
      );
    }

    if (
      explicitStock !== null &&
      (!Number.isInteger(explicitStock) ||
        explicitStock < 0 ||
        explicitStock > 1000000)
    ) {
      return NextResponse.json(
        { error: "New stock must be a non-negative whole number." },
        { status: 400 }
      );
    }

    const productRef = adminDb.collection("products").doc(productId);
    const movementRef = adminDb.collection("inventoryMovements").doc();

    const result = await adminDb.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(productRef);

      if (!snapshot.exists) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      const product = normalizeProduct(snapshot.id, snapshot.data() ?? {});
      const previousStock = product.stock;
      let newStock: number;

      if (action === "set" || explicitStock !== null) {
        newStock = explicitStock ?? Math.max(0, Math.trunc(quantity ?? 0));
      } else {
        const absoluteQuantity = Math.abs(Math.trunc(quantity ?? 0));

        if (action === "sale" || action === "decrease") {
          newStock = previousStock - absoluteQuantity;
        } else if (
          action === "increase" ||
          action === "restock" ||
          action === "received"
        ) {
          newStock = previousStock + absoluteQuantity;
        } else {
          newStock = previousStock + Math.trunc(quantity ?? 0);
        }
      }

      if (newStock < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      const now = Date.now();
      const delta = newStock - previousStock;
      const movement = {
        productId,
        productName: product.name,
        action,
        quantity: Math.abs(delta),
        delta,
        previousStock,
        newStock,
        unitPrice: product.price,
        valueChange: delta * product.price,
        source,
        note,
        referenceId,
        createdBy: admin.uid,
        createdAt: now,
      };

      transaction.update(productRef, {
        stock: newStock,
        updatedAt: now,
      });
      transaction.set(movementRef, movement);

      return {
        product: {
          ...product,
          stock: newStock,
          updatedAt: now,
        },
        movement: {
          id: movementRef.id,
          ...movement,
        },
      };
    });

    return NextResponse.json({
      ...result,
      inventory: inventoryRow(result.product),
      message: `Stock updated from ${result.movement.previousStock} to ${result.movement.newStock}.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "PRODUCT_NOT_FOUND") {
      return NextResponse.json(
        { error: "The selected product no longer exists." },
        { status: 404 }
      );
    }

    if (message === "INSUFFICIENT_STOCK") {
      return NextResponse.json(
        { error: "This operation would make stock negative." },
        { status: 409 }
      );
    }

    console.error("Inventory update failed:", error);
    return NextResponse.json(
      { error: "Inventory could not be updated." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  return mutateInventory(request);
}

export async function POST(request: NextRequest) {
  return mutateInventory(request);
}