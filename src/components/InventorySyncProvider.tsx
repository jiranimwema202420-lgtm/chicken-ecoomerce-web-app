"use client";

import {
  type ReactNode,
  useEffect,
} from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import {
  db,
  isFirebaseConfigured,
} from "@/lib/firebase";
import type { Product } from "@/lib/types";
import { useCartStore } from "@/store/cart-store";
import { useInventoryStore } from "@/store/inventory-store";

interface InventorySyncProviderProps {
  children: ReactNode;
}

export default function InventorySyncProvider({
  children,
}: InventorySyncProviderProps) {
  const {
    isAdmin,
    loading: authLoading,
  } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!isFirebaseConfigured) {
      useInventoryStore
        .getState()
        .setError(
          "Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* values."
        );
      return;
    }

    useInventoryStore.getState().setLoading(true);

    const productsQuery = isAdmin
      ? query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        )
      : query(
          collection(db, "products"),
          where("active", "==", true),
          orderBy("createdAt", "desc")
        );

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        const products = snapshot.docs.map(
          (document) =>
            ({
              id: document.id,
              ...document.data(),
            }) as Product
        );

        useInventoryStore
          .getState()
          .replaceProducts(products);

        useCartStore
          .getState()
          .reconcileWithProducts(products);
      },
      (snapshotError) => {
        console.error(
          "Global inventory subscription failed:",
          snapshotError
        );

        useInventoryStore
          .getState()
          .setError(
            snapshotError.code === "failed-precondition"
              ? "The product query requires a Firestore index."
              : "Live inventory could not be loaded."
          );
      }
    );

    return unsubscribe;
  }, [authLoading, isAdmin]);

  return children;
}