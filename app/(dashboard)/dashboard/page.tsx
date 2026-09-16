import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

async function getDashboardData(userId: string) {
  const business = await prisma.business.findUnique({
    where: { userId },
  });

  if (!business) return null;

  const now = new Date();
  const sevenDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 6,
    0,
    0,
    0,
    0
  );

  const [eventCounts, weekEvents, recentEvents] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: { businessId: business.id },
      _count: { id: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: sevenDaysAgo },
      },
      select: {
        type: true,
        createdAt: true,
      },
    }),
    prisma.analyticsEvent.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const countMap = Object.fromEntries(
    eventCounts.map((ec) => [ec.type, ec._count.id])
  );
  const visits = countMap["visit"] ?? 0;
  const generates = countMap["generate"] ?? 0;
  const redirects = countMap["redirect"] ?? 0;
  const intercepted = countMap["intercepted"] ?? 0;

  // Last 7 days chart data
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (6 - i)
    );
    const dayStart = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      0,
      0,
      0,
      0
    );
    const dayEnd = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      targetDate.getDate(),
      23,
      59,
      59,
      999
    );
    const dayStr = dayStart.toLocaleDateString("en-US", { weekday: "short" });

    const dayEvents = weekEvents.filter(
      (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
    );
    return {
      day: dayStr,
      visits: dayEvents.filter((e) => e.type === "visit").length,
      redirects: dayEvents.filter((e) => e.type === "redirect").length,
    };
  });

  return {
    business,
    stats: { visits, generates, redirects, intercepted },
    chartData,
    recentEvents,
  };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const data = await getDashboardData(session.user.id);
  if (!data) redirect("/onboarding/step1");

  return (
    <DashboardHome
      business={data.business}
      stats={data.stats}
      chartData={data.chartData}
      recentEvents={data.recentEvents}
      funnelUrl={`${process.env.NEXTAUTH_URL ?? ""}/r/${data.business.slug}`}
    />
  );
}
