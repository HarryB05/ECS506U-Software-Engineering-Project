"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type DashboardRole = "owner" | "minder";

type DashboardRoleContextValue = {
  roleTypes: DashboardRole[];
  activeRole: DashboardRole;
  setActiveRole: (role: DashboardRole) => void;
  isDualRole: boolean;
};

const DashboardRoleContext = createContext<
  DashboardRoleContextValue | undefined
>(undefined);

const STORAGE_KEY = "pet-minder-dashboard-active-role";

function normaliseRoleTypes(types: string[]): DashboardRole[] {
  const out: DashboardRole[] = [];
  if (types.includes("owner")) out.push("owner");
  if (types.includes("minder")) out.push("minder");
  return out;
}

function initialActiveRole(roles: DashboardRole[]): DashboardRole {
  if (roles.length === 1) return roles[0]!;
  return "owner";
}

export function DashboardRoleProvider({
  roleTypes,
  children,
}: {
  roleTypes: string[];
  children: ReactNode;
}) {
  const roles = useMemo(() => normaliseRoleTypes(roleTypes), [roleTypes]);
  const isDualRole = roles.length === 2;

  const [activeRole, setActiveRoleState] = useState<DashboardRole>(() =>
    initialActiveRole(roles),
  );

  useEffect(() => {
    if (roles.length === 0) return;
    if (roles.length === 1) {
      setActiveRoleState(roles[0]!);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "owner" || stored === "minder") {
        if (roles.includes(stored)) {
          setActiveRoleState(stored);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setActiveRoleState("owner");
  }, [roles]);

  const setActiveRole = useCallback(
    (role: DashboardRole) => {
      if (!roles.includes(role)) return;
      setActiveRoleState(role);
      if (roles.length === 2) {
        try {
          localStorage.setItem(STORAGE_KEY, role);
        } catch {
          /* ignore */
        }
      }
    },
    [roles],
  );

  const value = useMemo<DashboardRoleContextValue>(
    () => ({
      roleTypes: roles,
      activeRole,
      setActiveRole,
      isDualRole,
    }),
    [roles, activeRole, setActiveRole, isDualRole],
  );

  if (roles.length === 0) {
    return <>{children}</>;
  }

  return (
    <DashboardRoleContext.Provider value={value}>
      {children}
    </DashboardRoleContext.Provider>
  );
}

export function useDashboardRole(): DashboardRoleContextValue {
  const ctx = useContext(DashboardRoleContext);
  if (!ctx) {
    throw new Error(
      "useDashboardRole must be used within DashboardRoleProvider",
    );
  }
  return ctx;
}

/** For `MainNav` when rendered outside the dashboard shell (e.g. home while signed in). */
export function useOptionalDashboardRole():
  | DashboardRoleContextValue
  | undefined {
  return useContext(DashboardRoleContext);
}
