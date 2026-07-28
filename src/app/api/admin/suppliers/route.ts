import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import type { SupplierProfile } from "@/lib/types";

export const runtime = "nodejs";

function cleanText(value: unknown, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

function cleanProductIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((item) => String(item ?? "").trim())
        .filter((item) => /^[A-Za-z0-9_-]{6,128}$/.test(item))
    )
  ).slice(0, 100);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function validateProducts(productIds: string[]) {
  if (productIds.length === 0) {
    return true;
  }

  const snapshots = await adminDb.getAll(
    ...productIds.map((productId) =>
      adminDb.collection("products").doc(productId)
    )
  );

  return snapshots.every((snapshot) => snapshot.exists);
}

async function findSupplierByEmail(email: string) {
  const snapshot = await adminDb
    .collection("suppliers")
    .where("email", "==", email)
    .limit(1)
    .get();

  return snapshot.empty ? null : snapshot.docs[0];
}

function errorCode(error: unknown): string {
  return typeof error === "object" &&
    error !== null &&
    "code" in error
    ? String(error.code)
    : "";
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
        ({
          id: document.id,
          ...document.data(),
          manual:
            document.data().manual === true ||
            !document.data().uid,
        }) as SupplierProfile
    )
    .sort(
      (a, b) =>
        Number(b.updatedAt ?? 0) - Number(a.updatedAt ?? 0)
    );

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
    const manual = body.manual === true;

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid supplier email address." },
        { status: 400 }
      );
    }

    if (!businessName || !contactName) {
      return NextResponse.json(
        {
          error:
            "Business name and contact person are required.",
        },
        { status: 400 }
      );
    }

    if (!(await validateProducts(productIds))) {
      return NextResponse.json(
        {
          error:
            "One or more selected products no longer exist.",
        },
        { status: 400 }
      );
    }

    const existingByEmail = await findSupplierByEmail(email);
    const now = Date.now();

    if (manual) {
      if (
        existingByEmail &&
        existingByEmail.data().uid &&
        existingByEmail.data().manual !== true
      ) {
        return NextResponse.json(
          {
            error:
              "This email already belongs to a portal-enabled supplier. Update it with portal mode instead.",
          },
          { status: 409 }
        );
      }

      const supplierRef =
        existingByEmail?.ref ??
        adminDb.collection("suppliers").doc();

      const createdAt = existingByEmail
        ? Number(existingByEmail.data().createdAt ?? now)
        : now;

      const supplier: Omit<SupplierProfile, "id"> = {
        uid: "",
        manual: true,
        businessName,
        contactName,
        email,
        phone,
        productIds,
        active: true,
        createdAt,
        updatedAt: now,
      };

      await supplierRef.set(supplier, { merge: true });

      return NextResponse.json({
        supplier: {
          id: supplierRef.id,
          ...supplier,
        },
        message: existingByEmail
          ? "Manual supplier record updated."
          : "Manual supplier added to the supplier list.",
      });
    }

    const userRecord = await adminAuth.getUserByEmail(email);

    if (userRecord.uid === admin.uid) {
      return NextResponse.json(
        {
          error:
            "The current administrator account cannot be onboarded as a supplier.",
        },
        { status: 400 }
      );
    }

    const claims = userRecord.customClaims ?? {};

    await adminAuth.setCustomUserClaims(userRecord.uid, {
      ...claims,
      supplier: true,
    });

    const supplierRef = adminDb
      .collection("suppliers")
      .doc(userRecord.uid);

    const existingPortal = await supplierRef.get();

    const createdAt = existingByEmail
      ? Number(existingByEmail.data().createdAt ?? now)
      : existingPortal.exists
        ? Number(existingPortal.data()?.createdAt ?? now)
        : now;

    const supplier: Omit<SupplierProfile, "id"> = {
      uid: userRecord.uid,
      manual: false,
      businessName,
      contactName,
      email,
      phone,
      productIds,
      active: true,
      createdAt,
      updatedAt: now,
    };

    if (
      existingByEmail &&
      existingByEmail.id !== supplierRef.id
    ) {
      const batch = adminDb.batch();
      batch.set(supplierRef, supplier, { merge: true });
      batch.delete(existingByEmail.ref);
      await batch.commit();
    } else {
      await supplierRef.set(supplier, { merge: true });
    }

    return NextResponse.json({
      supplier: {
        id: supplierRef.id,
        ...supplier,
      },
      message:
        "Supplier portal access saved. Ask the supplier to sign out and sign in again.",
    });
  } catch (error) {
    if (errorCode(error) === "auth/user-not-found") {
      return NextResponse.json(
        {
          error:
            "No Firebase account uses that email. Select Manual supplier, or ask the supplier to register first.",
        },
        { status: 404 }
      );
    }

    console.error("Supplier save failed:", error);

    return NextResponse.json(
      { error: "The supplier could not be saved." },
      { status: 500 }
    );
  }
}