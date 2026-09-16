"use client";

import React, { useState, useEffect } from "react";
import { Users, Plus, Check, Trash2, Loader2, Calendar, Clock } from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";

interface VendorDue {
  id: string;
  vendorName: string;
  amount: number;
  dueDate?: string | null;
  isPaid: boolean;
  createdAt: string;
}

export default function CafeVendorsPage() {
  const [dues, setDues] = useState<VendorDue[]>([]);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);

  // Form states
  const [vendorName, setVendorName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchDues = async () => {
    try {
      const res = await fetch("/api/cafe/vendors");
      if (res.status === 404) {
        window.location.href = "/cafe/setup";
        return;
      }
      const data = await res.json();
      if (data.dues) {
        setDues(data.dues);
        setTotalPending(data.totalPending || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDues();
  }, []);

  const handleAddDue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !amount || Number(amount) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/cafe/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorName: vendorName.trim(),
          amount: Number(amount),
          dueDate: dueDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setVendorName("");
      setAmount("");
      setDueDate("");
      await fetchDues();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to record vendor due");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePaid = async (due: VendorDue) => {
    try {
      const res = await fetch(`/api/cafe/vendors/${due.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPaid: !due.isPaid }),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchDues();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this vendor record?")) return;
    try {
      const res = await fetch(`/api/cafe/vendors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchDues();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-lg font-medium">Loading Vendor Ledger...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-amber-400" />
            <span>Supplier & Vendor Dues</span>
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track payments owed to milk suppliers, bean roasters, packaging, and bakery partners.
          </p>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
          <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">
            Total Owed:
          </span>
          <span className="text-xl font-black text-amber-400">
            {formatCurrency(totalPending)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Add Vendor Due */}
        <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xl h-fit space-y-4">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-amber-400" />
            <span>Add Supplier Due</span>
          </h3>

          <form onSubmit={handleAddDue} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Vendor / Supplier Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Verka Milk Depot, Coffee Bean Co."
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Amount Owed (₹)
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
                  placeholder="2400"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-base text-slate-900 font-extrabold focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Due Date (Optional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold py-3.5 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Record Supplier Due</span>
            </button>
          </form>
        </div>

        {/* Right: Vendor Dues List */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <span>Outstanding & Past Vendor Dues</span>
          </h3>

          {dues.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-500">
              <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-semibold text-slate-700">No vendor dues on record</p>
              <p className="text-xs text-slate-500 mt-1">
                Keep track of credit owed to suppliers and mark them paid when settled.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {dues.map((due) => {
                const formattedDate = due.dueDate
                  ? new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeZone: "Asia/Kolkata",
                    }).format(new Date(due.dueDate))
                  : null;

                return (
                  <div
                    key={due.id}
                    className={`p-4 rounded-2xl border flex items-center justify-between transition ${
                      due.isPaid
                        ? "bg-white border-slate-200 opacity-60"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold text-base ${due.isPaid ? "line-through text-slate-500" : "text-slate-900"}`}>
                          {due.vendorName}
                        </span>
                        {due.isPaid && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                            PAID
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formattedDate ? `Due by ${formattedDate}` : "No due date set"}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-extrabold ${due.isPaid ? "text-slate-500" : "text-amber-400"}`}>
                        {formatCurrency(due.amount)}
                      </span>
                      <button
                        onClick={() => handleTogglePaid(due)}
                        className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                          due.isPaid
                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            : "bg-emerald-600 hover:bg-emerald-500 text-slate-900 shadow"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{due.isPaid ? "Mark Unpaid" : "Mark as Paid"}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(due.id)}
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
