import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PUZZLE_TYPES, DIFFICULTIES, DIFFICULTY_SETTINGS, type PuzzleType, type Difficulty } from "../../../shared/game";
import AppShell from "@/components/AppShell";
import {
  Puzzle,
  BookOpenText,
  Type,
  Flame,
  Trophy,
  Calendar,
  Sparkles,
  ArrowRight,
  ScrollText,
} from "lucide-react";

function todayLabel(): string {
  return new Date().toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function difficultyMeta(d: Difficulty) {
  const s = DIFFICULTY_SETTINGS[d];
  return `${s.letters[0]}–${s.letters[1]} ตัวอักษร · เวลา ${Math.round(s.timeMs / 1000 / 60)} นาที · ${s.choices} ตัวเลือก`;
}

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();
  const { data: summary } = trpc.progress.summary.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const utils = trpc.useUtils();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      /* guests see the landing hero; login happens on CTA */
    }
  }, [loading, isAuthenticated]);

  const heroMode: "guest" | "player" = isAuthenticated ? "player" : "guest";

  return (
    <AppShell>
      {/* Hero */}
      <section className="container pt-10 pb-8">
        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-center">
          <div className="fade-up">
            <p className="chip chip-mint mb-4">
              <Calendar className="w-3.5 h-3.5" />
              ปริศนาคำศัพท์รายวัน · {todayLabel()}
            </p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold leading-tight">
              ฝึกคำศัพท์ขององค์กร
              <br />
              ในแบบที่<span className="text-mint-dark">สนุก</span>และ
              <span className="text-peach-dark">ท้าทาย</span>
            </h1>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl">
              LexiLoops ช่วยให้ทีมของคุณจดจำคำศัพท์เฉพาะทางและคำศัพท์ผลิตภัณฑ์
              ผ่านปริศนาคำรายวัน 3 รูปแบบ แข่งสะสมคะแนนบนกระดานทีม
              และรักษาสตreak การเล่นให้อย่างต่อเนื่อง
            </p>
            {!isAuthenticated && !loading && (
              <Button
                size="lg"
                onClick={() => startLogin()}
                className="btn-press mt-6 bg-mint-deep text-primary-foreground hover:bg-mint-deep/90 h-12 px-8 text-base"
              >
                เข้าสู่ระบบเพื่อเริ่มเล่น <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            )}
            {isAuthenticated && (
              <p className="mt-6 text-sm text-muted-foreground">
                สวัสดี, <span className="font-semibold text-foreground">{user?.name ?? "เพื่อนร่วมทีม"}</span>!
                เลือกรูปแบบเกมด้านล่างเพื่อเริ่มปริศนาของวันนี้
              </p>
            )}
          </div>
          {/* Streak / stats tiles for players */}
          <div className="grid grid-cols-2 gap-4 fade-up" style={{ animationDelay: "80ms" }}>
            <div className="tile tile-hover p-5 text-center">
              <Flame className="w-7 h-7 mx-auto mb-2 text-peach-dark" />
              <p className="font-display text-3xl font-bold">{summary?.currentStreak ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">สตreak ต่อเนื่อง (วัน)</p>
            </div>
            <div className="tile tile-hover p-5 text-center">
              <Trophy className="w-7 h-7 mx-auto mb-2 text-mint-dark" />
              <p className="font-display text-3xl font-bold">{summary?.totalScore ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">คะแนนสะสม</p>
            </div>
            <div className="tile tile-hover p-5 text-center col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-display text-lg font-bold">{summary?.todaySolved ?? 0}/3</p>
                  <p className="text-xs text-muted-foreground">เกมที่ทำสำเร็จวันนี้</p>
                </div>
                <Sparkles className="w-6 h-6 text-peach-deep" />
              </div>
              <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-mint-deep to-mint transition-all duration-500"
                  style={{ width: `${Math.min(100, ((summary?.todaySolved ?? 0) / 3) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Game mode tiles */}
      <section className="container pb-14">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-2xl font-bold">เลือกรูปแบบปริศนาของวันนี้</h2>
            <p className="text-sm text-muted-foreground mt-1">
              แต่ละรูปแบบให้คะแนนสูงสุด 100 × ตัวคูณระดับความยาก
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {PUZZLE_TYPES.map((pt, i) => (
            <GameModeCard
              key={pt.key}
              type={pt.key}
              label={pt.label}
              labelEn={pt.labelEn}
              delay={i * 70}
              onPlay={() => {
                if (!isAuthenticated) {
                  startLogin();
                  return;
                }
                navigate(`/play/${pt.key}`);
              }}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="container pb-16">
        <h2 className="text-2xl font-bold mb-6">กติกาอย่างย่อ</h2>
        <div className="grid sm:grid-cols-3 gap-5">
          <RuleTile
            title="ระดับความยาก"
            body="ระดับต้นเริ่มใช้คำสั้นและให้เวลาเต็ม ระดับสูงใช้คำยาว ข้อมีและเวลาที่สั้นลง แต่คะแนนสูงกว่า 2 เท่า"
            className="border-l-4 border-l-mint-deep"
          />
          <RuleTile
            title="ใบ้และเฉลย"
            body="แต่ละเกมมี 3 ระดับใบ้ หักคะแนนระดับละ 15 คะแนน การเปิดเฉลยจะตัดคะแนนคงเหลือครึ่งหนึ่ง"
            className="border-l-4 border-l-peach-deep"
          />
          <RuleTile
            title="สตreak และทีม"
            body="เล่นอย่างน้อย 1 เกมต่อวันเพื่อรักษาต่อเนื่อง คะแนนสะสมรายสัปดาห์และรายเดือนจะถูกนับบนกระดานคะแนนทีม"
            className="border-l-4 border-l-ink"
          />
        </div>
      </section>
    </AppShell>
  );
}

function GameModeCard({
  type,
  label,
  labelEn,
  delay,
  onPlay,
}: {
  type: PuzzleType;
  label: string;
  labelEn: string;
  delay: number;
  onPlay: () => void;
}) {
  const icons = {
    anagram: Puzzle,
    definition: BookOpenText,
    fillblank: Type,
  } as const;
  const Icon = icons[type];
  const accents = {
    anagram: "from-mint to-mint-deep/60",
    definition: "from-peach to-peach-deep/60",
    fillblank: "from-ink-soft to-ink",
  } as const;
  const descriptions = {
    anagram: "นำตัวอักษรที่ถูกสลับตำแหน่งมาเรียงคืนเป็นคำศัพท์ที่ถูกต้อง",
    definition: "เลือกนิยามที่ตรงกับคำศัพท์จากตัวเลือกหลายข้อ",
    fillblank: "เติมตัวอักษรที่หายไปให้กลับเป็นคำศัพท์สมบูรณ์",
  } as const;

  return (
    <Card className="tile tile-hover flex flex-col fade-up border-0" style={{ animationDelay: `${delay}ms` }}>
      <CardHeader>
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accents[type]} flex items-center justify-center mb-3 shadow-md`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <CardTitle className="text-xl">{label}</CardTitle>
        <CardDescription className="text-xs font-semibold uppercase tracking-wide">
          {labelEn}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed">{descriptions[type]}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={onPlay} className="btn-press w-full" variant="outline">
          <Puzzle className="w-4 h-4 mr-1" /> เลือกความยากเพื่อเริ่มเล่น
        </Button>
      </CardFooter>
    </Card>
  );
}

function RuleTile({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={`tile p-5 ${className ?? ""}`}>
      <h3 className="font-display font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
