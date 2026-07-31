import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Ratelimit } from "@upstash/ratelimit";

type SpamGuardOptions = {
  rateLimit: Ratelimit | null;
  namespace: string;
};

function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function applySpamGuard(
  request: NextRequest,
  options: SpamGuardOptions,
): Promise<NextResponse | null> {
  const contentType = request.headers.get("content-type") ?? "";

  if (
    ["POST", "PUT", "PATCH"].includes(request.method) &&
    !contentType.includes("application/json") &&
    !contentType.includes("multipart/form-data")
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Unsupported content type",
      },
      {
        status: 415,
      },
    );
  }

  if (!options.rateLimit) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "Spam guard is not configured: Upstash environment variables are missing.",
      );
    }

    return null;
  }

  const ip = getClientIp(request);
  const identifier = `${options.namespace}:${ip}`;

  const result = await options.rateLimit.limit(identifier);

  if (!result.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many requests. Please try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.max(
            1,
            Math.ceil((result.reset - Date.now()) / 1000),
          ).toString(),
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return null;
}
