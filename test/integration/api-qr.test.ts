import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/qr/route";
import { NextRequest } from "next/server";

describe("GET /api/qr Integration Tests", () => {
  async function verifyPngResponse(res: Response) {
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Cache-Control")).toContain("max-age=86400");

    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    expect(bytes.length).toBeGreaterThan(0);
    // Verify PNG magic number bytes (0x89, 0x50, 0x4E, 0x47)
    expect(bytes[0]).toBe(0x89);
    expect(bytes[1]).toBe(0x50); // 'P'
    expect(bytes[2]).toBe(0x4e); // 'N'
    expect(bytes[3]).toBe(0x47); // 'G'
  }

  it("returns 400 when url parameter is missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/qr");
    const res = await GET(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("url parameter is required");
  });

  it("generates a valid PNG QR code for a given standard URL", async () => {
    const targetUrl = encodeURIComponent("https://tabandrate.com/r/d-hangout");
    const req = new NextRequest(`http://localhost:3000/api/qr?url=${targetUrl}&size=300`);
    const res = await GET(req);

    await verifyPngResponse(res);
  });

  describe("QR Code Safety & Percent-Character Decoding Immunity", () => {
    it("handles URLs with literal percent signs (e.g. 50%off) without throwing URIError", async () => {
      // In query strings, unescaped %off or 100%real previously crashed with URIError: URI malformed
      const rawUrl = "https://tabandrate.com/r/my-shop?discount=50%off";
      const req = new NextRequest(`http://localhost:3000/api/qr?url=${encodeURIComponent(rawUrl)}`);
      
      const res = await GET(req);
      await verifyPngResponse(res);
    });

    it("handles URLs with multiple percent signs (e.g. 100%real and save%25)", async () => {
      const rawUrl = "https://tabandrate.com/r/my-shop?offer=100%real&extra=save%25now";
      const req = new NextRequest(`http://localhost:3000/api/qr?url=${encodeURIComponent(rawUrl)}`);
      
      const res = await GET(req);
      await verifyPngResponse(res);
    });

    it("handles pre-encoded percent sequences (%20, %26, %3D) safely without double-decoding errors", async () => {
      const rawUrl = "https://tabandrate.com/r/my%20shop?param%3Dvalue%26test%3D1";
      const req = new NextRequest(`http://localhost:3000/api/qr?url=${encodeURIComponent(rawUrl)}`);
      
      const res = await GET(req);
      await verifyPngResponse(res);
    });

    it("handles raw percent character in direct query URL", async () => {
      // Direct raw query where URL has raw %
      const req = new NextRequest("http://localhost:3000/api/qr?url=https://tabandrate.com/r/shop?disc=50%off");
      const res = await GET(req);
      await verifyPngResponse(res);
    });
  });

  describe("Size Parameter Parsing & Boundary Clamping", () => {
    it("clamps size parameter between 100 and 600", async () => {
      const targetUrl = encodeURIComponent("https://tabandrate.com");
      
      // Request with size 50 (should clamp to 100)
      const reqSmall = new NextRequest(`http://localhost:3000/api/qr?url=${targetUrl}&size=50`);
      const resSmall = await GET(reqSmall);
      await verifyPngResponse(resSmall);

      // Request with size 1200 (should clamp to 600)
      const reqBig = new NextRequest(`http://localhost:3000/api/qr?url=${targetUrl}&size=1200`);
      const resBig = await GET(reqBig);
      await verifyPngResponse(resBig);
    });

    it("handles non-numeric or invalid size strings gracefully without NaN crash", async () => {
      const targetUrl = encodeURIComponent("https://tabandrate.com/r/safe-test");

      const invalidSizes = ["invalid", "abc", "NaN", "undefined", "-50", "null"];

      for (const size of invalidSizes) {
        const req = new NextRequest(`http://localhost:3000/api/qr?url=${targetUrl}&size=${size}`);
        const res = await GET(req);
        await verifyPngResponse(res);
      }
    });
  });
});
