export const dynamic = "force-dynamic";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-[#faf8f3] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#e0d8ce] bg-white">
        <Link href="/dashboard" className="text-xl font-bold tracking-tight text-[#2d1a0e]">
          Field Day
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/discover">
            <Button variant="ghost" size="sm">Discover</Button>
          </Link>
          <Link href="/games">
            <Button variant="ghost" size="sm">Games</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm">Dashboard</Button>
          </Link>
          <div className="w-px h-5 bg-[#e0d8ce]" />
          <UserMenu
            name={session.user?.name ?? "You"}
            userId={session.user?.id ?? ""}
          />
        </div>
      </nav>
      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  );
}
