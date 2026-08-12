export type PuzzleType = "anagram" | "definition" | "fillblank";
export type Difficulty = "easy" | "medium" | "hard";

export const PUZZLE_TYPES: { key: PuzzleType; label: string; labelEn: string }[] = [
  { key: "anagram", label: "เรียงคำ", labelEn: "Anagram" },
  { key: "definition", label: "จับคู่นิยาม", labelEn: "Definition Match" },
  { key: "fillblank", label: "เติมคำในช่องว่าง", labelEn: "Fill-in-the-Blank" },
];

export const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: "easy", label: "เริ่มต้น" },
  { key: "medium", label: "ระดับกลาง" },
  { key: "hard", label: "ระดับสูง" },
];

/** Difficulty tuning: letter count, time limit (ms), choice count */
export const DIFFICULTY_SETTINGS: Record<
  Difficulty,
  { letters: [number, number]; timeMs: number; choices: number }
> = {
  easy: { letters: [3, 6], timeMs: 90_000, choices: 3 },
  medium: { letters: [6, 10], timeMs: 60_000, choices: 4 },
  hard: { letters: [10, 16], timeMs: 40_000, choices: 5 },
};

/** Scoring system */
export const SCORING = {
  baseScore: 100,
  difficultyMultiplier: { easy: 1.0, medium: 1.5, hard: 2.0 } as Record<Difficulty, number>,
  hintCost: 15,
  hintCostMax: 45, // max deduction from hints
  revealPenalty: 0.5, // lose 50% of remaining score on reveal
  timeBonusThresholdPct: 0.5, // finish within 50% of time -> small bonus
  timeBonus: 20,
  maxHints: 3,
};

/** Generate a pseudo-random deterministic number from a seed string (LCG) */
export function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  let state = h >>> 0 || 1;
  return function next(): number {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Compute user-local date string YYYY-MM-DD */
export function todayString(timeZone?: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return parts;
}

export function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Anagram payload generation: shuffled letters with some tiles pre-placed */
export function buildAnagramPayload(word: string, difficulty: Difficulty, rand: () => number): string {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const letters = word.toUpperCase().split("");
  // number of pre-revealed hint tiles
  const revealCount = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 0;
  const revealed = new Set<number>();
  const indices = shuffle(
    Array.from({ length: letters.length }, (_, i) => i),
    rand
  );
  for (let k = 0; k < Math.min(revealCount, letters.length); k++) {
    revealed.add(indices[k]);
  }
  const shuffled = shuffle(
    letters.map((l, i) => ({ letter: l, index: i })),
    rand
  );
  return JSON.stringify({
    order: shuffled.map((s) => ({ letter: s.letter, origIndex: s.index })),
    revealed,
    revealCount,
  });
}

/** Fill-in-the-blank: split word into blanks; payload = array of {letter, revealed} */
export function buildFillBlankPayload(
  word: string,
  difficulty: Difficulty,
  rand: () => number
): string {
  const letters = word.toUpperCase().split("");
  // hard: show fewer letters
  const keepPct = difficulty === "easy" ? 0.5 : difficulty === "medium" ? 0.33 : 0.15;
  const keep = Math.max(1, Math.round(letters.length * keepPct));
  const idxs = shuffle(
    Array.from({ length: letters.length }, (_, i) => i),
    rand
  ).slice(0, keep);
  const revealed = new Set(idxs);
  return JSON.stringify(
    letters.map((l, i) => ({ letter: l, revealed: revealed.has(i) }))
  );
}

/** Compute final score for an attempt */
export function computeScore(params: {
  difficulty: Difficulty;
  hintsUsed: number;
  revealed: boolean;
  timeMs: number;
  timeLimitMs: number;
  success: boolean;
}): { score: number; maxPossibleScore: number } {
  const { difficulty, hintsUsed, revealed, timeMs, timeLimitMs, success } = params;
  const multiplier = SCORING.difficultyMultiplier[difficulty];
  const maxPossibleScore = Math.round(SCORING.baseScore * multiplier);
  if (!success) return { score: 0, maxPossibleScore };
  let score = maxPossibleScore;
  score -= Math.min(SCORING.hintCost * Math.max(0, hintsUsed), SCORING.hintCostMax);
  if (revealed) score = Math.round(score * (1 - SCORING.revealPenalty));
  if (timeLimitMs > 0 && timeMs <= timeLimitMs * SCORING.timeBonusThresholdPct) {
    score += SCORING.timeBonus;
  }
  return { score: Math.max(0, score), maxPossibleScore };
}
