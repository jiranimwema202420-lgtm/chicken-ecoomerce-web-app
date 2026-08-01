import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { getRequestUser } from "@/lib/server-auth";
import { orderStatusRateLimit } from "@/lib/server/rate-limit";
import type { CartLine } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SourceLine = { productId?: unknown; quantity?: unknown };

function validId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(value);
}

async function rateLimited(uid: string): Promise<boolean> {
  if (!orderStatusRateLimit) return false;
  const result = await orderStatusRateLimit.limit(`reorder:${uid}`);
  return !result.success;
}

async function verifiedCart(lines: SourceLine[]) {
  const requested = new Map<string, number>();
  for (const line of lines.slice(0, 30)) {
    if (!validId(line.productId)) continue;
    requested.set(line.productId, Math.min(20, Math.max(1, Math.trunc(Number(line.quantity) || 1))));
  }

  const references = [...requested.keys()].map((id) => adminDb.collection("products").doc(id));
  const documents = references.length ? await adminDb.getAll(...references) : [];
  const cartLines: CartLine[] = [];
  const unavailable: string[] = [];

  for (const document of documents) {
    const data = document.data();
    const stock = Math.max(0, Math.trunc(Number(data?.stock) || 0));
    const price = Number(data?.price);
    if (!document.exists || data?.active !== true || stock < 1 || !Number.isFinite(price) || price < 0) {
      unavailable.push(document.id);
      continue;
    }
    cartLines.push({
      productId: document.id,
      name: String(data?.name ?? "Product"),
      price,
      imageUrl: String(data?.imageUrl ?? ""),
      quantity: Math.min(requested.get(document.id) ?? 1, stock),
      maxQuantity: stock,
    });
  }
  return { lines: cartLines, unavailable };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to reorder." }, { status: 401 });
  if (await rateLimited(user.uid)) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const body = (await request.json()) as Record<string, unknown>;
  const orderId = body.orderId;
  const templateId = body.templateId;
  let source: FirebaseFirestore.DocumentSnapshot;

  if (validId(orderId)) source = await adminDb.collection("orders").doc(orderId).get();
  else if (validId(templateId)) source = await adminDb.collection("orderTemplates").doc(templateId).get();
  else return NextResponse.json({ error: "Choose an order or saved template." }, { status: 400 });

  const data = source.data();
  if (!source.exists || data?.userId !== user.uid) return NextResponse.json({ error: "Order selection was not found." }, { status: 404 });
  const result = await verifiedCart(Array.isArray(data.lines) ? data.lines : []);
  if (!result.lines.length) return NextResponse.json({ error: "None of these products are currently available." }, { status: 409 });
  return NextResponse.json(result);
}
