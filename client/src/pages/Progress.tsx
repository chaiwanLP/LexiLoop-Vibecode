import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { PUZZLE_TYPES, DIFFICULTIES } from "../../../shared/game";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Flame,
  Trophy,
  CalendarCheck,
  Target,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";

export default function Progress() {
  const { user, isAuthenticated, loading } = useAuth();
  const { data: summary, isLoading } = trpc.progress.summary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const history = summary?.history ?? [];

  // Streak calendar: last 28 days (must run on every render — before early returns)
  const streakDays = useMemo(() => {
    const days: { date: string; label: string; active: boolean }[] = [];
    const d = new Date();
    for (let i = 27; i >= 0; i--) {
      const day = new Date(d);
      day.setDate(day.getDate() - i);
      const dateStr = new Intl.DateTimeFormat("en-CA", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(day);
      days.push({
        date: dateStr,
        label: day.toLocaleDateString("th-TH", { month: "short", day: "numeric" }),
        active: history.some((h) => h.puzzleDate === dateStr),
      });
    }
    return days;
  }, [history]);

  if (loading) return <AppShell><Skeleton className="h-96 m-8" /></AppShell>;
  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="container py-24 text-center fade-up">
          <h1 className="text-2xl font-bold mb-3">เข้าสู่ระบบเพื่อดูความคืบหน้าของคุณ</h1>
          <Button size="lg" asChild className="btn-press">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </AppShell>
    );
  }
  const solved = history.filter((h) => h.score > 0).length;
  const avgScore =
    solved > 0 ? Math.round(history.reduce((acc, h) => acc + h.score, 0) / solved) : 0;
  const best = history.reduce((acc, h) => Math.max(acc, h.score), 0);
  const streak = summary?.currentStreak ?? 0;
  const todaySolved = summary?.todaySolved ?? 0;

  return (
    <AppShell>
      <div className="container py-10">
        <div className="fade-up">
          <h1 className="text-3xl font-bold">ความคืบหน้าของคุณ</h1>
          <p className="text-muted-foreground mt-1">
            เล่นอย่างน้อย 1 เกมต่อวันเพื่อรักษาสตreak ต่อเนื่อง
          </p>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 fade-up" style={{ animationDelay: "60ms" }}>
          <StatTile icon={Flame} label="สตreak ปัจจุบัน" value={String(streak)} sub="วันต่อเนื่อง" accent="peach" />
          <StatTile icon={Trophy} label="คะแนนสะสม" value={String(summary?.totalScore ?? 0)} sub="ตลอดกาล" accent="mint" />
          <StatTile icon={Target} label="เกมที่ทำสำเร็จ" value={`${solved}/${history.length}`} sub={`คะแนนเฉลี่ย ${avgScore}`} accent="mint" />
          <StatTile icon={TrendingUp} label="คะแนนสูงสุด" value={String(best)} sub="ในเกมเดียว" accent="ink" />
        </div>

        {/* Streak calendar */}
        <div className="tile p-6 mt-6 fade-up" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-peach-dark" /> ปฏิทินสตreak (28 วันล่าสุด)
            </h2>
            <p className="text-sm text-muted-foreground">วันนี้ทำ {todaySolved}/3 เกม</p>
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
            {streakDays.map((d) => (
              <div
                key={d.date}
                title={d.date}
                className={
                  "aspect-square rounded-md border transition-colors " +
                  (d.active
                    ? "bg-mint-deep border-mint-dark/40"
                    : "bg-muted/60 border-border/60")
                }
                aria-label={`${d.label} ${d.active ? "เล่นแล้ว" : "ยังไม่ได้เล่น"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-muted/60 border border-border/60" /> ยังไม่ได้เล่น</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-md bg-mint-deep border border-mint-dark/40" /> เล่นแล้ว</span>
          </div>
        </div>

        {/* History table */}
        <div className="tile p-6 mt-6 fade-up" style={{ animationDelay: "180ms" }}>
          <h2 className="font-display font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-mint-dark" /> ประวัติการเล่นล่าสุด
          </h2>
          {history.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground mb-4">ยังไม่มีประวัติการเล่น</p>
              <Link href="/">
                <Button className="btn-press">เริ่มเล่นเกมแรกของคุณ <ArrowRight className="w-4 h-4 ml-1" /></Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b border-border">
                    <th className="py-2 pr-3">วันที่</th>
                    <th className="py-2 pr-3">รูปแบบ</th>
                    <th className="py-2 pr-3">ระดับ</th>
                    <th className="py-2 pr-3 text-right">คะแนน</th>
                    <th className="py-2 text-right">ผล</th>
                  </tr>
                </thead>
                <tbody>
                  {history.slice().reverse().slice(0, 20).map((h, i) => {
                    const type = PUZZLE_TYPES.find((p) => p.key === h.puzzleType);
                    const diff = DIFFICULTIES.find((d) => d.key === h.difficulty);
                    return (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="py-2.5 pr-3 whitespace-nowrap">{h.puzzleDate}</td>
                        <td className="py-2.5 pr-3">{type?.label ?? h.puzzleType}</td>
                        <td className="py-2.5 pr-3">{diff?.label ?? h.difficulty}</td>
                        <td className="py-2.5 pr-3 text-right font-mono font-semibold">{h.score}</td>
                        <td className="py-2.5 text-right">
                          {h.score > 0 ? (
                            <span className="inline-flex items-center gap-1 text-mint-dark font-medium">
                              <CheckCircle2 className="w-4 h-4" /> สำเร็จ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <XCircle className="w-4 h-4" /> ไม่สำเร็จ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
  accent: "mint" | "peach" | "ink";
}) {
  const accentCls = {
    mint: "text-mint-dark",
    peach: "text-peach-dark",
    ink: "text-ink",
  }[accent];
  return (
    <div className="tile tile-hover p-5">
      <Icon className={`w-6 h-6 mb-3 ${accentCls}`} />
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="text-xs font-semibold mt-1">{label}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
