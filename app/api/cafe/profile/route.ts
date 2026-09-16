import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const createProfileSchema = z.object({
  cafeName: z.string().trim().min(2, "Cafe name must be at least 2 characters"),
  tagline: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  city: z.string().default("Chandigarh"),
  currency: z.string().default("INR"),
  openingFloat: z.number().nonnegative().default(1000),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.cafeProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = createProfileSchema.parse(body);

    const existing = await prisma.cafeProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (existing) {
      return NextResponse.json({ error: "Cafe profile already exists" }, { status: 400 });
    }

    const profile = await prisma.cafeProfile.create({
      data: {
        userId: session.user.id,
        cafeName: data.cafeName,
        tagline: data.tagline,
        address: data.address,
        phone: data.phone,
        city: data.city,
        currency: data.currency,
        openingFloat: data.openingFloat,
      },
    });

    // Seed default categories for Chandigarh micro-cafe to get started immediately
    const defaultCategories = [
      { name: "Hot Drinks", color: "#dc2626", icon: "☕", sortOrder: 1 },
      { name: "Cold Drinks", color: "#2563eb", icon: "🧊", sortOrder: 2 },
      { name: "Snacks", color: "#16a34a", icon: "🥪", sortOrder: 3 },
      { name: "Desserts", color: "#9333ea", icon: "🍰", sortOrder: 4 },
    ];

    for (const cat of defaultCategories) {
      await prisma.menuCategory.create({
        data: {
          cafeId: profile.id,
          name: cat.name,
          color: cat.color,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
        },
      });
    }

    return NextResponse.json({ profile }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request data";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const profile = await prisma.cafeProfile.update({
      where: { userId: session.user.id },
      data: {
        cafeName: body.cafeName,
        tagline: body.tagline,
        address: body.address,
        phone: body.phone,
        city: body.city,
        openingFloat: body.openingFloat !== undefined ? Number(body.openingFloat) : undefined,
      },
    });

    return NextResponse.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Update failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
