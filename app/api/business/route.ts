import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { generateSlug } from "@/lib/utils";
// Note: generateSlug is defined in lib/utils.ts
import { CATEGORY_TAGS } from "@/lib/constants";
import { z } from "zod";

const createBusinessSchema = z.object({
  name: z.string().min(1).max(150),
  reviewUrl: z.string().url().min(1),
  address: z.string().max(300).optional(),
  category: z.string().min(1),
  customIndustry: z.string().max(100).optional(),
  monthlyCustomers: z.string().optional(),
  hearAboutUs: z.string().optional(),
});

// ─── POST /api/business — Create business ────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createBusinessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const { name, reviewUrl, address, category, customIndustry, monthlyCustomers, hearAboutUs } =
      parsed.data;
    const userId = session.user.id;

    // 1 merchant = 1 business — check if one already exists
    const existing = await prisma.business.findUnique({ where: { userId } });
    if (existing) {
      return NextResponse.json(
        { error: "You already have a business profile.", slug: existing.slug },
        { status: 409 }
      );
    }

    // Generate unique slug with bounded collision retry
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let attempt = 0;
    while (await prisma.business.findUnique({ where: { slug } })) {
      attempt++;
      if (attempt > 10) {
        // Prevent infinite loops under high collision frequency
        slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
        break;
      }
      slug = `${baseSlug}-${attempt}`;
    }

    // Pre-seed tags from category
    const tags = CATEGORY_TAGS[category] ?? CATEGORY_TAGS["Other"];

    const business = await prisma.business.create({
      data: {
        userId,
        name,
        slug,
        reviewUrl,
        address: address ?? null,
        category,
        customIndustry: customIndustry ?? null,
        monthlyCustomers: monthlyCustomers ?? null,
        hearAboutUs: hearAboutUs ?? null,
        tags,
      },
    });

    return NextResponse.json({ slug: business.slug, id: business.id }, { status: 201 });
  } catch (error) {
    console.error("[BUSINESS_CREATE_ERROR]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}

// ─── GET /api/business — Get current user's business ─────────────────────────

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
  });

  if (!business) {
    return NextResponse.json({ error: "No business found." }, { status: 404 });
  }

  return NextResponse.json(business);
}

// ─── PATCH /api/business — Update business profile ───────────────────────────

const updateBusinessSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  reviewUrl: z.string().url().optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(20).optional(),
  website: z.string().url().optional().or(z.literal("")),
  category: z.string().optional(),
  customIndustry: z.string().max(100).optional(),
  customDescription: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  ctaText: z.string().max(100).optional(),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = updateBusinessSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const business = await prisma.business.update({
      where: { userId: session.user.id },
      data: parsed.data,
    });

    return NextResponse.json(business);
  } catch (error) {
    console.error("[BUSINESS_UPDATE_ERROR]", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
