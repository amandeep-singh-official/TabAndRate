import { redirect } from "next/navigation";

/**
 * DEV ONLY — automatically signs in as a test user without email confirmation.
 * This route is disabled in production via middleware.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  // In dev, just redirect to dashboard — the middleware bypasses auth check for this route
  // The actual session is created by the signIn action via the UI
  redirect("/dashboard");
}
