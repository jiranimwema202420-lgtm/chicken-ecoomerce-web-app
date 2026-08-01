import { NextRequest, NextResponse } from "next/server";

import { adminDb } from "@/lib/firebaseAdmin";
import { getRequestUser } from "@/lib/server-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{6,128}$/.test(value);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to view saved orders." }, { status: 401 });
  const snapshot = await adminDb.collection("orderTemplates").where("userId", "==", user.uid).limit(20).get();
  const templates = snapshot.docs.map((doc) => ({ id: doc.id, name: String(doc.data().name ?? "Saved order"), createdAt: Number(doc.data().createdAt ?? 0), itemCount: Array.isArray(doc.data().lines) ? doc.data().lines.length : 0 })).sort((a, b) => b.createdAt - a.createdAt);
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to save an order." }, { status: 401 });
  const body = (await request.json()) as Record<string, unknown>;
  if (!validId(body.orderId)) return NextResponse.json({ error: "Choose a valid order." }, { status: 400 });
  const name = String(body.name ?? "").trim().slice(0, 60);
  if (name.length < 2) return NextResponse.json({ error: "Enter a template name." }, { status: 400 });
  const order = await adminDb.collection("orders").doc(body.orderId).get();
  const orderData = order.data();
  if (!order.exists || orderData?.userId !== user.uid) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  const existing = await adminDb.collection("orderTemplates").where("userId", "==", user.uid).limit(20).get();
  if (existing.size >= 20) return NextResponse.json({ error: "You can save up to 20 order templates." }, { status: 409 });
  const now = Date.now();
  const reference = await adminDb.collection("orderTemplates").add({ userId: user.uid, name, lines: Array.isArray(orderData.lines) ? orderData.lines.slice(0, 30).map((line: SourceLine) => ({ productId: String(line.productId ?? ""), quantity: Math.min(20, Math.max(1, Math.trunc(Number(line.quantity) || 1))) })) : [], createdAt: now, updatedAt: now });
  return NextResponse.json({ template: { id: reference.id, name, createdAt: now } }, { status: 201 });
}

type SourceLine = { productId?: unknown; quantity?: unknown };

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  const user = await getRequestUser(request);
  if (!user) return NextResponse.json({ error: "Sign in to manage saved orders." }, { status: 401 });
  const id = request.nextUrl.searchParams.get("id");
  if (!validId(id)) return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  const reference = adminDb.collection("orderTemplates").doc(id);
  const document = await reference.get();
  if (!document.exists || document.data()?.userId !== user.uid) return NextResponse.json({ error: "Template not found." }, { status: 404 });
  await reference.delete();
  return NextResponse.json({ success: true });
}
