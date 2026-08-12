// Seed script: inserts the internal vocabulary bank if empty.
// Run: node scripts/seed-words.mjs (requires DATABASE_URL in env)
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { vocabulary } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import fs from "node:fs";

const db = drizzle(process.env.DATABASE_URL);

const words = JSON.parse(fs.readFileSync(new URL("./seed-words.json", import.meta.url), "utf-8"));

const existing = await db.select({ id: vocabulary.id, word: vocabulary.word }).from(vocabulary);
const existingWords = new Set(existing.map((e) => e.word));

let added = 0;
let skipped = 0;
for (const w of words) {
  if (existingWords.has(w.word)) {
    skipped++;
    continue;
  }
  try {
    await db.insert(vocabulary).values({
      word: w.word,
      definition: w.definition,
      difficulty: w.difficulty,
      category: w.category,
      active: "yes",
    });
    added++;
    existingWords.add(w.word);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("Duplicate") || msg.includes("ER_DUP_ENTRY")) {
      // Another process added it concurrently
      existingWords.add(w.word);
      skipped++;
      continue;
    }
    throw err;
  }
}

console.log(`Seeded ${added} new words (${skipped} skipped)`);
process.exit(0);
