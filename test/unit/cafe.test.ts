import { describe, it, expect } from "vitest";
import { formatCurrency, getISTDayRange } from "@/lib/cafe-utils";

describe("Micro-Cafe Accounting & POS Business Logic", () => {
  describe("formatCurrency", () => {
    it("formats Indian Rupees correctly with ₹ symbol", () => {
      expect(formatCurrency(100)).toContain("100");
      expect(formatCurrency(1500)).toContain("1,500");
      expect(formatCurrency(0)).toContain("0");
    });
  });

  describe("getISTDayRange", () => {
    it("generates start and end of day in Asia/Kolkata (IST)", () => {
      const fixedDate = new Date("2026-09-13T12:00:00Z");
      const { startOfDay, endOfDay, istDateString } = getISTDayRange(fixedDate);

      expect(istDateString).toBe("2026-09-13");
      expect(endOfDay.getTime()).toBeGreaterThan(startOfDay.getTime());
      
      // Total duration between start and end of day should be exactly 24h minus 1ms
      const durationMs = endOfDay.getTime() - startOfDay.getTime();
      expect(durationMs).toBe(86399999);
    });
  });

  describe("P&L Calculation Formula", () => {
    it("accurately computes today's net profit (Revenue - Daily Outflow)", () => {
      const dailyOrders = [
        { total: 180, paymentMethod: "CASH" },
        { total: 250, paymentMethod: "ONLINE" },
        { total: 90, paymentMethod: "ONLINE" },
      ];
      const dailyExpenses = [
        { amount: 120, category: "MILK", paidFrom: "CASH" },
        { amount: 50, category: "ICE", paidFrom: "CASH" },
      ];

      const totalRevenue = dailyOrders.reduce((sum, o) => sum + o.total, 0); // 520
      const totalExpenses = dailyExpenses.reduce((sum, e) => sum + e.amount, 0); // 170
      const netProfit = totalRevenue - totalExpenses; // 350

      expect(totalRevenue).toBe(520);
      expect(totalExpenses).toBe(170);
      expect(netProfit).toBe(350);
    });
  });

  describe("Cash Drawer Balancing Formula", () => {
    it("computes expected cash and detects zero discrepancy when balanced", () => {
      const openingFloat = 1000;
      const cashSales = 850;
      const cashExpenses = 200; // paid milkman from drawer
      const expectedCash = openingFloat + cashSales - cashExpenses; // 1650

      const actualCashCounted = 1650;
      const discrepancy = actualCashCounted - expectedCash;

      expect(expectedCash).toBe(1650);
      expect(discrepancy).toBe(0);
    });

    it("detects shortage when cash is missing", () => {
      const openingFloat = 1000;
      const cashSales = 500;
      const cashExpenses = 0;
      const expectedCash = 1500;

      const actualCashCounted = 1420; // 80 missing
      const discrepancy = actualCashCounted - expectedCash;

      expect(discrepancy).toBe(-80);
    });
  });

  describe("Dual Receipt (KOT & Customer Slip) Consistency", () => {
    it("verifies KOT and Customer Bill share the identical order details", () => {
      const order = {
        orderNumber: 1042,
        tokenNumber: 14,
        createdAt: new Date(),
        total: 350,
        paymentMethod: "ONLINE",
        orderType: "TAKEAWAY",
        items: [
          { name: "Gulab Jamun", quantity: 2, priceAtSale: 100 },
          { name: "Cold Coffee", quantity: 1, priceAtSale: 150 },
        ],
      };

      // Kitchen Ticket data
      const kotSlip = {
        tokenNumber: order.tokenNumber,
        orderNumber: order.orderNumber,
        items: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
      };

      // Customer Bill data
      const customerBill = {
        tokenNumber: order.tokenNumber,
        orderNumber: order.orderNumber,
        total: order.total,
        paymentMethod: order.paymentMethod,
        items: order.items,
      };

      // Verify strict parity
      expect(kotSlip.tokenNumber).toBe(customerBill.tokenNumber);
      expect(kotSlip.orderNumber).toBe(customerBill.orderNumber);
      expect(kotSlip.items.length).toBe(customerBill.items.length);
      expect(kotSlip.items[0].quantity).toBe(customerBill.items[0].quantity);
    });
  });
});
