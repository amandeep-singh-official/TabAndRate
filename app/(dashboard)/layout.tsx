import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Check if user has completed onboarding
  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!business) redirect("/onboarding/step1");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        userName={session.user.name}
        userImage={session.user.image}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
