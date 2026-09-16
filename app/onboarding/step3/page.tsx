"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  LayoutDashboard,
  Loader2,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OnboardingStepper } from "@/components/onboarding/stepper";

export default function OnboardingStep3() {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const funnelUrl =
    typeof window !== "undefined" && slug
      ? `${window.location.origin}/r/${slug}`
      : "";

  useEffect(() => {
    const savedSlug = sessionStorage.getItem("onboarding_slug");
    if (!savedSlug) {
      router.replace("/onboarding/step1");
      return;
    }
    setSlug(savedSlug);
  }, [router]);

  // Fetch QR code from our API once we have the slug
  useEffect(() => {
    if (!slug) return;
    const url = encodeURIComponent(`${window.location.origin}/r/${slug}`);
    fetch(`/api/qr?url=${url}&size=200`)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onload = () => setQrDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, [slug]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(funnelUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy.");
    }
  }

  function handleDownloadQR() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${slug}-qr.png`;
    a.click();
  }

  return (
    <div className="space-y-8">
      <OnboardingStepper current={3} />

      <div className="bg-card border border-border rounded-2xl p-8 space-y-8 shadow-sm">
        {/* Success header */}
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight">
              Your funnel is live! 🎉
            </h1>
            <p className="text-sm text-muted-foreground">
              Share the link or print the QR code. Every scan = a potential 5-star review.
            </p>
          </div>
        </div>

        {/* QR code */}
        <div className="flex flex-col items-center gap-4">
          <div className="border border-border rounded-xl p-5 bg-background inline-block">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrDataUrl}
                alt="Your review funnel QR code"
                width={180}
                height={180}
                className="rounded"
              />
            ) : (
              <div className="h-[180px] w-[180px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDownloadQR}
            disabled={!qrDataUrl}
          >
            <Download className="h-4 w-4" />
            Download QR PNG
          </Button>
        </div>

        {/* Funnel link */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Your Review Funnel Link</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={funnelUrl}
              className="h-11 bg-muted text-sm font-mono"
            />
            <Button
              variant="outline"
              className="h-11 px-4 gap-2 shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-primary" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Place this link on your invoices, menus, or WhatsApp status.
          </p>
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href={`/r/${slug ?? ""}`}
            target="_blank"
            className={cn(buttonVariants({ variant: "outline" }), "flex-1 h-11 gap-2")}
          >
            <QrCode className="h-4 w-4" />
            Preview Funnel
          </Link>
          <Button
            className="flex-1 h-11 gap-2"
            onClick={() => {
              sessionStorage.removeItem("onboarding_slug");
              router.push("/dashboard");
            }}
          >
            <LayoutDashboard className="h-4 w-4" />
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
