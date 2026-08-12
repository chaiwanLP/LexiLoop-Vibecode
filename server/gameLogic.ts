import { seededRandom, buildAnagramPayload, buildFillBlankPayload, DIFFICULTY_SETTINGS, SCORING, type Difficulty, type PuzzleType } from "../shared/game";
import type { Vocabulary } from "../drizzle/schema";

export interface GeneratedPuzzle {
  vocabId: number;
  word: string;
  definition: string;
  blanks: string;
  payload: string;
  timeLimitMs: number;
  choices?: string[];
}

/** Pick a vocabulary word deterministically for (date, puzzleType, difficulty, vocabCount). */
function pickVocab(words: Vocabulary[], date: string, puzzleType: PuzzleType, difficulty: Difficulty): Vocabulary | undefined {
  const pool = words.filter((w) => {
    const letters = w.word.replace(/[^a-zA-Z]/g, "").length;
    const [min, max] = DIFFICULTY_SETTINGS[difficulty].letters;
    return w.active === "yes" && letters >= min && letters <= max;
  });
  if (pool.length === 0) return undefined;
  const rand = seededRandom(`${date}:${puzzleType}:${difficulty}:${pool.length}`);
  const idx = Math.floor(rand() * pool.length);
  return pool[idx];
}

/** Generate definition-match choices (wrong answers are other words' definitions, shuffled). */
function buildChoices(target: Vocabulary, words: Vocabulary[], count: number, seed: string): string[] {
  const others = words.filter((w) => w.active === "yes" && w.id !== target.id);
  const rand = seededRandom(seed + ":choices");
  const shuffled = [...others].sort(() => rand() - 0.5);
  const wrong = shuffled.slice(0, count - 1).map((w) => w.definition);
  const all = [target.definition, ...wrong];
  return all.sort(() => rand() - 0.5);
}

/** Generate a daily puzzle deterministically. */
export function generatePuzzle(
  words: Vocabulary[],
  date: string,
  puzzleType: PuzzleType,
  difficulty: Difficulty
): GeneratedPuzzle | null {
  const target = pickVocab(words, date, puzzleType, difficulty);
  if (!target) return null;
  const seed = `${date}:${puzzleType}:${difficulty}:${target.id}`;
  const rand = seededRandom(seed);
  const timeLimitMs = DIFFICULTY_SETTINGS[difficulty].timeMs;
  const blanksJson = target.blanks ?? target.definition;

  if (puzzleType === "anagram") {
    return {
      vocabId: target.id,
      word: target.word,
      definition: target.definition,
      blanks: blanksJson,
      payload: buildAnagramPayload(target.word, difficulty, rand),
      timeLimitMs,
    };
  }
  if (puzzleType === "fillblank") {
    return {
      vocabId: target.id,
      word: target.word,
      definition: target.definition,
      blanks: blanksJson,
      payload: buildFillBlankPayload(target.word, difficulty, rand),
      timeLimitMs,
    };
  }
  // definition
  const choices = buildChoices(target, words, DIFFICULTY_SETTINGS[difficulty].choices, seed);
  return {
    vocabId: target.id,
    word: target.word,
    definition: target.definition,
    blanks: blanksJson,
    payload: JSON.stringify({ choices }),
    timeLimitMs,
    choices,
  };
}

/** Hint generation for anagram: reveal the next unrevealed letter */
export function anagramHintProgress(revealedSet: number[], letters: number): number[] {
  const unrevealed: number[] = [];
  for (let i = 0; i < letters; i++) {
    if (!revealedSet.includes(i)) unrevealed.push(i);
  }
  return unrevealed;
}

export const SCORING_RULES = {
  baseScore: SCORING.baseScore,
  hintCost: SCORING.hintCost,
  hintCostMax: SCORING.hintCostMax,
  revealPenalty: SCORING.revealPenalty,
  difficultyMultiplier: SCORING.difficultyMultiplier,
};
