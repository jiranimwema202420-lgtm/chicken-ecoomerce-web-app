import "server-only";

import { cache } from "react";

import type { Product } from "@/lib/types";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function timestampToMillis(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }

  return 0;
}

function normalizeProduct(
  id: string,
  data: Record<string, unknown>,
): Product {
  return {
    id,
    name: cleanText(data.name, 160),
    description: cleanText(data.description, 2000),
    price: Math.max(0, Number(data.price ?? 0)),
    imageUrl: cleanText(data.imageUrl, 1000),
    category: cleanText(data.category, 100),
    stock: Math.max(0, Math.trunc(Number(data.stock ?? 0))),
    active: data.active !== false,
    createdAt: timestampToMillis(data.createdAt),
    updatedAt: timestampToMillis(data.updatedAt),
  };
}

function isSafeProductId(productId: string): boolean {
  return /^[A-Za-z0-9_-]{1,128}$/.test(productId);
}

export const getPublicProduct = cache(
  async (productId: string): Promise<Product | null> => {
    if (!isSafeProductId(productId)) {
      return null;
    }

    const { adminDb } = await import("@/lib/firebaseAdmin");
    const snapshot = await adminDb
      .collection("products")
      .doc(productId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    const product = normalizeProduct(
      snapshot.id,
      snapshot.data() as Record<string, unknown>,
    );

    return product.active ? product : null;
  },
);

export const getPublicProducts = cache(async (): Promise<Product[]> => {
  const { adminDb } = await import("@/lib/firebaseAdmin");
  const snapshot = await adminDb
    .collection("products")
    .where("active", "==", true)
    .get();

  return snapshot.docs
    .map((document) =>
      normalizeProduct(
        document.id,
        document.data() as Record<string, unknown>,
      ),
    )
    .filter((product) => product.active && product.name.length > 0)
    .sort((left, right) => right.updatedAt - left.updatedAt);
});
