import { getAuthCafe } from "@/lib/cafe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const vendorDueSchema = z.object({
  vendorName: z.string().trim().min(1, "Vendor name is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  dueDate: z.string().optional(),
});

export async function GET() {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const dues = await prisma.vendorDue.findMany({
    where: { cafeId: cafe.id },
    orderBy: [{ isPaid: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
  });

  const totalPending = dues
    .filter((d) => !d.isPaid)
    .reduce((sum, d) => sum + d.amount, 0);

  return NextResponse.json({ dues, totalPending });
}

export async function POST(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const data = vendorDueSchema.parse(body);

    const due = await prisma.vendorDue.create({
      data: {
        cafeId: cafe.id,
        vendorName: data.vendorName,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
    });

    return NextResponse.json({ due }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record vendor due";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
