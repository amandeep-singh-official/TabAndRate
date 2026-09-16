import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST as businessPOST } from "@/app/api/business/route";
import { GET as qrGET } from "@/app/api/qr/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

describe("Adversarial Challenger Stress Tests", () => {
  const mockUserId = "usr-challenger-stress-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/business — Collision and Edge-Case Stress", () => {
    it("bounds collision retry loop at attempt 11 and appends random entropy suffix", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as any);

      let findCount = 0;



      vi.spyOn(prisma.business, "findUnique").mockImplementation((({ where }: any) => {
        if (where.userId) return Promise.resolve(null);
        findCount++;
        return Promise.resolve({ id: `existing-${findCount}`, slug: where.slug });
      }) as any);

      let createdData: any = null;

      vi.spyOn(prisma.business, "create").mockImplementation((({ data }: any) => {
        createdData = data;
        return Promise.resolve({ id: "biz-stress-1", ...data });
      }) as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({
          name: "Cafe Mocha",
          reviewUrl: "https://maps.app.goo.gl/123",
          category: "Cafe",
        }),
      });

      const res = await businessPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.slug).toMatch(/^cafe-mocha-[a-z0-9]{6}$/);
      expect(createdData.slug).toMatch(/^cafe-mocha-[a-z0-9]{6}$/);
      expect(findCount).toBe(11);
    });

    it("terminates collision retry loop at attempt 10 when slot becomes available", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as any);

      let findCount = 0;




      vi.spyOn(prisma.business, "findUnique").mockImplementation((({ where }: any) => {
        if (where.userId) return Promise.resolve(null);
        findCount++;
        if (where.slug === "cafe-mocha-10") return Promise.resolve(null);
        return Promise.resolve({ id: `existing-${findCount}`, slug: where.slug });
      }) as any);

      let createdData: any = null;





      vi.spyOn(prisma.business, "create").mockImplementation((({ data }: any) => {
        createdData = data;
        return Promise.resolve({ id: "biz-stress-2", ...data });
      }) as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({
          name: "Cafe Mocha",
          reviewUrl: "https://maps.app.goo.gl/123",
          category: "Cafe",
        }),
      });

      const res = await businessPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.slug).toBe("cafe-mocha-10");
      expect(createdData.slug).toBe("cafe-mocha-10");
    });

    it("creates business with valid URL-safe fallback slug for non-Latin Devanagari name", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as any);
      vi.spyOn(prisma.business, "findUnique").mockResolvedValue(null as any);

      let createdData: any = null;
      vi.spyOn(prisma.business, "create").mockImplementation((({ data }: any) => {
        createdData = data;
        return Promise.resolve({ id: "biz-stress-3", ...data });
      }) as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({
          name: "नमस्ते रेस्टोरेंट",
          reviewUrl: "https://maps.app.goo.gl/123",
          category: "Restaurant",
        }),
      });

      const res = await businessPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.slug).toMatch(/^business-[a-z0-9]{6}$/);
      expect(createdData.slug).toMatch(/^business-[a-z0-9]{6}$/);
    });

    it("creates business with valid URL-safe fallback slug for emoji-only business name", async () => {
      vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as any);
      vi.spyOn(prisma.business, "findUnique").mockResolvedValue(null as any);

      let createdData: any = null;




      vi.spyOn(prisma.business, "create").mockImplementation((({ data }: any) => {
        createdData = data;
        return Promise.resolve({ id: "biz-stress-4", ...data });
      }) as any);

      const req = new NextRequest("http://localhost:3000/api/business", {
        method: "POST",
        body: JSON.stringify({
          name: "🍕🎉🚀",
          reviewUrl: "https://maps.app.goo.gl/123",
          category: "Food Truck",
        }),
      });

      const res = await businessPOST(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.slug).toMatch(/^business-[a-z0-9]{6}$/);
      expect(createdData.slug).toMatch(/^business-[a-z0-9]{6}$/);
    });
  });

  describe("GET /api/qr — Percent-Encoding Immunity and Clamping", () => {
    it("handles literal unescaped percent signs and malformed escapes without URIError", async () => {
      const testUrls = [
        "https://example.com/discount?deal=50%off",
        "https://example.com/test?param=%ZZ_invalid",
        "https://tabandrate.com/r/my-shop?campaign=100%real&tracking=%99",
      ];

      for (const url of testUrls) {
        const req = new NextRequest(`http://localhost:3000/api/qr?url=${encodeURIComponent(url)}`);
        const res = await qrGET(req);
        expect(res.status).toBe(200);
        expect(res.headers.get("content-type")).toBe("image/png");

        const buffer = Buffer.from(await res.arrayBuffer());
        expect(buffer[0]).toBe(0x89);
        expect(buffer[1]).toBe(0x50);
        expect(buffer[2]).toBe(0x4e);
        expect(buffer[3]).toBe(0x47);
      }
    });

    it("clamps QR code size parameter to valid boundaries [100, 600] and defaults invalid inputs", async () => {
      const cases = [
        { size: "50", expectedSize: 100 },
        { size: "9999", expectedSize: 600 },
        { size: "invalid", expectedSize: 300 },
      ];

      for (const { size, expectedSize } of cases) {
        const req = new NextRequest(`http://localhost:3000/api/qr?url=https://tabandrate.com/r/demo&size=${size}`);
        const res = await qrGET(req);
        expect(res.status).toBe(200);

        const buffer = Buffer.from(await res.arrayBuffer());
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        expect(width).toBe(expectedSize);
        expect(height).toBe(expectedSize);
      }
    });
  });
});
