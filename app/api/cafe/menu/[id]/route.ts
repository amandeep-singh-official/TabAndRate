import { getAuthCafe } from "@/lib/cafe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

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
    const existing = await prisma.menuItem.findFirst({
      where: { id, cafeId: cafe.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name: body.name ?? undefined,
        price: body.price !== undefined ? Number(body.price) : undefined,
        categoryId: body.categoryId ?? undefined,
        isAvailable: body.isAvailable !== undefined ? Boolean(body.isAvailable) : undefined,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ item });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;

  const existing = await prisma.menuItem.findFirst({
    where: { id, cafeId: cafe.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  await prisma.menuItem.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
