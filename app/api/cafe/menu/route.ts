import { getAuthCafe } from "@/lib/cafe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const menuItemSchema = z.object({
  name: z.string().trim().min(1, "Item name is required"),
  price: z.number().positive("Price must be greater than 0"),
  categoryId: z.string().min(1, "Category is required"),
  isAvailable: z.boolean().default(true),
});

export async function GET(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const items = await prisma.menuItem.findMany({
    where: {
      cafeId: cafe.id,
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: {
        select: { id: true, name: true, color: true, icon: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const data = menuItemSchema.parse(body);

    // Verify category belongs to this cafe
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, cafeId: cafe.id },
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found for this cafe" }, { status: 400 });
    }

    const item = await prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: data.categoryId,
        name: data.name,
        price: data.price,
        isAvailable: data.isAvailable,
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid menu item data";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
