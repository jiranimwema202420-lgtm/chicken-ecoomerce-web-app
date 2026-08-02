import { NextResponse } from "next/server";
import { getAppVersion } from "@/lib/app-version";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = getAppVersion();
  let inventoryCleanup: Record<string, unknown> | null = null;
  try {
    const snapshot = await adminDb.collection("systemOperations").doc("inventoryCleanup").get();
    inventoryCleanup = snapshot.exists ? snapshot.data() ?? null : null;
  } catch (error) {
    console.error("Inventory cleanup health read failed", { error });
    inventoryCleanup = { status: "unknown" };
  }
  return NextResponse.json({ status: "healthy", service: "duka-ecommerce", environment: version.environment,
    version: version.version, commitSha: version.commitSha, timestamp: new Date().toISOString(), inventoryCleanup },
    { status: 200, headers: { "Cache-Control": "no-store, max-age=0" } });
}
