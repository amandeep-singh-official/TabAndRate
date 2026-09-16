"use client";

import React, { useState, useEffect } from "react";
import {
  UtensilsCrossed,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Sparkles,
  Loader2,
  FolderPlus,
  Layers,
  IndianRupee,
} from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";

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
    id: string;
    name: string;
    color: string;
    icon?: string | null;
  };
}

const COLOR_PRESETS = [
  { label: "Crimson", hex: "#dc2626" },
  { label: "Purple", hex: "#7c3aed" },
  { label: "Blue", hex: "#2563eb" },
  { label: "Emerald", hex: "#16a34a" },
  { label: "Amber", hex: "#d97706" },
  { label: "Rose", hex: "#e11d48" },
  { label: "Indigo", hex: "#4f46e5" },
  { label: "Dark Blue", hex: "#1e3a8a" },
];

const EMOJI_PRESETS = ["☕", "🧊", "🧋", "🥪", "🍕", "🍰", "🥗", "🍲", "🍟", "🥐", "🍩", "🥤"];

export default function CafeMenuManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"items" | "categories">("items");
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>("ALL");

  // New Category Form state
  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#dc2626");
  const [catIcon, setCatIcon] = useState("🍽️");
  const [savingCat, setSavingCat] = useState(false);

  // New Item Form state
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemCategoryId, setItemCategoryId] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  // Load Data
  const fetchData = async () => {
    try {
      const [catsRes, itemsRes] = await Promise.all([
        fetch("/api/cafe/categories"),
        fetch("/api/cafe/menu"),
      ]);

      if (catsRes.status === 404 || itemsRes.status === 404) {
        window.location.href = "/cafe/setup";
        return;
      }

      const catsData = await catsRes.json();
      const itemsData = await itemsRes.json();

      if (catsData.categories) {
        setCategories(catsData.categories);
        if (!itemCategoryId && catsData.categories.length > 0) {
          setItemCategoryId(catsData.categories[0].id);
        }
      }
      if (itemsData.items) {
        setItems(itemsData.items);
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

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    setSavingCat(true);
    try {
      const res = await fetch("/api/cafe/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: catName.trim(),
          color: catColor,
          icon: catIcon,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCatName("");
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSavingCat(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure? Items inside this category will also be deleted.")) return;

    try {
      const res = await fetch(`/api/cafe/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete category");
    }
  };

  // Create Item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemPrice || !itemCategoryId) return;

    setSavingItem(true);
    try {
      const res = await fetch("/api/cafe/menu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: itemName.trim(),
          price: Number(itemPrice),
          categoryId: itemCategoryId,
          isAvailable: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setItemName("");
      setItemPrice("");
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create menu item");
    } finally {
      setSavingItem(false);
    }
  };

  // Toggle Item Availability
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/cafe/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      if (!res.ok) throw new Error("Update failed");
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this food item?")) return;
    try {
      const res = await fetch(`/api/cafe/menu/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  // Quick Seed Popular Chandigarh Cafe Menu
  const handleQuickSeed = async () => {
    if (!confirm("Seed quick starter menu (Hot Coffee, Cold Coffee, Snacks, Desserts)?")) return;
    setLoading(true);

    try {
      // Ensure basic categories exist or create
      const starterCats = [
        { name: "Hot Coffee & Tea", color: "#dc2626", icon: "☕" },
        { name: "Cold Beverages", color: "#2563eb", icon: "🧊" },
        { name: "Quick Bites", color: "#16a34a", icon: "🥪" },
        { name: "Desserts & Bakery", color: "#7c3aed", icon: "🍰" },
      ];

      for (const sc of starterCats) {
        const catRes = await fetch("/api/cafe/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sc),
        });
        const catData = await catRes.json();
        if (catData.category) {
          const catId = catData.category.id;
          let seedItems: Array<{ name: string; price: number }> = [];

          if (sc.name.includes("Hot")) {
            seedItems = [
              { name: "Espresso", price: 60 },
              { name: "Cappuccino", price: 80 },
              { name: "Cafe Latte", price: 90 },
              { name: "Masala Chai", price: 40 },
            ];
          } else if (sc.name.includes("Cold")) {
            seedItems = [
              { name: "Classic Cold Coffee", price: 90 },
              { name: "Iced Americano", price: 80 },
              { name: "Hazelnut Cold Coffee", price: 120 },
              { name: "Lemon Ice Tea", price: 70 },
            ];
          } else if (sc.name.includes("Bites")) {
            seedItems = [
              { name: "Grilled Cheese Sandwich", price: 110 },
              { name: "Paneer Tikka Sandwich", price: 130 },
              { name: "French Fries", price: 90 },
              { name: "Garlic Toast", price: 80 },
            ];
          } else {
            seedItems = [
              { name: "Gulab Jamun (2 pcs)", price: 60 },
              { name: "Chocolate Lava Cake", price: 120 },
              { name: "Chocolate Brownie", price: 90 },
              { name: "Kulfi", price: 50 },
            ];
          }

          for (const item of seedItems) {
            await fetch("/api/cafe/menu", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: item.name,
                price: item.price,
                categoryId: catId,
                isAvailable: true,
              }),
            });
          }
        }
      }

      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = selectedCatFilter === "ALL"
    ? items
    : items.filter((i) => i.categoryId === selectedCatFilter);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mr-3" />
        <span className="text-lg font-medium">Loading Menu & Categories...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
            <UtensilsCrossed className="w-7 h-7 text-amber-400" />
            <span>Menu & Categories</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Create customized categories and food items for your takeaway counter.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {items.length === 0 && (
            <button
              onClick={handleQuickSeed}
              className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-amber-950 px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition hover:scale-105"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Seed Starter Menu</span>
            </button>
          )}

          <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("items")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "items"
                  ? "bg-amber-500 text-amber-950"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Food Items ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("categories")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTab === "categories"
                  ? "bg-amber-500 text-amber-950"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Categories ({categories.length})
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────── TAB 1: FOOD ITEMS ───────────────── */}
      {activeTab === "items" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Top Form: Add Food Item */}
          <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xl h-fit">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5 text-amber-400" />
              <span>Add New Food Item</span>
            </h3>

            {categories.length === 0 ? (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300">
                You must create at least one category before adding items. Switch to the Categories tab!
              </div>
            ) : (
              <form onSubmit={handleCreateItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Select Category
                  </label>
                  <select
                    value={itemCategoryId}
                    onChange={(e) => setItemCategoryId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cappuccino, Gulab Jamun"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    Price (in ₹)
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
                      placeholder="80"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl pl-8 pr-3.5 py-2.5 text-sm text-slate-900 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingItem}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
                >
                  {savingItem ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Save Food Item</span>
                </button>
              </form>
            )}
          </div>

          {/* Right: Items List with Category Filter */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Category Filter Badges */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
              <button
                onClick={() => setSelectedCatFilter("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  selectedCatFilter === "ALL"
                    ? "bg-white text-black"
                    : "bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900"
                }`}
              >
                All Items ({items.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatFilter(cat.id)}
                  style={{
                    backgroundColor: selectedCatFilter === cat.id ? cat.color : undefined,
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    selectedCatFilter === cat.id
                      ? "text-slate-900 shadow"
                      : "bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>

            {/* Item Cards Grid */}
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl text-slate-500">
                <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-700">No items in this category</p>
                <p className="text-xs text-slate-500 mt-1">Use the form on the left to add items.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:border-slate-300 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{item.name}</span>
                        {!item.isAvailable && (
                          <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.2 rounded font-semibold">
                            Out of Stock
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-base font-extrabold text-amber-400">
                          {formatCurrency(item.price)}
                        </span>
                        <span className="text-xs text-slate-500">• {item.category.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition ${
                          item.isAvailable
                            ? "bg-slate-200 text-slate-500 hover:bg-slate-300"
                            : "bg-emerald-600/20 text-emerald-400"
                        }`}
                      >
                        {item.isAvailable ? "Set 86" : "Restock"}
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-200 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>
      )}

      {/* ───────────────── TAB 2: CATEGORIES ───────────────── */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Create Category Form */}
          <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-xl h-fit">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2 mb-4">
              <FolderPlus className="w-5 h-5 text-amber-400" />
              <span>Create Custom Category</span>
            </h3>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Starters, Beverages, Desserts"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Pick Card Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setCatColor(color.hex)}
                      style={{ backgroundColor: color.hex }}
                      className={`h-9 rounded-xl border flex items-center justify-center transition-all ${
                        catColor === color.hex
                          ? "ring-2 ring-white scale-105 border-white"
                          : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      {catColor === color.hex && <Check className="w-4 h-4 text-slate-900" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Icon / Emoji
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_PRESETS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setCatIcon(emoji)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg border transition ${
                        catIcon === emoji
                          ? "bg-amber-500/20 border-amber-500"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingCat}
                className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-extrabold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-md"
              >
                {savingCat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Add Category</span>
              </button>
            </form>
          </div>

          {/* Categories Grid Display */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {categories.map((cat) => {
                const itemCount = items.filter((i) => i.categoryId === cat.id).length;

                return (
                  <div
                    key={cat.id}
                    style={{ borderColor: cat.color }}
                    className="p-4 rounded-2xl bg-slate-50 border flex items-center justify-between shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: `${cat.color}35`, color: cat.color }}
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl border"
                      >
                        {cat.icon || "🍽️"}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-slate-900">{cat.name}</h4>
                        <span className="text-xs text-slate-500">
                          {itemCount} {itemCount === 1 ? "Food Item" : "Food Items"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-200 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
