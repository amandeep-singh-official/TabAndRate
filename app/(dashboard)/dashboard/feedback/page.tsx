import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { FeedbackView } from "@/components/dashboard/feedback-view";

export default async function FeedbackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
  });

  if (!business) redirect("/onboarding/step1");

  const events = await prisma.analyticsEvent.findMany({
    where: {
      businessId: business.id,
      type: "intercepted",
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return <FeedbackView events={events} businessName={business.name} />;
}
