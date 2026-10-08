CREATE TYPE "public"."difficulty" AS ENUM('easy', 'medium', 'hard');--> statement-breakpoint
CREATE TYPE "public"."puzzle_type" AS ENUM('anagram', 'definition', 'fillblank');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."yes_no" AS ENUM('yes', 'no');--> statement-breakpoint
CREATE TABLE "attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"dailyPuzzleId" integer NOT NULL,
	"puzzleType" "puzzle_type" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"timeMs" integer DEFAULT 0 NOT NULL,
	"hintsUsed" integer DEFAULT 0 NOT NULL,
	"revealed" "yes_no" DEFAULT 'no' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"maxPossibleScore" integer DEFAULT 0 NOT NULL,
	"success" "yes_no" DEFAULT 'no' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dailyPuzzles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"puzzleDate" varchar(10) NOT NULL,
	"puzzleType" "puzzle_type" NOT NULL,
	"difficulty" "difficulty" NOT NULL,
	"vocabId" integer NOT NULL,
	"word" varchar(80) NOT NULL,
	"definition" text NOT NULL,
	"blanks" text,
	"payload" text,
	"solved" "yes_no" DEFAULT 'no' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streaks" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"activityDate" varchar(10) NOT NULL,
	"puzzlesSolved" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" text,
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vocabulary" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" varchar(80) NOT NULL,
	"definition" text NOT NULL,
	"difficulty" "difficulty" DEFAULT 'easy' NOT NULL,
	"category" varchar(80),
	"blanks" text,
	"active" "yes_no" DEFAULT 'yes' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "attempt_uq" ON "attempts" USING btree ("userId","dailyPuzzleId");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_puzzle_uq" ON "dailyPuzzles" USING btree ("userId","puzzleDate","puzzleType","difficulty");--> statement-breakpoint
CREATE UNIQUE INDEX "streak_uq" ON "streaks" USING btree ("userId","activityDate");--> statement-breakpoint
CREATE UNIQUE INDEX "vocabulary_word_uq" ON "vocabulary" USING btree ("word");