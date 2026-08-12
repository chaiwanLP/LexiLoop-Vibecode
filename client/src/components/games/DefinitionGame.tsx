import { useState } from "react";
import type { PuzzleState } from "@/hooks/useGame";
import { cn } from "@/lib/utils";
import { Lightbulb } from "lucide-react";

/**
 * Definition match: show the word, pick the correct definition.
 */
export default function DefinitionGame({
  puzzle,
  word,
  onAnswer,
  onHint,
  hintsUsed,
}: {
  puzzle: PuzzleState;
  word: string;
  onAnswer: (correct: boolean) => void;
  onHint: () => void;
  onReveal: () => void;
  hintsUsed: number;
}) {
  const choices = puzzle.choices ?? [];
  const [picked, setPicked] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  const handlePick = (idx: number) => {
    if (feedback) return;
    setPicked(idx);
    const correct = choices[idx] === puzzle.definition;
    setFeedback(correct ? "correct" : "wrong");
    setTimeout(() => {
      onAnswer(correct);
    }, 1100);
  };

  return (
    <div className="tile p-6 sm:p-8">
      <div className="text-center mb-7">
        <p className="text-sm text-muted-foreground mb-3">คำศัพท์ของวันนี้คือ</p>
        <p className="font-display text-4xl sm:text-5xl font-extrabold tracking-wide">{word}</p>
        {hintsUsed > 0 && (
          <p className="mt-3 chip chip-mint inline-flex">
            <Lightbulb className="w-3 h-3" /> คำตอบขึ้นต้นด้วย "{word.slice(0, 2)}..."
          </p>
        )}
      </div>

      <p className="text-sm text-muted-foreground mb-3">
        นิยามข้อใดตรงกับคำนี้?
      </p>
      <div className="space-y-3">
        {choices.map((choice, i) => {
          const isPicked = picked === i;
          const isCorrectChoice = choice === puzzle.definition;
          let cls = "tile tile-hover p-4 sm:p-5 text-left text-sm sm:text-base leading-relaxed cursor-pointer";
          if (feedback) {
            if (isCorrectChoice) cls += " !border-mint-dark/60 !bg-mint";
            else if (isPicked) cls += " !border-peach-dark/60 !bg-peach wiggle";
            else cls += " opacity-50";
          }
          return (
            <button
              key={i}
              onClick={() => handlePick(i)}
              disabled={feedback !== null}
              className={cls}
              style={feedback && !isPicked && !isCorrectChoice ? { pointerEvents: "none" } : undefined}
            >
              <span
                className={cn(
                  "inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3 shrink-0",
                  feedback && isCorrectChoice
                    ? "bg-mint-dark text-white"
                    : feedback && isPicked && !isCorrectChoice
                      ? "bg-peach-dark text-white"
                      : "bg-muted text-muted-foreground"
                )}
              >
                {String.fromCharCode(65 + i)}
              </span>
              {choice}
            </button>
          );
        })}
      </div>

      {feedback === "correct" && (
        <p className="text-center mt-5 text-mint-dark font-semibold pop-in">✓ ถูกต้อง!</p>
      )}
      {feedback === "wrong" && (
        <p className="text-center mt-5 text-peach-dark font-semibold pop-in">✗ ยังไม่ตรง ลองใหม่นะในครั้งหน้า</p>
      )}
    </div>
  );
}
