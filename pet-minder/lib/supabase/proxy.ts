import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and getUser().
  // A simple mistake could make it very hard to debug session issues.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  async function isAccountActive(userId: string): Promise<boolean> {
    const { data: row, error } = await supabase
      .from("users")
      .select("is_active")
      .eq("id", userId)
      .maybeSingle();
    if (error) return true;
    // Explicit false only — null/undefined treated as active (legacy rows).
    return row?.is_active !== false;
  }

  async function hasActiveRoles(userId: string): Promise<boolean> {
    const { data: roles } = await supabase
      .from("roles")
      .select("role_type")
      .eq("user_id", userId)
      .is("deleted_at", null)
      .limit(1);
    return Boolean(roles && roles.length > 0);
  }

  /** Admin only: has `admin` role and no `owner` / `minder` roles. */
  async function isAdminOnlyUser(userId: string): Promise<boolean> {
    const { data: roles } = await supabase
      .from("roles")
      .select("role_type")
      .eq("user_id", userId)
      .is("deleted_at", null);
    const types = new Set((roles ?? []).map((r) => r.role_type));
    return types.has("admin") && !types.has("owner") && !types.has("minder");
  }

  const onSuspendedPage =
    pathname === "/account-suspended" ||
    pathname.startsWith("/account-suspended/");

  // Suspension: block dashboard/onboarding only — allow `/`, `/auth/*`, etc., so
  // "Back to home" works and users can sign out then sign in again.
  const suspendedBlockedPath =
    pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding");

  if (
    user &&
    suspendedBlockedPath &&
    !onSuspendedPage &&
    !(await isAccountActive(user.id))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/account-suspended";
    return NextResponse.redirect(url);
  }

  // Admin-only users: redirect the bare /dashboard root to /dashboard/admin.
  // Sub-paths (owner, minder pages) are allowed so the role slider works.
  if (
    user &&
    pathname === "/dashboard" &&
    (await isAdminOnlyUser(user.id))
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard/admin";
    return NextResponse.redirect(url);
  }

  // Onboarding: require session; send completed users to the dashboard
  if (pathname === "/onboarding" || pathname.startsWith("/onboarding/")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/login";
      return NextResponse.redirect(url);
    }
    if (await hasActiveRoles(user.id)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Protect dashboard: redirect unauthenticated users to login
  if (!user && pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages to onboarding or dashboard
  if (
    user &&
    (pathname === "/auth/login" || pathname === "/auth/sign-up")
  ) {
    const url = request.nextUrl.clone();
    if (!(await isAccountActive(user.id))) {
      url.pathname = "/account-suspended";
      return NextResponse.redirect(url);
    }
    if (await hasActiveRoles(user.id)) {
      url.pathname = (await isAdminOnlyUser(user.id))
        ? "/dashboard/admin"
        : "/dashboard";
    } else {
      url.pathname = "/onboarding";
    }
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
