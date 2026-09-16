"use client";

import { useState, useRef } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FlyerDesignCanvasProps {
  business: { slug: string; name: string; ctaText: string };
  funnelUrl: string;
}

const COLOR_THEMES = [
  { label: "Indigo Modern", value: "#4F46E5", bg: "#EEF2FF" },
  { label: "Emerald Fresh", value: "#059669", bg: "#ECFDF5" },
  { label: "Amber Warm", value: "#D97706", bg: "#FFFBEB" },
  { label: "Rose Bold", value: "#E11D48", bg: "#FFF1F2" },
  { label: "Slate Classic", value: "#1E293B", bg: "#F8FAFC" },
];

const TEMPLATES = [
  { label: "Standard", value: "standard" },
  { label: "Discount Offer", value: "discount" },
];

export function FlyerDesignCanvas({ business, funnelUrl }: FlyerDesignCanvasProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [config, setConfig] = useState({
    template: "standard",
    colorTheme: COLOR_THEMES[0],
    showBusinessName: true,
    discountText: "Show this QR & get 10% off!",
    qrSize: 160,
    padding: 32,
    textScale: 1,
  });

  const qrImageUrl = `/api/qr?url=${encodeURIComponent(funnelUrl)}&size=${config.qrSize * 2}`;

  async function handleExport() {
    if (!flyerRef.current) return;
    setIsExporting(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(flyerRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: config.colorTheme.bg,
      });
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${business.slug}-flyer.png`;
      a.click();
      toast.success("Flyer downloaded!");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flyer Design</h1>
          <p className="text-muted-foreground text-sm">
            Design a printable QR flyer for your counter or table
          </p>
        </div>
        <Button className="gap-2" onClick={handleExport} disabled={isExporting}>
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Export PNG
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-sm">Template & Style</h2>

            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={config.template}
                onValueChange={(v) => setConfig((c) => ({ ...c, template: v ?? "standard" }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Color Theme</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    onClick={() => setConfig((c) => ({ ...c, colorTheme: theme }))}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${
                      config.colorTheme.value === theme.value
                        ? "border-foreground bg-muted"
                        : "border-border hover:border-foreground/50"
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full"
                      style={{ backgroundColor: theme.value }}
                    />
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            {config.template === "discount" && (
              <div className="space-y-2">
                <Label>Discount Offer Text</Label>
                <Input
                  value={config.discountText}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, discountText: e.target.value }))
                  }
                  className="h-10"
                />
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold text-sm">Adjustments</h2>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>QR Code Size</Label>
                <span className="text-muted-foreground">{config.qrSize}px</span>
              </div>
              <input
                type="range"
                min={100}
                max={240}
                value={config.qrSize}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, qrSize: Number(e.target.value) }))
                }
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Flyer Padding</Label>
                <span className="text-muted-foreground">{config.padding}px</span>
              </div>
              <input
                type="range"
                min={16}
                max={64}
                value={config.padding}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, padding: Number(e.target.value) }))
                }
                className="w-full accent-primary"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <Label>Text Size</Label>
                <span className="text-muted-foreground">{config.textScale.toFixed(1)}×</span>
              </div>
              <input
                type="range"
                min={0.8}
                max={1.4}
                step={0.1}
                value={config.textScale}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, textScale: Number(e.target.value) }))
                }
                className="w-full accent-primary"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="showName"
                checked={config.showBusinessName}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, showBusinessName: e.target.checked }))
                }
                className="h-4 w-4 accent-primary"
              />
              <Label htmlFor="showName">Show business name on flyer</Label>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            A6 FLYER PREVIEW
          </p>
          <div className="flex justify-center">
            <div
              ref={flyerRef}
              style={{
                backgroundColor: config.colorTheme.bg,
                padding: `${config.padding}px`,
                width: "320px",
                minHeight: "450px",
                borderRadius: "16px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                fontFamily: "sans-serif",
                border: `3px solid ${config.colorTheme.value}`,
              }}
            >
              {/* Discount banner */}
              {config.template === "discount" && config.discountText && (
                <div
                  style={{
                    backgroundColor: config.colorTheme.value,
                    color: "#fff",
                    padding: "8px 20px",
                    borderRadius: "100px",
                    fontSize: `${13 * config.textScale}px`,
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  {config.discountText}
                </div>
              )}

              {/* Business name */}
              {config.showBusinessName && (
                <p
                  style={{
                    fontSize: `${20 * config.textScale}px`,
                    fontWeight: 800,
                    color: config.colorTheme.value,
                    textAlign: "center",
                    margin: 0,
                  }}
                >
                  {business.name}
                </p>
              )}

              {/* QR Code */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="QR Code"
                width={config.qrSize}
                height={config.qrSize}
                style={{
                  borderRadius: "12px",
                  border: `2px solid ${config.colorTheme.value}20`,
                }}
                crossOrigin="anonymous"
              />

              {/* CTA */}
              <div style={{ textAlign: "center" }}>
                <p
                  style={{
                    fontSize: `${16 * config.textScale}px`,
                    fontWeight: 700,
                    color: config.colorTheme.value,
                    margin: 0,
                  }}
                >
                  {business.ctaText}
                </p>
                <p
                  style={{
                    fontSize: `${11 * config.textScale}px`,
                    color: "#9CA3AF",
                    marginTop: "6px",
                  }}
                >
                  Scan to write a Google review in seconds
                </p>
              </div>

              {/* Stars */}
              <div style={{ display: "flex", gap: "4px" }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} style={{ color: "#F59E0B", fontSize: "18px" }}>
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
