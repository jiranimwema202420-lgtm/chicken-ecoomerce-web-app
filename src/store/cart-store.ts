"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CartLine, Product } from "@/lib/types";

interface CartState {
  lines: CartLine[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  total: () => number;
}

function clampQuantity(quantity: number, maxQuantity?: number): number {
  const maximum = Math.max(1, maxQuantity ?? 99);
  return Math.min(maximum, Math.max(1, Math.floor(quantity || 1)));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      addItem: (product, quantity = 1) => {
        if (product.stock <= 0) return;

        const existing = get().lines.find((line) => line.productId === product.id);
        const requestedQuantity = existing
          ? existing.quantity + quantity
          : quantity;
        const safeQuantity = clampQuantity(requestedQuantity, product.stock);

        if (existing) {
          set({
            lines: get().lines.map((line) =>
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
            ...get().lines,
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
        set({ lines: get().lines.filter((line) => line.productId !== productId) }),
      setQuantity: (productId, quantity) =>
        set({
          lines: get().lines.map((line) =>
            line.productId === productId
              ? {
                  ...line,
                  quantity: clampQuantity(quantity, line.maxQuantity),
                }
              : line
          ),
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
