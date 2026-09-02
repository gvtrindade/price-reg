import Sidebar from "@/components/sidebar";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");
  if (session.user.mustChangePassword) redirect("/force-change-password");

  return <Sidebar>{children}</Sidebar>;
}
