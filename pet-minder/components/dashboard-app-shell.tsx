"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { DashboardRoleProvider } from "@/components/dashboard-role-context";
import { MainNav } from "@/components/main-nav";

function AdminOnlyRouteGuard({
  roleTypes,
  children,
}: {
  roleTypes: string[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isAdminOnly =
    roleTypes.includes("admin") &&
    !roleTypes.includes("owner") &&
    !roleTypes.includes("minder");

  useEffect(() => {
    if (!isAdminOnly) return;
    if (pathname === "/dashboard") {
      router.replace("/dashboard/admin");
    }
  }, [isAdminOnly, pathname, router]);

  return <>{children}</>;
}

export function DashboardAppShell({
  roleTypes,
  userId,
  children,
}: {
  roleTypes: string[];
  userId: string;
  children: ReactNode;
}) {
  return (
    <DashboardRoleProvider roleTypes={roleTypes} userId={userId}>
      <AdminOnlyRouteGuard roleTypes={roleTypes}>
        <div className="min-h-screen bg-background">
          <MainNav authenticated />
          <main className="min-h-[calc(100vh-4rem)]">
            <div className="p-4 md:p-6">{children}</div>
          </main>
        </div>
      </AdminOnlyRouteGuard>
    </DashboardRoleProvider>
  );
}
