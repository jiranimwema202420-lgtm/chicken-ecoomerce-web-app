import "server-only";

export const BUSINESS_MEMBERSHIP_PRICE = 1_000;
export const BUSINESS_MEMBERSHIP_CURRENCY = "KES" as const;

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
