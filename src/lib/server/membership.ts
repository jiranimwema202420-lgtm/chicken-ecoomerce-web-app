import "server-only";

import { adminDb } from "@/lib/firebaseAdmin";

export const BUSINESS_MEMBERSHIP_PRICE = 1_000;
export const BUSINESS_MEMBERSHIP_CURRENCY = "KES" as const;
export const MEMBER_MINIMUM_ORDER = 800;
export const MEMBER_DELIVERY_DISCOUNT = 100;

export type MembershipBenefits = {
  active: boolean;
  minimumOrder: number;
  deliveryDiscount: number;
  expiresAt: number;
};

export function addMembershipMonth(timestamp: number): number {
  const date = new Date(timestamp);
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.getTime();
}

export function membershipStatus(data: Record<string, unknown> | undefined, now = Date.now()) {
  if (!data) return "none" as const;
  if (data.status === "active" && Number(data.expiresAt) > now) return "active" as const;
  return "expired" as const;
}

export async function loadMembershipBenefits(userId: string): Promise<MembershipBenefits> {
  const snapshot = await adminDb.collection("memberships").doc(userId).get();
  const data = snapshot.data();
  const active = membershipStatus(data) === "active";
  return {
    active,
    minimumOrder: active ? MEMBER_MINIMUM_ORDER : 0,
    deliveryDiscount: active ? MEMBER_DELIVERY_DISCOUNT : 0,
    expiresAt: active ? Number(data?.expiresAt ?? 0) : 0,
  };
}
