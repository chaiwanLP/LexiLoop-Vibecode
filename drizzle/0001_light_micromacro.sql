CREATE TABLE `attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dailyPuzzleId` int NOT NULL,
	`puzzleType` enum('anagram','definition','fillblank') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`timeMs` int NOT NULL DEFAULT 0,
	`hintsUsed` int NOT NULL DEFAULT 0,
	`revealed` enum('yes','no') NOT NULL DEFAULT 'no',
	`score` int NOT NULL DEFAULT 0,
	`maxPossibleScore` int NOT NULL DEFAULT 0,
	`success` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `attempt_uq` UNIQUE(`userId`,`dailyPuzzleId`)
);
--> statement-breakpoint
CREATE TABLE `dailyPuzzles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`puzzleDate` varchar(10) NOT NULL,
	`puzzleType` enum('anagram','definition','fillblank') NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL,
	`vocabId` int NOT NULL,
	`word` varchar(80) NOT NULL,
	`definition` text NOT NULL,
	`blanks` text,
	`payload` text,
	`solved` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dailyPuzzles_id` PRIMARY KEY(`id`),
	CONSTRAINT `daily_puzzle_uq` UNIQUE(`userId`,`puzzleDate`,`puzzleType`,`difficulty`)
);
--> statement-breakpoint
CREATE TABLE `streaks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`activityDate` varchar(10) NOT NULL,
	`puzzlesSolved` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `streaks_id` PRIMARY KEY(`id`),
	CONSTRAINT `streak_uq` UNIQUE(`userId`,`activityDate`)
);
--> statement-breakpoint
CREATE TABLE `vocabulary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`word` varchar(80) NOT NULL,
	`definition` text NOT NULL,
	`difficulty` enum('easy','medium','hard') NOT NULL DEFAULT 'easy',
	`category` varchar(80),
	`blanks` text,
	`active` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vocabulary_id` PRIMARY KEY(`id`),
	CONSTRAINT `vocabulary_word_uq` UNIQUE(`word`)
);
