/**
 * Scrapes live IPO GMP + subscription data from investorgain.com and writes
 * public/live-data.json in the exact shape src/App.jsx expects:
 *
 *   { updatedAt: string, ipos: { [internalIpoId]: { gmp, estListing, sub } } }
 *
 * Field names here MUST match the baseline objects in src/App.jsx exactly
 * (gmp, estListing, sub: {overall, qib, hni, retail}) — App.jsx does a plain
 * object spread to merge this patch onto the baseline, so a mismatched key
 * silently does nothing instead of erroring.
 *
 * WHY PLAYWRIGHT: investorgain.com renders its data tables with client-side
 * JavaScript, so a plain HTTP fetch returns an empty shell. We need a real
 * headless browser to let the page render, then read the DOM.
 *
 * IF THE SCRAPE COMES BACK EMPTY OR WRONG:
 * investorgain.com can change its HTML/CSS structure at any time, which
 * breaks the selectors below. Check the GitHub Action run's log — it prints
 * which selector matched and how many rows, or a dump of the actual table
 * HTML if nothing matched. Update TABLE_SELECTOR_CANDIDATES / the column
 * index comments in scrapeGmp()/scrapeSubscription() to match.
 *
 * Run locally:  npm i -D playwright  &&  npx playwright install chromium
 *               node scripts/scrape-ipo-data.mjs
 */

import { chromium } from "playwright";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "live-data.json");

const GMP_URL = "https://www.investorgain.com/report/live-ipo-gmp/331/all/";
const SUB_URL = "https://www.investorgain.com/report/ipo-subscription-live/68/all/";

const TABLE_SELECTOR_CANDIDATES = [
  "table.gmp_tbl",
  "table#mainTable",
  "table.table_bordered",
  "table.dataTable",
  "table",
];

const NUM_RE = /-?[\d,]+\.?\d*/;
function toNumber(text) {
  if (!text) return undefined;
  const m = text.replace(/,/g, "").match(NUM_RE);
  if (!m) return undefined;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : undefined;
}

// Maps investorgain's display name (normalized) to this app's internal id
// (see the `id:` field on each IPO object in src/App.jsx). Add an entry here
// whenever a new IPO is added to App.jsx, or matching silently stops working.
const NAME_TO_ID = {
  "knack packaging": "knack-packaging",
  "ic electricals": "ic-electricals",
  "kusumgar": "kusumgar",
  "kusumgar corporates": "kusumgar",
  "devson catalyst": "devson-catalyst",
  "happy steels": "happy-steels",
  "happy steel": "happy-steels",
  "sbi funds management": "sbi-funds",
  "kratikal tech": "kratikal-tech",
  "teja engineering": "teja-engineering",
  "teja engineering industries": "teja-engineering",
  "vinit mobile": "vinit-mobile",
  "sampark india logistics": "sampark-logistics",
  "sampark logistics": "sampark-logistics",
  "atharva polyplast": "atharva-polyplast",
  "atharva poly plast": "atharva-polyplast",
  "seemax resources": "seemax-resources",
  "aastha spintex": "aastha-spintex",
  "adon agro": "adon-agro",
  "adon agro commodities": "adon-agro",
  "csm technologies": "csm-technologies",
};

function normalizeName(raw) {
  return raw
    .toLowerCase()
    .replace(/\bipo\b/g, "")
    .replace(/\b(ltd|limited|pvt|private|co|company|corporation|corp)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveId(rawName) {
  const norm = normalizeName(rawName);
  if (NAME_TO_ID[norm]) return NAME_TO_ID[norm];
  for (const [key, id] of Object.entries(NAME_TO_ID)) {
    if (norm.includes(key) || key.includes(norm)) return id;
  }
  return null;
}

async function extractTable(page, label) {
  for (const sel of TABLE_SELECTOR_CANDIDATES) {
    const rows = await page
      .$$eval(sel + " tbody tr", (trs) =>
        trs
          .map((tr) => Array.from(tr.querySelectorAll("td")).map((td) => td.innerText.trim()))
          .filter((cells) => cells.length >= 3)
      )
      .catch(() => []);
    if (rows.length > 3) {
      console.log(`[${label}] matched selector "${sel}" — ${rows.length} rows`);
      return rows;
    }
  }
  console.warn(`[${label}] WARNING: no table matched. Dumping first <table> for debugging:`);
  const dump = await page.$eval("table", (t) => t.outerHTML.slice(0, 1500)).catch(() => "(no <table> element found at all)");
  console.warn(dump);
  return [];
}

async function scrapeGmp(page) {
  await page.goto(GMP_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  const rows = await extractTable(page, "gmp");

  // Expected columns (verify against the debug dump if this drifts):
  // [0] IPO Name  [1] Price  [2] GMP  [3] Est Listing  [4] Est Gain % ...
  const result = {};
  for (const cells of rows) {
    const rawName = cells[0]?.replace(/\s*IPO\s*$/i, "").trim();
    const id = resolveId(rawName || "");
    if (!id) continue;

    const price = toNumber(cells[1]);
    const gmp = toNumber(cells[2]);
    const estListing = toNumber(cells[3]);
    if (gmp === undefined && estListing === undefined && price === undefined) continue;

    result[id] = {
      ...(gmp !== undefined ? { gmp } : {}),
      ...(estListing !== undefined ? { estListing } : {}),
      ...(price !== undefined ? { priceMax: price } : {}),
    };
  }
  return result;
}

async function scrapeSubscription(page) {
  await page.goto(SUB_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  const rows = await extractTable(page, "sub");

  // Expected columns: [0] IPO Name [1] QIB [2] NII/HNI [3] Retail [4] Total ...
  const result = {};
  for (const cells of rows) {
    const rawName = cells[0]?.replace(/\s*IPO\s*$/i, "").trim();
    const id = resolveId(rawName || "");
    if (!id) continue;

    const qib = toNumber(cells[1]);
    const hni = toNumber(cells[2]);
    const retail = toNumber(cells[3]);
    const overall = toNumber(cells[4]);
    if ([qib, hni, retail, overall].every((v) => v === undefined)) continue;

    result[id] = { overall: overall ?? 0, qib: qib ?? 0, hni: hni ?? 0, retail: retail ?? 0 };
  }
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });

  let gmpPatches = {};
  let subPatches = {};
  const errors = [];

  try {
    gmpPatches = await scrapeGmp(page);
  } catch (err) {
    console.error("GMP scrape failed:", err.message);
    errors.push(`gmp: ${err.message}`);
  }

  try {
    subPatches = await scrapeSubscription(page);
  } catch (err) {
    console.error("Subscription scrape failed:", err.message);
    errors.push(`sub: ${err.message}`);
  }

  await browser.close();

  const ids = new Set([...Object.keys(gmpPatches), ...Object.keys(subPatches)]);
  const ipos = {};
  for (const id of ids) {
    ipos[id] = {
      ...(gmpPatches[id] || {}),
      ...(subPatches[id] ? { sub: subPatches[id] } : {}),
    };
  }

  const output = { updatedAt: new Date().toISOString(), errors, ipos };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Wrote live-data.json with ${Object.keys(ipos).length} matched IPOs.`);
  if (errors.length > 0) console.warn("Completed with warnings:", errors);
  if (Object.keys(ipos).length === 0) {
    console.warn("0 IPOs matched — either the site structure changed (see selector warnings above) or NAME_TO_ID needs new aliases.");
  }
}

main().catch((err) => {
  console.error("Fatal scraper error:", err);
  process.exit(1);
});
