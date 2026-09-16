import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { QrCodePage } from "@/components/dashboard/qr-code-page";

export default async function QRCodePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const business = await prisma.business.findUnique({
    where: { userId: session.user.id },
    select: { slug: true, name: true, ctaText: true },
  });

  if (!business) redirect("/onboarding/step1");

  const funnelUrl = `${process.env.NEXTAUTH_URL ?? "https://yourdomain.com"}/r/${business.slug}`;

  return <QrCodePage business={business} funnelUrl={funnelUrl} />;
}
