"use client";

import React, { useState, useEffect } from "react";
import {
  Receipt,
  Plus,
  Trash2,
  Loader2,
  Coins,
  CreditCard,
  Calendar,
} from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";

interface Expense {
  id: string;
  category: string;
  amount: number;
  note?: string | null;
  paidFrom: string;
  date: string;
}

const CATEGORY_PRESETS = [
  { key: "MILK", label: "Milk", icon: "🥛" },
  { key: "BEANS", label: "Coffee Beans", icon: "☕" },
  { key: "ICE", label: "Ice", icon: "🧊" },
  { key: "PACKAGING", label: "Cups & Bags", icon: "📦" },
  { key: "SUGAR", label: "Sugar & Syrups", icon: "🍬" },
  { key: "OTHER", label: "Other / Misc", icon: "➕" },
];

export default function CafeExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form states
  const [selectedCategory, setSelectedCategory] = useState("MILK");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidFrom, setPaidFrom] = useState<"CASH" | "ONLINE">("CASH");
  const [submitting, setSubmitting] = useState(false);

  const fetchExpenses = async () => {
    try {
      const res = await fetch("/api/cafe/expenses");
      if (res.status === 404) {
        window.location.href = "/cafe/setup";
        return;
      }
      const data = await res.json();
      if (data.expenses) {
        setExpenses(data.expenses);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/cafe/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedCategory,
          amount: Number(amount),
          note: note.trim() || undefined,
          paidFrom,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAmount("");
      setNote("");
      await fetchExpenses();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to record expense");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Delete this expense entry?")) return;
    try {
      const res = await fetch(`/api/cafe/expenses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-lg font-medium">Loading Expenses...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Receipt className="w-7 h-7 text-rose-400" />
            <span>Daily Outflow & Expenses</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Quick 2-tap log for daily milk, coffee beans, cups, and petty cash spending.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            Today's Outflow:
          </span>
          <span className="text-xl font-black text-rose-400">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form: Add Daily Expense */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xl h-fit space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-400" />
            <span>Log Daily Expense</span>
          </h3>

          <form onSubmit={handleAddExpense} className="space-y-4">
            {/* Category presets */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Item Category
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORY_PRESETS.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition text-left ${
                      selectedCategory === cat.key
                        ? "bg-amber-500/20 border-amber-500 text-amber-300 ring-1 ring-amber-500"
                        : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="truncate">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Amount (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  placeholder="350"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-base text-slate-900 font-extrabold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Paid From toggle (Cash Drawer vs Online) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Paid From
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaidFrom("CASH")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    paidFrom === "CASH"
                      ? "bg-amber-500 text-amber-950 shadow"
                      : "bg-white border border-slate-200 text-slate-500"
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>Cash Drawer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaidFrom("ONLINE")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition ${
                    paidFrom === "ONLINE"
                      ? "bg-blue-600 text-slate-900 shadow"
                      : "bg-white border border-slate-200 text-slate-500"
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Bank / UPI</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                Choosing "Cash Drawer" deducts this from expected cash during EOD reconciliation.
              </p>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Note / Vendor (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 5 Liters Amul Milk from Verka booth"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-rose-600 hover:bg-rose-500 text-slate-900 font-extrabold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Record Expense</span>
            </button>
          </form>
        </div>

        {/* Right: Today's Expense Records */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Today's Expenses Log</span>
          </h3>

          {expenses.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-500">
              <Receipt className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-700">No expenses logged today</p>
              <p className="text-xs text-slate-500 mt-1">
                Milk, coffee beans, and packaging logs will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {expenses.map((item) => {
                const preset = CATEGORY_PRESETS.find((c) => c.key === item.category);
                const timeStr = new Intl.DateTimeFormat("en-IN", {
                  timeStyle: "short",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(item.date));

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl">
                        {preset?.icon || "💸"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">
                            {preset?.label || item.category}
                          </span>
                          <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-200 text-slate-700">
                            {item.paidFrom === "CASH" ? "Cash Drawer" : "Bank UPI"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {item.note ? `${item.note} • ` : ""}
                          <span>{timeStr}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-rose-400">
                        -{formatCurrency(item.amount)}
                      </span>
                      <button
                        onClick={() => handleDeleteExpense(item.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-200 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
