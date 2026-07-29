/**
 * Scrapuje stronę "List of Soul Cores" z TibiaWiki (Fandom) za pomocą Puppeteer
 * (headless Chrome — omija blokady stawiane zwykłemu fetch/HTML requestowi):
 * - wyciąga nazwę soul core'a
 * - pobiera lokalnie jego obrazek (32x32 gif/png) do public/soul-cores/images
 * - zapisuje wynikowy JSON: public/soul-cores/soul_cores.json
 *
 * Jednorazowy skrypt (nie jest częścią bundla Vite/React).
 *
 * Użycie:
 *   npm run scrape:soul-cores
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PAGE_URL = "https://tibia.fandom.com/wiki/Soul_Core";
const OUTPUT_DIR = path.join(__dirname, "..", "public", "soul-cores");
const IMAGES_DIR = path.join(OUTPUT_DIR, "images");
const JSON_PATH = path.join(OUTPUT_DIR, "soul_cores.json");

interface RawRow {
  fullName: string;
  imgUrl: string | null;
}

interface SoulCoreEntry {
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

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filepath, buffer);
    return true;
  } catch (err) {
    console.error(`[!] Błąd pobierania ${url}:`, err);
    return false;
  }
}

async function main() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
  );

  console.log(`Ładowanie: ${PAGE_URL}`);
  await page.goto(PAGE_URL, { waitUntil: "networkidle2", timeout: 60_000 });
  await page.waitForSelector("table", { timeout: 30_000 });

  // Wyciągamy surowe dane bezpośrednio z DOM w kontekście przeglądarki
  const rawRows: RawRow[] = await page.evaluate(() => {
    const table = document.querySelector(
      "table.wikitable.sortable.jquery-tablesorter"
    );
    if (!table) return [];

    const rows = Array.from(table.querySelectorAll("tr"));
    return rows
      .map((row) => {
        const link = row.querySelector("a");
        const img = row.querySelector("img");
        if (!link || !img) return null;

        const fullName = link.textContent?.trim() ?? "";
        // real url bywa w data-src (lazy-load), fallback na src
        const imgUrl =
          img.getAttribute("data-src") || img.getAttribute("src") || null;

        return { fullName, imgUrl };
      })
      .filter((r): r is RawRow => r !== null);
  });

  await browser.close();

  const results: SoulCoreEntry[] = [];

  for (const { fullName, imgUrl } of rawRows) {
    if (!fullName || !/soul core$/i.test(fullName)) continue;
    if (!imgUrl || imgUrl.startsWith("data:")) {
      console.warn(`[!] Brak obrazka dla: ${fullName}`);
      continue;
    }

    const creatureName = fullName.replace(/\s+Soul Core$/i, "");

    // UWAGA: NIE obcinamy /revision/... z imgUrl — static.wikia.nocookie.net
    // zwraca 404 bez tego segmentu, plik jest dostępny tylko pod pełnym URL-em
    // (z /revision/latest/... na końcu). Do pobrania używamy pełnego imgUrl,
    // a "czystą" ścieżkę (bez /revision/) tylko po to, żeby wyciągnąć rozszerzenie.
    const pathBeforeRevision = imgUrl.split("/revision/")[0];

    const slug = slugify(creatureName);
    const ext = path.extname(pathBeforeRevision.split("?")[0]) || ".gif";
    const filename = `${slug}${ext}`;
    const filepath = path.join(IMAGES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      const ok = await downloadImage(imgUrl, filepath);
      if (!ok) continue;
      await new Promise((r) => setTimeout(r, 150)); // uprzejmość wobec serwera
    }

    results.push({ creature: creatureName, name: fullName, img: filename });
    console.log(`[+] ${fullName} -> ${filename}`);
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(results, null, 2), "utf-8");
  console.log(`\nGotowe: ${results.length} soul core'ów zapisanych do ${JSON_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});