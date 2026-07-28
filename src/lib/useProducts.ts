"use client";

import { useMemo } from "react";
import type { Product } from "@/lib/types";
import { useInventoryStore } from "@/store/inventory-store";

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string;
  syncedAt: number | null;
}

interface ProductState {
  product: Product | null;
  loading: boolean;
  error: string;
  syncedAt: number | null;
}

function useProductsQuery(activeOnly: boolean): ProductsState {
  const products = useInventoryStore((state) => state.products);
  const loading = useInventoryStore((state) => state.loading);
  const error = useInventoryStore((state) => state.error);
  const syncedAt = useInventoryStore((state) => state.syncedAt);

  const filteredProducts = useMemo(
    () =>
      activeOnly
        ? products.filter((product) => product.active)
        : products,
    [activeOnly, products]
  );

  return {
    products: filteredProducts,
    loading,
    error,
    syncedAt,
  };
}

export function useActiveProducts(): ProductsState {
  return useProductsQuery(true);
}

export function useAllProducts(): ProductsState {
  return useProductsQuery(false);
}

export function useProduct(productId: string): ProductState {
  const products = useInventoryStore((state) => state.products);
  const loading = useInventoryStore((state) => state.loading);
  const error = useInventoryStore((state) => state.error);
  const syncedAt = useInventoryStore((state) => state.syncedAt);

  const product = useMemo(
    () =>
      products.find(
        (candidate) => candidate.id === productId
      ) ?? null,
    [productId, products]
  );

  return {
    product,
    loading,
    error,
    syncedAt,
  };
}