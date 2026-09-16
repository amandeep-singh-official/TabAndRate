"use client";

import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { MousePointerClick, ExternalLink, TrendingUp, ShieldAlert } from "lucide-react";
import { formatCount, calcPercent } from "@/lib/utils";

interface AnalyticsViewProps {
  stats: {
    visits: number;
    generates: number;
    redirects: number;
    intercepted: number;
  };
  chartData: {
    label: string;
    visits: number;
    generates: number;
    redirects: number;
    intercepted: number;
  }[];
}

export function AnalyticsView({ stats, chartData }: AnalyticsViewProps) {
  const funnelSteps = [
    {
      label: "Funnel Visits",
      value: stats.visits,
      icon: MousePointerClick,
      color: "bg-blue-500",
      pct: "100%",
    },
    {
      label: "AI Reviews Generated",
      value: stats.generates,
      icon: TrendingUp,
      color: "bg-violet-500",
      pct: calcPercent(stats.generates, stats.visits),
    },
    {
      label: "Redirected to Google",
      value: stats.redirects,
      icon: ExternalLink,
      color: "bg-emerald-500",
      pct: calcPercent(stats.redirects, stats.visits),
    },
    {
      label: "Intercepted (Low Rating)",
      value: stats.intercepted,
      icon: ShieldAlert,
      color: "bg-amber-500",
      pct: calcPercent(stats.intercepted, stats.visits),
    },
  ];

  const maxFunnelValue = Math.max(stats.visits, 1);

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground text-sm">
          30-day overview of your review funnel performance
        </p>
      </div>

      {/* Pipeline Funnel */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <h2 className="font-semibold">Conversion Pipeline</h2>
        <div className="space-y-3">
          {funnelSteps.map((step, idx) => (
            <div key={step.label} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-muted-foreground" />
                  <span>{step.label}</span>
                  {step.label.includes("Intercepted") && (
                    <Link
                      href="/dashboard/feedback"
                      className="text-xs text-primary hover:underline ml-1 font-medium"
                    >
                      (View Inbox &rarr;)
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground text-xs">{step.pct}</span>
                  <span className="font-semibold w-10 text-right">
                    {formatCount(step.value)}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full ${step.color} rounded-full transition-all duration-500`}
                  style={{
                    width: `${Math.round((step.value / maxFunnelValue) * 100)}%`,
                    opacity: 1 - idx * 0.1,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 30-day area chart */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="font-semibold">Daily Activity (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="gradVisits" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRedirects" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval={4}
            />
            <YAxis
              tick={{ fontSize: 10 }}
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
            <Area
              type="monotone"
              dataKey="visits"
              name="Visits"
              stroke="#4F46E5"
              strokeWidth={2}
              fill="url(#gradVisits)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="redirects"
              name="Redirects"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradRedirects)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
