import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/generate/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import * as aiModule from "@/lib/ai";

describe("POST /api/generate Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when tags array is empty or missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({ slug: "d-hangout", tags: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe("Invalid input.");
  });

  it("returns 404 when business slug does not exist", async () => {
    vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce(null);

    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({ slug: "nonexistent-shop", tags: ["Great Service"] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toBe("Business not found.");
  });

  it("generates 5 reviews and returns reviews array", async () => {
    vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce({
      id: "biz-1",
      name: "D-Hangout",
      category: "Cafe",
      customDescription: "Best iced latte in town",
    } as any);

    const mockReviews = [
      "Review 1 for D-Hangout",
      "Review 2 for D-Hangout",
      "Review 3 for D-Hangout",
      "Review 4 for D-Hangout",
      "Review 5 for D-Hangout",
    ];
    vi.spyOn(aiModule, "generateReviews").mockResolvedValueOnce(mockReviews);

    const req = new NextRequest("http://localhost:3000/api/generate", {
      method: "POST",
      body: JSON.stringify({
        slug: "d-hangout",
        tags: ["Cozy Ambiance", "Friendly Staff"],
        extraNotes: "Loved the music",
        language: "English",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.reviews).toEqual(mockReviews);
    expect(data.reviews.length).toBe(5);
  });
});
