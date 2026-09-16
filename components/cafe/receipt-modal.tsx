"use client";

import React from "react";
import { Printer, X, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/cafe-utils";

export interface ReceiptOrder {
  id: string;
  orderNumber: number;
  tokenNumber: number;
  createdAt: string | Date;
  total: number;
  paymentMethod: string;
  orderType: string;
  note?: string | null;
  items: Array<{
    name: string;
    quantity: number;
    priceAtSale: number;
  }>;
  cafe?: {
    cafeName: string;
    tagline?: string | null;
    address?: string | null;
    phone?: string | null;
    city?: string | null;
  } | null;
}

interface ReceiptModalProps {
  order: ReceiptOrder | null;
  isOpen: boolean;
  onClose: () => void;
  autoPrint?: boolean;
}

export function ReceiptModal({ order, isOpen, onClose, autoPrint }: ReceiptModalProps) {
  React.useEffect(() => {
    if (isOpen && autoPrint && order) {
      const timer = setTimeout(() => {
        window.print();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, order]);

  if (!isOpen || !order) return null;

  const orderDate = new Date(order.createdAt);
  const formattedDateTime = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(orderDate);

  const cafeName = order.cafe?.cafeName || "My Cafe";
  const cafeTagline = order.cafe?.tagline || "Freshly Brewed";
  const cafeAddress = order.cafe?.address || (order.cafe?.city ? `${order.cafe.city}, India` : "Chandigarh");
  const cafePhone = order.cafe?.phone;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
      {/* Container - on screen it is a modal; during print it takes over the whole thermal print page */}
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl text-slate-900 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            <span>Order #{order.orderNumber} Completed</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Area */}
        <div id="thermal-receipt-area" className="flex-1 overflow-y-auto my-4 font-mono text-sm space-y-6">
          
          {/* ═══════════ SLIP 1: KITCHEN ORDER TICKET (KOT) ═══════════ */}
          <div className="bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300 print:border-black print:bg-white print:text-black">
            <div className="text-center border-b border-dashed border-slate-300 print:border-black pb-2 mb-3">
              <span className="text-xs font-bold tracking-widest uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded print:bg-transparent print:text-black">
                *** KITCHEN ORDER TICKET ***
              </span>
              <div className="text-2xl font-black mt-1">TOKEN #{order.tokenNumber}</div>
              <div className="text-xs text-slate-500 print:text-black">
                Order ID: #{order.orderNumber} · {order.orderType}
              </div>
              <div className="text-xs text-slate-500 print:text-black">{formattedDateTime}</div>
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs font-bold border-b border-slate-200 print:border-black pb-1">
                <span>ITEM</span>
                <span>QTY</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-base font-bold">
                  <span className="flex-1 pr-2">{item.name}</span>
                  <span className="text-lg font-extrabold text-amber-600 print:text-black">
                    x{item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {order.note && (
              <div className="mt-2 p-2 bg-white print:bg-transparent border border-slate-200 print:border-black rounded text-xs">
                <span className="font-bold">Note: </span>
                <span>{order.note}</span>
              </div>
            )}
          </div>

          {/* ✂️ Cut Line Indicator */}
          <div className="relative flex py-1 items-center justify-center print:my-4">
            <div className="border-t-2 border-dashed border-slate-400 print:border-black w-full" />
            <span className="bg-white print:bg-white px-3 text-xs text-slate-500 print:text-black font-sans font-bold flex items-center gap-1 shrink-0">
              ✂️ TEAR HERE FOR KITCHEN
            </span>
            <div className="border-t-2 border-dashed border-slate-400 print:border-black w-full" />
          </div>

          {/* ═══════════ SLIP 2: CUSTOMER INVOICE / BILL ═══════════ */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 print:border-black print:bg-white print:text-black">
            <div className="text-center border-b border-dashed border-slate-300 print:border-black pb-2 mb-3">
              <h2 className="text-lg font-black tracking-wide">{cafeName}</h2>
              {cafeTagline && <p className="text-xs text-slate-500 print:text-black">{cafeTagline}</p>}
              <p className="text-xs text-slate-500 print:text-black">{cafeAddress}</p>
              {cafePhone && <p className="text-xs text-slate-500 print:text-black">Ph: {cafePhone}</p>}
              <div className="mt-2 text-xs font-bold uppercase tracking-wider text-slate-700 print:text-black">
                Customer Invoice
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-500 print:text-black mb-3">
              <div>
                <div>Token: <strong className="text-slate-900 print:text-black text-sm">#{order.tokenNumber}</strong></div>
                <div>Bill No: #{order.orderNumber}</div>
              </div>
              <div className="text-right">
                <div>{formattedDateTime}</div>
                <div>Type: {order.orderType}</div>
              </div>
            </div>

            {/* Line items table */}
            <div className="border-t border-b border-slate-200 print:border-black py-2 mb-3 space-y-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-500 print:text-black">
                <span className="w-1/2">Item</span>
                <span className="w-1/6 text-center">Qty</span>
                <span className="w-1/6 text-right">Rate</span>
                <span className="w-1/6 text-right">Amt</span>
              </div>
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="w-1/2 font-medium truncate pr-1">{item.name}</span>
                  <span className="w-1/6 text-center">{item.quantity}</span>
                  <span className="w-1/6 text-right">₹{item.priceAtSale}</span>
                  <span className="w-1/6 text-right font-bold">
                    ₹{item.quantity * item.priceAtSale}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 text-xs border-b border-slate-200 print:border-black pb-2 mb-3">
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-black">Total Items</span>
                <span>{order.items.reduce((s, i) => s + i.quantity, 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-black">Taxes (0%)</span>
                <span>₹0.00</span>
              </div>
              <div className="flex justify-between text-base font-extrabold pt-1">
                <span>TOTAL AMOUNT</span>
                <span className="text-emerald-400 print:text-black">{formatCurrency(order.total)}</span>
              </div>
            </div>

            <div className="text-xs mb-3 text-center">
              <span className="text-slate-500 print:text-black">Paid via: </span>
              <strong className="text-amber-600 print:text-black uppercase">
                {order.paymentMethod === "ONLINE" ? "Online / UPI" : "Cash in Drawer"}
              </strong>
            </div>

            <div className="text-center text-xs text-slate-500 print:text-black pt-2 border-t border-dashed border-slate-200 print:border-black">
              Thank you for visiting {cafeName}!
              <br />
              Have a wonderful day!
            </div>
          </div>

        </div>

        {/* Modal Actions */}
        <div className="flex gap-3 pt-3 border-t border-slate-200 print:hidden">
          <button
            onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-slate-900 font-bold py-3.5 px-4 rounded-xl transition shadow-lg text-base active:scale-95"
          >
            <Printer className="w-5 h-5" />
            <span>Print Receipts</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold py-3.5 px-4 rounded-xl transition text-base active:scale-95"
          >
            Done (Next Order)
          </button>
        </div>
      </div>

      {/* Global CSS for 58mm / 80mm POS Thermal Printing */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #thermal-receipt-area, #thermal-receipt-area * {
            visibility: visible;
          }
          #thermal-receipt-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            margin: 0;
            padding: 4mm;
            background: white !important;
            color: black !important;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}
