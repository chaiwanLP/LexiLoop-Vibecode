import { and, desc, eq, gte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { InsertUser, users, InsertVocabulary, vocabulary, InsertDailyPuzzle, dailyPuzzles, InsertAttempt, attempts, streaks } from "../drizzle/schema";
import { ENV } from './_core/env';

const { Pool } = pg;

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: InstanceType<typeof Pool> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // Neon requires SSL
        ssl: process.env.DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      (values as Record<string, unknown>)[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    // keep updatedAt fresh on conflict
    updateSet.updatedAt = new Date();

    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Vocabulary (admin-managed bank) ============

export async function listVocabulary() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vocabulary).orderBy(desc(vocabulary.createdAt));
}

export async function listActiveVocabulary() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(vocabulary).where(eq(vocabulary.active, "yes"));
}

export async function getVocabularyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select().from(vocabulary).where(eq(vocabulary.id, id)).limit(1);
  return rows[0];
}

export async function insertVocabulary(v: InsertVocabulary) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(vocabulary).values(v);
}

export async function updateVocabulary(id: number, v: Partial<InsertVocabulary>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(vocabulary).set({ ...v, updatedAt: new Date() }).where(eq(vocabulary.id, id));
}

export async function deleteVocabulary(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(vocabulary).where(eq(vocabulary.id, id));
}

// ============ Daily Puzzles ============

export async function getDailyPuzzle(
  userId: number,
  date: string,
  type: "anagram" | "definition" | "fillblank",
  difficulty: "easy" | "medium" | "hard"
) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(dailyPuzzles)
    .where(
      and(
        eq(dailyPuzzles.userId, userId),
        eq(dailyPuzzles.puzzleDate, date),
        eq(dailyPuzzles.puzzleType, type),
        eq(dailyPuzzles.difficulty, difficulty)
      )
    )
    .limit(1);
  return rows[0];
}

export async function insertDailyPuzzle(p: InsertDailyPuzzle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(dailyPuzzles).values(p).onConflictDoNothing();
}

// ============ Attempts / Scores ============

export async function upsertAttempt(userId: number, dailyPuzzleId: number, a: InsertAttempt) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .insert(attempts)
    .values(a)
    .onConflictDoUpdate({
      // uses unique index attempt_uq(userId, dailyPuzzleId)
      target: [attempts.userId, attempts.dailyPuzzleId],
      set: {
        timeMs: a.timeMs,
        hintsUsed: a.hintsUsed,
        revealed: a.revealed,
        score: a.score,
        maxPossibleScore: a.maxPossibleScore,
        success: a.success,
      },
    });
}

export async function getUserAttempt(userId: number, dailyPuzzleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db
    .select()
    .from(attempts)
    .where(and(eq(attempts.userId, userId), eq(attempts.dailyPuzzleId, dailyPuzzleId)))
    .limit(1);
  return rows[0];
}

/** Daily attempts summary for a user (all dates) */
export async function getUserAttemptsSummary(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      puzzleDate: dailyPuzzles.puzzleDate,
      puzzleType: dailyPuzzles.puzzleType,
      difficulty: dailyPuzzles.difficulty,
      score: attempts.score,
      maxPossibleScore: attempts.maxPossibleScore,
      hintsUsed: attempts.hintsUsed,
      revealed: attempts.revealed,
      success: attempts.success,
      createdAt: attempts.createdAt,
    })
    .from(attempts)
    .innerJoin(dailyPuzzles, eq(attempts.dailyPuzzleId, dailyPuzzles.id))
    .where(eq(attempts.userId, userId))
    .orderBy(desc(dailyPuzzles.puzzleDate));
}

// ============ Streaks ============

export async function upsertStreak(userId: number, date: string, solved: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .insert(streaks)
    .values({ userId, activityDate: date, puzzlesSolved: solved ? 1 : 0 })
    .onConflictDoUpdate({
      target: [streaks.userId, streaks.activityDate],
      set: { puzzlesSolved: solved ? 1 : 0 },
    });
}

export async function getUserStreakDates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({ activityDate: streaks.activityDate, puzzlesSolved: streaks.puzzlesSolved })
    .from(streaks)
    .where(and(eq(streaks.userId, userId), gte(streaks.puzzlesSolved, 1)))
    .orderBy(streaks.activityDate);
  return rows.map((r) => r.activityDate);
}

// ============ Leaderboard ============

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

export async function getLeaderboard(range: "week" | "month") {
  const db = await getDb();
  if (!db) return { ranges: [] as unknown[] };
  const now = new Date();
  const from = range === "week" ? startOfWeek(now) : startOfMonth(now);
  const rows = await db
    .select({
      userId: attempts.userId,
      userName: users.name,
      totalScore: sql<number>`SUM(${attempts.score})`.as("totalScore"),
      gamesPlayed: sql<number>`COUNT(*)`.as("gamesPlayed"),
    })
    .from(attempts)
    .innerJoin(users, eq(attempts.userId, users.id))
    .where(gte(attempts.createdAt, from))
    .groupBy(attempts.userId, users.name)
    .orderBy(desc(sql`SUM(${attempts.score})`))
    .limit(50);
  return { range, from: from.toISOString(), rows };
}

export async function getUserTotalScore(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ totalScore: sql<number>`COALESCE(SUM(${attempts.score}), 0)`.as("totalScore") })
    .from(attempts)
    .where(eq(attempts.userId, userId))
    .limit(1);
  return Number(rows[0]?.totalScore ?? 0);
}
