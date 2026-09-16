"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Star,
  MessageSquare,
  Clock,
  Sparkles,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { AnalyticsEvent } from "@prisma/client";

interface FeedbackViewProps {
  events: AnalyticsEvent[];
  businessName: string;
}

function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function FeedbackView({ events, businessName }: FeedbackViewProps) {
  const [filter, setFilter] = useState<"all" | "comments" | "1" | "2" | "3">("all");

  const totalIntercepted = events.length;

  const itemsWithComments = events.filter((e) => {
    const meta = e.metadata as Record<string, any> | null;
    return Boolean(meta?.feedback && typeof meta.feedback === "string" && meta.feedback.trim().length > 0);
  });

  const ratings = events.map((e) => {
    const meta = e.metadata as Record<string, any> | null;
    return typeof meta?.starRating === "number" ? meta.starRating : 2;
  });

  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : "0";

  const filteredEvents = events.filter((e) => {
    const meta = e.metadata as Record<string, any> | null;
    const rating = typeof meta?.starRating === "number" ? meta.starRating : 2;
    const hasComment = Boolean(meta?.feedback && typeof meta.feedback === "string" && meta.feedback.trim().length > 0);

    if (filter === "comments") return hasComment;
    if (filter === "1") return rating === 1;
    if (filter === "2") return rating === 2;
    if (filter === "3") return rating === 3;
    return true;
  });

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Private Customer Feedback</h1>
            <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Intercepted from Google Maps
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Ratings of 1–3 stars were stopped from going to your public Google listing. Review their private feedback below to resolve customer issues directly.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Total Bad Reviews Saved
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {totalIntercepted}
          </p>
          <p className="text-xs text-muted-foreground">
            Protected your public Google rating
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            With Written Comments
          </p>
          <p className="text-3xl font-bold tracking-tight text-foreground">
            {itemsWithComments.length}
          </p>
          <p className="text-xs text-muted-foreground">
            Detailed issues reported by customers
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Average Low Rating
          </p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-bold tracking-tight text-amber-600">
              {avgRating}★
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Filtered out of your 5★ funnel
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All Feedback ({totalIntercepted})
          </Button>
          <Button
            variant={filter === "comments" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("comments")}
          >
            With Comments ({itemsWithComments.length})
          </Button>
          <Button
            variant={filter === "1" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("1")}
          >
            1 Star ({events.filter((e) => (e.metadata as any)?.starRating === 1).length})
          </Button>
          <Button
            variant={filter === "2" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("2")}
          >
            2 Stars ({events.filter((e) => (e.metadata as any)?.starRating === 2).length})
          </Button>
          <Button
            variant={filter === "3" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("3")}
          >
            3 Stars ({events.filter((e) => (e.metadata as any)?.starRating === 3).length})
          </Button>
        </div>
      </div>

      {/* Feedbacks List */}
      {filteredEvents.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-2xl p-12 text-center flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-lg">No feedback found</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {totalIntercepted === 0
              ? "Your business currently has 0 negative reviews. Every time an unhappy customer rates 1–3 stars, their private feedback will be safely caught here instead of posting to Google!"
              : "No feedback matching this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((event) => {
            const meta = event.metadata as Record<string, any> | null;
            const starRating = typeof meta?.starRating === "number" ? meta.starRating : 2;
            const comment = typeof meta?.feedback === "string" ? meta.feedback.trim() : "";

            return (
              <div
                key={event.id}
                className="bg-card border border-border rounded-2xl p-6 space-y-4 transition-all hover:border-border/80"
              >
                {/* Card Top Row */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    {/* Stars visual */}
                    <div className="flex items-center gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < starRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-semibold">
                      {starRating} {starRating === 1 ? "Star" : "Stars"} Rating
                    </span>
                    <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      Private Intercept
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span suppressHydrationWarning>{timeAgo(event.createdAt)}</span>
                    <span className="hidden sm:inline" suppressHydrationWarning>
                      ({new Date(event.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })})
                    </span>
                  </div>
                </div>

                {/* Customer Comment */}
                {comment ? (
                  <div className="bg-muted/40 border border-border/60 rounded-xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                      <span>Customer's Private Feedback Note:</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      &ldquo;{comment}&rdquo;
                    </p>
                  </div>
                ) : (
                  <div className="bg-muted/20 border border-dashed border-border/50 rounded-xl p-3 text-xs text-muted-foreground italic">
                    Customer selected {starRating} stars and exited without typing a written note.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
