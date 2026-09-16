import { getAuthCafe } from "@/lib/cafe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { id } = await params;

  const existing = await prisma.dailyExpense.findFirst({
    where: { id, cafeId: cafe.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Expense not found" }, { status: 404 });
  }

  await prisma.dailyExpense.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
