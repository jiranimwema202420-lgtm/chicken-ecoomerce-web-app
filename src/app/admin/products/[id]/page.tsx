"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Product } from "@/lib/types";
import ProductForm from "@/components/admin/ProductForm";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const snap = await getDoc(doc(db, "products", id));
      if (snap.exists()) setProduct({ id: snap.id, ...snap.data() } as Product);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <p className="text-sm text-ink/60">Loading…</p>;
  if (!product) return <p className="text-sm text-ink/60">Product not found.</p>;

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl font-bold">Edit product</h1>
      <ProductForm product={product} />
    </div>
  );
}
