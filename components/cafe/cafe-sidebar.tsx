"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Receipt,
  Users,
  Coins,
  Building,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/cafe/pos", icon: ShoppingBag, label: "Billing POS", badge: "FAST" },
  { href: "/cafe/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cafe/menu", icon: UtensilsCrossed, label: "Menu & Categories" },
  { href: "/cafe/expenses", icon: Receipt, label: "Daily Expenses" },
  { href: "/cafe/vendors", icon: Users, label: "Vendor Ledger" },
  { href: "/cafe/reconciliation", icon: Coins, label: "Cash Reconcile" },
  { href: "/cafe/fixed-costs", icon: Building, label: "Fixed Costs" },
];

interface CafeSidebarProps {
  userName?: string | null;
  userImage?: string | null;
  cafeName?: string | null;
}

export function CafeSidebar({ userName, userImage, cafeName }: CafeSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="group/sidebar flex flex-col w-14 hover:w-56 transition-[width] duration-200 ease-in-out overflow-hidden border-r border-border bg-card h-screen sticky top-0 shrink-0 z-30 print:hidden">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="h-6 w-6 rounded-md bg-amber-500 flex items-center justify-center shrink-0">
          <span className="text-amber-950 text-xs font-bold">☕</span>
        </div>
        <span className="font-semibold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 truncate">
          {cafeName || "Micro-Cafe"}
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 p-2 pt-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const active =
            href === "/cafe/dashboard"
              ? pathname === "/cafe/dashboard"
              : pathname.startsWith(href);

          return (
            <Tooltip key={href}>
              <TooltipTrigger
                render={
                  <Link
                    href={href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative w-full",
                      active
                        ? "bg-amber-100 text-amber-900 font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 flex-1 text-left">
                      {label}
                    </span>
                    {badge && (
                      <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 text-[10px] font-medium bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </Link>
                }
              />
              <TooltipContent side="right" className="group-hover/sidebar:hidden">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}

        <div className="mt-4 pt-4 border-t border-border">
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative w-full text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 flex-1 text-left">
                    Back to Review App
                  </span>
                </Link>
              }
            />
            <TooltipContent side="right" className="group-hover/sidebar:hidden">
              Back to Review App
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>

      {/* Bottom — User + Sign Out */}
      <div className="p-2 border-t border-border space-y-1">
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={userImage}
              alt={userName ?? "User"}
              className="h-6 w-6 rounded-full shrink-0 object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
              <span className="text-[10px] font-semibold text-muted-foreground">
                {userName?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
          )}
          <span className="text-xs font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 truncate">
            {userName ?? "Account"}
          </span>
        </div>

        {/* Sign out */}
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
                  Sign out
                </span>
              </button>
            }
          />
          <TooltipContent side="right" className="group-hover/sidebar:hidden">
            Sign out
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
