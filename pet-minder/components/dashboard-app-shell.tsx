"use client";

import type { ReactNode } from "react";
import { DashboardRoleProvider } from "@/components/dashboard-role-context";
import { MainNav } from "@/components/main-nav";

export function DashboardAppShell({
  roleTypes,
  children,
}: {
  roleTypes: string[];
  children: ReactNode;
}) {
  return (
    <DashboardRoleProvider roleTypes={roleTypes}>
      <div className="min-h-screen bg-background">
        <MainNav authenticated />
        <main className="min-h-[calc(100vh-4rem)]">
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </DashboardRoleProvider>
  );
}
