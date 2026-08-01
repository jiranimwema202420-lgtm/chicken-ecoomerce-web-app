import { DecodedIdToken } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export async function getRequestUser(
  request: NextRequest
): Promise<DecodedIdToken | null> {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match || match[1].length > 8_192) return null;

  try {
    return await adminAuth.verifyIdToken(match[1], true);
  } catch {
    return null;
  }
}
