import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DIFFICULTIES, PUZZLE_TYPES } from "../../../shared/game";
import { Search, BookOpen, Tag, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Vocabulary() {
  const { data: words, isLoading } = trpc.vocabulary.list.useQuery();
  const [query, setQuery] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const categories = useMemo(() => {
    const set = new Set((words ?? []).map((w) => w.category ?? "ทั่วไป"));
    return ["ทั่วไป", ...Array.from(set).filter((c) => c !== "ทั่วไป")];
  }, [words]);

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    return (words ?? []).filter((w) => {
      if (q && !w.word.toUpperCase().includes(q) && !w.definition.includes(query.trim()))
        return false;
      if (filterDifficulty !== "all" && w.difficulty !== filterDifficulty) return false;
      if (filterCategory !== "all" && (w.category ?? "ทั่วไป") !== filterCategory) return false;
      return true;
    });
  }, [words, query, filterDifficulty, filterCategory]);

  const difficultyMeta = (d: string) => DIFFICULTIES.find((x) => x.key === d)?.label ?? d;

  return (
    <AppShell>
      <div className="container py-10">
        <div className="fade-up">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-mint-dark" /> คลังคำศัพท์ขององค์กร
          </h1>
          <p className="text-muted-foreground mt-1">
            คลังคำศัพท์เฉพาะทางและคำศัพท์ผลิตภัณฑ์ภายในบริษัท · มี {(words ?? []).filter((w) => w.active === "yes").length} คำ
          </p>
        </div>

        {/* Filters */}
        <div className="tile p-4 mt-6 flex flex-col sm:flex-row gap-3 fade-up" style={{ animationDelay: "60ms" }}>
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหาคำศัพท์หรือคำนิยาม..."
              className="pl-9 bg-card"
            />
          </div>
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            aria-label="กรองระดับความยาก"
          >
            <option value="all">ทุกระดับความยาก</option>
            {DIFFICULTIES.map((d) => (
              <option key={d.key} value={d.key}>{d.label}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm"
            aria-label="กรองหมวดหมู่"
          >
            <option value="all">ทุกหมวดหมู่</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Word list */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="tile p-10 text-center mt-6">
            <p className="text-muted-foreground">ไม่พบคำศัพท์ที่ตรงกับการค้นหา</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {filtered.map((w, i) => (
              <div
                key={w.id}
                className="tile tile-hover p-5 fade-up"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-display text-xl font-bold tracking-wide">{w.word}</h2>
                  <div className="flex gap-1.5 shrink-0">
                    <span className="chip chip-ink">{difficultyMeta(w.difficulty)}</span>
                    {w.category && (
                      <span className="chip">
                        <Tag className="w-3 h-3" /> {w.category}
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{w.definition}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
