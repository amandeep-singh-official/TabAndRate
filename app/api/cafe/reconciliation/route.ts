import { getAuthCafe } from "@/lib/cafe";
import { getISTDayRange } from "@/lib/cafe-utils";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const reconciliationSchema = z.object({
  actualCash: z.number().nonnegative("Actual cash cannot be negative"),
  note: z.string().optional(),
});

export async function GET() {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { startOfDay, endOfDay } = getISTDayRange(new Date());

  // 1. Get today's cash sales
  const cashOrders = await prisma.order.findMany({
    where: {
      cafeId: cafe.id,
      paymentMethod: "CASH",
      status: "COMPLETED",
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: { total: true },
  });
  const cashSalesToday = cashOrders.reduce((sum, o) => sum + o.total, 0);

  // 2. Get today's cash expenses paid from drawer
  const cashExpenses = await prisma.dailyExpense.findMany({
    where: {
      cafeId: cafe.id,
      paidFrom: "CASH",
      date: { gte: startOfDay, lte: endOfDay },
    },
    select: { amount: true },
  });
  const cashExpensesToday = cashExpenses.reduce((sum, e) => sum + e.amount, 0);

  const openingFloat = cafe.openingFloat || 0;
  const expectedCash = openingFloat + cashSalesToday - cashExpensesToday;

  // 3. Check if already reconciled today
  const existingRecord = await prisma.cashReconciliation.findFirst({
    where: {
      cafeId: cafe.id,
      date: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json({
    openingFloat,
    cashSalesToday,
    cashExpensesToday,
    expectedCash,
    existingRecord,
  });
}

export async function POST(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const data = reconciliationSchema.parse(body);

    const { startOfDay, endOfDay } = getISTDayRange(new Date());

    // 1. Calculate expected cash
    const cashOrders = await prisma.order.findMany({
      where: {
        cafeId: cafe.id,
        paymentMethod: "CASH",
        status: "COMPLETED",
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
      select: { total: true },
    });
    const cashSalesToday = cashOrders.reduce((sum, o) => sum + o.total, 0);

    const cashExpenses = await prisma.dailyExpense.findMany({
      where: {
        cafeId: cafe.id,
        paidFrom: "CASH",
        date: { gte: startOfDay, lte: endOfDay },
      },
      select: { amount: true },
    });
    const cashExpensesToday = cashExpenses.reduce((sum, e) => sum + e.amount, 0);

    const openingFloat = cafe.openingFloat || 0;
    const expectedCash = openingFloat + cashSalesToday - cashExpensesToday;
    const discrepancy = data.actualCash - expectedCash;

    const record = await prisma.cashReconciliation.create({
      data: {
        cafeId: cafe.id,
        openingFloat,
        expectedCash,
        actualCash: data.actualCash,
        discrepancy,
        note: data.note,
      },
    });

    return NextResponse.json({ record }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to save cash reconciliation";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
