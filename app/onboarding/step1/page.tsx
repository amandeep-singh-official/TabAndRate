"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Store, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OnboardingStepper } from "@/components/onboarding/stepper";
import { cn, isValidGoogleReviewUrl } from "@/lib/utils";

export default function OnboardingStep1() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [form, setForm] = useState({
    name: "",
    reviewUrl: "",
    address: "",
  });

  function handleUrlChange(val: string) {
    setForm((f) => ({ ...f, reviewUrl: val }));
    if (val && !isValidGoogleReviewUrl(val)) {
      setUrlError("Please paste a valid Google Maps or Google Review URL.");
    } else {
      setUrlError("");
    }
  }

  function handleNext() {
    if (!form.name.trim()) {
      toast.error("Please enter your business name.");
      return;
    }
    if (!form.reviewUrl.trim()) {
      toast.error("Please paste your Google Review URL.");
      return;
    }
    if (!isValidGoogleReviewUrl(form.reviewUrl)) {
      toast.error("That doesn't look like a valid Google URL.");
      return;
    }

    setIsLoading(true);
    // Persist to sessionStorage → read in step 2 & 3
    sessionStorage.setItem(
      "onboarding_step1",
      JSON.stringify({
        name: form.name.trim(),
        reviewUrl: form.reviewUrl.trim(),
        address: form.address.trim(),
      })
    );
    router.push("/onboarding/step2");
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <OnboardingStepper current={1} />

      {/* Card */}
      <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Your Business</h1>
          <p className="text-sm text-muted-foreground">
            Tell us where to send your customers to leave a review.
          </p>
        </div>

        <div className="space-y-5">
          {/* Business Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-1.5">
              <Store className="h-3.5 w-3.5 text-muted-foreground" />
              Business Name
            </Label>
            <Input
              id="name"
              placeholder="e.g. Spice Garden Restaurant"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
              className="h-11"
            />
          </div>

          {/* Google Review URL */}
          <div className="space-y-2">
            <Label htmlFor="reviewUrl" className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
              Google Review URL
            </Label>
            <Input
              id="reviewUrl"
              placeholder="https://search.google.com/local/writereview?placeid=..."
              value={form.reviewUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={cn("h-11", urlError && "border-destructive focus-visible:ring-destructive")}
            />
            {urlError ? (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertCircle className="h-3 w-3" />
                {urlError}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Go to Google Maps → find your business → Share → Copy link.
              </p>
            )}
          </div>

          {/* Address (optional) */}
          <div className="space-y-2">
            <Label htmlFor="address">
              Address{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="address"
              placeholder="123 Main St, Bangalore 560001"
              value={form.address}
              onChange={(e) =>
                setForm((f) => ({ ...f, address: e.target.value }))
              }
              rows={2}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Shown on the customer review page below your business name.
            </p>
          </div>
        </div>

        {/* CTA */}
        <Button
          className="w-full h-11 gap-2"
          onClick={handleNext}
          disabled={isLoading || !!urlError}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
