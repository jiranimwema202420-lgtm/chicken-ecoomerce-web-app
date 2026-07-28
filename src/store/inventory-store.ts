"use client";

import { create } from "zustand";
import type { Product } from "@/lib/types";

interface InventoryState {
  products: Product[];
  loading: boolean;
  error: string;
  syncedAt: number | null;
  setLoading: (loading: boolean) => void;
  replaceProducts: (products: Product[]) => void;
  setError: (error: string) => void;
  clear: () => void;
}

export const useInventoryStore = create<InventoryState>((set) => ({
  products: [],
  loading: true,
  error: "",
  syncedAt: null,

  setLoading: (loading) => set({ loading }),

  replaceProducts: (products) =>
    set({
      products,
      loading: false,
      error: "",
      syncedAt: Date.now(),
    }),

  setError: (error) =>
    set({
      error,
      loading: false,
    }),

  clear: () =>
    set({
      products: [],
      loading: true,
      error: "",
      syncedAt: null,
    }),
}));