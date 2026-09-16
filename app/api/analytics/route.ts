import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod";

const trackSchema = z.object({
  slug: z.string().min(1),
  type: z.enum(["visit", "generate", "redirect", "intercepted"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = trackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const { slug, type, metadata } = parsed.data;

    const business = await prisma.business.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!business) {
      return NextResponse.json({ error: "Business not found." }, { status: 404 });
    }

    await prisma.analyticsEvent.create({
      data: {
        businessId: business.id,
        type,
        metadata: metadata as object | undefined,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[ANALYTICS_ERROR]", error);
    return NextResponse.json({ error: "Failed to track event." }, { status: 500 });
  }
}
