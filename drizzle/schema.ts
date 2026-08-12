import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, uniqueIndex } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Company vocabulary bank (internal-only word pool, seeded/managed by admins).
 */
export const vocabulary = mysqlTable(
  "vocabulary",
  {
    id: int("id").autoincrement().primaryKey(),
    word: varchar("word", { length: 80 }).notNull(),
    /** Thai definition, can contain blanks {{}} for fill-in-the-blank puzzles */
    definition: text("definition").notNull(),
    difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).default("easy").notNull(),
    category: varchar("category", { length: 80 }),
    /** e.g. 'API' or 'SLA' — for fill-in-the-blank display variants */
    blanks: text("blanks"),
    active: mysqlEnum("active", ["yes", "no"]).default("yes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (t) => ({
    wordUq: uniqueIndex("vocabulary_word_uq").on(t.word),
  })
);

export type Vocabulary = typeof vocabulary.$inferSelect;
export type InsertVocabulary = typeof vocabulary.$inferInsert;

/**
 * Daily puzzle snapshot: deterministic per (date, puzzleType, difficulty, userId).
 * Stores the generated puzzle so each user sees consistent content per day.
 */
export const dailyPuzzles = mysqlTable(
  "dailyPuzzles",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    puzzleDate: varchar("puzzleDate", { length: 10 }).notNull(), // 'YYYY-MM-DD' (user local date)
    puzzleType: mysqlEnum("puzzleType", ["anagram", "definition", "fillblank"]).notNull(),
    difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
    vocabId: int("vocabId").notNull(),
    word: varchar("word", { length: 80 }).notNull(),
    definition: text("definition").notNull(),
    blanks: text("blanks"),
    /** JSON: anagram letter arrangement / choices for definition / blank indices */
    payload: text("payload"),
    solved: mysqlEnum("solved", ["yes", "no"]).default("no").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("daily_puzzle_uq").on(t.userId, t.puzzleDate, t.puzzleType, t.difficulty),
  })
);

export type DailyPuzzle = typeof dailyPuzzles.$inferSelect;
export type InsertDailyPuzzle = typeof dailyPuzzles.$inferInsert;

/**
 * Game attempt: records each play and the score earned.
 */
export const attempts = mysqlTable(
  "attempts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    dailyPuzzleId: int("dailyPuzzleId").notNull(),
    puzzleType: mysqlEnum("puzzleType", ["anagram", "definition", "fillblank"]).notNull(),
    difficulty: mysqlEnum("difficulty", ["easy", "medium", "hard"]).notNull(),
    /** milliseconds spent on the attempt */
    timeMs: int("timeMs").notNull().default(0),
    hintsUsed: int("hintsUsed").notNull().default(0),
    revealed: mysqlEnum("revealed", ["yes", "no"]).default("no").notNull(),
    score: int("score").notNull().default(0),
    maxPossibleScore: int("maxPossibleScore").notNull().default(0),
    success: mysqlEnum("success", ["yes", "no"]).default("no").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("attempt_uq").on(t.userId, t.dailyPuzzleId),
  })
);

export type Attempt = typeof attempts.$inferSelect;
export type InsertAttempt = typeof attempts.$inferInsert;

/**
 * Daily streak tracking: one row per (user, date).
 */
export const streaks = mysqlTable(
  "streaks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    activityDate: varchar("activityDate", { length: 10 }).notNull(), // 'YYYY-MM-DD'
    puzzlesSolved: int("puzzlesSolved").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("streak_uq").on(t.userId, t.activityDate),
  })
);

export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = typeof streaks.$inferInsert;
