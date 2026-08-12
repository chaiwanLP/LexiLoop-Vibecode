import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { appRouter, computeStreak } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function ctxFor(role: "user" | "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as unknown as TrpcContext["res"],
  };
}

describe("computeStreak", () => {
  it("returns 0 for empty date list", () => {
    expect(computeStreak([])).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const d = (offset: number) => {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    };
    expect(computeStreak([d(2), d(1), d(0)])).toBe(3);
  });

  it("allows streak to continue from yesterday when today not yet played (counts yesterday as the latest day)", () => {
    const d = (offset: number) => {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    };
    // Cursor starts on yesterday (today implicit) and walks backwards through d(1), d(2), d(3)
    expect(computeStreak([d(3), d(2), d(1)])).toBe(4);
  });

  it("returns 0 when the most recent day is before yesterday", () => {
    const d = (offset: number) => {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(date);
    };
    expect(computeStreak([d(4), d(3)])).toBe(0);
  });
});

describe("scoring rules (shared/game computeScore)", async () => {
  const { computeScore } = await import("../shared/game");

  it("awards 100 base score for an easy successful answer with no hints and slow time", () => {
    const { score } = computeScore({
      difficulty: "easy",
      hintsUsed: 0,
      revealed: false,
      timeMs: 80_000,
      timeLimitMs: 90_000,
      success: true,
    });
    expect(score).toBe(100);
  });

  it("multiplies base score by difficulty", () => {
    const mk = (difficulty: "easy" | "medium" | "hard", expected: number) =>
      expect(
        computeScore({
          difficulty,
          hintsUsed: 0,
          revealed: false,
          timeMs: 80_000,
          timeLimitMs: difficulty === "easy" ? 90_000 : difficulty === "medium" ? 60_000 : 40_000,
          success: true,
        }).score
      ).toBe(expected);
    mk("easy", 100);
    mk("medium", 150);
    mk("hard", 200);
  });

  it("deducts 15 points per hint up to 45", () => {
    const base = {
      difficulty: "easy" as const,
      revealed: false,
      timeMs: 80_000,
      timeLimitMs: 90_000,
      success: true,
    };
    expect(computeScore({ ...base, hintsUsed: 1 }).score).toBe(85);
    expect(computeScore({ ...base, hintsUsed: 2 }).score).toBe(70);
    expect(computeScore({ ...base, hintsUsed: 3 }).score).toBe(55);
    expect(computeScore({ ...base, hintsUsed: 4 }).score).toBe(55); // capped
  });

  it("halves remaining score when answer is revealed", () => {
    const { score } = computeScore({
      difficulty: "easy",
      hintsUsed: 0,
      revealed: true,
      timeMs: 80_000,
      timeLimitMs: 90_000,
      success: true,
    });
    expect(score).toBe(50);
  });

  it("adds a 20 point time bonus when finishing within half the time limit", () => {
    const { score } = computeScore({
      difficulty: "medium",
      hintsUsed: 0,
      revealed: false,
      timeMs: 25_000,
      timeLimitMs: 60_000,
      success: true,
    });
    expect(score).toBe(150 + 20);
  });

  it("awards 0 on failure", () => {
    const { score } = computeScore({
      difficulty: "hard",
      hintsUsed: 0,
      revealed: false,
      timeMs: 10_000,
      timeLimitMs: 40_000,
      success: false,
    });
    expect(score).toBe(0);
  });
});

describe("admin gating", () => {
  it("rejects vocabulary.create for non-admin users", async () => {
    const caller = appRouter.createCaller(ctxFor("user"));
    await expect(
      caller.vocabulary.create({
        word: "BLOCKED",
        definition: "ควรจะถูกปฏิเสธ เพราะ caller ไม่ใช่ admin",
        difficulty: "easy",
        active: "yes",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("vocabulary.list is public and does not require auth", async () => {
    const caller = appRouter.createCaller({ user: null } as unknown as TrpcContext);
    const rows = await caller.vocabulary.list();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(0);
  });
});

import type { Vocabulary } from "../drizzle/schema";
import {
  buildAnagramPayload,
  buildFillBlankPayload,
} from "../shared/game";
import { generatePuzzle } from "./gameLogic";

describe("puzzle generation", () => {
  const seeded = (() => {
    let s = 0.5;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  })();

  describe("buildAnagramPayload", () => {
    it("shuffles all letters and keeps letter multiset", () => {
      const payload = buildAnagramPayload("CLOUD", "easy", seeded);
      const parsed = JSON.parse(payload) as {
        order: { letter: string; origIndex: number }[];
        revealed: unknown;
        revealCount: number;
      };
      expect(parsed.order.length).toBe(5);
      const sorted = parsed.order.map((t) => t.letter).sort().join("");
      expect(sorted).toBe("CDLOU");
    });

    it("pre-reveals 1 letter for easy, 2 for medium, 0 for hard", () => {
      const easy = JSON.parse(buildAnagramPayload("CLOUD", "easy", seeded));
      const medium = JSON.parse(buildAnagramPayload("LEADERSHIP", "medium", seeded));
      const hard = JSON.parse(buildAnagramPayload("TRANSFORMATION", "hard", seeded));
      expect(easy.revealCount).toBe(1);
      expect(medium.revealCount).toBe(2);
      expect(hard.revealCount).toBe(0);
    });

    it("pre-revealed indices are within word length", () => {
      const p = JSON.parse(buildAnagramPayload("CLOUD", "easy", seeded));
      const indices = Object.values(p.revealed) as number[];
      for (const i of indices) {
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(5);
      }
    });
  });

  describe("definition choices (via generatePuzzle)", () => {
    const pool: Vocabulary[] = [
      { id: 1, word: "KPI", definition: "correct", difficulty: "easy", category: null, active: "yes", blanks: null },
      ...[2, 3, 4, 5].map((id) => ({
        id,
        word: `W${id}`,
        definition: `def${id}`,
        difficulty: "easy",
        category: null,
        active: "yes",
        blanks: null,
      })),
    ] as unknown as Vocabulary[];

    it("includes the correct answer among choices", () => {
      const a = generatePuzzle(pool, "2026-08-12", "definition", "easy");
      expect(a).not.toBeNull();
      const choices = JSON.parse(a!.payload).choices as string[];
      expect(choices).toHaveLength(3);
      expect(choices).toContain("correct");
    });
  });

  describe("buildFillBlankPayload", () => {
    it("reveals letters per difficulty ratio", () => {
      const word = "CLOUDSERVICE";
      const easy = JSON.parse(buildFillBlankPayload(word, "easy", seeded)) as {
        letter: string;
        revealed: boolean;
      }[];
      const medium = JSON.parse(buildFillBlankPayload(word, "medium", seeded));
      const hard = JSON.parse(buildFillBlankPayload(word, "hard", seeded));
      expect(easy.every((s) => s.letter === word[easy.indexOf(s)] && s.revealed === true || s.revealed === false)).toBe(true);
      const revealedCount = (arr: { revealed: boolean }[]) => arr.filter((s) => s.revealed).length;
      expect(revealedCount(easy)).toBeGreaterThanOrEqual(revealedCount(medium));
      expect(revealedCount(medium)).toBeGreaterThanOrEqual(revealedCount(hard));
      expect(revealedCount(hard)).toBeGreaterThanOrEqual(1);
    });

    it("covers every letter of the word", () => {
      const slots = JSON.parse(buildFillBlankPayload("TEST", "medium", seeded)) as {
        letter: string;
        revealed: boolean;
      }[];
      expect(slots.map((s) => s.letter).join("")).toBe("TEST");
    });
  });

  describe("generatePuzzle", () => {
    const pool = [
      { id: 1, word: "KPI", definition: "indicator", difficulty: "easy", category: "biz", active: "yes", blanks: null },
      { id: 2, word: "UX", definition: "experience", difficulty: "easy", category: "prod", active: "yes", blanks: null },
      { id: 3, word: "RETENTION", definition: "stay", difficulty: "medium", category: "biz", active: "yes", blanks: null },
    ] as unknown as Vocabulary[];

    it("produces a valid payload for each puzzle type", () => {
      for (const t of ["anagram", "definition", "fillblank"] as const) {
        const a = generatePuzzle(pool, "2026-08-12", t, "easy");
        expect(a).not.toBeNull();
        expect(a!.word).toBeTruthy();
        expect(a!.payload).toBeTruthy();
      }
    });

    it("returns null when no pool words match the difficulty", () => {
      expect(generatePuzzle(pool, "2026-08-12", "anagram", "hard")).toBeNull();
    });

    it("is deterministic for the same inputs", () => {
      const a = generatePuzzle(pool, "2026-08-12", "anagram", "easy");
      const b = generatePuzzle(pool, "2026-08-12", "anagram", "easy");
      expect(a!.payload).toBe(b!.payload);
      expect(a!.word).toBe(b!.word);
    });

    it("varies across dates", () => {
      const payloads = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const d = new Date(2026, 0, i + 1).toISOString().slice(0, 10);
        const p = generatePuzzle(pool, d, "definition", "easy");
        if (p) payloads.add(p.payload);
      }
      // at least some days pick different word/choices combinations
      expect(payloads.size).toBeGreaterThan(1);
    });
  });
});
