import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import { SupplierProfile } from "@/lib/types";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => /^[A-Za-z0-9_-]{6,128}$/.test(item))
    )
  ).slice(0, 100);
}

export async function GET(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  const snapshot = await adminDb.collection("suppliers").get();
  const suppliers = snapshot.docs
    .map(
      (document) =>
        ({ id: document.id, ...document.data() }) as SupplierProfile
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ suppliers });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminRequestUser(request);

  if (!admin) {
    return NextResponse.json(
      { error: "Administrator access is required." },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const email = cleanText(body.email, 254).toLowerCase();
    const businessName = cleanText(body.businessName, 120);
    const contactName = cleanText(body.contactName, 120);
    const phone = cleanText(body.phone, 32);
    const productIds = cleanProductIds(body.productIds);

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Enter a valid supplier account email." },
        { status: 400 }
      );
    }

    if (!businessName || !contactName) {
      return NextResponse.json(
        { error: "Business name and contact name are required." },
        { status: 400 }
      );
    }

    const userRecord = await adminAuth.getUserByEmail(email);

    if (userRecord.uid === admin.uid) {
      return NextResponse.json(
        { error: "The current administrator account cannot be onboarded as a supplier." },
        { status: 400 }
      );
    }

    if (productIds.length > 0) {
      const productRefs = productIds.map((productId) =>
        adminDb.collection("products").doc(productId)
      );
      const productSnapshots = await adminDb.getAll(...productRefs);

      if (productSnapshots.some((snapshot) => !snapshot.exists)) {
        return NextResponse.json(
          { error: "One or more selected products no longer exist." },
          { status: 400 }
        );
      }
    }

    const claims = userRecord.customClaims ?? {};
    await adminAuth.setCustomUserClaims(userRecord.uid, {
      ...claims,
      supplier: true,
    });

    const supplierRef = adminDb.collection("suppliers").doc(userRecord.uid);
    const existing = await supplierRef.get();
    const now = Date.now();

    const supplier: Omit<SupplierProfile, "id"> = {
      uid: userRecord.uid,
      businessName,
      contactName,
      email,
      phone,
      productIds,
      active: true,
      createdAt: existing.exists
        ? Number(existing.data()?.createdAt ?? now)
        : now,
      updatedAt: now,
    };

    await supplierRef.set(supplier, { merge: true });

    return NextResponse.json({
      supplier: { id: userRecord.uid, ...supplier },
      message:
        "Supplier access saved. The supplier must sign out and sign in again to refresh their access claim.",
    });
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";

    if (code === "auth/user-not-found") {
      return NextResponse.json(
        {
          error:
            "No Firebase account uses that email. Ask the supplier to create an account first.",
        },
        { status: 404 }
      );
    }

    console.error("Supplier onboarding failed:", error);
    return NextResponse.json(
      { error: "The supplier could not be onboarded." },
      { status: 500 }
    );
  }
}