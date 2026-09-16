"use client";

import { useState, useEffect } from "react";
import { Star, ArrowLeft, RefreshCw, Copy, Check, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";

type Step = "stars" | "tags" | "loading" | "drafts" | "feedback";

interface Business {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  reviewUrl: string;
  category: string;
  tags: string[];
  customDescription: string | null;
  logoUrl: string | null;
}

interface CustomerFunnelProps {
  business: Business;
}

function track(slug: string, type: string, metadata?: Record<string, unknown>) {
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, type, metadata }),
  }).catch(() => {});
}

export function CustomerFunnel({ business }: CustomerFunnelProps) {
  const [step, setStep] = useState<Step>("stars");
  const [starRating, setStarRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [extraNotes, setExtraNotes] = useState("");
  const [language, setLanguage] = useState("English");
  const [drafts, setDrafts] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);

  // Track visit on mount
  useEffect(() => {
    track(business.slug, "visit");
  }, [business.slug]);

  function handleStarSelect(rating: number) {
    setStarRating(rating);
    if (rating <= 3) {
      // Do not track 'intercepted' prematurely here to avoid duplicate events.
      // Feedback submission is compulsory and will track once with the written feedback note.
      setStep("feedback");
    } else {
      setStep("tags");
    }
  }

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleGenerate() {
    if (selectedTags.length === 0) {
      toast.error("Please select at least one highlight.");
      return;
    }
    setStep("loading");
    track(business.slug, "generate", { tags: selectedTags, language });

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: business.slug,
          tags: selectedTags,
          extraNotes,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setDrafts(data.reviews ?? []);
      setStep("drafts");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate reviews.";
      toast.error(msg);
      setStep("tags");
    }
  }

  async function handleCopyAndRedirect(draft: string, index: number) {
    try {
      await navigator.clipboard.writeText(draft);
      setCopiedIndex(index);
      toast.success("Review copied! Opening Google…");
      track(business.slug, "redirect", { draftIndex: index });
      setTimeout(() => {
        window.open(business.reviewUrl, "_blank", "noopener");
      }, 600);
      setTimeout(() => setCopiedIndex(null), 2500);
    } catch {
      toast.error("Failed to copy. Please copy manually.");
    }
  }

  async function handleFeedbackSubmit() {
    if (!feedbackText.trim()) {
      toast.error("Please share your feedback before submitting.");
      return;
    }
    setFeedbackSent(true);
    track(business.slug, "intercepted", {
      starRating,
      feedback: feedbackText.trim(),
    });
    toast.success("Thank you for your feedback!");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Header */}
      <div className="w-full bg-primary text-primary-foreground">
        <div className="max-w-md mx-auto px-4 py-6 text-center">
          {business.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={business.logoUrl}
              alt={business.name}
              className="h-12 w-12 rounded-xl object-cover mx-auto mb-3"
            />
          )}
          <h1 className="text-xl font-bold">{business.name}</h1>
          {business.address && (
            <p className="text-primary-foreground/70 text-sm mt-1">
              {business.address}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-md mx-auto px-4 py-8 flex-1">

        {/* STEP: Stars */}
        {step === "stars" && (
          <div className="space-y-8 text-center animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">How was your experience?</h2>
              <p className="text-muted-foreground">Tap the stars to rate</p>
            </div>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHoveredStar(n)}
                  onMouseLeave={() => setHoveredStar(0)}
                  onClick={() => handleStarSelect(n)}
                  className="p-2 rounded-xl transition-transform active:scale-90"
                  aria-label={`${n} star`}
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      n <= (hoveredStar || starRating)
                        ? "fill-amber-400 text-amber-400"
                        : "text-border fill-border"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              4–5 stars? We&apos;ll help you write a Google review in seconds!
            </p>
          </div>
        )}

        {/* STEP: Tags */}
        {step === "tags" && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">What stood out?</h2>
              <p className="text-muted-foreground text-sm">
                Select highlights — we&apos;ll craft your review instantly
              </p>
            </div>

            {/* Tag chips */}
            <div className="flex flex-wrap gap-2">
              {business.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium border transition-colors",
                    selectedTags.includes(tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:border-primary/50"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Extra notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Anything specific to mention?{" "}
                <span className="font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="e.g. the paneer tikka was exceptional!"
                value={extraNotes}
                onChange={(e) => setExtraNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>

            {/* Language */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                Review language
              </label>
              <Select value={language} onValueChange={(v) => setLanguage(v ?? "English")}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="h-12 gap-2"
                onClick={() => setStep("stars")}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <Button
                className="flex-1 h-12 gap-2"
                onClick={handleGenerate}
                disabled={selectedTags.length === 0}
              >
                Generate My Review
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Loading */}
        {step === "loading" && (
          <div className="flex flex-col items-center justify-center gap-6 py-20 animate-in fade-in-0 duration-300">
            <div className="relative">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            </div>
            <div className="text-center space-y-1">
              <p className="font-semibold text-lg">Crafting your reviews…</p>
              <p className="text-muted-foreground text-sm">
                AI is writing 5 personalised drafts for you
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* STEP: Drafts */}
        {step === "drafts" && (
          <div className="space-y-5 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-bold">Pick your favourite!</h2>
              <p className="text-muted-foreground text-sm">
                Tap a review to copy it — then paste it on Google.
              </p>
            </div>

            {drafts.map((draft, idx) => (
              <div
                key={idx}
                className="border border-border rounded-2xl p-5 space-y-4 bg-card hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => handleCopyAndRedirect(draft, idx)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Draft {idx + 1}
                  </span>
                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium transition-colors",
                      copiedIndex === idx
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {copiedIndex === idx ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Tap to copy & post →
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-foreground">{draft}</p>
              </div>
            ))}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="h-12 gap-2"
                onClick={() => setStep("tags")}
              >
                <ArrowLeft className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-12 gap-2"
                onClick={handleGenerate}
              >
                <RefreshCw className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Feedback (intercepted) */}
        {step === "feedback" && (
          <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
            {feedbackSent ? (
              <div className="text-center space-y-4 py-16">
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Check className="h-7 w-7 text-primary" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold">Thank you!</h2>
                  <p className="text-muted-foreground text-sm">
                    Your feedback helps {business.name} improve.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <span className="text-2xl">🙏</span>
                  </div>
                  <h2 className="text-xl font-bold">
                    We&apos;re sorry it wasn&apos;t perfect
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Share what went wrong — {business.name} reads every message
                    and will reach out to make it right.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="customer-feedback" className="text-sm font-medium">
                      Your feedback
                    </label>
                    <span className="text-xs font-semibold text-destructive">
                      * Required
                    </span>
                  </div>
                  <Textarea
                    id="customer-feedback"
                    required
                    placeholder="Tell us what happened (required)…"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Please provide details so {business.name} can address your issue directly.
                  </p>
                </div>

                <Button
                  className="w-full h-12"
                  onClick={handleFeedbackSubmit}
                  disabled={!feedbackText.trim()}
                >
                  Send Feedback
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="w-full text-center py-4 text-xs text-muted-foreground border-t border-border">
        Powered by{" "}
        <span className="font-semibold text-primary">TabAndRate</span>
      </div>
    </div>
  );
}
