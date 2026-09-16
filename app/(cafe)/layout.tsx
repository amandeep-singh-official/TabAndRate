import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CafeSidebar } from "@/components/cafe/cafe-sidebar";

export default async function CafeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const cafe = await prisma.cafeProfile.findUnique({
    where: { userId: session.user.id },
    select: { cafeName: true },
  });

  return (
    <div className="flex min-h-screen bg-background text-foreground antialiased selection:bg-amber-500/30 selection:text-amber-900">
      <CafeSidebar 
        cafeName={cafe?.cafeName} 
        userName={session.user.name} 
        userImage={session.user.image} 
      />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {children}
      </main>
    </div>
  );
}
