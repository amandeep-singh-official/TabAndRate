import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AnalyticsView } from "@/components/dashboard/analytics-view";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
  });

  if (!business) redirect("/onboarding/step1");

  const now = new Date();
  const thirtyDaysAgo = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 29,
    0,
    0,
    0,
    0
  );

  const [eventCounts, monthEvents] = await Promise.all([
    prisma.analyticsEvent.groupBy({
      by: ["type"],
      where: { businessId: business.id },
      _count: { id: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        businessId: business.id,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        type: true,
        createdAt: true,
      },
    }),
  ]);

  const countMap = Object.fromEntries(
    eventCounts.map((ec) => [ec.type, ec._count.id])
  );
  const visits = countMap["visit"] ?? 0;
  const generates = countMap["generate"] ?? 0;
  const redirects = countMap["redirect"] ?? 0;
  const intercepted = countMap["intercepted"] ?? 0;

  // Last 30 days chart data
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const targetDate = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - (29 - i)
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
    const label = dayStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    const dayEvents = monthEvents.filter(
      (e) => e.createdAt >= dayStart && e.createdAt <= dayEnd
    );
    return {
      label,
      visits: dayEvents.filter((e) => e.type === "visit").length,
      generates: dayEvents.filter((e) => e.type === "generate").length,
      redirects: dayEvents.filter((e) => e.type === "redirect").length,
      intercepted: dayEvents.filter((e) => e.type === "intercepted").length,
    };
  });

  return (
    <AnalyticsView
      stats={{ visits, generates, redirects, intercepted }}
      chartData={chartData}
    />
  );
}
