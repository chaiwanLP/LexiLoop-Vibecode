import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["user", "admin"]);
export const difficultyEnum = pgEnum("difficulty", ["easy", "medium", "hard"]);
export const yesNoEnum = pgEnum("yes_no", ["yes", "no"]);
export const puzzleTypeEnum = pgEnum("puzzle_type", ["anagram", "definition", "fillblank"]);

/**
 * Core user table backing local JWT auth flow (email + password).
 * openId kept for backwards compat: local users use `local:<email>`.
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: text("passwordHash"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Company vocabulary bank (internal-only word pool, seeded/managed by admins).
 */
export const vocabulary = pgTable(
  "vocabulary",
  {
    id: serial("id").primaryKey(),
    word: varchar("word", { length: 80 }).notNull(),
    /** Thai definition, can contain blanks {{}} for fill-in-the-blank puzzles */
    definition: text("definition").notNull(),
    difficulty: difficultyEnum("difficulty").default("easy").notNull(),
    category: varchar("category", { length: 80 }),
    /** e.g. 'API' or 'SLA' — for fill-in-the-blank display variants */
    blanks: text("blanks"),
    active: yesNoEnum("active").default("yes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
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
export const dailyPuzzles = pgTable(
  "dailyPuzzles",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    puzzleDate: varchar("puzzleDate", { length: 10 }).notNull(), // 'YYYY-MM-DD' (user local date)
    puzzleType: puzzleTypeEnum("puzzleType").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    vocabId: integer("vocabId").notNull(),
    word: varchar("word", { length: 80 }).notNull(),
    definition: text("definition").notNull(),
    blanks: text("blanks"),
    /** JSON: anagram letter arrangement / choices for definition / blank indices */
    payload: text("payload"),
    solved: yesNoEnum("solved").default("no").notNull(),
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
export const attempts = pgTable(
  "attempts",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    dailyPuzzleId: integer("dailyPuzzleId").notNull(),
    puzzleType: puzzleTypeEnum("puzzleType").notNull(),
    difficulty: difficultyEnum("difficulty").notNull(),
    /** milliseconds spent on the attempt */
    timeMs: integer("timeMs").notNull().default(0),
    hintsUsed: integer("hintsUsed").notNull().default(0),
    revealed: yesNoEnum("revealed").default("no").notNull(),
    score: integer("score").notNull().default(0),
    maxPossibleScore: integer("maxPossibleScore").notNull().default(0),
    success: yesNoEnum("success").default("no").notNull(),
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
export const streaks = pgTable(
  "streaks",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    activityDate: varchar("activityDate", { length: 10 }).notNull(), // 'YYYY-MM-DD'
    puzzlesSolved: integer("puzzlesSolved").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (t) => ({
    uniq: uniqueIndex("streak_uq").on(t.userId, t.activityDate),
  })
);

export type Streak = typeof streaks.$inferSelect;
export type InsertStreak = typeof streaks.$inferInsert;
