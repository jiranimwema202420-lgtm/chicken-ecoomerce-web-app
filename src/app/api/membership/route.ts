import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { getRequestUser } from "@/lib/server-auth";
import { BUSINESS_MEMBERSHIP_CURRENCY, BUSINESS_MEMBERSHIP_PRICE, membershipStatus } from "@/lib/server/membership";
import { paymentApiRateLimit } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function phone(value: unknown): string | null {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to view membership." }, { status: 401 });
  const [membership, pending] = await Promise.all([
    adminDb.collection("memberships").doc(user.uid).get(),
    adminDb.collection("membershipRenewalRequests").where("userId", "==", user.uid).where("status", "==", "pending").limit(1).get(),
  ]);
  const data = membership.data();
  return NextResponse.json({
    plan: { name: "Duka Business", price: BUSINESS_MEMBERSHIP_PRICE, currency: BUSINESS_MEMBERSHIP_CURRENCY, billingPeriod: "monthly" },
    membership: data ? { status: membershipStatus(data), startsAt: Number(data.startsAt ?? 0), expiresAt: Number(data.expiresAt ?? 0) } : { status: "none", startsAt: 0, expiresAt: 0 },
    pendingRequest: !pending.empty,
  });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user || user.firebase?.sign_in_provider === "anonymous") return NextResponse.json({ error: "A permanent account is required for membership." }, { status: 401 });
  if (paymentApiRateLimit) {
    const rateLimit = await paymentApiRateLimit.limit(`membership:${user.uid}`);
    if (!rateLimit.success) return NextResponse.json({ error: "Too many membership submissions. Try again later." }, { status: 429 });
  }
  const body = (await request.json()) as Record<string, unknown>;
  const receipt = String(body.mpesaReceipt ?? "").trim().toUpperCase();
  const normalizedPhone = phone(body.phone);
  if (!/^[A-Z0-9]{8,20}$/.test(receipt) || !normalizedPhone) return NextResponse.json({ error: "Enter a valid M-Pesa receipt and Kenyan phone number." }, { status: 400 });
  const requestId = createHash("sha256").update(receipt).digest("hex");
  const reference = adminDb.collection("membershipRenewalRequests").doc(requestId);
  const existing = await reference.get();
  if (existing.exists) return NextResponse.json({ error: "This M-Pesa receipt has already been submitted." }, { status: 409 });
  const now = Date.now();
  await reference.create({ userId: user.uid, customerEmail: user.email ?? null, customerName: user.name ?? null, phone: normalizedPhone, mpesaReceipt: receipt, amount: BUSINESS_MEMBERSHIP_PRICE, currency: BUSINESS_MEMBERSHIP_CURRENCY, status: "pending", createdAt: now, updatedAt: now });
  return NextResponse.json({ success: true, message: "Membership payment submitted for verification." }, { status: 201 });
}
