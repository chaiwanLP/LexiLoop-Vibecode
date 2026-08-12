import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { startLogin } from "@/const";
import { Flame, Home, Trophy, BookOpen, UserRound, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

const NAV = [
  { href: "/", label: "หน้าหลัก", icon: Home },
  { href: "/progress", label: "ความคืบหน้า", icon: Flame },
  { href: "/leaderboard", label: "กระดานคะแนน", icon: Trophy },
  { href: "/vocabulary", label: "คลังคำศัพท์", icon: BookOpen },
];

function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location] = useLocation();
  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 tile-pressed">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-mint-deep to-mint-dark flex items-center justify-center text-primary-foreground font-extrabold text-lg shadow-md">
              L
            </span>
            <span className="font-display font-bold text-lg tracking-tight">
              Lexi<span className="text-mint-dark">Loops</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  location === item.href
                    ? "bg-mint text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  location === "/admin"
                    ? "bg-peach text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                จัดการคลังคำ
              </Link>
            )}
          </nav>
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="w-9 h-9 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 tile-pressed px-2 py-1.5 rounded-xl">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-mint text-accent-foreground text-xs font-bold">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-sm font-medium max-w-32 truncate">
                      {user.name ?? user.email ?? "ผู้ใช้"}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-semibold truncate">{user.name ?? "ผู้ใช้"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {isAdmin && (
                      <p className="chip chip-peach mt-1.5 text-[10px]">Admin</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/progress" className="flex items-center gap-2 cursor-pointer">
                      <UserRound className="w-4 h-4" /> ความคืบหน้า
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2 cursor-pointer">
                        <ShieldCheck className="w-4 h-4" /> จัดการคลังคำ
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive">
                    ออกจากระบบ
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={() => startLogin()}
                className="btn-press bg-ink text-white hover:bg-ink/90"
              >
                เข้าสู่ระบบ
              </Button>
            )}
          </div>
        </div>
        {/* mobile nav */}
        <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                location === item.href
                  ? "bg-mint text-accent-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                location === "/admin" ? "bg-peach text-secondary-foreground" : "text-muted-foreground"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> คลังคำ
            </Link>
          )}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border mt-12">
        <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>
            © {new Date().getFullYear()} LexiLoops — เกมปริศนาคำศัพท์สำหรับการเรียนรู้ภายในองค์กร
          </p>
          <p>คลังคำศัพท์ของบริษัทเท่านั้น · ไม่มีข้อมูลจากแหล่งภายนอก</p>
        </div>
      </footer>
    </div>
  );
}
