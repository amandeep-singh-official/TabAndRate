import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/**
 * Server-only helper to fetch or verify current logged-in cafe
 */
export async function getAuthCafe() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized", status: 401, cafe: null, session: null };
  }

  const cafe = await prisma.cafeProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!cafe) {
    return { error: "Cafe profile not found", status: 404, cafe: null, session };
  }

  return { error: null, status: 200, cafe, session };
}
