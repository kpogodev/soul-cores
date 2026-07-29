/**
 * Jednorazowy skrypt seedujący tabelę `soul_cores` danymi z
 * public/soul-cores/soul_cores.json (wygenerowanego przez scraper).
 *
 * JSON nie ma pola `id` — generujemy je tym samym slugiem co scraper
 * (na podstawie `creature`), żeby zgadzało się z nazwami plików obrazków.
 *
 * Użycie:
 *   npm run seed:soul-cores
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@/lib/db";
import { soulCores } from "@/lib/schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const JSON_PATH = path.join(
  __dirname,
  "..",
  "public",
  "soul-cores",
  "soul_cores.json"
);

interface RawEntry {
  creature: string;
  name: string;
  img: string;
}

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function main() {
  const raw = fs.readFileSync(JSON_PATH, "utf-8");
  const entries: RawEntry[] = JSON.parse(raw);

  const rows = entries.map((entry) => ({
    id: slugify(entry.creature),
    creature: entry.creature,
    name: entry.name,
    img: entry.img,
  }));

  console.log(`Seeduję ${rows.length} soul core'ów...`);

  // insert w paczkach + pomiń duplikaty jeśli skrypt odpalony ponownie
  const BATCH_SIZE = 100;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await db.insert(soulCores).values(batch).onConflictDoNothing();
    console.log(`  ${Math.min(i + BATCH_SIZE, rows.length)}/${rows.length}`);
  }

  console.log("Gotowe.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});