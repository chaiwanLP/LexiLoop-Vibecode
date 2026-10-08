import { useState } from "react";
import { Link, useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { PUZZLE_TYPES, DIFFICULTIES, DIFFICULTY_SETTINGS, type PuzzleType } from "../../../shared/game";
import AppShell from "@/components/AppShell";
import AnagramGame from "@/components/games/AnagramGame";
import DefinitionGame from "@/components/games/DefinitionGame";
import FillBlankGame from "@/components/games/FillBlankGame";
import { useGame } from "@/hooks/useGame";
import { Clock, ArrowLeft, HelpCircle, Eye, Flag, RefreshCw, Lightbulb } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function formatTime(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function PlayGame() {
  const params = useParams<{ type: string }>();
  const { user, isAuthenticated, loading } = useAuth();
  const typeKey = (PUZZLE_TYPES.map((p) => p.key) as string[]).includes(params.type ?? "")
    ? (params.type as PuzzleType)
    : null;
  const meta = PUZZLE_TYPES.find((p) => p.key === typeKey);

  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const game = useGame(typeKey ?? "anagram", difficulty);

  if (loading) return <AppShell><Skeleton className="h-96 m-8" /></AppShell>;
  if (!isAuthenticated) {
    return (
      <AppShell>
        <div className="container py-24 text-center fade-up">
          <h1 className="text-2xl font-bold mb-3">เข้าสู่ระบบเพื่อเริ่มเล่นเกม</h1>
          <p className="text-muted-foreground mb-6">
            เข้าสู่ระบบด้วยบัญชีองค์กรเพื่อบันทึกคะแนนและสตรีค
          </p>
          <Button size="lg" asChild className="btn-press">
            <Link href="/login">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </AppShell>
    );
  }
  if (!meta) {
    return (
      <AppShell>
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-bold mb-3">ไม่พบรูปแบบเกมนี้</h1>
          <Link href="/">
            <Button variant="outline" className="btn-press">กลับไปหน้าหลัก</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const settings = DIFFICULTY_SETTINGS[difficulty];

  return (
    <AppShell>
      <div className="container py-8 max-w-3xl">
        {/* Header */}
        <div className="fade-up flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/" className="tile-pressed w-9 h-9 rounded-lg flex items-center justify-center border border-border bg-card">
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold">{meta.label}</h1>
              <p className="text-xs text-muted-foreground">{meta.labelEn}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "tile flex items-center gap-2 px-4 py-2 font-mono text-lg font-bold",
                game.timeLeftMs < 10_000 && !game.finished ? "bg-peach border-peach-deep/40 text-peach-dark" : ""
              )}
            >
              <Clock className="w-4 h-4" />
              {game.finished ? "จบเกม" : formatTime(game.timeLeftMs)}
            </div>
          </div>
        </div>

        {/* Difficulty selector */}
        <div className="fade-up tile p-2 mb-6 flex gap-1" style={{ animationDelay: "60ms" }}>
          {DIFFICULTIES.map((d, i) => {
            const s = DIFFICULTY_SETTINGS[d.key];
            return (
              <button
                key={d.key}
                onClick={() => setDifficulty(d.key)}
                className={cn(
                  "btn-press flex-1 rounded-lg py-2 px-2 text-sm font-semibold transition-colors duration-150",
                  difficulty === d.key
                    ? i === 0
                      ? "bg-mint text-accent-foreground shadow-sm"
                      : i === 1
                        ? "bg-peach text-secondary-foreground shadow-sm"
                        : "bg-ink text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className="block">{d.label}</span>
                <span className="block text-[10px] font-normal opacity-75 mt-0.5">
                  {s.letters[0]}–{s.letters[1]} ตัว · {Math.round(s.timeMs / 1000 / 60)} นาที
                </span>
              </button>
            );
          })}
        </div>

        {/* Game area */}
        {game.loading ? (
          <div className="tile p-10 flex flex-col items-center gap-4">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">กำลังสร้างปริศนาของวันนี้...</p>
          </div>
        ) : game.error || !game.puzzle ? (
          <div className="tile p-10 text-center">
            <p className="text-muted-foreground mb-4">
              {game.error
                ? "โหลดปริศนาไม่ได้: คลังคำยังไม่มีคำที่ตรงกับระดับความยากนี้"
                : "ไม่พบปริศนา"}
            </p>
            <Link href="/admin" className="text-sm text-primary underline">
              ไปหน้าจัดการคลังคำ (Admin)
            </Link>
          </div>
        ) : game.finished ? (
          <FinishedView
            type={meta.key}
            word={game.puzzle.word}
            definition={game.puzzle.definition}
            score={game.lastScore?.score ?? 0}
            maxScore={game.lastScore?.maxPossibleScore ?? 0}
            streak={game.lastScore?.streak ?? 0}
            hintsUsed={game.hintsUsed}
            revealed={game.revealed}
          />
        ) : (
          <div className="fade-up" style={{ animationDelay: "120ms" }}>
            {meta.key === "anagram" && (
              <AnagramGame
                puzzle={game.puzzle}
                hintsUsed={game.hintsUsed}
                onHint={game.hint}
                onReveal={game.revealAnswer}
                onSubmit={game.submitSuccess}
              />
            )}
            {meta.key === "definition" && (
              <DefinitionGame
                puzzle={game.puzzle}
                word={game.puzzle.word}
                onAnswer={(correct) => game.submitSuccess(correct)}
                onHint={game.hint}
                onReveal={game.revealAnswer}
                hintsUsed={game.hintsUsed}
              />
            )}
            {meta.key === "fillblank" && (
              <FillBlankGame
                puzzle={game.puzzle}
                hintsUsed={game.hintsUsed}
                onHint={game.hint}
                onReveal={game.revealAnswer}
                onSubmit={game.submitSuccess}
              />
            )}
            {/* Action bar */}
            <div className="mt-6 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => game.hint()}
                  disabled={game.hintsUsed >= 3}
                  className="btn-press bg-card"
                >
                  <HelpCircle className="w-4 h-4 mr-1" />
                  ใบ้คำ ({game.hintsUsed}/3)
                </Button>
                <Button
                  variant="outline"
                  onClick={() => game.revealAnswer()}
                  className="btn-press bg-peach/40 border-peach-deep/40 text-secondary-foreground hover:bg-peach/60"
                >
                  <Eye className="w-4 h-4 mr-1" />
                  เฉลย
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => game.submit(false, game.hintsUsed)}
                className="btn-press text-muted-foreground"
              >
                <Flag className="w-4 h-4 mr-1" />
                ข้ามเกมนี้
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
              <Lightbulb className="w-3 h-3 inline mr-1" />
              ใบ้คำแต่ละครั้งหัก 15 คะแนน (หักสูงสุด 45) · เฉลยคำตอบจะหักคะแนนคงเหลือครึ่งหนึ่ง ·
              สำเร็จภายในครึ่งเวลาเดิมได้โบนัส +20 คะแนน
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function FinishedView({
  type,
  word,
  definition,
  score,
  maxScore,
  streak,
  hintsUsed,
  revealed,
}: {
  type: PuzzleType;
  word: string;
  definition: string;
  score: number;
  maxScore: number;
  streak: number;
  hintsUsed: number;
  revealed: boolean;
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  return (
    <div className="tile p-8 text-center fade-up confetti-drop">
      <p className="text-6xl mb-3">{score > 0 ? "🎉" : "💪"}</p>
      <h2 className="font-display text-2xl font-bold mb-1">
        {score > 0 ? "ยินดีด้วย! ตอบถูก" : "เกมเสร็จสิ้น"}
      </h2>
      <p className="text-muted-foreground text-sm mb-6">
        {revealed && " (ใช้เฉลยคำตอบ)"}
        {hintsUsed > 0 && !revealed && ` (ใช้ใบ้คำ ${hintsUsed} ครั้ง)`}
      </p>
      <div className="tile bg-muted/60 inline-block px-8 py-5 mb-6">
        <p className="font-display text-4xl font-bold tracking-widest">{word}</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">{definition}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-8">
        <div className="tile p-3">
          <p className="font-display text-2xl font-bold text-mint-dark">{score}</p>
          <p className="text-[11px] text-muted-foreground">คะแนน</p>
        </div>
        <div className="tile p-3">
          <p className="font-display text-2xl font-bold">{pct}%</p>
          <p className="text-[11px] text-muted-foreground">ของสูงสุด</p>
        </div>
        <div className="tile p-3">
          <p className="font-display text-2xl font-bold text-peach-dark">{streak}</p>
          <p className="text-[11px] text-muted-foreground">สตreak</p>
        </div>
      </div>
      <div className="flex justify-center gap-3">
        <Link href="/">
          <Button className="btn-press">เลือกเกมอื่น</Button>
        </Link>
        <Link href="/progress">
          <Button variant="outline" className="btn-press bg-card">ดูความคืบหน้า</Button>
        </Link>
      </div>
    </div>
  );
}
