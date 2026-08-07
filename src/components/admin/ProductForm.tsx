"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { auth, db, isFirebaseConfigured, storage } from "@/lib/firebase";
import { Product } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";

interface Props {
  product?: Product;
}

type ImageSource = "link" | "upload";
type StorageCheckState = "idle" | "checking" | "ok" | "error";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FALLBACK_IMAGE = "/placeholder.svg";
const UPLOAD_TIMEOUT_MS = 90_000;
const STALLED_UPLOAD_TIMEOUT_MS = 20_000;
const STORAGE_PREFLIGHT_TIMEOUT_MS = 10_000;

function normalizeStorageBucket(value: string | undefined): string {
  const bucket = (value ?? "").trim();

  if (!bucket) {
    return "";
  }

  return bucket.replace(/^gs:\/\//, "");
}

async function assertStorageReachable(bucket: string): Promise<void> {
  if (!bucket) {
    throw new Error("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is missing. Use Image link/path or configure Firebase Storage.");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), STORAGE_PREFLIGHT_TIMEOUT_MS);

  try {
    const probeUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?maxResults=1`;
    await fetch(probeUrl, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new Error(
      "Could not reach Firebase Storage from this browser. Use Image link/path, or check network/firewall and Firebase Storage setup."
    );
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function firebaseErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String((error as { code?: unknown }).code ?? "");

    if (code.includes("permission-denied") || code.includes("storage/unauthorized")) {
      return "Firebase Storage denied the upload. Sign out, sign in again as admin, and deploy the latest Storage rules.";
    }

    if (
      code.includes("storage/bucket-not-found") ||
      code.includes("storage/no-default-bucket") ||
      code.includes("storage/project-not-found")
    ) {
      return "Firebase Storage cannot find the configured bucket. Use an image link/path for development or initialize Storage in Firebase Console.";
    }

    if (code.includes("storage/quota-exceeded")) {
      return "Firebase Storage quota is unavailable or exceeded. Use an image link/path or check the project's Storage quota.";
    }

    if (code.includes("storage/retry-limit-exceeded")) {
      return "Firebase stopped retrying the upload. Use an image link/path, or check your network and Firebase Storage availability.";
    }

    if (code.includes("storage/canceled")) {
      return "The image upload was canceled. Use an image link/path or try a smaller image.";
    }
  }

  return error instanceof Error ? error.message : "The product could not be saved.";
}

function normalizeImageUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return FALLBACK_IMAGE;

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (/^[a-zA-Z]:\\/.test(trimmed)) {
    throw new Error(
      "Do not use a Windows file path. Copy the image into public/products, then enter a browser path such as /products/broiler-medium.jpg."
    );
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // The user receives the clearer validation message below.
  }

  throw new Error(
    "Enter a public path beginning with /, such as /products/broiler-medium.jpg, or a complete http:// or https:// image URL."
  );
}

export default function ProductForm({ product }: Props) {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const submittingRef = useRef(false);
  const canUploadToFirebaseStorage = isFirebaseConfigured;
  const initialImageUrl = product?.imageUrl && product.imageUrl !== FALLBACK_IMAGE ? product.imageUrl : "";

  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product?.price ?? 0);
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [category, setCategory] = useState(product?.category ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [imageSource, setImageSource] = useState<ImageSource>("link");
  const [imageUrlInput, setImageUrlInput] = useState(initialImageUrl);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(initialImageUrl);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [storageCheckState, setStorageCheckState] = useState<StorageCheckState>("idle");
  const [storageCheckMessage, setStorageCheckMessage] = useState("");

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function testStorageConnection() {
    if (!canUploadToFirebaseStorage) {
      setStorageCheckState("error");
      setStorageCheckMessage("Firebase Storage is not configured in this environment.");
      return;
    }

    setStorageCheckState("checking");
    setStorageCheckMessage("Checking Firebase Storage...");

    try {
      const storageBucket = normalizeStorageBucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
      await assertStorageReachable(storageBucket);
      setStorageCheckState("ok");
      setStorageCheckMessage("Firebase Storage is reachable from this browser.");
    } catch (storageCheckError) {
      setStorageCheckState("error");
      setStorageCheckMessage(firebaseErrorMessage(storageCheckError));
    }
  }

  function selectImageSource(source: ImageSource) {
    if (source === "upload" && !canUploadToFirebaseStorage) {
      setImageSource("link");
      setError("Firebase Storage is not configured. Use Image link/path until Firebase Storage is initialized.");
      setPreviewFailed(false);
      return;
    }

    setImageSource(source);
    setError("");
    setPreviewFailed(false);

    if (source === "upload") {
      void testStorageConnection();
    }

    if (source === "link") {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(imageUrlInput.trim());
      return;
    }

    if (!imageFile) {
      setPreview(product?.imageUrl ?? "");
    }
  }

  function onImageUrlChange(value: string) {
    setImageUrlInput(value ?? "");
    setError("");
    setPreviewFailed(false);

    if (imageSource === "link") {
      if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
      setPreview(value.trim());
    }
  }

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
    setPreviewFailed(false);
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
  }

  async function uploadSelectedImage(): Promise<string> {
    if (!imageFile) return product?.imageUrl || FALLBACK_IMAGE;
    if (!canUploadToFirebaseStorage) {
      throw new Error("Firebase Storage is not configured. Use Image link/path or configure NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET.");
    }

    const storageBucket = normalizeStorageBucket(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
    await assertStorageReachable(storageBucket);

    setStatus("Uploading image... 0%");
    const safeFileName = imageFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storageRef = ref(storage, `products/${Date.now()}-${safeFileName}`);
    const uploadTask = uploadBytesResumable(storageRef, imageFile, {
      contentType: imageFile.type,
      cacheControl: "public,max-age=31536000,immutable",
    });

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      let lastTransferred = 0;
      let stalledTimeoutId = 0;

      const armStalledGuard = () => {
        window.clearTimeout(stalledTimeoutId);
        stalledTimeoutId = window.setTimeout(() => {
          finish(() => {
            uploadTask.cancel();
            reject(
              new Error(
                "The image upload is stalled at 0%. Check your internet connection or Firebase Storage setup, then try again."
              )
            );
          });
        }, STALLED_UPLOAD_TIMEOUT_MS);
      };

      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        window.clearTimeout(stalledTimeoutId);
        callback();
      };

      const timeoutId = window.setTimeout(() => {
        finish(() => {
          uploadTask.cancel();
          reject(
            new Error(
              "The image upload did not complete within 90 seconds. Switch to Image link/path for development, or initialize Firebase Storage."
            )
          );
        });
      }, UPLOAD_TIMEOUT_MS);

      armStalledGuard();

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.bytesTransferred > lastTransferred) {
            lastTransferred = snapshot.bytesTransferred;
            armStalledGuard();
          }

          const progress = snapshot.totalBytes
            ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
            : 0;
          setStatus(`Uploading image... ${progress}%`);
        },
        (uploadError) => finish(() => reject(uploadError)),
        () => {
          void getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadUrl) => finish(() => resolve(downloadUrl)))
            .catch((downloadError: unknown) => finish(() => reject(downloadError)));
        }
      );
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setStatus("");

    try {
      if (!isAdmin || !auth.currentUser) {
        throw new Error("Administrator access is required. Sign out and sign in again.");
      }

      await auth.currentUser.getIdToken();

      const cleanName = name.trim();
      const cleanDescription = description.trim();
      const cleanCategory = category.trim();

      if (!cleanName || !cleanDescription) {
        throw new Error("Name and description are required.");
      }

      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Enter a valid product price greater than zero.");
      }

      if (!Number.isInteger(stock) || stock < 0) {
        throw new Error("Stock must be a whole number of zero or more.");
      }

      setSaving(true);

      let imageUrl: string;
      if (imageSource === "link") {
        imageUrl = normalizeImageUrl(imageUrlInput);
      } else {
        imageUrl = imageFile ? await uploadSelectedImage() : product?.imageUrl || FALLBACK_IMAGE;
      }

      setStatus(product ? "Updating product..." : "Creating product...");
      const now = Date.now();
      const data = {
        name: cleanName,
        description: cleanDescription,
        price: Math.round(Number(price)),
        stock: Math.trunc(Number(stock)),
        category: cleanCategory,
        active,
        imageUrl,
        updatedAt: now,
      };

      if (product) {
        await updateDoc(doc(db, "products", product.id), data);
      } else {
        await addDoc(collection(db, "products"), {
          ...data,
          createdAt: now,
        });
      }

      setStatus("Product saved. Returning to catalogue...");
      router.replace("/admin/products");
    } catch (saveError) {
      console.error("Product save failed:", saveError);
      setError(firebaseErrorMessage(saveError));
      setStatus("");
    } finally {
      setSaving(false);
      submittingRef.current = false;
    }
  }

  const previewUrl = preview.trim();

  return (
    <form onSubmit={handleSubmit} className="card max-w-2xl space-y-5 p-5 sm:p-7">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Product image</legend>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-canvas/60 p-4">
            <input
              type="radio"
              name="image-source"
              value="link"
              checked={imageSource === "link"}
              onChange={() => selectImageSource("link")}
              disabled={saving}
              className="mt-1 h-4 w-4 accent-forest"
            />
            <span>
              <span className="block text-sm font-semibold">Image link/path</span>
              <span className="mt-1 block text-xs text-ink/55">Recommended while Firebase Storage is disabled.</span>
            </span>
          </label>

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-line bg-canvas/60 p-4">
            <input
              type="radio"
              name="image-source"
              value="upload"
              checked={imageSource === "upload"}
              onChange={() => selectImageSource("upload")}
              disabled={saving || !canUploadToFirebaseStorage}
              className="mt-1 h-4 w-4 accent-forest"
            />
            <span>
              <span className="block text-sm font-semibold">Firebase upload</span>
              <span className="mt-1 block text-xs text-ink/55">
                {canUploadToFirebaseStorage
                  ? "Use after Firebase Storage is initialized."
                  : "Unavailable: Firebase Storage is not configured in this environment."}
              </span>
            </span>
          </label>
        </div>

        {imageSource === "link" ? (
          <div>
            <label htmlFor="image-url" className="mb-2 block text-sm font-semibold">Image URL or public path</label>
            <input
              id="image-url"
              type="text"
              disabled={saving}
              className="input-field"
              placeholder="/products/broiler-medium.jpg"
              value={imageUrlInput ?? ""}
              onChange={(event) => onImageUrlChange(event.target.value)}
            />
            <p className="mt-2 text-xs leading-5 text-ink/55">
              Use a path from the Next.js public folder, for example <code>/products/broiler-medium.jpg</code>, or a complete HTTPS image URL. Do not enter a Windows path such as <code>C:\Users\...</code>.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="product-image" className="block text-sm font-semibold">Upload image</label>
              <button
                type="button"
                onClick={() => void testStorageConnection()}
                disabled={saving || storageCheckState === "checking" || !canUploadToFirebaseStorage}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink/70 transition hover:border-forest hover:text-forest disabled:cursor-not-allowed disabled:opacity-55"
              >
                {storageCheckState === "checking" ? "Checking..." : "Test Storage Connection"}
              </button>
            </div>
            <input
              id="product-image"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={onImageChange}
              disabled={saving}
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-forest file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-forest-light disabled:opacity-60"
            />
            <p className="mt-2 text-xs text-ink/50">Optional. Maximum 5 MB. This button selects a local file and requires active Firebase Storage.</p>
            {storageCheckState !== "idle" && (
              <p
                role="status"
                className={`mt-2 rounded-md border p-2 text-xs ${
                  storageCheckState === "ok"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : storageCheckState === "checking"
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {storageCheckMessage}
              </p>
            )}
            {storageCheckState === "error" && (
              <p className="mt-2 text-xs text-ink/60">
                Retry the connection test after fixing Firebase Storage settings, or switch to Image link/path to continue adding products.
              </p>
            )}
          </div>
        )}

        {previewUrl && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink/50">Preview</p>
            <div className="aspect-[4/3] w-full max-w-xs overflow-hidden rounded-lg border border-line bg-line">
              {/* Blob/local previews are transient and cannot use next/image safely. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={previewUrl}
                src={previewUrl}
                alt="Product image preview"
                className="h-full w-full object-cover"
                onLoad={() => setPreviewFailed(false)}
                onError={() => setPreviewFailed(true)}
              />
            </div>
            {previewFailed && (
              <p className="mt-2 max-w-xs rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                The image could not be loaded. Confirm that the file exists inside <code>public/products</code> and use a path such as <code>/products/broiler-medium.jpg</code>.
              </p>
            )}
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="name" className="mb-2 block text-sm font-semibold">Name</label>
        <input id="name" required disabled={saving} className="input-field" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div>
        <label htmlFor="description" className="mb-2 block text-sm font-semibold">Description</label>
        <textarea id="description" required disabled={saving} rows={5} className="input-field resize-y" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="price" className="mb-2 block text-sm font-semibold">Price (KES)</label>
          <input id="price" required disabled={saving} type="number" min={1} step="1" className="input-field" value={price} onChange={(event) => setPrice(Number(event.target.value))} />
        </div>
        <div>
          <label htmlFor="stock" className="mb-2 block text-sm font-semibold">Stock</label>
          <input id="stock" required disabled={saving} type="number" min={0} step="1" className="input-field" value={stock} onChange={(event) => setStock(Number(event.target.value))} />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-sm font-semibold">Category</label>
        <input id="category" disabled={saving} className="input-field" placeholder="e.g. Broiler Chicken" value={category} onChange={(event) => setCategory(event.target.value)} />
      </div>

      <label className="flex items-center gap-3 rounded-md border border-line bg-canvas/60 p-4 text-sm font-semibold">
        <input type="checkbox" disabled={saving} checked={active} onChange={(event) => setActive(event.target.checked)} className="h-4 w-4 accent-forest" />
        Visible on storefront
      </label>

      {status && <p className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">{status}</p>}
      {error && <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-700">{error}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" disabled={saving} className="btn-secondary" onClick={() => router.push("/admin/products")}>Cancel</button>
        <button type="submit" disabled={saving || !isAdmin} className="btn-primary">
          {saving ? status || "Saving..." : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

