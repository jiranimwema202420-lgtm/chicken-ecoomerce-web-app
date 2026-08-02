import { NextRequest, NextResponse } from "next/server";
import { getAdminRequestUser } from "@/lib/role-auth";
import { getInventoryAuditCsv, getInventoryOverview, releaseExpiredReservations } from "@/lib/server/inventory-monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!await getAdminRequestUser(request)) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  if (request.nextUrl.searchParams.get("format") === "csv") return new NextResponse(await getInventoryAuditCsv(), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=duka-inventory-audit.csv" } });
  return NextResponse.json(await getInventoryOverview());
}

export async function POST(request: NextRequest) {
  const user = await getAdminRequestUser(request);
  if (!user) return NextResponse.json({ error: "Administrator access is required." }, { status: 403 });
  try { return NextResponse.json(await releaseExpiredReservations(user.uid)); }
  catch (error) { console.error("Manual inventory cleanup failed", { actorId: user.uid, error }); return NextResponse.json({ error: "Expired reservations could not be released." }, { status: 500 }); }
}
