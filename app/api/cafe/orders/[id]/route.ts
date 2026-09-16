import { getAuthCafe } from "@/lib/cafe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, cafeId: cafe.id },
    include: {
      items: true,
      cafe: {
        select: {
          cafeName: true,
          tagline: true,
          address: true,
          phone: true,
          city: true,
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const existing = await prisma.order.findFirst({
      where: { id, cafeId: cafe.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: body.status ?? undefined, // e.g. "VOID"
        note: body.note ?? undefined,
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ order });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
