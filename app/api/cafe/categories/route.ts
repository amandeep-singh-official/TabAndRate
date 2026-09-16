import { getAuthCafe } from "@/lib/cafe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required"),
  color: z.string().default("#dc2626"),
  icon: z.string().optional().default("🍽️"),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const categories = await prisma.menuCategory.findMany({
    where: { cafeId: cafe.id },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const data = categorySchema.parse(body);

    const category = await prisma.menuCategory.create({
      data: {
        cafeId: cafe.id,
        name: data.name,
        color: data.color,
        icon: data.icon,
        sortOrder: data.sortOrder,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid category data";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
