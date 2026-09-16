import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerFunnel } from "@/components/funnel/customer-funnel";

interface FunnelPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: FunnelPageProps) {
  const { slug } = await params;
  const business = await prisma.business.findUnique({
    where: { slug },
    select: { name: true },
  });
  return {
    title: business ? `Review ${business.name}` : "Leave a Review",
  };
}

export default async function FunnelPage({ params }: FunnelPageProps) {
  const { slug } = await params;

  const business = await prisma.business.findUnique({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      address: true,
      reviewUrl: true,
      category: true,
      tags: true,
      customDescription: true,
      logoUrl: true,
    },
  });

  if (!business) notFound();

  return <CustomerFunnel business={business} />;
}
