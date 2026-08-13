import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Belt-and-suspenders: DashboardShell already hides this link from
// non-admins in the sidebar, but that's just UI — someone typing the URL
// directly would otherwise still get the page shell rendered (even if the
// underlying /api/users calls come back 403 empty). This layout runs on
// the server before any of that, so a non-admin never sees the page at all.
export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
