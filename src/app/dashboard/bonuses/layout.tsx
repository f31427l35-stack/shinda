import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

// Same reasoning as /dashboard/users/layout.tsx: the bonus-settings API is
// admin-only, so this page should never render for anyone else, regardless
// of whether they clicked a link or typed the URL directly.
export default async function BonusesLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
