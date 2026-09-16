"use client";

import React, { useState, useEffect } from "react";
import { Building, Zap, Users, Save, Loader2, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";

interface FixedCostItem {
  id?: string;
  type: "RENT" | "ELECTRICITY" | "SALARY";
  amount: number;
}

export default function FixedCostsPage() {
  const [rent, setRent] = useState("25000");
  const [electricity, setElectricity] = useState("8000");
  const [salary, setSalary] = useState("35000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const fetchFixedCosts = async () => {
    try {
      const res = await fetch(`/api/cafe/fixed-costs?month=${currentMonth}&year=${currentYear}`);
      if (res.status === 404) {
        window.location.href = "/cafe/setup";
        return;
      }
      const data = await res.json();
      if (data.fixedCosts) {
        for (const fc of data.fixedCosts) {
          if (fc.type === "RENT") setRent(String(fc.amount));
          if (fc.type === "ELECTRICITY") setElectricity(String(fc.amount));
          if (fc.type === "SALARY") setSalary(String(fc.amount));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFixedCosts();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const payload = [
        { type: "RENT", amount: Number(rent) || 0 },
        { type: "ELECTRICITY", amount: Number(electricity) || 0 },
        { type: "SALARY", amount: Number(salary) || 0 },
      ];

      for (const item of payload) {
        await fetch("/api/cafe/fixed-costs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: item.type,
            amount: item.amount,
            month: currentMonth,
            year: currentYear,
          }),
        });
      }

      setSavedSuccess(true);
      await fetchFixedCosts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save fixed costs");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-lg font-medium">Loading Fixed Costs...</span>
      </div>
    );
  }

  const totalMonthlyOverheads = (Number(rent) || 0) + (Number(electricity) || 0) + (Number(salary) || 0);

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Building className="w-7 h-7 text-amber-400" />
            <span>Monthly Fixed Overheads</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monthly placeholders for rent, electricity, and staff salaries to calculate break-even run rates.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            Monthly Target:
          </span>
          <span className="text-xl font-black text-amber-400">
            {formatCurrency(totalMonthlyOverheads)}
          </span>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          <span>Monthly overhead targets updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Rent */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Building className="w-5 h-5" />
              <span>Shop Rent</span>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monthly Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={rent}
                  onChange={(e) => setRent(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-lg font-black text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Electricity */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
              <Zap className="w-5 h-5" />
              <span>Electricity & Water</span>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monthly Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={electricity}
                  onChange={(e) => setElectricity(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-lg font-black text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Salary */}
          <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Users className="w-5 h-5" />
              <span>Staff Salaries</span>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Monthly Amount (₹)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 font-bold">₹</span>
                <input
                  type="number"
                  required
                  min="0"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3 py-2.5 text-lg font-black text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-black py-4 px-8 rounded-2xl transition shadow-lg flex items-center gap-2 text-sm"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          <span>Save Fixed Costs</span>
        </button>
      </form>

    </div>
  );
}
