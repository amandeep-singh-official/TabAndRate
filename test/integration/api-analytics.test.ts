import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/analytics/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

describe("POST /api/analytics Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when body or event type is invalid", async () => {
    const req = new NextRequest("http://localhost:3000/api/analytics", {
      method: "POST",
      body: JSON.stringify({ slug: "d-hangout", type: "invalid_type" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid input.");
  });

  it("returns 404 if business slug does not exist", async () => {
    vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3000/api/analytics", {
      method: "POST",
      body: JSON.stringify({ slug: "nonexistent-shop", type: "visit" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("Business not found.");
  });

  it("successfully logs analytics events for valid business", async () => {
    vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce({
      id: "biz-123",
    } as any);

    const createSpy = vi.spyOn(prisma.analyticsEvent, "create").mockResolvedValueOnce({
      id: "event-1",
      businessId: "biz-123",
      type: "intercepted",
      createdAt: new Date(),
    } as any);

    const req = new NextRequest("http://localhost:3000/api/analytics", {
      method: "POST",
      body: JSON.stringify({
        slug: "d-hangout",
        type: "intercepted",
        metadata: { rating: 2, feedback: "Service was slow" },
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(createSpy).toHaveBeenCalledWith({
      data: {
        businessId: "biz-123",
        type: "intercepted",
        metadata: { rating: 2, feedback: "Service was slow" },
      },
    });
  });
});
