"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShieldAlert,
  BarChart3,
  MessageSquare,
  Building2,
  QrCode,
  Palette,
  LogOut,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/cafe/pos", icon: ShoppingBag, label: "Cafe POS & Billing", badge: "HOT" },
  { href: "/dashboard/feedback", icon: ShieldAlert, label: "Private Feedback" },
  { href: "/dashboard/analytics", icon: BarChart3, label: "Analytics" },
  {
    href: "/dashboard/reviews-reply",
    icon: MessageSquare,
    label: "Reviews Reply",
    badge: "Soon",
  },
  { href: "/dashboard/my-business", icon: Building2, label: "My Business" },
  { href: "/dashboard/qr-code", icon: QrCode, label: "QR Code" },
  { href: "/dashboard/qr-flyer", icon: Palette, label: "Flyer Design" },
];

interface SidebarProps {
  userName?: string | null;
  userImage?: string | null;
}

export function Sidebar({ userName, userImage }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="group/sidebar flex flex-col w-14 hover:w-56 transition-[width] duration-200 ease-in-out overflow-hidden border-r border-border bg-card h-screen sticky top-0 shrink-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
        <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center shrink-0">
          <span className="text-primary-foreground text-xs font-bold">T</span>
        </div>
        <span className="font-semibold text-sm whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
          TabAndRate
        </span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 flex flex-col gap-1 p-2 pt-3">
        {NAV_ITEMS.map(({ href, icon: Icon, label, badge }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
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
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 flex-1">
                      {label}
                    </span>
                    {badge && (
                      <span className="whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 text-[10px] font-medium bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
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
