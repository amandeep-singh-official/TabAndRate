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
    const existing = await prisma.vendorDue.findFirst({
      where: { id, cafeId: cafe.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Vendor record not found" }, { status: 404 });
    }

    const due = await prisma.vendorDue.update({
      where: { id },
      data: {
        isPaid: body.isPaid !== undefined ? Boolean(body.isPaid) : undefined,
        amount: body.amount !== undefined ? Number(body.amount) : undefined,
        vendorName: body.vendorName ?? undefined,
      },
    });

    return NextResponse.json({ due });
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

  const existing = await prisma.vendorDue.findFirst({
    where: { id, cafeId: cafe.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Vendor record not found" }, { status: 404 });
  }

  await prisma.vendorDue.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
