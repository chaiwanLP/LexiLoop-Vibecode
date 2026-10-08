// Seed script: inserts the internal vocabulary bank if empty.
// Run: pnpm db:seed (requires DATABASE_URL in env, Neon Postgres)
import "dotenv/config";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { vocabulary } from "../drizzle/schema";
import fs from "node:fs";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
});
const db = drizzle(pool);

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
    if (msg.includes("Duplicate") || msg.includes("duplicate") || msg.includes("unique")) {
      existingWords.add(w.word);
      skipped++;
      continue;
    }
    throw err;
  }
}

console.log(`Seeded ${added} new words (${skipped} skipped)`);
await pool.end();
process.exit(0);
