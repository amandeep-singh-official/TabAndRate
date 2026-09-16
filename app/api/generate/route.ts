import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateReviews } from "@/lib/ai";
import { z } from "zod";


const generateSchema = z.object({
  slug: z.string().min(1),
  tags: z.array(z.string()).min(1).max(8),
  extraNotes: z.string().max(500).optional(),
  language: z.string().default("English"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = generateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const { slug, tags, extraNotes, language } = parsed.data;

    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        category: true,
        customDescription: true,
      },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    const reviews = await generateReviews({
      businessName: business.name,
      category: business.category,
      tags,
      customDescription: business.customDescription,
      extraNotes,
      language,
      count: 5,
    });

    // Track event (non-blocking)
    prisma.analyticsEvent
      .create({
        data: {
          businessId: business.id,
          type: "generate",
          metadata: { tags, language },
        },
      })
      .catch(() => {});

    return NextResponse.json({ reviews });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[GENERATE_ERROR]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
