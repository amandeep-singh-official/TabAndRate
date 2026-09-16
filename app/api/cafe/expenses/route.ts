import { getAuthCafe } from "@/lib/cafe";
import { getISTDayRange } from "@/lib/cafe-utils";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.number().positive("Amount must be greater than 0"),
  note: z.string().optional(),
  paidFrom: z.enum(["CASH", "ONLINE"]).default("CASH"),
  date: z.string().optional(),
});

export async function GET(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const filterDate = searchParams.get("date");
  const targetDate = filterDate ? new Date(filterDate) : new Date();
  const { startOfDay, endOfDay } = getISTDayRange(targetDate);

  const expenses = await prisma.dailyExpense.findMany({
    where: {
      cafeId: cafe.id,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { date: "desc" },
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json({ expenses, total });
}

export async function POST(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const data = expenseSchema.parse(body);

    const expenseDate = data.date ? new Date(data.date) : new Date();

    const expense = await prisma.dailyExpense.create({
      data: {
        cafeId: cafe.id,
        category: data.category.toUpperCase(),
        amount: data.amount,
        note: data.note,
        paidFrom: data.paidFrom,
        date: expenseDate,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record expense";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
