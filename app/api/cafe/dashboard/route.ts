import { getAuthCafe } from "@/lib/cafe";
import { getISTDayRange } from "@/lib/cafe-utils";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const now = new Date();
  const { startOfDay, endOfDay } = getISTDayRange(now);

  // 1. Today's orders
  const todayOrders = await prisma.order.findMany({
    where: {
      cafeId: cafe.id,
      status: "COMPLETED",
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    include: { items: true },
  });

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);
  const totalOrdersCount = todayOrders.length;
  const aov = totalOrdersCount > 0 ? todayRevenue / totalOrdersCount : 0;

  const cashRevenue = todayOrders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((sum, o) => sum + o.total, 0);

  const onlineRevenue = todayOrders
    .filter((o) => o.paymentMethod === "ONLINE")
    .reduce((sum, o) => sum + o.total, 0);

  // 2. Today's expenses
  const todayExpenses = await prisma.dailyExpense.findMany({
    where: {
      cafeId: cafe.id,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });
  const todaySpending = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayProfit = todayRevenue - todaySpending;

  // 3. Top 5 Best Sellers (from past 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentOrderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        cafeId: cafe.id,
        status: "COMPLETED",
        createdAt: { gte: thirtyDaysAgo },
      },
    },
    select: {
      name: true,
      quantity: true,
      priceAtSale: true,
    },
  });

  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const item of recentOrderItems) {
    const prev = itemMap.get(item.name) || { name: item.name, quantity: 0, revenue: 0 };
    itemMap.set(item.name, {
      name: item.name,
      quantity: prev.quantity + item.quantity,
      revenue: prev.revenue + item.priceAtSale * item.quantity,
    });
  }

  const topSellers = Array.from(itemMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // 4. Monthly Fixed Costs & Run-Rate
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fixedCosts = await prisma.fixedCost.findMany({
    where: {
      cafeId: cafe.id,
      month: currentMonth,
      year: currentYear,
    },
  });
  const monthlyFixedTotal = fixedCosts.reduce((sum, fc) => sum + fc.amount, 0);

  // Month-to-date revenue
  const startOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1, 0, 0, 0));
  startOfMonth.setMinutes(startOfMonth.getMinutes() - 330);

  const mtdOrders = await prisma.order.findMany({
    where: {
      cafeId: cafe.id,
      status: "COMPLETED",
      createdAt: { gte: startOfMonth },
    },
    select: { total: true },
  });
  const mtdRevenue = mtdOrders.reduce((sum, o) => sum + o.total, 0);
  const runRatePercent = monthlyFixedTotal > 0 ? (mtdRevenue / monthlyFixedTotal) * 100 : 100;

  // 5. 7-Day Revenue Trend
  const chartData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayRange = getISTDayRange(d);

    const dayOrders = await prisma.order.findMany({
      where: {
        cafeId: cafe.id,
        status: "COMPLETED",
        createdAt: { gte: dayRange.startOfDay, lte: dayRange.endOfDay },
      },
      select: { total: true, paymentMethod: true },
    });

    const cash = dayOrders
      .filter((o) => o.paymentMethod === "CASH")
      .reduce((sum, o) => sum + o.total, 0);
    const online = dayOrders
      .filter((o) => o.paymentMethod === "ONLINE")
      .reduce((sum, o) => sum + o.total, 0);

    const dayName = new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      timeZone: "Asia/Kolkata",
    }).format(d);

    chartData.push({
      date: dayRange.istDateString,
      day: dayName,
      cash,
      online,
      total: cash + online,
    });
  }

  return NextResponse.json({
    cafeName: cafe.cafeName,
    today: {
      revenue: todayRevenue,
      orderCount: totalOrdersCount,
      aov,
      cashRevenue,
      onlineRevenue,
      spending: todaySpending,
      profit: todayProfit,
    },
    topSellers,
    fixedCosts: {
      monthlyTotal: monthlyFixedTotal,
      mtdRevenue,
      runRatePercent,
    },
    chartData,
  });
}
