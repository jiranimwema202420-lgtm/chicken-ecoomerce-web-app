import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { getAdminRequestUser } from "@/lib/role-auth";
import { addMembershipMonth, BUSINESS_MEMBERSHIP_PRICE } from "@/lib/server/membership";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validId = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request);
  if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const [requests, memberships] = await Promise.all([
    adminDb.collection("membershipRenewalRequests").orderBy("createdAt", "desc").limit(200).get(),
    adminDb.collection("memberships").limit(500).get(),
  ]);
  const now = Date.now();
  const items = requests.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      customerName: String(data.customerName ?? ""),
      customerEmail: String(data.customerEmail ?? ""),
      phone: String(data.phone ?? ""),
      mpesaReceipt: String(data.mpesaReceipt ?? ""),
      amount: Number(data.amount ?? 0),
      status: String(data.status ?? "pending"),
      createdAt: Number(data.createdAt ?? 0),
    };
  });
  const activeMembers = memberships.docs.filter((doc) => doc.data().status === "active" && Number(doc.data().expiresAt) > now).length;
  const approvedRevenue = items.filter((item) => item.status === "approved").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return NextResponse.json({ requests: items, summary: { activeMembers, pendingRequests: items.filter((item) => item.status === "pending").length, approvedRevenue, monthlyPrice: BUSINESS_MEMBERSHIP_PRICE } });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const admin = await getAdminRequestUser(request);
  if (!admin) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>;
  const requestId = body.requestId;
  const decision = body.decision;
  if (!validId(requestId) || !["approved", "rejected"].includes(String(decision))) return NextResponse.json({ error: "Choose a valid pending request and decision." }, { status: 400 });
  const requestRef = adminDb.collection("membershipRenewalRequests").doc(requestId);
  const result = await adminDb.runTransaction(async (transaction) => {
    const paymentRequest = await transaction.get(requestRef);
    if (!paymentRequest.exists || paymentRequest.data()?.status !== "pending") throw new Error("REQUEST_NOT_PENDING");
    const data = paymentRequest.data()!;
    const now = Date.now();
    if (decision === "rejected") {
      transaction.update(requestRef, { status: "rejected", reviewedAt: now, reviewedBy: admin.uid, updatedAt: now });
      return { status: "rejected" };
    }
    const membershipRef = adminDb.collection("memberships").doc(String(data.userId));
    const membership = await transaction.get(membershipRef);
    const currentExpiry = Number(membership.data()?.expiresAt ?? 0);
    const startsAt = currentExpiry > now ? currentExpiry : now;
    const expiresAt = addMembershipMonth(startsAt);
    transaction.set(membershipRef, { userId: data.userId, customerEmail: data.customerEmail ?? null, customerName: data.customerName ?? null, status: "active", startsAt: membership.exists ? Number(membership.data()?.startsAt ?? now) : now, expiresAt, lastReceipt: data.mpesaReceipt, lastAmount: BUSINESS_MEMBERSHIP_PRICE, updatedAt: now }, { merge: true });
    transaction.update(requestRef, { status: "approved", membershipStartsAt: startsAt, membershipExpiresAt: expiresAt, reviewedAt: now, reviewedBy: admin.uid, updatedAt: now });
    return { status: "approved", expiresAt };
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "REQUEST_NOT_PENDING") return null;
    throw error;
  });
  if (!result) return NextResponse.json({ error: "This request has already been reviewed." }, { status: 409 });
  return NextResponse.json({ success: true, ...result });
}
