import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/auth/register/route";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";

// Capture the configuration passed to NextAuth in auth.ts using vi.hoisted
const mocks = vi.hoisted(() => {
  return {
    capturedNextAuthConfig: null as any,
  };
});

vi.mock("next-auth", () => ({
  default: vi.fn((config: any) => {
    mocks.capturedNextAuthConfig = config;
    return {
      handlers: { GET: vi.fn(), POST: vi.fn() },
      signIn: vi.fn(),
      signOut: vi.fn(),
      auth: vi.fn(),
    };
  }),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((options: any) => ({
    id: "credentials",
    name: "credentials",
    ...options,
  })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", name: "Google" })),
}));

vi.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: vi.fn(),
}));

// Importing @/auth executes auth.ts and passes the configuration to NextAuth
import "@/auth";

describe("Authentication & Email Normalization Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/auth/register", () => {
    beforeEach(() => {
      vi.spyOn(bcrypt, "hash").mockImplementation(
        async () => "$2a$12$e8YqK6hFzH4R0p0y7D8cOe12345678901234567890123456789012"
      );
    });

    it("returns 400 for missing or invalid email", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: "Alice", email: "invalid-email", password: "password123" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.error).toBe("Invalid input.");
    });

    it("returns 400 for passwords shorter than 6 characters", async () => {
      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: "Bob", email: "bob@example.com", password: "123" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 409 if user already exists", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "existing-user-id",
        email: "duplicate@example.com",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Duplicate User",
          email: "duplicate@example.com",
          password: "securepassword123",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(409);

      const data = await res.json();
      expect(data.error).toBe("An account with this email already exists.");
    });

    it("returns 201 and creates user when payload is valid", async () => {
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      const createSpy = vi.spyOn(prisma.user, "create").mockResolvedValueOnce({
        id: "new-user-id",
        email: "newuser@example.com",
        name: "New User",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "newuser@example.com",
          password: "securepassword123",
        }),
      });
      const res = await POST(req);
      expect(res.status).toBe(201);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(createSpy).toHaveBeenCalled();
    });

    it("normalizes mixed-case and whitespace emails during registration before querying and storing", async () => {
      const findUniqueSpy = vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      const createSpy = vi.spyOn(prisma.user, "create").mockResolvedValueOnce({
        id: "user-norm-1",
        name: "Alice Smith",
        email: "alice.smith@example.com",
      } as any);

      const rawEmail = "  Alice.Smith@EXAMPLE.Com  ";
      const expectedNormalizedEmail = "alice.smith@example.com";

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Alice Smith",
          email: rawEmail,
          password: "securepassword123",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify findUnique was called with normalized lowercase trimmed email
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: expectedNormalizedEmail },
      });

      // Verify create was called with normalized email
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Alice Smith",
          email: expectedNormalizedEmail,
        }),
      });
    });

    it("handles tab and newline whitespace in registration emails", async () => {
      const findUniqueSpy = vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);
      const createSpy = vi.spyOn(prisma.user, "create").mockResolvedValueOnce({
        id: "user-norm-2",
        name: "Bob Doe",
        email: "bob.doe@example.com",
      } as any);

      const req = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Bob Doe",
          email: "\t BOB.DOE@Example.COM \n",
          password: "securepassword123",
        }),
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: "bob.doe@example.com" },
      });
      expect(createSpy).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "bob.doe@example.com",
        }),
      });
    });
  });

  describe("Credentials Sign-In (auth.ts) Email Normalization", () => {
    beforeEach(() => {
      vi.spyOn(bcrypt, "hash").mockRestore();
    });

    function getCredentialsAuthorize() {
      expect(mocks.capturedNextAuthConfig).toBeDefined();
      const credentialsProvider = mocks.capturedNextAuthConfig.providers.find(
        (p: any) => p.name === "credentials" || p.id === "credentials"
      );
      expect(credentialsProvider).toBeDefined();
      expect(typeof credentialsProvider.authorize).toBe("function");
      return credentialsProvider.authorize;
    }

    it("normalizes mixed-case and whitespace email before querying user in prisma", async () => {
      const authorize = getCredentialsAuthorize();
      const passwordHash = await bcrypt.hash("password123", 10);
      const mockUser = {
        id: "user-alice-123",
        name: "Alice Smith",
        email: "alice.smith@example.com",
        passwordHash,
        image: null,
      };

      const findUniqueSpy = vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(mockUser as any);

      const result = await authorize({
        email: "   Alice.Smith@EXAMPLE.COM   ",
        password: "password123",
      });

      expect(findUniqueSpy).toHaveBeenCalledWith({
        where: { email: "alice.smith@example.com" },
      });
      expect(result).toEqual({
        id: "user-alice-123",
        email: "alice.smith@example.com",
        name: "Alice Smith",
        image: null,
      });
    });

    it("returns null if password does not match", async () => {
      const authorize = getCredentialsAuthorize();
      const passwordHash = await bcrypt.hash("correct-password", 10);
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce({
        id: "user-1",
        email: "user@example.com",
        passwordHash,
      } as any);

      const result = await authorize({
        email: "USER@example.com",
        password: "wrong-password",
      });

      expect(result).toBeNull();
    });

    it("returns null if user does not exist in database", async () => {
      const authorize = getCredentialsAuthorize();
      vi.spyOn(prisma.user, "findUnique").mockResolvedValueOnce(null);

      const result = await authorize({
        email: "nonexistent@example.com",
        password: "anypassword123",
      });

      expect(result).toBeNull();
    });

    it("returns null for malformed credentials input", async () => {
      const authorize = getCredentialsAuthorize();
      const result = await authorize({
        email: "not-an-email",
        password: "123", // too short (< 6 chars)
      });

      expect(result).toBeNull();
    });
  });
});
