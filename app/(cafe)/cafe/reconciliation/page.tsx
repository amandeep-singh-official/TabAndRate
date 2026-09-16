"use client";

import React, { useState, useEffect } from "react";
import {
  Coins,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Calendar,
  Save,
  HelpCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";

interface ReconcileData {
  openingFloat: number;
  cashSalesToday: number;
  cashExpensesToday: number;
  expectedCash: number;
  existingRecord?: {
    id: string;
    actualCash: number;
    expectedCash: number;
    discrepancy: number;
    note?: string | null;
    date: string;
  } | null;
}

export default function CashReconciliationPage() {
  const [data, setData] = useState<ReconcileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualCash, setActualCash] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/cafe/reconciliation");
      if (res.status === 404) {
        window.location.href = "/cafe/setup";
        return;
      }
      const json = await res.json();
      setData(json);
      if (json.existingRecord) {
        setActualCash(String(json.existingRecord.actualCash));
        if (json.existingRecord.note) setNote(json.existingRecord.note);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actualCash) return;

    setSubmitting(true);
    setSavedSuccess(false);

    try {
      const res = await fetch("/api/cafe/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualCash: Number(actualCash),
          note: note.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      setSavedSuccess(true);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to record reconciliation");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-lg font-medium">Auditing Cash Drawer...</span>
      </div>
    );
  }

  const countedNumber = parseFloat(actualCash) || 0;
  const discrepancy = actualCash !== "" ? countedNumber - data.expectedCash : 0;

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
          <Coins className="w-7 h-7 text-amber-400" />
          <span>End-of-Day Cash Drawer Audit</span>
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Zero-training cash reconciliation. Compare physical notes in drawer against expected system sales.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 text-sm flex items-center gap-2 font-semibold">
          <CheckCircle2 className="w-5 h-5" />
          <span>Cash drawer successfully balanced and recorded for today!</span>
        </div>
      )}

      {/* ───────────────── STEP 1: EXPECTED BREAKDOWN ───────────────── */}
      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-4">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-500">
          Step 1: System Calculation (Today)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">Morning Opening Float</span>
            <span className="text-xl font-bold text-slate-900">
              {formatCurrency(data.openingFloat)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Change in drawer at open</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">+ Today's Cash Sales</span>
            <span className="text-xl font-bold text-emerald-400">
              +{formatCurrency(data.cashSalesToday)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Cash orders logged</span>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <span className="text-xs text-slate-500 block mb-1">- Cash Expenses Paid Out</span>
            <span className="text-xl font-bold text-rose-400">
              -{formatCurrency(data.cashExpensesToday)}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">Paid from drawer (milk/ice)</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border-2 border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-extrabold text-amber-400 tracking-wider">
              Expected Total Cash in Drawer:
            </span>
            <p className="text-xs text-slate-500 mt-0.5">
              (Opening Float + Cash Sales − Drawer Expenses)
            </p>
          </div>
          <span className="text-3xl font-black text-amber-400">
            {formatCurrency(data.expectedCash)}
          </span>
        </div>
      </div>

      {/* ───────────────── STEP 2: COUNT PHYSICAL CASH ───────────────── */}
      <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-5">
        <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-500">
          Step 2: Enter Physical Cash Count
        </h3>

        <form onSubmit={handleSaveReconciliation} className="space-y-4">
          <div className="max-w-md">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Total Counted Cash in Drawer Right Now (₹)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-slate-500 text-xl font-bold">
                ₹
              </span>
              <input
                type="number"
                required
                min="0"
                step="any"
                placeholder="e.g. 3450"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-3.5 text-2xl font-black text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Instant Discrepancy Flag */}
          {actualCash !== "" && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                discrepancy === 0
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : discrepancy > 0
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              }`}
            >
              <div className="flex items-center gap-3">
                {discrepancy === 0 ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
                <div>
                  <span className="font-extrabold text-base block">
                    {discrepancy === 0
                      ? "Perfect Match!"
                      : discrepancy > 0
                      ? `Surplus: +${formatCurrency(discrepancy)} in Drawer`
                      : `Shortage: -${formatCurrency(Math.abs(discrepancy))} Missing`}
                  </span>
                  <span className="text-xs opacity-80">
                    {discrepancy === 0
                      ? "The cash drawer aligns 100% with POS records."
                      : discrepancy > 0
                      ? "There is more cash than logged. Possible untracked tip or cash entry."
                      : "The drawer is short. Verify if an expense was paid in cash without logging."}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Closing Note (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Discrepancy verified by staff Aman at 10 PM"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || actualCash === ""}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 text-amber-950 font-black py-4 px-6 rounded-2xl transition shadow-lg flex items-center gap-2 text-sm"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>Save EOD Drawer Balance</span>
          </button>
        </form>
      </div>

    </div>
  );
}
