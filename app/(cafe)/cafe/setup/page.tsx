"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, ArrowRight, Loader2, Sparkles, Store } from "lucide-react";

export default function CafeSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    cafeName: "",
    tagline: "Freshly Brewed & Baked",
    city: "Chandigarh",
    address: "",
    phone: "",
    openingFloat: "1000",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cafeName.trim()) {
      setError("Please enter your cafe name");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/cafe/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cafeName: formData.cafeName,
          tagline: formData.tagline,
          city: formData.city,
          address: formData.address,
          phone: formData.phone,
          openingFloat: Number(formData.openingFloat) || 1000,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to setup cafe");
      }

      // Success -> Redirect to Billing POS
      router.push("/cafe/pos");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="w-full max-w-lg bg-slate-50/90 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-3xl shadow-inner mb-4">
            ☕
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Setup Your Micro-Cafe
          </h1>
          <p className="text-slate-500 text-sm mt-1.5">
            Zero accounting background needed. Let's get your POS ready in 30 seconds.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Cafe Name <span className="text-amber-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. Chandigarh Roasters"
                value={formData.cafeName}
                onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-slate-900 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition text-base font-medium"
              />
              <Store className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Phone (for Bills)
              </label>
              <input
                type="text"
                placeholder="e.g. 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Tagline or Address
            </label>
            <input
              type="text"
              placeholder="e.g. Sector 35-C, Chandigarh"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Morning Cash Float (₹ in Drawer)
            </label>
            <input
              type="number"
              min="0"
              placeholder="1000"
              value={formData.openingFloat}
              onChange={(e) => setFormData({ ...formData, openingFloat: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition text-sm font-semibold"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Petty cash in drawer for giving change to customers. Used for EOD drawer reconciliation.
            </p>
          </div>

          <div className="pt-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg hover:shadow-amber-500/20 active:scale-[0.99] text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Setting up your cafe...</span>
                </>
              ) : (
                <>
                  <span>Create Cafe & Launch POS</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
