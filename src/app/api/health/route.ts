import { NextResponse } from "next/server";
import { getAppVersion } from "@/lib/app-version";

export const dynamic = "force-dynamic";

export async function GET() {
  const version = getAppVersion();

  return NextResponse.json(
    {
      status: "healthy",
      service: "duka-ecommerce",
      environment: version.environment,
      version: version.version,
      commitSha: version.commitSha,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}