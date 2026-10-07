import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function ChangeAccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
