"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLine, Product } from "@/lib/types";

interface CartState {
  lines: CartLine[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  reconcileWithProducts: (products: Product[]) => void;
  replaceWithVerifiedLines: (lines: CartLine[]) => void;
  clear: () => void;
  total: () => number;
}

function clampQuantity(quantity: number, maxQuantity?: number): number {
  const maximum = Math.max(1, Math.trunc(maxQuantity ?? 99));
  const requested = Math.max(1, Math.trunc(Number(quantity) || 1));

  return Math.min(maximum, requested);
}

function linesAreEqual(left: CartLine[], right: CartLine[]): boolean {
  if (left.length !== right.length) return false;

  return left.every((line, index) => {
    const other = right[index];

    return (
      other &&
      line.productId === other.productId &&
      line.name === other.name &&
      line.price === other.price &&
      line.imageUrl === other.imageUrl &&
      line.quantity === other.quantity &&
      line.maxQuantity === other.maxQuantity
    );
  });
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],

      addItem: (product, quantity = 1) => {
        if (!product.active || product.stock <= 0) return;

        const currentLines = get().lines;
        const existing = currentLines.find(
          (line) => line.productId === product.id
        );
        const requestedQuantity = existing
          ? existing.quantity + quantity
          : quantity;
        const safeQuantity = clampQuantity(
          requestedQuantity,
          product.stock
        );

        if (existing) {
          set({
            lines: currentLines.map((line) =>
              line.productId === product.id
                ? {
                    ...line,
                    name: product.name,
                    price: product.price,
                    imageUrl: product.imageUrl,
                    quantity: safeQuantity,
                    maxQuantity: product.stock,
                  }
                : line
            ),
          });
          return;
        }

        set({
          lines: [
            ...currentLines,
            {
              productId: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              quantity: safeQuantity,
              maxQuantity: product.stock,
            },
          ],
        });
      },

      removeItem: (productId) =>
        set({
          lines: get().lines.filter(
            (line) => line.productId !== productId
          ),
        }),

      setQuantity: (productId, quantity) =>
        set({
          lines: get().lines.map((line) =>
            line.productId === productId
              ? {
                  ...line,
                  quantity: clampQuantity(
                    quantity,
                    line.maxQuantity
                  ),
                }
              : line
          ),
        }),

      reconcileWithProducts: (products) => {
        const productsById = new Map(
          products.map((product) => [product.id, product])
        );
        const currentLines = get().lines;
        const nextLines: CartLine[] = [];

        for (const line of currentLines) {
          const product = productsById.get(line.productId);

          if (!product || !product.active || product.stock <= 0) {
            continue;
          }

          nextLines.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            quantity: clampQuantity(
              line.quantity,
              product.stock
            ),
            maxQuantity: product.stock,
          });
        }

        if (!linesAreEqual(currentLines, nextLines)) {
          set({ lines: nextLines });
        }
      },

      replaceWithVerifiedLines: (lines) =>
        set({
          lines: lines.slice(0, 30).map((line) => ({
            ...line,
            quantity: clampQuantity(line.quantity, line.maxQuantity),
          })),
        }),

      clear: () => set({ lines: [] }),

      total: () =>
        get().lines.reduce(
          (sum, line) => sum + line.price * line.quantity,
          0
        ),
    }),
    {
      name: "duka-cart",
      version: 1,
    }
  )
);
