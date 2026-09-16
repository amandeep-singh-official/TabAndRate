"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Printer,
  Zap,
  RotateCcw,
  Clock,
  Loader2,
  CheckCircle2,
  Coins,
  CreditCard,
  History,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";
import { ReceiptModal, ReceiptOrder } from "@/components/cafe/receipt-modal";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string | null;
  _count?: { items: number };
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  isAvailable: boolean;
  category: {
    name: string;
    color: string;
    icon?: string | null;
  };
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CafePOSPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "ONLINE">("ONLINE");
  const [cashReceived, setCashReceived] = useState<string>("");
  const [orderNote, setOrderNote] = useState<string>("");
  
  // Loading & Action states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [recentOrders, setRecentOrders] = useState<ReceiptOrder[]>([]);
  const [showRecent, setShowRecent] = useState(false);

  // Modal receipt
  const [completedOrder, setCompletedOrder] = useState<ReceiptOrder | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    async function loadPOSData() {
      setLoading(true);
      try {
        const [catsRes, itemsRes, ordersRes] = await Promise.all([
          fetch("/api/cafe/categories"),
          fetch("/api/cafe/menu"),
          fetch("/api/cafe/orders?limit=8"),
        ]);

        if (catsRes.status === 404 || itemsRes.status === 404) {
          // Cafe not set up yet
          window.location.href = "/cafe/setup";
          return;
        }

        const catsData = await catsRes.json();
        const itemsData = await itemsRes.json();
        const ordersData = await ordersRes.json();

        if (catsData.categories?.length > 0) {
          setCategories(catsData.categories);
          setSelectedCategoryId(catsData.categories[0].id);
        }
        if (itemsData.items) {
          setMenuItems(itemsData.items);
        }
        if (ordersData.orders) {
          setRecentOrders(ordersData.orders);
        }
      } catch (err) {
        console.error("Failed to load POS data", err);
      } finally {
        setLoading(false);
      }
    }

    loadPOSData();
  }, []);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (!selectedCategoryId) return menuItems;
    return menuItems.filter((item) => item.categoryId === selectedCategoryId);
  }, [menuItems, selectedCategoryId]);

  // Cart quantity lookup
  const getItemQuantity = (itemId: string) => {
    const item = cart.find((i) => i.menuItemId === itemId);
    return item ? item.quantity : 0;
  };

  // Add / Increment item
  const handleAddItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  // Decrement item
  const handleDecrementItem = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => i.menuItemId !== itemId);
      }
      return prev.map((i) =>
        i.menuItemId === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
  };

  // Remove from cart completely
  const handleRemoveItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.menuItemId !== itemId));
  };

  // Clear cart
  const handleClearCart = () => {
    setCart([]);
    setCashReceived("");
    setOrderNote("");
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const taxAmount = 0.0; // Future feature toggle
  const totalAmount = subtotal + taxAmount;

  // Change computation
  const cashGivenNumber = parseFloat(cashReceived) || 0;
  const changeToReturn = Math.max(0, cashGivenNumber - totalAmount);

  // Place Order API call
  const handlePlaceOrder = async (shouldAutoPrint: boolean = false) => {
    if (cart.length === 0 || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/cafe/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            name: i.name,
            quantity: i.quantity,
            priceAtSale: i.price,
          })),
          paymentMethod,
          orderType: "TAKEAWAY",
          note: orderNote || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Order failed");
      }

      // Add to recent orders
      setRecentOrders((prev) => [data.order, ...prev.slice(0, 7)]);

      // Open receipt modal
      setCompletedOrder(data.order);
      setIsReceiptOpen(true);

      // Reset cart
      handleClearCart();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-lg font-medium">Opening Cash Register...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden bg-white text-slate-900 select-none">
      
      {/* ───────────────── LEFT & MIDDLE: MENU & CATEGORIES ───────────────── */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 overflow-hidden">
        
        {/* Top Header / Bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Counter Billing · Takeaway Only
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecent(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-xs font-semibold text-slate-700 transition"
            >
              <History className="w-3.5 h-3.5 text-amber-400" />
              <span>Recent Orders ({recentOrders.length})</span>
            </button>
            <Link
              href="/cafe/menu"
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-amber-400 font-semibold transition"
            >
              + Edit Menu
            </Link>
          </div>
        </div>

        {/* ─── Category Selection Grid / Pills ─── */}
        <div className="p-4 bg-white border-b border-slate-200 overflow-x-auto">
          {categories.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
              <p className="text-sm text-slate-500">No categories found yet.</p>
              <Link
                href="/cafe/menu"
                className="mt-2 inline-block text-xs bg-amber-500 text-amber-950 px-3 py-1.5 rounded-lg font-bold"
              >
                Create Categories & Items →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2.5">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                const itemCount = menuItems.filter((m) => m.categoryId === cat.id).length;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    style={{
                      backgroundColor: isSelected ? cat.color : `${cat.color}25`,
                      borderColor: cat.color,
                    }}
                    className={`relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-150 text-left shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] min-h-[72px] ${
                      isSelected ? "ring-2 ring-slate-300 shadow-lg text-slate-900 font-bold" : "text-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm font-extrabold truncate flex items-center gap-1.5">
                        <span className="text-base">{cat.icon || "🍽️"}</span>
                        <span>{cat.name}</span>
                      </span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-white shadow" />
                      )}
                    </div>
                    <span className="text-[11px] opacity-80 font-medium">
                      {itemCount} {itemCount === 1 ? "Item" : "Items"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ─── Menu Items Grid ─── */}
        <div className="flex-1 p-4 overflow-y-auto bg-white">
          {filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-3xl">
              <span className="text-4xl mb-3">☕</span>
              <h3 className="text-base font-bold text-slate-700">No items in this category</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Add drinks, snacks, or bakery items to this category from the Menu Manager.
              </p>
              <Link
                href="/cafe/menu"
                className="mt-4 bg-amber-500 hover:bg-amber-400 text-amber-950 px-4 py-2 rounded-xl text-xs font-bold transition"
              >
                + Add Food Items
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
              {filteredItems.map((item) => {
                const qtyInCart = getItemQuantity(item.id);
                const hasItem = qtyInCart > 0;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col justify-between p-4 rounded-2xl border transition-all duration-150 ${
                      hasItem
                        ? "bg-slate-50 border-amber-500/50 shadow-md ring-1 ring-amber-500/30"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    {/* Item Title & Cart indicator */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h4 className="font-bold text-base text-slate-900 leading-snug">
                          {item.name}
                        </h4>
                        <span className="text-xs text-slate-500">{item.category.name}</span>
                      </div>
                      <button
                        onClick={() => handleAddItem(item)}
                        className={`p-2 rounded-xl transition ${
                          hasItem
                            ? "bg-amber-500 text-amber-950"
                            : "bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                        }`}
                      >
                        <ShoppingBag className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Price & Quantity Stepper Controls */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <span className="text-xl font-extrabold text-slate-900">
                        ₹{item.price}
                      </span>

                      {/* Stepper matching reference screenshot */}
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 gap-2 shadow-inner">
                        <button
                          onClick={() => handleDecrementItem(item.id)}
                          disabled={!hasItem}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 disabled:opacity-30 disabled:hover:bg-slate-200 transition"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center font-extrabold text-base text-amber-400">
                          {qtyInCart}
                        </span>
                        <button
                          onClick={() => handleAddItem(item)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ───────────────── RIGHT SIDEBAR: ORDER DETAILS (CART & BILLING) ───────────────── */}
      <div className="w-full lg:w-96 xl:w-[420px] bg-slate-50/95 border-t lg:border-t-0 flex flex-col h-auto lg:h-full shrink-0 shadow-2xl">
        
        {/* Order Details Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-lg text-slate-900 tracking-wide">
              Order Details
            </h2>
            <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
              <span>Takeaway Order</span>
              <span>•</span>
              <span className="text-amber-400 font-semibold">Active Cart</span>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold p-1 rounded transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Live Cart Items List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2.5 max-h-[35vh] lg:max-h-none">
          {cart.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <ShoppingBag className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-700">Your cart is empty</p>
              <p className="text-xs text-slate-500 mt-1">
                Tap items on the left to add them to this order
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.menuItemId}
                className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <h4 className="font-bold text-sm text-slate-800 truncate">
                    {item.name}
                  </h4>
                  <div className="text-xs text-slate-500">
                    ₹{item.price} × {item.quantity} ={" "}
                    <strong className="text-slate-800">
                      ₹{item.price * item.quantity}
                    </strong>
                  </div>
                </div>

                {/* Quantity adjuster */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDecrementItem(item.menuItemId)}
                    className="w-6 h-6 rounded-md bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 text-xs"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-5 text-center font-bold text-sm text-amber-400">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => {
                      const origin = menuItems.find((m) => m.id === item.menuItemId);
                      if (origin) handleAddItem(origin);
                    }}
                    className="w-6 h-6 rounded-md bg-slate-200 hover:bg-slate-300 flex items-center justify-center text-slate-700 text-xs"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ─── Bottom Billing & Actions Panel ─── */}
        <div className="p-4 border-t border-slate-200 bg-white/90 space-y-3">
          
          {/* Subtotal, Tax & Total */}
          <div className="space-y-1.5 text-xs text-slate-500">
            <div className="flex justify-between">
              <span>Items ({totalItemsCount})</span>
              <span className="text-slate-800 font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (0.00%)</span>
              <span className="text-slate-800 font-semibold">₹0.00</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1 border-t border-slate-200">
              <span>Total With Tax</span>
              <span className="text-emerald-400 text-xl font-black">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Method Toggle: Cash vs Online (UPI) */}
          <div className="pt-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("CASH")}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-sm transition-all ${
                  paymentMethod === "CASH"
                    ? "bg-amber-500 text-amber-950 shadow-md ring-2 ring-amber-400"
                    : "bg-slate-50 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>Cash in Drawer</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("ONLINE")}
                className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-sm transition-all ${
                  paymentMethod === "ONLINE"
                    ? "bg-blue-600 text-slate-900 shadow-md ring-2 ring-blue-400"
                    : "bg-slate-50 hover:bg-slate-200 text-slate-700 border border-slate-200"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Online / UPI</span>
              </button>
            </div>
          </div>

          {/* Quick Cash Change Helper (when Cash is selected) */}
          {paymentMethod === "CASH" && totalAmount > 0 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Cash Handed:</span>
                <div className="flex items-center gap-1.5">
                  {[100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setCashReceived(String(amt))}
                      className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold"
                    >
                      ₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceived(String(totalAmount))}
                    className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold"
                  >
                    Exact
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <input
                  type="number"
                  placeholder="Cash entered..."
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="w-28 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900"
                />
                {cashGivenNumber > 0 && (
                  <div className="text-xs font-extrabold text-emerald-400">
                    Return: ₹{changeToReturn}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons: Print Receipt & Place Order */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={() => handlePlaceOrder(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-slate-900 font-bold py-3.5 px-3 rounded-xl transition shadow-lg text-sm active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || submitting}
              onClick={() => handlePlaceOrder(false)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:hover:from-amber-500 text-amber-950 font-black py-3.5 px-3 rounded-xl transition shadow-lg text-sm active:scale-98"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 fill-current" />
              )}
              <span>Place Order</span>
            </button>
          </div>

        </div>
      </div>

      {/* ───────────────── SLIDE-OUT: RECENT ORDERS (REPRINT & AUDIT) ───────────────── */}
      {showRecent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-50 border-l border-slate-200 h-full flex flex-col p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <History className="w-5 h-5 text-amber-400" />
                <span>Today's Recent Orders</span>
              </div>
              <button
                onClick={() => setShowRecent(false)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {recentOrders.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">
                  No orders recorded today yet.
                </p>
              ) : (
                recentOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">
                        Token #{ord.tokenNumber} · Order #{ord.orderNumber}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-200 text-slate-700">
                        {ord.paymentMethod}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500">
                      {ord.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                      <span className="font-extrabold text-emerald-400">
                        {formatCurrency(ord.total)}
                      </span>
                      <button
                        onClick={() => {
                          setCompletedOrder(ord);
                          setIsReceiptOpen(true);
                          setShowRecent(false);
                        }}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>View / Reprint</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────── DUAL RECEIPT MODAL (KOT + CUSTOMER SLIP) ───────────────── */}
      <ReceiptModal
        order={completedOrder}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

    </div>
  );
}
