export interface DateRangeIST {
  startOfDay: Date;
  endOfDay: Date;
  istDateString: string;
}

/**
 * Returns Start and End of Day in IST (Asia/Kolkata, UTC+5:30)
 */
export function getISTDayRange(targetDate: Date = new Date()): DateRangeIST {
  const istFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const istDateString = istFormatter.format(targetDate); // e.g. "2026-09-13"

  const [year, month, day] = istDateString.split("-").map(Number);
  
  // Midnight IST in UTC: 00:00 IST is previous day 18:30 UTC
  const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  startOfDay.setMinutes(startOfDay.getMinutes() - 330);

  const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  endOfDay.setMinutes(endOfDay.getMinutes() - 330);

  return { startOfDay, endOfDay, istDateString };
}

/**
 * Format currency in Indian Rupees (₹)
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}
