import { DecodedIdToken } from "firebase-admin/auth";
import { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/server-auth";

export async function getAdminRequestUser(
  request: NextRequest
): Promise<DecodedIdToken | null> {
  const user = await getRequestUser(request);
  return user?.admin === true ? user : null;
}

export async function getSupplierRequestUser(
  request: NextRequest
): Promise<DecodedIdToken | null> {
  const user = await getRequestUser(request);
  return user?.supplier === true ? user : null;
}