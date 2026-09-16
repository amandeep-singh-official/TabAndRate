"use client";

import Link from "next/link";
import {
  MousePointerClick,
  ExternalLink,
  TrendingUp,
  ShieldAlert,
  Activity,
  QrCode,
  ArrowUpRight,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calcPercent, formatCount, getInitials } from "@/lib/utils";
import type { Business, AnalyticsEvent } from "@prisma/client";

interface DashboardHomeProps {
  business: Business;
  stats: {
    visits: number;
    generates: number;
    redirects: number;
    intercepted: number;
  };
  chartData: { day: string; visits: number; redirects: number }[];
  recentEvents: AnalyticsEvent[];
  funnelUrl: string;
}

const EVENT_LABELS: Record<string, string> = {
  visit: "New visitor on funnel page",
  generate: "AI reviews generated",
  redirect: "Redirected to Google Reviews",
  intercepted: "Low-rating intercepted",
};

const EVENT_COLORS: Record<string, string> = {
  visit: "bg-blue-100 text-blue-700",
  generate: "bg-violet-100 text-violet-700",
  redirect: "bg-emerald-100 text-emerald-700",
  intercepted: "bg-amber-100 text-amber-700",
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function DashboardHome({
  business,
  stats,
  chartData,
  recentEvents,
  funnelUrl,
}: DashboardHomeProps) {
  const conversionRate = calcPercent(stats.redirects, stats.visits);

  const statCards = [
    {
      label: "Funnel Clicks",
      value: formatCount(stats.visits),
      sub: "Landing page visits",
      icon: MousePointerClick,
      accent: false,
    },
    {
      label: "Google Redirects",
      value: formatCount(stats.redirects),
      sub: "Sent to write a review",
      icon: ExternalLink,
      accent: false,
    },
    {
      label: "Conversion Rate",
      value: conversionRate,
      sub: "Redirects / Clicks",
      icon: TrendingUp,
      accent: true,
    },
    {
      label: "Intercepted",
      value: formatCount(stats.intercepted),
      sub: "1–3 ★ ratings caught",
      icon: ShieldAlert,
      accent: false,
      href: "/dashboard/feedback",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      {/* Business header */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-card border border-border rounded-2xl px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">
              {getInitials(business.name)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">{business.name}</h2>
              <Badge variant="secondary" className="text-xs">
                {business.category}
              </Badge>
            </div>
            {business.address && (
              <span className="text-xs text-muted-foreground">
                {business.address}
              </span>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          nativeButton={false}
          render={<Link href="/dashboard/qr-code" />}
        >
          <QrCode className="h-4 w-4" />
          QR Poster
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const content = (
            <div
              className={`rounded-2xl border p-5 space-y-3 h-full transition-all ${
                card.accent
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-card border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-medium uppercase tracking-wider ${
                    card.accent ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {card.label}
                </span>
                <card.icon
                  className={`h-4 w-4 ${
                    card.accent ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                />
              </div>
              <p
                className={`text-3xl font-bold tracking-tight ${
                  card.accent ? "text-primary-foreground" : "text-foreground"
                }`}
              >
                {card.value}
              </p>
              <div className="flex items-center justify-between">
                <p
                  className={`text-xs ${
                    card.accent ? "text-primary-foreground/60" : "text-muted-foreground"
                  }`}
                >
                  {card.sub}
                </p>
                {card.href && (
                  <span className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                    View Inbox &rarr;
                  </span>
                )}
              </div>
            </div>
          );

          return card.href ? (
            <Link key={card.label} href={card.href} className="block">
              {content}
            </Link>
          ) : (
            <div key={card.label}>{content}</div>
          );
        })}
      </div>

      {/* Chart + Events grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-semibold">Funnel Traffic</h3>
            <p className="text-xs text-muted-foreground">
              Daily clicks vs. redirects (last 7 days)
            </p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Line
                type="monotone"
                dataKey="visits"
                name="Clicks"
                stroke="#4F46E5"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="redirects"
                name="Redirects"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions + Business Info */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-semibold text-sm">Quick Actions</h3>
            <Button className="w-full gap-2 justify-start" size="sm"
              nativeButton={false}
              render={<Link href="/dashboard/qr-code" />}>
              <QrCode className="h-4 w-4" />
              Printable QR Poster
            </Button>
            <Button variant="outline" className="w-full gap-2 justify-start" size="sm"
              nativeButton={false}
              render={<Link href={funnelUrl} target="_blank" />}>
              <ArrowUpRight className="h-4 w-4" />
              Preview Funnel
            </Button>
          </div>

          {/* Business mini card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Business Info
            </p>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary font-bold text-xs">
                  {getInitials(business.name)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{business.name}</p>
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  {business.category}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="text-center p-2 bg-muted rounded-lg">
                <p className="text-lg font-bold">{formatCount(stats.visits)}</p>
                <p className="text-[10px] text-muted-foreground">Total Clicks</p>
              </div>
              <div className="text-center p-2 bg-primary/5 rounded-lg">
                <p className="text-lg font-bold text-primary">{conversionRate}</p>
                <p className="text-[10px] text-muted-foreground">Conversion</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events Feed */}
      {recentEvents.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Recent Funnel Events</h3>
            </div>
            <Link
              href="/dashboard/feedback"
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Open Feedback Inbox &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {recentEvents.map((event) => {
              const meta = event.metadata as Record<string, any> | null;
              const hasFeedback = event.type === "intercepted" && meta?.feedback;
              const starRating = meta?.starRating;

              return (
                <div
                  key={event.id}
                  className="py-2.5 border-b border-border last:border-0 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          EVENT_COLORS[event.type] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {event.type.toUpperCase()}
                      </span>
                      <span className="text-sm text-foreground truncate">
                        {hasFeedback
                          ? `Private Feedback (${starRating ? `${starRating}★` : "Intercepted"})`
                          : EVENT_LABELS[event.type] ?? event.type}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0" suppressHydrationWarning>
                      {timeAgo(event.createdAt)}
                    </span>
                  </div>

                  {hasFeedback && (
                    <div className="ml-2 pl-3 border-l-2 border-amber-500/60 text-xs text-muted-foreground bg-muted/40 rounded-r-md py-1.5 pr-3">
                      <p className="italic text-foreground">&ldquo;{meta.feedback}&rdquo;</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
