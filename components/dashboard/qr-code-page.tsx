"use client";

import { useState, useEffect } from "react";
import { Download, Copy, Check, Printer, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface QrCodePageProps {
  business: { slug: string; name: string; ctaText: string };
  funnelUrl: string;
}

export function QrCodePage({ business, funnelUrl }: QrCodePageProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const encoded = encodeURIComponent(funnelUrl);
    setQrUrl(`/api/qr?url=${encoded}&size=400`);
  }, [funnelUrl]);

  async function handleCopy() {
    await navigator.clipboard.writeText(funnelUrl);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload(size: number, label: string) {
    const encoded = encodeURIComponent(funnelUrl);
    const a = document.createElement("a");
    a.href = `/api/qr?url=${encoded}&size=${size}`;
    a.download = `${business.slug}-qr-${label}.png`;
    a.click();
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">QR Code</h1>
        <p className="text-muted-foreground text-sm">
          Print and display your QR code to collect more reviews automatically
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* QR Preview */}
        <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-6">
          <div className="border border-border rounded-2xl p-6 bg-white shadow-sm">
            {qrUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl} alt="Your QR code" width={220} height={220} />
            )}
          </div>
          <div className="text-center space-y-1">
            <p className="font-semibold text-lg">{business.name}</p>
            <p className="text-muted-foreground text-sm">{business.ctaText}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-5">
          {/* Link copy */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-sm">Funnel Link</h2>
            <div className="flex gap-2">
              <Input
                readOnly
                value={funnelUrl}
                className="h-10 text-xs font-mono bg-muted"
              />
              <Button variant="outline" size="sm" className="h-10 gap-1.5 shrink-0" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button variant="outline" className="w-full gap-2" size="sm"
              onClick={() => window.open(funnelUrl, "_blank")}>
              <ExternalLink className="h-4 w-4" />
              Preview Funnel
            </Button>
          </div>

          {/* Download options */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h2 className="font-semibold text-sm">Download</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { size: 200, label: "Small (200px)" },
                { size: 400, label: "Medium (400px)" },
                { size: 600, label: "Large (600px)" },
                { size: 1200, label: "Print (1200px)" },
              ].map(({ size, label }) => (
                <Button
                  key={size}
                  variant="outline"
                  size="sm"
                  className="gap-2 h-10 text-sm"
                  onClick={() => handleDownload(size, `${size}px`)}
                >
                  <Download className="h-3.5 w-3.5" />
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Printing guide */}
          <div className="bg-muted/50 border border-border rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">Printing Tips</h2>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1.5">
              <li>• Download the 1200px version for crisp A4/A5 prints</li>
              <li>• Laminate and stick at your counter, table, or door</li>
              <li>• Use the Flyer Design tool to create a branded poster</li>
              <li>• Add to your invoice/receipt for restaurant & retail</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
