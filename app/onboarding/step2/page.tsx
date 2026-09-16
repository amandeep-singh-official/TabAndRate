"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
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
import { OnboardingStepper } from "@/components/onboarding/stepper";
import {
  BUSINESS_CATEGORIES,
  HOW_HEARD_OPTIONS,
  MONTHLY_CUSTOMER_OPTIONS,
} from "@/lib/constants";

export default function OnboardingStep2() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    category: "",
    customIndustry: "",
    monthlyCustomers: "",
    hearAboutUs: "",
  });

  // Redirect back if step1 data missing
  useEffect(() => {
    const step1 = sessionStorage.getItem("onboarding_step1");
    if (!step1) router.replace("/onboarding/step1");
  }, [router]);

  async function handleSubmit() {
    if (!form.category) {
      toast.error("Please select your business type.");
      return;
    }
    if (form.category === "Other" && !form.customIndustry.trim()) {
      toast.error("Please specify your industry.");
      return;
    }

    setIsLoading(true);

    try {
      const step1Raw = sessionStorage.getItem("onboarding_step1");
      const step1 = step1Raw ? JSON.parse(step1Raw) : {};

      const res = await fetch("/api/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...step1,
          category: form.category,
          customIndustry: form.customIndustry,
          monthlyCustomers: form.monthlyCustomers,
          hearAboutUs: form.hearAboutUs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "Something went wrong.");
        return;
      }

      // Save slug for step 3
      sessionStorage.setItem("onboarding_slug", data.slug);
      sessionStorage.removeItem("onboarding_step1");

      router.push("/onboarding/step3");
    } catch {
      toast.error("Failed to create your funnel. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <OnboardingStepper current={2} />

      <div className="bg-card border border-border rounded-2xl p-8 space-y-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Profile Info</h1>
          <p className="text-sm text-muted-foreground">
            Help us personalise your AI review tags and funnel.
          </p>
        </div>

        <div className="space-y-5">
          {/* Business Type */}
          <div className="space-y-2">
            <Label>Business Type / Industry</Label>
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v ?? "" }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a category…" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Custom Industry (conditional) */}
          {form.category === "Other" && (
            <div className="space-y-2">
              <Label htmlFor="customIndustry">Specify Your Industry</Label>
              <Input
                id="customIndustry"
                placeholder="e.g. Photography Studio"
                value={form.customIndustry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, customIndustry: e.target.value }))
                }
                className="h-11"
              />
            </div>
          )}

          {/* Monthly Customers */}
          <div className="space-y-2">
            <Label>
              Estimated Monthly Customers{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select
              value={form.monthlyCustomers}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, monthlyCustomers: v ?? "" }))
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select a range…" />
              </SelectTrigger>
              <SelectContent>
                {MONTHLY_CUSTOMER_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* How did you hear */}
          <div className="space-y-2">
            <Label>
              How did you hear about us?{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select
              value={form.hearAboutUs}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, hearAboutUs: v ?? "" }))
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {HOW_HEARD_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="h-11 gap-1.5"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            className="flex-1 h-11 gap-2"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating your funnel…
              </>
            ) : (
              <>
                Generate My Funnel
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
