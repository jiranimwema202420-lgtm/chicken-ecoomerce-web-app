"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Product } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

interface Props {
  product?: Product;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [category, setCategory] = useState(product?.category ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(product?.imageUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function onImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Choose a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setError("Product images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setError("");
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!isAdmin) {
      setError("Administrator access is required.");
      return;
    }

    const cleanName = name.trim();
    const cleanDescription = description.trim();
    const cleanCategory = category.trim();

    if (!cleanName || !cleanDescription) {
      setError("Name and description are required.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Enter a valid product price greater than zero.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a whole number of zero or more.");
      return;
    }

    if (!product && !imageFile) {
      setError("Choose a product image.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = product?.imageUrl ?? "";

      if (imageFile) {
        const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const storageRef = ref(storage, `products/${Date.now()}-${safeFileName}`);
        await uploadBytes(storageRef, imageFile, { contentType: imageFile.type });
        imageUrl = await getDownloadURL(storageRef);
      }

      const data = {
        name: cleanName,
        description: cleanDescription,
        price: Number(price),
        stock: Number(stock),
        category: cleanCategory,
        active,
        imageUrl,
        updatedAt: Date.now(),
      };

      if (product) {
        await updateDoc(doc(db, "products", product.id), data);
      } else {
        await addDoc(collection(db, "products"), {
          ...data,
          createdAt: Date.now(),
        });
      }

      router.push("/admin/products");
      router.refresh();
    } catch (saveError) {
      console.error("Product save failed:", saveError);
      setError(saveError instanceof Error ? saveError.message : "Failed to save product.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5 p-5 sm:p-7">
      <div>
        <label htmlFor="product-image" className="mb-2 block text-sm font-semibold">Product image</label>
        {preview && (
          <div className="relative mb-3 aspect-[4/3] w-full max-w-xs overflow-hidden rounded-lg border border-line bg-line">
            <Image src={preview} alt="Product preview" fill className="object-cover" sizes="320px" />
          </div>
        )}
        <input
          id="product-image"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={onImageChange}
          className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-forest file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-forest-light"
        />
        <p className="mt-2 text-xs text-ink/50">PNG, JPG, WEBP, or GIF. Maximum 5 MB.</p>
      </div>

      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-semibold">Name</label>
        <input id="name" required className="input-field" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-semibold">Description</label>
        <textarea
          id="description"
          required
          rows={5}
          className="input-field resize-y"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className="mb-2 block text-sm font-semibold">Price (KES)</label>
          <input
            id="price"
            required
            type="number"
            min={1}
            step="1"
            className="input-field"
            value={price}
            onChange={(event) => setPrice(Number(event.target.value))}
          />
        </div>
        <div>
          <label htmlFor="stock" className="mb-2 block text-sm font-semibold">Stock</label>
          <input
            id="stock"
            required
            type="number"
            min={0}
            step="1"
            className="input-field"
            value={stock}
            onChange={(event) => setStock(Number(event.target.value))}
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-semibold">Category</label>
        <input id="category" className="input-field" placeholder="e.g. Apparel" value={category} onChange={(event) => setCategory(event.target.value)} />
      </div>

      <label className="flex items-center gap-3 rounded-md border border-line bg-canvas/60 p-4 text-sm font-semibold">
        <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-forest" />
        Visible on storefront
      </label>

      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className="btn-secondary" onClick={() => router.push("/admin/products")}>Cancel</button>
        <button type="submit" disabled={saving || !isAdmin} className="btn-primary">
          {saving ? "Saving…" : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
