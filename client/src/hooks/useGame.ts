import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { DIFFICULTY_SETTINGS, SCORING, type Difficulty, type PuzzleType } from "../../../shared/game";

export interface AnagramTile {
  letter: string;
  origIndex: number;
  revealed: boolean;
  revealedAtStart: boolean;
}

export interface FillBlankSlot {
  letter: string;
  revealed: boolean;
}

export interface PuzzleState {
  dailyPuzzleId: number;
  word: string; // answer
  definition: string;
  timeLimitMs: number;
  // anagram
  anagramTiles: AnagramTile[] | null;
  // definition
  choices: string[] | null;
  // fillblank
  fillSlots: FillBlankSlot[] | null;
}

/**
 * Fetches (or creates) today's puzzle and exposes game controls:
 * timer, hints, reveal, submit.
 */
export function useGame(puzzleType: PuzzleType, difficulty: Difficulty) {
  const [, navigate] = useLocation();
  const [difficultyState, setDifficultyState] = useState<Difficulty>(difficulty);
  const [puzzle, setPuzzle] = useState<PuzzleState | null>(null);
  const [fetched, setFetched] = useState(false);
  const [finished, setFinished] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(DIFFICULTY_SETTINGS[difficultyState].timeMs);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const startTimeRef = useRef<number>(Date.now());
  const elapsedRef = useRef<number>(0);

  const getDaily = trpc.puzzles.getDaily.useQuery(
    { puzzleType, difficulty: difficultyState },
    {
      enabled: !!puzzleType && !!difficultyState,
      retry: false,
    }
  );

  // Parse the fetched puzzle into game state
  useEffect(() => {
    const p = getDaily.data?.puzzle;
    if (!p || getDaily.isLoading) return;
    startTimeRef.current = Date.now();
    const timeLimitMs =
      DIFFICULTY_SETTINGS[p.difficulty as keyof typeof DIFFICULTY_SETTINGS]?.timeMs ?? 90_000;
    setTimeLeftMs(timeLimitMs);
    let anagramTiles: AnagramTile[] | null = null;
    let choices: string[] | null = null;
    let fillSlots: FillBlankSlot[] | null = null;
    if (p.puzzleType === "anagram" && p.payload) {
      const raw = JSON.parse(p.payload) as {
        order: { letter: string; origIndex: number }[];
        revealed: number[] | Record<string, number>;
      };
      // server stores revealed as a Set<number>, which serializes as {"0": 0, "1": 3}
      const revealedIndices: number[] = Array.isArray(raw.revealed)
        ? raw.revealed
        : Object.values(raw.revealed ?? {});
      anagramTiles = raw.order.map((t) => ({
        ...t,
        revealed: revealedIndices.includes(t.origIndex),
        revealedAtStart: revealedIndices.includes(t.origIndex),
      }));
    } else if (p.puzzleType === "definition" && p.payload) {
      const payload = JSON.parse(p.payload) as { choices: string[] };
      choices = payload.choices;
    } else if (p.puzzleType === "fillblank" && p.payload) {
      fillSlots = JSON.parse(p.payload) as FillBlankSlot[];
    }
    setPuzzle({
      dailyPuzzleId: p.id,
      word: p.word.toUpperCase(),
      definition: p.definition,
      timeLimitMs,
      anagramTiles,
      choices,
      fillSlots,
    });
    setHintsUsed(0);
    setRevealed(false);
    setFinished(p.solved === "yes");
    setFetched(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getDaily.data, getDaily.isLoading]);

  // Timer
  useEffect(() => {
    if (!puzzle || finished) return;
    const id = setInterval(() => {
      elapsedRef.current = Date.now() - startTimeRef.current;
      const left = puzzle.timeLimitMs - elapsedRef.current;
      setTimeLeftMs(left);
      if (left <= 0) {
        clearInterval(id);
        submit(false, 0);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle, finished]);

  const utils = trpc.useUtils();
  const submitMutation = trpc.attempts.submit.useMutation({
    onSuccess: (data) => {
      setFinished(true);
      if (data.score > 0) {
        toast.success(`ได้ ${data.score} คะแนน! สตreak ต่อเนื่อง: ${data.streak} วัน`);
      } else {
        toast.info(`เกมเสร็จสิ้น สตreak ต่อเนื่อง: ${data.streak} วัน`);
      }
      void utils.progress.summary.invalidate();
      void utils.leaderboard.list.invalidate();
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "ส่งผลไม่ได้");
    },
  });

  const submit = useCallback(
    (success: boolean, usedHints: number) => {
      if (!puzzle || submitMutation.isPending) return;
      elapsedRef.current = Date.now() - startTimeRef.current;
      setFinished(true);
      submitMutation.mutate({
        dailyPuzzleId: puzzle.dailyPuzzleId,
        puzzleType,
        difficulty: difficultyState,
        timeMs: Math.min(600_000, Math.max(0, elapsedRef.current)),
        hintsUsed: Math.min(10, usedHints),
        revealed,
        success,
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puzzle, difficultyState, revealed, puzzleType]
  );

  const hint = useCallback(() => {
    if (!puzzle || finished) return null;
    if (hintsUsed >= SCORING.maxHints) {
      toast.info("ใช้ใบ้ครบจำนวนแล้ว");
      return null;
    }
    setHintsUsed((h) => h + 1);
    if (puzzleType === "anagram" && puzzle.anagramTiles) {
      // reveal next unrevealed letter position in the answer
      const answerLetters = puzzle.word.toUpperCase().split("");
      // find a position in answer not yet revealed by start or hints
      const placed = new Set(
        puzzle.anagramTiles.filter((t) => t.revealed).map((t) => t.origIndex)
      );
      let target = -1;
      for (let i = 0; i < answerLetters.length; i++) {
        if (!placed.has(i)) {
          target = i;
          break;
        }
      }
      if (target === -1) return null;
      const tileIdx = puzzle.anagramTiles.findIndex((t) => t.origIndex === target);
      if (tileIdx === -1) return null;
      setPuzzle((prev) => {
        if (!prev?.anagramTiles) return prev;
        const tiles = [...prev.anagramTiles];
        tiles[tileIdx] = { ...tiles[tileIdx], revealed: true };
        return { ...prev, anagramTiles: tiles };
      });
      toast.success("ใบ้คำ: ตัวอักษรถูกวางลงในตำแหน่งที่ถูกต้องแล้ว (-15 คะแนน)", { duration: 2400 });
      return target;
    }
    if (puzzleType === "fillblank" && puzzle.fillSlots) {
      const idx = puzzle.fillSlots.findIndex((s) => !s.revealed);
      if (idx === -1) return null;
      setPuzzle((prev) => {
        if (!prev?.fillSlots) return prev;
        const slots = prev.fillSlots.map((s, i) =>
          i === idx ? { ...s, revealed: true } : s
        );
        return { ...prev, fillSlots: slots };
      });
      toast.success("ใบ้คำ: ตัวอักษรถูกเผยแล้ว (-15 คะแนน)", { duration: 2400 });
      return idx;
    }
    if (puzzleType === "definition" && puzzle.choices) {
      // definition hint: show first 2 chars of the answer
      toast.success(`ใบ้คำ: คำตอบขึ้นต้นด้วย "${puzzle.word.slice(0, 2)}..." (-15 คะแนน)`, {
        duration: 2800,
      });
      return null;
    }
    return null;
  }, [puzzle, puzzleType, hintsUsed, finished]);

  const revealAnswer = useCallback(() => {
    if (!puzzle || finished) return;
    setRevealed(true);
    toast("เฉลยคำตอบแล้ว (คะแนนคงเหลือถูกหักครึ่ง)", { duration: 2400 });
  }, [puzzle, finished]);

  const changeDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d);
    setFetched(false);
    setPuzzle(null);
    setHintsUsed(0);
    setRevealed(false);
    setFinished(false);
    elapsedRef.current = 0;
  }, []);

  return {
    difficulty: difficultyState,
    changeDifficulty,
    puzzle,
    fetched,
    finished,
    loading: getDaily.isLoading || !fetched,
    error: getDaily.isError,
    timeLeftMs,
    hintsUsed,
    revealed,
    hint,
    revealAnswer,
    submitSuccess: (success: boolean) => submit(success, hintsUsed),
    submit,
    setPuzzle,
    lastScore: submitMutation.data,
  };
}
