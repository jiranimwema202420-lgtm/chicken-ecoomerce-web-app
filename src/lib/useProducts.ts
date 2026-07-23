"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase";
import { Product } from "@/lib/types";

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string;
}

function useProductsQuery(activeOnly: boolean): ProductsState {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      setError("Firebase is not configured. Copy .env.example to .env.local and add your Firebase web app settings.");
      return;
    }

    const productsQuery = activeOnly
      ? query(
          collection(db, "products"),
          where("active", "==", true),
          orderBy("createdAt", "desc")
        )
      : query(collection(db, "products"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      productsQuery,
      (snapshot) => {
        setProducts(
          snapshot.docs.map(
            (product) => ({ id: product.id, ...product.data() }) as Product
          )
        );
        setLoading(false);
        setError("");
      },
      (snapshotError) => {
        console.error("Product subscription failed:", snapshotError);
        setLoading(false);
        setError(
          snapshotError.code === "failed-precondition"
            ? "The product query needs a Firestore index. Open the Firebase console link shown in your browser console to create it."
            : "Products could not be loaded. Check your Firebase configuration and internet connection."
        );
      }
    );

    return unsubscribe;
  }, [activeOnly]);

  return { products, loading, error };
}

/** Live list of storefront-visible products, newest first. */
export function useActiveProducts(): ProductsState {
  return useProductsQuery(true);
}

/** Live list of every product, for the admin dashboard. */
export function useAllProducts(): ProductsState {
  return useProductsQuery(false);
}
