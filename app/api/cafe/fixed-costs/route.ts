import { getAuthCafe } from "@/lib/cafe";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const fixedCostSchema = z.object({
  type: z.enum(["RENT", "ELECTRICITY", "SALARY"]),
  amount: z.number().nonnegative(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
});

export async function GET(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const now = new Date();
  const month = Number(searchParams.get("month") || now.getMonth() + 1);
  const year = Number(searchParams.get("year") || now.getFullYear());

  const fixedCosts = await prisma.fixedCost.findMany({
    where: {
      cafeId: cafe.id,
      month,
      year,
    },
  });

  const total = fixedCosts.reduce((sum, fc) => sum + fc.amount, 0);

  return NextResponse.json({ fixedCosts, total, month, year });
}

export async function POST(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const data = fixedCostSchema.parse(body);

    const cost = await prisma.fixedCost.upsert({
      where: {
        cafeId_type_month_year: {
          cafeId: cafe.id,
          type: data.type,
          month: data.month,
          year: data.year,
        },
      },
      update: {
        amount: data.amount,
      },
      create: {
        cafeId: cafe.id,
        type: data.type,
        amount: data.amount,
        month: data.month,
        year: data.year,
      },
    });

    return NextResponse.json({ cost });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save fixed cost";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
