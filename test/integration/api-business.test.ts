import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PATCH } from "@/app/api/business/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("/api/business Integration Tests", () => {
  const mockUserId = "user-abc-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/business", () => {
    it("returns 401 if unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({ name: "Cafe Mocha", reviewUrl: "https://maps.app.goo.gl/123", category: "Cafe" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.error).toBe("Unauthorised");
    });

    it("returns 400 if required fields are invalid or missing", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: mockUserId } } as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({ name: "", reviewUrl: "not-a-valid-url" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Invalid input.");
    });

    it("returns 409 if user already owns a business profile", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: mockUserId } } as any);
      vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce({
        id: "biz-existing",
        slug: "existing-cafe",
        userId: mockUserId,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({
          name: "Cafe Mocha",
          reviewUrl: "https://maps.app.goo.gl/123",
          category: "Cafe",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toBe("You already have a business profile.");
      expect(data.slug).toBe("existing-cafe");
    });

    it("creates business with unique slug collision handling and seeded tags", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: mockUserId } } as any);

      // First check: existing user business -> null
      // Second check: baseSlug collision -> exists
      // Third check: baseSlug-1 collision -> null (free)
      const findUniqueSpy = vi.spyOn(prisma.business, "findUnique")
        .mockResolvedValueOnce(null) // no existing for user
        .mockResolvedValueOnce({ id: "collision-1" } as any) // "cafe-mocha" taken
        .mockResolvedValueOnce(null); // "cafe-mocha-1" available

      const createSpy = vi.spyOn(prisma.business, "create").mockResolvedValueOnce({
        id: "biz-created-456",
        slug: "cafe-mocha-1",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({
          name: "Cafe Mocha",
          reviewUrl: "https://maps.app.goo.gl/123",
          category: "Restaurant",
          address: "123 Main St",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.slug).toBe("cafe-mocha-1");
      expect(data.id).toBe("biz-created-456");

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUserId,
            name: "Cafe Mocha",
            slug: "cafe-mocha-1",
            category: "Restaurant",
            tags: expect.arrayContaining(["Delicious Food", "Great Ambiance"]),
          }),
        })
      );
    });
  });

  describe("GET /api/business", () => {
    it("returns 401 if unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns 404 if user has no business", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: mockUserId } } as any);
      vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce(null);

      const res = await GET();
      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("No business found.");
    });

    it("returns business data when found", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: mockUserId } } as any);
      vi.spyOn(prisma.business, "findUnique").mockResolvedValueOnce({
        id: "biz-1",
        name: "Test Bistro",
        slug: "test-bistro",
      } as any);

      const res = await GET();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.name).toBe("Test Bistro");
      expect(data.slug).toBe("test-bistro");
    });
  });

  describe("PATCH /api/business", () => {
    it("returns 401 if unauthenticated", async () => {
      vi.mocked(auth).mockResolvedValueOnce(null as any);
      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "PATCH",
        body: JSON.stringify({ customDescription: "Updated desc" }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(401);
    });

    it("returns 400 if payload fails validation (e.g. invalid primaryColor)", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: mockUserId } } as any);
      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "PATCH",
        body: JSON.stringify({ primaryColor: "not-a-hex" }),
      });
      const res = await PATCH(req);
      expect(res.status).toBe(400);
    });

    it("successfully updates business profile", async () => {
      vi.mocked(auth).mockResolvedValueOnce({ user: { id: mockUserId } } as any);
      const updateSpy = vi.spyOn(prisma.business, "update").mockResolvedValueOnce({
        id: "biz-1",
        customDescription: "Artisan sourdough bakery",
        tags: ["Fresh Bread", "Coffee"],
        primaryColor: "#4F46E5",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "PATCH",
        body: JSON.stringify({
          customDescription: "Artisan sourdough bakery",
          tags: ["Fresh Bread", "Coffee"],
          primaryColor: "#4F46E5",
        }),
      });

      const res = await PATCH(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.customDescription).toBe("Artisan sourdough bakery");
      expect(updateSpy).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          customDescription: "Artisan sourdough bakery",
          tags: ["Fresh Bread", "Coffee"],
          primaryColor: "#4F46E5",
        },
      });
    });
  });
});
