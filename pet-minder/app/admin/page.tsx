import { redirect } from "next/navigation";

/** Canonical admin UI lives under the dashboard shell at `/dashboard/admin`. */
export default function AdminAliasPage() {
  redirect("/dashboard/admin");
}
