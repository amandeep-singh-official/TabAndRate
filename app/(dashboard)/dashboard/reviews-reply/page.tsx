import { MessageSquare, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ReviewsReplyPage() {
  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight">Reviews Reply</h1>
          <Badge className="text-xs gap-1">
            <Sparkles className="h-3 w-3" />
            Coming Soon
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm">
          AI-powered replies to your Google reviews — all in one place.
        </p>
      </div>

      <div className="border-2 border-dashed border-border rounded-2xl p-12 flex flex-col items-center text-center gap-6">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2 max-w-sm">
          <h2 className="font-semibold text-lg">AI Review Replies</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Connect your Google Business Profile and let AI draft personalised
            replies to every customer review — saving you hours every week.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-muted-foreground w-full max-w-md">
          {[
            "Auto-sync Google Reviews",
            "AI-drafted replies",
            "One-click publish",
          ].map((feature) => (
            <div
              key={feature}
              className="bg-muted rounded-xl px-4 py-3 text-center"
            >
              {feature}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          This feature requires Google My Business API access — launching in V2.
        </p>
      </div>
    </div>
  );
}
