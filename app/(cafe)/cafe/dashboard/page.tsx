"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Coins,
  CreditCard,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Award,
  Calendar,
  Loader2,
  Building,
} from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import Link from "next/link";

interface DashboardData {
  cafeName: string;
  today: {
    revenue: number;
    orderCount: number;
    aov: number;
    cashRevenue: number;
    onlineRevenue: number;
    spending: number;
    profit: number;
  };
  topSellers: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  fixedCosts: {
    monthlyTotal: number;
    mtdRevenue: number;
    runRatePercent: number;
  };
  chartData: Array<{
    date: string;
    day: string;
    cash: number;
    online: number;
    total: number;
  }>;
}

export default function CafeDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/cafe/dashboard");
        if (res.status === 404) {
          window.location.href = "/cafe/setup";
          return;
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-lg font-medium">Calculating Cafe Financial Pulse...</span>
      </div>
    );
  }

  const { today, topSellers, fixedCosts, chartData } = data;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
            <span>Financial Pulse</span>
            <span className="text-xs bg-amber-500/20 text-amber-400 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
              Live IST
            </span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {data.cafeName} · Clear snapshot of earnings, spending, and profit.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/cafe/pos"
            className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition shadow-md"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Open Billing Counter →</span>
          </Link>
        </div>
      </div>

      {/* ───────────────── 1. TODAY'S PULSE (BIG METRICS) ───────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Earnings */}
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Today's Earnings
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {formatCurrency(today.revenue)}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>{today.orderCount} Takeaway Orders</span>
            <span>•</span>
            <span>AOV {formatCurrency(today.aov)}</span>
          </div>
        </div>

        {/* Today's Spending */}
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Today's Spending
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-rose-400 mt-2">
            {formatCurrency(today.spending)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            <Link href="/cafe/expenses" className="hover:text-slate-900 underline">
              Raw materials & milk log →
            </Link>
          </div>
        </div>

        {/* Today's Net Profit */}
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
              Today's Profit
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              today.profit >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}>
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-3xl font-black mt-2 ${
            today.profit >= 0 ? "text-emerald-400" : "text-rose-400"
          }`}>
            {formatCurrency(today.profit)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Earnings − Daily Spending
          </div>
        </div>

        {/* Payment Split (Cash vs UPI) */}
        <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl flex flex-col justify-between">
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
            Payment Mode Split
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold mb-0.5">
                <Coins className="w-3.5 h-3.5" />
                <span>Cash</span>
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {formatCurrency(today.cashRevenue)}
              </div>
            </div>
            <div className="p-2.5 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center gap-1.5 text-xs text-blue-400 font-bold mb-0.5">
                <CreditCard className="w-3.5 h-3.5" />
                <span>Online / UPI</span>
              </div>
              <div className="text-base font-extrabold text-slate-900">
                {formatCurrency(today.onlineRevenue)}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ───────────────── 2. CHARTS & RUN-RATE ───────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 7-Day Revenue Trend (2 cols) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>7-Day Revenue Trend</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Daily breakdown of Cash vs. Online settlements</p>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis dataKey="day" stroke="#737373" fontSize={12} tickLine={false} />
                <YAxis stroke="#737373" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    borderColor: "#404040",
                    borderRadius: "12px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Bar dataKey="cash" name="Cash (₹)" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="online" name="UPI / Online (₹)" fill="#3b82f6" stackId="a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Best Sellers + Run-Rate (1 col) */}
        <div className="space-y-6">
          
          {/* Top 5 Best Sellers */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-3">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Top 5 Best Sellers</span>
            </h3>

            {topSellers.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No items sold yet. Log orders to see volume leaders.
              </p>
            ) : (
              <div className="space-y-2">
                {topSellers.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[10px] text-amber-400">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-slate-900">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-extrabold text-slate-800">{item.quantity} sold</span>
                      <div className="text-[10px] text-slate-500">{formatCurrency(item.revenue)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Monthly Overhead Run-Rate */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-amber-400" />
                <span>Overheads Run-Rate</span>
              </h3>
              <Link href="/cafe/fixed-costs" className="text-xs text-amber-400 hover:underline">
                Set Costs →
              </Link>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Month's Fixed Costs (Rent + Salaries):</span>
                <span className="text-slate-900 font-bold">{formatCurrency(fixedCosts.monthlyTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Month-to-Date Revenue:</span>
                <span className="text-emerald-400 font-bold">{formatCurrency(fixedCosts.mtdRevenue)}</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-white rounded-full h-3 overflow-hidden border border-slate-200 mt-2">
                <div
                  style={{ width: `${Math.min(100, Math.round(fixedCosts.runRatePercent))}%` }}
                  className={`h-full transition-all duration-500 ${
                    fixedCosts.runRatePercent >= 100
                      ? "bg-emerald-500"
                      : fixedCosts.runRatePercent >= 50
                      ? "bg-amber-500"
                      : "bg-rose-500"
                  }`}
                />
              </div>

              <div className="text-right text-[11px] font-bold text-slate-700 pt-0.5">
                {fixedCosts.monthlyTotal > 0
                  ? `${Math.round(fixedCosts.runRatePercent)}% of monthly overheads covered`
                  : "Add monthly fixed costs to track run-rate"}
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
