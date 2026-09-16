import { describe, it, expect } from "vitest";
import { authConfig } from "@/auth.config";

describe("authConfig Middleware Authorization Unit Tests", () => {
  const authorized = authConfig.callbacks?.authorized;

  if (!authorized) {
    throw new Error("authConfig.callbacks.authorized is not defined");
  }

  function checkAccess(pathname: string, user: any = null): boolean {
    const nextUrl = new URL(pathname, "http://localhost:3000");
    const req = { nextUrl } as any;
    const auth = user ? ({ user, expires: new Date(Date.now() + 86400000).toISOString() } as any) : null;
    return !!authorized({ auth: auth as any, request: req });
  }

  describe("Public Funnel & Unauthenticated Access", () => {
    it("returns true for unauthenticated requests to /api/generate", () => {
      expect(checkAccess("/api/generate")).toBe(true);
    });

    it("returns true for unauthenticated requests to /api/analytics", () => {
      expect(checkAccess("/api/analytics")).toBe(true);
    });

    it("returns true for unauthenticated requests to customer funnel /r/[slug]", () => {
      expect(checkAccess("/r/my-shop")).toBe(true);
      expect(checkAccess("/r/d-hangout-cafe")).toBe(true);
      expect(checkAccess("/r/business-xyz123")).toBe(true);
    });

    it("returns true for unauthenticated requests to marketing and auth pages", () => {
      expect(checkAccess("/")).toBe(true);
      expect(checkAccess("/login")).toBe(true);
      expect(checkAccess("/signup")).toBe(true);
    });

    it("returns true for unauthenticated requests to /api/auth routes", () => {
      expect(checkAccess("/api/auth/signin")).toBe(true);
      expect(checkAccess("/api/auth/callback/credentials")).toBe(true);
      expect(checkAccess("/api/auth/session")).toBe(true);
    });
  });

  describe("Protected Routes Access Control", () => {
    it("returns false for unauthenticated requests to protected merchant routes", () => {
      expect(checkAccess("/dashboard")).toBe(false);
      expect(checkAccess("/dashboard/analytics")).toBe(false);
      expect(checkAccess("/dashboard/qr")).toBe(false);
      expect(checkAccess("/dashboard/settings")).toBe(false);
      expect(checkAccess("/api/business")).toBe(false);
      expect(checkAccess("/api/business/profile")).toBe(false);
    });

    it("returns true for authenticated requests to protected merchant routes", () => {
      const mockUser = { id: "123", email: "merchant@example.com", name: "Merchant" };
      expect(checkAccess("/dashboard", mockUser)).toBe(true);
      expect(checkAccess("/dashboard/analytics", mockUser)).toBe(true);
      expect(checkAccess("/api/business", mockUser)).toBe(true);
      expect(checkAccess("/dashboard/settings", mockUser)).toBe(true);
    });

    it("returns true for authenticated requests to public routes", () => {
      const mockUser = { id: "123", email: "merchant@example.com" };
      expect(checkAccess("/", mockUser)).toBe(true);
      expect(checkAccess("/r/my-shop", mockUser)).toBe(true);
      expect(checkAccess("/api/generate", mockUser)).toBe(true);
    });
  });
});
