import { DecodedIdToken } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/server-auth";

export async function getAdminRequestUser(
  request: NextRequest
): Promise<DecodedIdToken | null> {
  const user = await getRequestUser(request);
  const role = typeof user?.role === "string" ? user.role : null;
  return user?.admin === true || role === "admin" ? user : null;
}

export async function getSupplierRequestUser(
  request: NextRequest
): Promise<DecodedIdToken | null> {
  const user = await getRequestUser(request);
  const role = typeof user?.role === "string" ? user.role : null;
  return user?.supplier === true || role === "supplier" ? user : null;
}
