"use client";

import { useState } from "react";
import { Loader2, Save, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Business } from "@prisma/client";

interface MyBusinessFormProps {
  business: Business;
}

export function MyBusinessForm({ business }: MyBusinessFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [tags, setTags] = useState<string[]>(business.tags);
  const [newTag, setNewTag] = useState("");
  const [form, setForm] = useState({
    name: business.name,
    reviewUrl: business.reviewUrl,
    address: business.address ?? "",
    phone: business.phone ?? "",
    website: business.website ?? "",
    customDescription: business.customDescription ?? "",
    ctaText: business.ctaText,
  });

  function addTag() {
    const tag = newTag.trim();
    if (!tag || tags.includes(tag) || tags.length >= 12) return;
    setTags((t) => [...t, tag]);
    setNewTag("");
  }

  function removeTag(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error("Business name is required.");
      return;
    }
    if (!form.reviewUrl.trim()) {
      toast.error("Google Review URL is required.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/business", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tags }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save.");
        return;
      }

      toast.success("Business profile saved!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Business</h1>
        <p className="text-muted-foreground text-sm">
          Update your business profile and AI review settings
        </p>
      </div>

      {/* Core Details */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold">Core Details</h2>

        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="name">Business Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="h-11"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reviewUrl">Google Review URL</Label>
          <Input
            id="reviewUrl"
            value={form.reviewUrl}
            onChange={(e) => setForm((f) => ({ ...f, reviewUrl: e.target.value }))}
            className="h-11 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            This is where customers land after copying their AI-generated review.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input
            id="address"
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="h-11"
            placeholder="123 Main St, City, State"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={form.website}
            onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
            className="h-11"
            placeholder="https://yourbusiness.com"
          />
        </div>
      </div>

      {/* AI Context */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-semibold">AI Review Context</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            The AI reads this to mention your specific products and services in reviews.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="customDescription">Business Description for AI</Label>
          <Textarea
            id="customDescription"
            value={form.customDescription}
            onChange={(e) =>
              setForm((f) => ({ ...f, customDescription: e.target.value }))
            }
            rows={4}
            placeholder="e.g. We are famous for our Butter Chicken, Paneer Tikka, and Peshwari Naan. We also offer catering services and private dining for groups of 20+."
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Be specific — mention dish names, services, unique features. Max 1000 chars.
          </p>
        </div>
      </div>

      {/* Tags */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-semibold">Review Tags</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Customers tap these chips to select what they enjoyed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="gap-1.5 py-1 px-3 text-sm"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="text-muted-foreground hover:text-foreground transition-colors ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Add custom tag…"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            className="h-10"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-10 gap-1.5 shrink-0"
            onClick={addTag}
            disabled={!newTag.trim() || tags.length >= 12}
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Max 12 tags.</p>
      </div>

      {/* CTA Text */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">QR Poster Text</h2>
        <div className="space-y-2">
          <Label htmlFor="ctaText">Call-to-action text on QR posters</Label>
          <Input
            id="ctaText"
            value={form.ctaText}
            onChange={(e) => setForm((f) => ({ ...f, ctaText: e.target.value }))}
            className="h-11"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button className="h-11 gap-2 px-8" onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
