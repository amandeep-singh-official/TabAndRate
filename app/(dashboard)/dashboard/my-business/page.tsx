import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { MyBusinessForm } from "@/components/dashboard/my-business-form";

export default async function MyBusinessPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
  });

  if (!business) redirect("/onboarding/step1");

  return <MyBusinessForm business={business} />;
}
