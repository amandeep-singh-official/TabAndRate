import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;
      const PUBLIC_PATHS = [
        "/",
        "/login",
        "/signup",
        "/r",
        "/api/generate",
        "/api/analytics",
      ];
      const DEV_BYPASS = "/dev-login";

      if (pathname === DEV_BYPASS && process.env.NODE_ENV !== "production") {
        return true;
      }

      const isPublic =
        pathname === "/" ||
        PUBLIC_PATHS.filter((p) => p !== "/").some(
          (p) => pathname === p || pathname.startsWith(p + "/")
        ) ||
        (pathname === "/api/auth" || pathname.startsWith("/api/auth/"));

      if (isPublic) return true;
      if (!isLoggedIn) return false;
      return true;
    },
  },
} satisfies NextAuthConfig;
