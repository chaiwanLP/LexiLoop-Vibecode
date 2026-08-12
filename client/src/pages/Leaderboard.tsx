import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Crown, Medal, Flame, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Range = "week" | "month";

export default function Leaderboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [range, setRange] = useState<Range>("week");
  const { data: rows, isLoading } = trpc.leaderboard.list.useQuery({ range });

  if (loading) return <AppShell><Skeleton className="h-96 m-8" /></AppShell>;
  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="container py-24 text-center fade-up">
          <h1 className="text-2xl font-bold mb-3">เข้าสู่ระบบเพื่อดูกระดานคะแนนของทีม</h1>
          <Button size="lg" onClick={() => startLogin()} className="btn-press">
            เข้าสู่ระบบ
          </Button>
        </div>
      </AppShell>
    );
  }

  const leaderboard = rows ?? [];
  const myRank = leaderboard.findIndex((r) => r.userId === user?.id) + 1;

  return (
    <AppShell>
      <div className="container py-10 max-w-3xl">
        <div className="fade-up flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Trophy className="w-7 h-7 text-peach-deep" /> กระดานคะแนนทีม
            </h1>
            <p className="text-muted-foreground mt-1">
              คะแนนสะสมจากเกมทั้งหมดที่เล่นในช่วงเวลาที่เลือก
            </p>
          </div>
          <div className="tile p-1 flex gap-1">
            {([
              { key: "week", label: "รายสัปดาห์" },
              { key: "month", label: "รายเดือน" },
            ] as { key: Range; label: string }[]).map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={cn(
                  "btn-press rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors duration-150",
                  range === r.key ? "bg-mint text-accent-foreground" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* My rank strip */}
        {myRank > 0 && (
          <div className="tile tile-hover bg-mint/30 border-mint-deep/30 p-4 mt-6 flex items-center justify-between fade-up" style={{ animationDelay: "60ms" }}>
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-mint-deep text-primary-foreground flex items-center justify-center font-bold text-sm">
                {myRank}
              </span>
              <div>
                <p className="font-semibold text-sm">อันดับของคุณ</p>
                <p className="text-xs text-muted-foreground">จาก {leaderboard.length} คน</p>
              </div>
            </div>
            <Flame className="w-5 h-5 text-peach-dark" />
          </div>
        )}

        {/* Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-3 mt-6 items-end fade-up" style={{ animationDelay: "120ms" }}>
            {[leaderboard[1], leaderboard[0], leaderboard[2]].map((r, i) => {
              const heights = ["h-24", "h-32", "h-20"];
              const icons = [Medal, Crown, Medal];
              const Icon = icons[i];
              const colors = ["bg-peach-deep", "bg-mint-deep", "bg-ink-soft"];
              const order = [2, 1, 3];
              const isMe = r.userId === user?.id;
              return (
                <div key={i} className="text-center">
                  <div className="tile p-3 mb-2">
                    <div className={cn("w-10 h-10 rounded-full mx-auto flex items-center justify-center text-white font-bold", colors[i])}>
                      {(r.userName ?? "?")[0]?.toUpperCase()}
                    </div>
                    <p className={cn("text-sm font-semibold mt-1 truncate", isMe && "text-mint-dark")}>
                      {r.userName ?? "ผู้ใช้"}
                      {isMe && <span className="chip chip-mint ml-1 text-[9px]">คุณ</span>}
                    </p>
                    <p className="font-mono font-bold text-lg">{r.totalScore}</p>
                    <p className="text-[10px] text-muted-foreground">{r.gamesPlayed} เกม</p>
                  </div>
                  <div className={cn("rounded-t-lg text-white text-lg font-bold flex items-end justify-center pb-2", heights[i], colors[i])}>
                    <Icon className="w-4 h-4 mr-1 opacity-80" />
                    {order[i]}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Full list */}
        <div className="tile p-4 mt-6 fade-up" style={{ animationDelay: "180ms" }}>
          {isLoading ? (
            <Skeleton className="h-64" />
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="font-semibold mb-1">ยังไม่มีใครมีคะแนนในช่วงเวลานี้</p>
              <p className="text-sm text-muted-foreground">
                เรียงคำ จับคู่นิยาม หรือเติมคำวันนี้ แล้วมาไต่อันดับบนกระดาน!
              </p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((r, i) => {
                const isMe = r.userId === user?.id;
                return (
                  <div
                    key={r.userId}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      isMe ? "bg-mint/40" : "hover:bg-muted/60"
                    )}
                  >
                    <span
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                        i < 3 ? "bg-ink text-white" : "bg-muted text-muted-foreground"
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center font-bold text-sm shrink-0">
                      {(r.userName ?? "?")[0]?.toUpperCase()}
                    </div>
                    <p className={cn("flex-1 text-sm font-medium truncate", isMe && "font-bold text-mint-dark")}>
                      {r.userName ?? "ผู้ใช้"}
                      {isMe && <span className="chip chip-mint ml-2 text-[9px]">คุณ</span>}
                    </p>
                    <div className="text-right shrink-0">
                      <p className="font-mono font-bold text-sm">{r.totalScore}</p>
                      <p className="text-[10px] text-muted-foreground">{r.gamesPlayed} เกม</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
