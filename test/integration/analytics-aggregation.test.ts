import { describe, it, expect, vi, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import DashboardPage from "@/app/(dashboard)/dashboard/page";
import AnalyticsPage from "@/app/(dashboard)/dashboard/analytics/page";

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({
    user: { id: "user-test-123", email: "merchant@example.com" },
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

describe("Analytics Aggregation & Date Immutability Integration Tests", () => {
  const mockBusiness = {
    id: "biz-test-1",
    userId: "user-test-123",
    slug: "coffee-haven",
    name: "Coffee Haven",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Lifetime Metrics Unbounded Aggregation", () => {
    it("aggregates lifetime metrics via groupBy without legacy 50 or 500 truncation in DashboardPage", async () => {
      vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce(mockBusiness as any);

      // Return high event counts exceeding 50 and 500
      const groupBySpy = vi.spyOn(prisma.analyticsEvent, "groupBy").mockResolvedValueOnce([
        { type: "visit", _count: { id: 18450 } },
        { type: "generate", _count: { id: 6210 } },
        { type: "redirect", _count: { id: 4320 } },
        { type: "intercepted", _count: { id: 980 } },
      ] as any);

      const findManySpy = vi.spyOn(prisma.analyticsEvent, "findMany")
        .mockResolvedValueOnce([]) // weekEvents
        .mockResolvedValueOnce([]); // recentEvents

      const jsx = await DashboardPage();

      // Verify groupBy query was called for the business with no take limit
      expect(groupBySpy).toHaveBeenCalledWith({
        by: ["type"],
        where: { businessId: mockBusiness.id },
        _count: { id: true },
      });

      // Verify that groupBy was NOT passed a take: 50 or take: 500 argument
      const groupByArgs = groupBySpy.mock.calls[0][0] as any;
      expect(groupByArgs.take).toBeUndefined();

      // Verify JSX props receive full, un-truncated counts
      expect(jsx.props.stats).toEqual({
        visits: 18450,
        generates: 6210,
        redirects: 4320,
        intercepted: 980,
      });
    });

    it("aggregates lifetime metrics via groupBy without truncation in AnalyticsPage", async () => {
      vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce(mockBusiness as any);

      const groupBySpy = vi.spyOn(prisma.analyticsEvent, "groupBy").mockResolvedValueOnce([
        { type: "visit", _count: { id: 45000 } },
        { type: "generate", _count: { id: 12500 } },
        { type: "redirect", _count: { id: 9300 } },
        { type: "intercepted", _count: { id: 2100 } },
      ] as any);

      vi.spyOn(prisma.analyticsEvent, "findMany").mockResolvedValueOnce([]); // monthEvents

      const jsx = await AnalyticsPage();

      expect(groupBySpy).toHaveBeenCalledWith({
        by: ["type"],
        where: { businessId: mockBusiness.id },
        _count: { id: true },
      });

      const groupByArgs = groupBySpy.mock.calls[0][0] as any;
      expect(groupByArgs.take).toBeUndefined();

      expect(jsx.props.stats).toEqual({
        visits: 45000,
        generates: 12500,
        redirects: 9300,
        intercepted: 2100,
      });
    });
  });

  describe("Date Immutability & Timeline Bucketing", () => {
    it("correctly groups 7-day timeline buckets immutably in DashboardPage without date mutation", async () => {
      vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce(mockBusiness as any);

      vi.spyOn(prisma.analyticsEvent, "groupBy").mockResolvedValueOnce([
        { type: "visit", _count: { id: 10 } },
        { type: "redirect", _count: { id: 5 } },
      ] as any);

      const now = new Date();
      // Snapshot original date properties to verify immutability
      const originalTime = now.getTime();

      // Events on specific days
      // Today: 2 visits, 1 redirect
      const todayVisit1 = {
        id: "e1",
        type: "visit",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0),
      };
      const todayVisit2 = {
        id: "e2",
        type: "visit",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 14, 30, 0),
      };
      const todayRedirect = {
        id: "e3",
        type: "redirect",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0, 0),
      };

      // 3 days ago: 1 visit
      const threeDaysAgoVisit = {
        id: "e4",
        type: "visit",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3, 11, 0, 0),
      };

      // 6 days ago (oldest bucket): 1 redirect
      const sixDaysAgoRedirect = {
        id: "e5",
        type: "redirect",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 9, 0, 0),
      };

      const weekEvents = [todayVisit1, todayVisit2, todayRedirect, threeDaysAgoVisit, sixDaysAgoRedirect];

      vi.spyOn(prisma.analyticsEvent, "findMany")
        .mockResolvedValueOnce(weekEvents as any)
        .mockResolvedValueOnce([]);

      const jsx = await DashboardPage();
      const chartData = jsx.props.chartData;

      expect(chartData).toBeDefined();
      expect(chartData.length).toBe(7);

      // Oldest bucket (index 0 = 6 days ago)
      expect(chartData[0].visits).toBe(0);
      expect(chartData[0].redirects).toBe(1);

      // Index 3 (3 days ago)
      expect(chartData[3].visits).toBe(1);
      expect(chartData[3].redirects).toBe(0);

      // Today bucket (index 6 = 0 days ago)
      expect(chartData[6].visits).toBe(2);
      expect(chartData[6].redirects).toBe(1);

      // Verify other buckets (e.g. index 1, 2, 4, 5) have 0
      expect(chartData[1].visits).toBe(0);
      expect(chartData[1].redirects).toBe(0);
      expect(chartData[2].visits).toBe(0);
      expect(chartData[2].redirects).toBe(0);
      expect(chartData[4].visits).toBe(0);
      expect(chartData[4].redirects).toBe(0);
      expect(chartData[5].visits).toBe(0);
      expect(chartData[5].redirects).toBe(0);

      // Immutability check: original date time remains intact
      expect(now.getTime()).toBe(originalTime);
    });

    it("correctly groups 30-day timeline buckets immutably in AnalyticsPage", async () => {
      vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce(mockBusiness as any);

      vi.spyOn(prisma.analyticsEvent, "groupBy").mockResolvedValueOnce([] as any);

      const now = new Date();
      const originalTime = now.getTime();

      // Event on day 0 (29 days ago): 1 visit
      const day0Event = {
        id: "m0",
        type: "visit",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 12, 0, 0),
      };

      // Event on day 15 (14 days ago): 1 generate, 1 intercepted
      const day15Gen = {
        id: "m15a",
        type: "generate",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 10, 0, 0),
      };
      const day15Int = {
        id: "m15b",
        type: "intercepted",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 14, 11, 0, 0),
      };

      // Event today (index 29): 3 visits, 2 redirects
      const todayVisit = {
        id: "m29a",
        type: "visit",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0, 0),
      };
      const todayRedirect = {
        id: "m29b",
        type: "redirect",
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0, 0),
      };

      const monthEvents = [day0Event, day15Gen, day15Int, todayVisit, todayRedirect];

      vi.spyOn(prisma.analyticsEvent, "findMany").mockResolvedValueOnce(monthEvents as any);

      const jsx = await AnalyticsPage();
      const chartData = jsx.props.chartData;

      expect(chartData).toBeDefined();
      expect(chartData.length).toBe(30);

      // Index 0 (29 days ago)
      expect(chartData[0].visits).toBe(1);
      expect(chartData[0].generates).toBe(0);

      // Index 15 (14 days ago)
      expect(chartData[15].generates).toBe(1);
      expect(chartData[15].intercepted).toBe(1);
      expect(chartData[15].visits).toBe(0);

      // Index 29 (today)
      expect(chartData[29].visits).toBe(1);
      expect(chartData[29].redirects).toBe(1);

      // Verify all 30 labels are non-empty strings
      chartData.forEach((bucket: any) => {
        expect(typeof bucket.label).toBe("string");
        expect(bucket.label.length).toBeGreaterThan(0);
      });

      // Immutability check
      expect(now.getTime()).toBe(originalTime);
    });
  });
});
