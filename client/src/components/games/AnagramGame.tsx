import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PuzzleState } from "@/hooks/useGame";
import { Lightbulb, RotateCcw, CheckCircle2, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Anagram: user taps bank tiles to fill the answer slots in order.
 */
export default function AnagramGame({
  puzzle,
  hintsUsed,
  onHint,
  onReveal,
  onSubmit,
}: {
  puzzle: PuzzleState;
  hintsUsed: number;
  onHint: () => void;
  onReveal: () => void;
  onSubmit: (success: boolean) => void;
}) {
  const tiles = puzzle.anagramTiles ?? [];
  const answerLen = tiles.length;
  const [placed, setPlaced] = useState<number[]>([]); // bank indices placed in order
  const [shake, setShake] = useState(false);

  const answer = useMemo(() => {
    // placed tiles ordered by origIndex reconstruct the answer so far
    const placedTiles = placed.map((i) => tiles[i]);
    return placedTiles;
  }, [placed, tiles]);

  const placedOrigIndices = new Set(placed.map((i) => tiles[i].origIndex));
  const allPlaced = placed.length === answerLen;

  const handleTileClick = (bankIdx: number) => {
    if (placed.includes(bankIdx)) return; // already placed
    const tile = tiles[bankIdx];
    // the tile fills the next empty slot at answer position = placed.length
    const answerPos = placed.length;
    const correct = tile.origIndex === answerPos;
    setPlaced((p) => [...p, bankIdx]);
    if (!correct) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
  };

  const undoLast = () => {
    setPlaced((p) => p.slice(0, -1));
  };

  const reshuffle = () => {
    setPlaced([]);
    toast("เรียงตัวอักษรใหม่แล้ว");
  };

  const check = () => {
    if (placed.length !== answerLen) {
      toast.info("ยังวางตัวอักษรไม่ครบ");
      return;
    }
    const correct = answer.every((t, pos) => t.origIndex === pos);
    if (!correct) {
      toast.error("ยังไม่ตรง ลองใหม่นะ");
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }
    onSubmit(true);
  };

  // Build display: answer row = tiles sorted by origIndex showing placed/revealed; bank row = order in payload
  const answerRow = tiles.slice().sort((a, b) => a.origIndex - b.origIndex);

  return (
    <div className={cn("tile p-6 sm:p-8", shake && "wiggle")}>
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          เรียงตัวอักษรให้เป็นคำที่ตรงกับนิยามนี้:
        </p>
        <p className="mt-2 text-base sm:text-lg font-medium leading-relaxed px-2">
          {puzzle.definition}
        </p>
      </div>

      {/* Answer slots row */}
      <div className="flex flex-wrap justify-center gap-2 my-7">
        {answerRow.map((t) => {
          const isRevealed = t.revealed;
          const bankIdx = tiles.findIndex((x) => x.origIndex === t.origIndex);
          const isPlaced = placed.includes(bankIdx);
          return (
            <div
              key={t.origIndex}
              className={cn(
                "letter-tile",
                !isPlaced && !isRevealed && "[data-slot='true']",
                isPlaced && "[data-filled='true']"
              )}
              style={{ width: "3rem", height: "3.25rem" }}
              aria-label={`ตัวอักษรตำแหน่ง ${t.origIndex + 1}`}
            >
              {(isPlaced || isRevealed) && t.letter}
            </div>
          );
        })}
      </div>

      {/* Bank row */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {tiles.map((t, i) => (
          <button
            key={i}
            onClick={() => handleTileClick(i)}
            disabled={placed.includes(i)}
            className={cn("letter-tile", (t.revealedAtStart || hintsUsed > 0 && t.revealed) && "bg-mint/60")}
            aria-label={`ตัวอักษร ${t.letter}`}
          >
            {t.letter}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={undoLast} className="btn-press bg-card" disabled={placed.length === 0}>
          <RotateCcw className="w-4 h-4 mr-1" /> ยกเลิกตัวล่าสุด
        </Button>
        <Button variant="outline" size="sm" onClick={reshuffle} className="btn-press bg-card" disabled={placed.length === 0}>
          <Shuffle className="w-4 h-4 mr-1" /> เริ่มใหม่
        </Button>
        <Button
          size="sm"
          onClick={check}
          disabled={!allPlaced}
          className="btn-press bg-mint-deep text-primary-foreground hover:bg-mint-deep/90 disabled:opacity-40"
        >
          <CheckCircle2 className="w-4 h-4 mr-1" /> ตรวจสอบคำตอบ
        </Button>
      </div>
      {hintsUsed > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          <Lightbulb className="w-3 h-3 inline mr-1" />
          ตัวอักษรสีเขียวคือตัวใบ้ที่ถูกวางลงตำแหน่งถูกต้องแล้ว
        </p>
      )}
    </div>
  );
}
