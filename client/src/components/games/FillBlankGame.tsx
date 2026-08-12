import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PuzzleState } from "@/hooks/useGame";
import { Lightbulb, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Fill-in-the-blank: the word is shown with some letters hidden;
 * user fills the missing letters using a letter bank.
 * Payload shape: { letter: string; revealed: boolean }[]  (positional array).
 */
export default function FillBlankGame({
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
  const slots = puzzle.fillSlots ?? []; // one entry per letter position
  const missing = useMemo(
    () => slots.map((s, i) => ({ pos: i, letter: s.letter, revealed: s.revealed })).filter((s) => !s.revealed),
    [slots]
  );
  const totalMissing = missing.length;

  // Bank: one tile per missing letter, shuffled for a small challenge
  const bank = useMemo(() => {
    return missing.map((s, i) => ({ letter: s.letter, idx: i, pos: s.pos }));
  }, [missing]);

  const [placed, setPlaced] = useState<Record<number, number>>({}); // pos -> bankIdx
  const [shake, setShake] = useState(false);

  const placedCount = Object.keys(placed).length;
  const allPlaced = placedCount === totalMissing;

  const handleSlotClick = (pos: number) => {
    if (placed[pos] !== undefined) {
      setPlaced((p) => {
        const copy = { ...p };
        delete copy[pos];
        return copy;
      });
      return;
    }
    toast.info("แตะตัวอักษรจากธนาคารด้านล่าง");
  };

  const handleBankClick = (bankIdx: number) => {
    if (Object.values(placed).includes(bankIdx)) return;
    // fill the first empty missing slot (left-to-right)
    const target = missing.find((m) => placed[m.pos] === undefined);
    if (!target) return;
    const letter = bank[bankIdx].letter;
    const isCorrect = letter === target.letter;
    setPlaced((p) => ({ ...p, [target.pos]: bankIdx }));
    if (!isCorrect) {
      setShake(true);
      setTimeout(() => setShake(false), 420);
    }
  };

  const clearAll = () => setPlaced({});

  const check = () => {
    if (!allPlaced) {
      toast.info("ยังเติมตัวอักษรไม่ครบ");
      return;
    }
    const correct = Object.entries(placed).every(([pos, bankIdx]) => {
      const m = missing.find((x) => x.pos === Number(pos));
      return m && bank[bankIdx].letter === m.letter;
    });
    if (!correct) {
      toast.error("ยังไม่ตรง ลองใหม่นะ");
      setShake(true);
      setTimeout(() => setShake(false), 420);
      return;
    }
    onSubmit(true);
  };

  return (
    <div className={cn("tile p-6 sm:p-8", shake && "wiggle")}>
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">เติมตัวอักษรที่หายไปให้กลับมาเป็นคำนี้:</p>
        <p className="mt-2 text-base sm:text-lg font-medium leading-relaxed px-2">{puzzle.definition}</p>
      </div>

      {/* Word display */}
      <div className="flex flex-wrap justify-center gap-2 my-7">
        {slots.map((s, i) => (
          <div
            key={i}
            className={cn(
              "letter-tile",
              s.revealed ? "[data-filled='true'] [data-correct='true']" : "[data-slot='true']"
            )}
            style={{ width: "3rem", height: "3.25rem" }}
            aria-label={`ตัวอักษรตำแหน่ง ${i + 1}`}
          >
            {s.revealed ? s.letter : ""}
          </div>
        ))}
      </div>

      {/* Missing-slot board */}
      <div className="flex flex-wrap justify-center gap-2 mb-2">
        {missing.map((m) => {
          const bankIdx = placed[m.pos];
          const filled = bankIdx !== undefined;
          const bankLetter = filled ? bank[bankIdx].letter : "";
          const isCorrect = filled && bankLetter === m.letter;
          return (
            <button
              key={m.pos}
              onClick={() => handleSlotClick(m.pos)}
              className={cn(
                "letter-tile",
                "[data-slot='true']",
                filled && "[data-filled='true']",
                filled && isCorrect && "[data-correct='true']",
                filled && !isCorrect && "[data-wrong='true']"
              )}
              style={{ width: "3rem", height: "3.25rem" }}
              aria-label={`ช่องว่างตำแหน่ง ${m.pos + 1}`}
            >
              {filled ? bankLetter : ""}
            </button>
          );
        })}
      </div>

      {/* Bank */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {bank.map((b, i) => {
          const used = Object.values(placed).includes(i);
          return (
            <button
              key={i}
              onClick={() => handleBankClick(i)}
              disabled={used}
              className="letter-tile"
              style={{ width: "3rem", height: "3.25rem" }}
              aria-label={`ตัวอักษรธนาคาร ${b.letter}`}
            >
              {b.letter}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          className="btn-press bg-card"
          disabled={placedCount === 0}
        >
          <RotateCcw className="w-4 h-4 mr-1" /> ล้างทั้งหมด
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
      <p className="text-center text-[11px] text-muted-foreground mt-4">
        {totalMissing > 0 && (
          <>
            <Lightbulb className="w-3 h-3 inline mr-1" />
            กดตัวอักษรธนาคารเพื่อเติมช่องว่างตามลำดับจากซ้ายไปขวา · กดช่องที่เติมแล้วเพื่อยกเลิก
          </>
        )}
      </p>
    </div>
  );
}
