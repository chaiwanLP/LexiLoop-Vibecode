import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { loginLocalUser, registerLocalUser } from "./auth";
import { generatePuzzle, SCORING_RULES } from "./gameLogic";
import { todayString, computeScore, DIFFICULTY_SETTINGS, SCORING } from "../shared/game";
import { z } from "zod";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "เฉพาะ Admin เท่านั้นที่จัดการคลังคำได้" });
  }
  return next({ ctx });
});

const PUZZLE_TYPE = z.enum(["anagram", "definition", "fillblank"]);
const DIFFICULTY = z.enum(["easy", "medium", "hard"]);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash: _omit, ...safe } = opts.ctx.user;
      return safe;
    }),
    register: publicProcedure
      .input(
        z.object({
          email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
          password: z.string().min(8, "รหัสผ่านต้องยาวอย่างน้อย 8 ตัว"),
          name: z.string().max(120).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { user, token } = await registerLocalUser(input);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 365 });
          const { passwordHash: _omit, ...safe } = user;
          return { success: true as const, user: safe };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "สมัครสมาชิกไม่สำเร็จ";
          if ((err as { code?: string }).code === "CONFLICT") {
            throw new TRPCError({ code: "CONFLICT", message: msg });
          }
          throw new TRPCError({ code: "BAD_REQUEST", message: msg });
        }
      }),
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email("รูปแบบอีเมลไม่ถูกต้อง"),
          password: z.string().min(1, "กรุณากรอกรหัสผ่าน"),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const { user, token } = await loginLocalUser(input);
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 24 * 365 });
          const { passwordHash: _omit, ...safe } = user;
          return { success: true as const, user: safe };
        } catch (err) {
          const msg = err instanceof Error ? err.message : "เข้าสู่ระบบไม่สำเร็จ";
          throw new TRPCError({ code: "UNAUTHORIZED", message: msg });
        }
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  vocabulary: router({
    list: publicProcedure.query(async () => {
      return db.listVocabulary();
    }),
    create: adminProcedure
      .input(
        z.object({
          word: z.string().min(2).max(80),
          definition: z.string().min(5).max(2000),
          difficulty: DIFFICULTY,
          category: z.string().max(80).optional(),
          blanks: z.string().max(2000).optional(),
          active: z.enum(["yes", "no"]).default("yes"),
        })
      )
      .mutation(async ({ input }) => {
        try {
          await db.insertVocabulary({ ...input, active: input.active });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
            throw new TRPCError({ code: "CONFLICT", message: "คำนี้มีอยู่ในคลังคำแล้ว" });
          }
          throw err;
        }
        return { success: true } as const;
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          word: z.string().min(2).max(80).optional(),
          definition: z.string().min(5).max(2000).optional(),
          difficulty: DIFFICULTY.optional(),
          category: z.string().max(80).optional(),
          blanks: z.string().max(2000).optional(),
          active: z.enum(["yes", "no"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await db.updateVocabulary(id, rest);
        return { success: true } as const;
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteVocabulary(input.id);
        return { success: true } as const;
      }),
    importBulk: adminProcedure
      .input(
        z.object({
          // plain text: one word per line; line format: WORD|นิยาม|difficulty|หมวดหมู่ (optional)
          lines: z.array(z.string()).max(200),
        })
      )
      .mutation(async ({ input }) => {
        let added = 0;
        let skipped = 0;
        for (const line of input.lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parts = trimmed.split("|").map((s) => s.trim());
          const word = (parts[0] ?? "").toUpperCase();
          const definition = parts[1];
          const difficulty = (parts[2] ?? "medium") as "easy" | "medium" | "hard";
          const category = parts[3] || undefined;
          if (word.length < 2 || !definition || definition.length < 5) {
            skipped++;
            continue;
          }
          if (!["easy", "medium", "hard"].includes(difficulty)) {
            skipped++;
            continue;
          }
          try {
            await db.insertVocabulary({
              word,
              definition,
              difficulty,
              category,
              active: "yes",
            });
            added++;
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique")) {
              skipped++;
            } else {
              throw err;
            }
          }
        }
        return { success: true, added, skipped } as const;
      }),
    seed: adminProcedure.mutation(async () => {
      // seed is handled externally via script; this is a no-op placeholder
      return { success: true } as const;
    }),
  }),

  puzzles: router({
    /** Get or create today's puzzle for the user. */
    getDaily: protectedProcedure
      .input(z.object({
        puzzleType: PUZZLE_TYPE,
        difficulty: DIFFICULTY,
      }))
      .query(async ({ ctx, input }) => {
        const date = todayString();
        const existing = await db.getDailyPuzzle(ctx.user.id, date, input.puzzleType, input.difficulty);
        if (existing) {
          return { puzzle: existing, fresh: false };
        }
        const words = await db.listActiveVocabulary();
        const gen = generatePuzzle(words, date, input.puzzleType, input.difficulty);
        if (!gen) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "ยังไม่มีคำศัพท์ในคลังคำที่ตรงกับระดับความยากนี้ (ต้องยาว " +
              DIFFICULTY_SETTINGS[input.difficulty].letters[0] +
              "–" +
              DIFFICULTY_SETTINGS[input.difficulty].letters[1] +
              " ตัวอักษร) กรุณาให้ Admin เพิ่มคำในคลังคำ",
          });
        }
        const row = await db.insertDailyPuzzle({
          userId: ctx.user.id,
          puzzleDate: date,
          puzzleType: input.puzzleType,
          difficulty: input.difficulty,
          vocabId: gen.vocabId,
          word: gen.word,
          definition: gen.definition,
          blanks: gen.blanks,
          payload: gen.payload,
        });
        const puzzle = await db.getDailyPuzzle(ctx.user.id, date, input.puzzleType, input.difficulty);
        return { puzzle, fresh: true };
      }),
  }),

  attempts: router({
    /** Submit a game attempt and compute the score. */
    submit: protectedProcedure
      .input(
        z.object({
          dailyPuzzleId: z.number(),
          puzzleType: PUZZLE_TYPE,
          difficulty: DIFFICULTY,
          timeMs: z.number().min(0).max(600_000),
          hintsUsed: z.number().min(0).max(10),
          revealed: z.boolean(),
          success: z.boolean(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const puzzle = await db.getDailyPuzzle(
          ctx.user.id,
          todayString(),
          input.puzzleType,
          input.difficulty
        );
        if (!puzzle || puzzle.id !== input.dailyPuzzleId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "ไม่พบปริศนาของวันนี้" });
        }
        const timeLimitMs = DIFFICULTY_SETTINGS[input.difficulty].timeMs;
        const result = computeScore({
          difficulty: input.difficulty,
          hintsUsed: input.hintsUsed,
          revealed: input.revealed,
          timeMs: input.timeMs,
          timeLimitMs,
          success: input.success,
        });
        await db.upsertAttempt(ctx.user.id, input.dailyPuzzleId, {
          userId: ctx.user.id,
          dailyPuzzleId: input.dailyPuzzleId,
          puzzleType: input.puzzleType,
          difficulty: input.difficulty,
          timeMs: input.timeMs,
          hintsUsed: input.hintsUsed,
          revealed: input.revealed ? "yes" : "no",
          score: result.score,
          maxPossibleScore: result.maxPossibleScore,
          success: input.success ? "yes" : "no",
        });
        // mark daily puzzle solved
        await db.insertDailyPuzzle({
          userId: ctx.user.id,
          puzzleDate: todayString(),
          puzzleType: input.puzzleType,
          difficulty: input.difficulty,
          vocabId: puzzle.vocabId,
          word: puzzle.word,
          definition: puzzle.definition,
          blanks: puzzle.blanks,
          payload: puzzle.payload,
          solved: input.success ? "yes" : puzzle.solved,
        }).catch(() => undefined);
        // streak: any attempt counts as daily activity
        await db.upsertStreak(ctx.user.id, todayString(), true);
        return {
          score: result.score,
          maxPossibleScore: result.maxPossibleScore,
          streak: await currentStreak(ctx.user.id),
        };
      }),
  }),

  progress: router({
    summary: protectedProcedure.query(async ({ ctx }) => {
      const [attempts, streakDates, totalScore] = await Promise.all([
        db.getUserAttemptsSummary(ctx.user.id),
        db.getUserStreakDates(ctx.user.id),
        db.getUserTotalScore(ctx.user.id),
      ]);
      const streak = computeStreak(streakDates);
      const today = todayString();
      const todayAttempts = attempts.filter((a) => a.puzzleDate === today);
      return {
        totalScore,
        currentStreak: streak,
        todaySolved: todayAttempts.filter((a) => a.success === "yes").length,
        history: attempts,
      };
    }),
  }),

  leaderboard: router({
    list: protectedProcedure
      .input(z.object({ range: z.enum(["week", "month"]) }))
      .query(async ({ input }) => {
        const data = await db.getLeaderboard(input.range);
        return data.rows;
      }),
  }),
});

export type AppRouter = typeof appRouter;

/** Compute current streak (consecutive days ending today) from sorted date list */
async function currentStreak(userId: number): Promise<number> {
  const dates = await db.getUserStreakDates(userId);
  return computeStreak(dates);
}

export function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const today = todayString();
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  // streak counts only if today or yesterday is the most recent active day
  const lastDate = dates[dates.length - 1];
  const yesterday = new Date(d);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(yesterday);
  if (lastDate !== today && lastDate !== yesterdayStr) return 0;
  let cursor = new Date(d);
  let cursorStr = lastDate === today ? today : yesterdayStr;
  while (set.has(cursorStr)) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
    cursorStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(cursor);
  }
  return streak;
}

export const RULES = {
  scoring: SCORING_RULES,
  maxHints: SCORING.maxHints,
};
