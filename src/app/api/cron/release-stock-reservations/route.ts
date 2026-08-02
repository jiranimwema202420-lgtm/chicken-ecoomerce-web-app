import { NextRequest, NextResponse } from "next/server";
import { releaseExpiredReservations } from "@/lib/server/inventory-monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try { return NextResponse.json(await releaseExpiredReservations("reservation-expiry-cron")); }
  catch (error) { console.error("Scheduled inventory cleanup failed", { error }); return NextResponse.json({ error: "Inventory cleanup failed." }, { status: 500 }); }
}
