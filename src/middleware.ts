import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const BLOCKED_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /acunetix/i,
  /nessus/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
];

const SUSPICIOUS_PATH_PATTERNS = [
  /\.env/i,
  /\.git/i,
  /wp-admin/i,
  /wp-login/i,
  /phpmyadmin/i,
  /xmlrpc\.php/i,
  /config\.php/i,
  /server-status/i,
];

function securityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  return response;
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent") ?? "";

  const blockedUserAgent = BLOCKED_USER_AGENTS.some((pattern) =>
    pattern.test(userAgent),
  );

  const suspiciousPath = SUSPICIOUS_PATH_PATTERNS.some((pattern) =>
    pattern.test(pathname),
  );

  if (blockedUserAgent || suspiciousPath) {
    return NextResponse.json(
      {
        success: false,
        error: "Request blocked",
      },
      {
        status: 403,
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (
    ["POST", "PUT", "PATCH"].includes(request.method) &&
    contentLength > 1_000_000
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Request body is too large",
      },
      {
        status: 413,
      },
    );
  }

  return securityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)",
  ],
};
