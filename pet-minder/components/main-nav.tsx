"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarCheck,
  PawPrint,
  User,
  Home,
  Search,
  Shield,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { useOptionalDashboardRole } from "@/components/dashboard-role-context";
import { RoleModeSwitch } from "@/components/role-mode-switch";

const ownerNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/dashboard/pets", label: "Pets", icon: PawPrint },
  { href: "/dashboard/search", label: "Search", icon: Search },
] as const;

const minderNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/dashboard/minder", label: "Minder", icon: Home },
] as const;

const adminNavItem = {
  href: "/dashboard/admin",
  label: "Admin",
  icon: Shield,
} as const;

function isNavActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MainNav({
  authenticated,
  children,
}: {
  authenticated: boolean;
  /** When not signed in, pass server `AuthButton` (e.g. wrapped in `Suspense`) as children. */
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const dashboardRole = useOptionalDashboardRole();

  const appNav = useMemo(() => {
    if (!dashboardRole) {
      return ownerNav;
    }
    const { roleTypes, activeRole, allRoleTypes } = dashboardRole;
    const isAdmin = allRoleTypes.includes("admin");
    let base: readonly { href: string; label: string; icon: LucideIcon }[];
    if (roleTypes.length === 1) {
      base = roleTypes[0] === "minder" ? minderNav : ownerNav;
    } else {
      base = activeRole === "minder" ? minderNav : ownerNav;
    }
    if (isAdmin) {
      return [...base, adminNavItem];
    }
    return base;
  }, [dashboardRole]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card">
      <div className="grid h-auto min-h-16 w-full grid-cols-1 items-center gap-2 px-3 py-2 sm:grid-cols-[1fr_auto_1fr] sm:px-4 sm:py-0">
        <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-start">
          <Link
            href="/"
            className="font-display text-xl text-foreground shrink-0"
          >
            Pet Minder
          </Link>
        </div>

        {authenticated ? (
          <nav
            className="flex flex-wrap items-center justify-center gap-2"
            aria-label="Dashboard"
          >
            {dashboardRole?.isDualRole ? <RoleModeSwitch /> : null}
            {appNav.map(({ href, label, icon: Icon }) => {
              const isActive = isNavActive(href, pathname);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors",
                    isActive
                      ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex items-center justify-center">
            <Link
              href="#features"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              How it works
            </Link>
          </div>
        )}

        <div className="flex shrink-0 items-center justify-end gap-1">
          <ThemeToggle />
          {authenticated ? (
            <>
              <Link
                href="/dashboard/profile"
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  pathname.startsWith("/dashboard/profile") &&
                    "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
                )}
                aria-label="Profile"
              >
                <User className="size-5" />
              </Link>
              <LogoutButton size="sm" variant="outline" />
            </>
          ) : (
            children
          )}
        </div>
      </div>
    </header>
  );
}
