import { chromium } from "playwright";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = path.join(__dirname, "..", "public", "live-data.json");
const IPOS_JSON_PATH = path.join(__dirname, "..", "public", "ipos.json");

const GMP_URL = "https://www.investorgain.com/report/live-ipo-gmp/331/all/";
const SUB_URL = "https://www.investorgain.com/report/ipo-subscription-live/333/all/";

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
  "caliber mining": "caliber-mining",
  "caliber mining logistics": "caliber-mining",
  "cube highways": "cube-highways",
  "cube highways trust": "cube-highways",
  "cube highways trust invit": "cube-highways",
  "sotefin bharat": "sotefin-bharat",
};

function normalizeName(raw) {
  return raw
    .toLowerCase()
    .replace(/\b(bse sme|nse emerge|nse sme|bse|nse|ipo|ltd|limited|pvt|private|co|company|corporation|corp)\b/g, "")
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

// Extends extractTable to return { cells, href }
async function extractTable(page, label) {
  for (const sel of TABLE_SELECTOR_CANDIDATES) {
    const rows = await page
      .$$eval(sel + " tbody tr", (trs) =>
        trs
          .map((tr) => {
            const tds = Array.from(tr.querySelectorAll("td"));
            if (tds.length < 3) return null;
            const cells = tds.map((td) => td.innerText.trim());
            const linkEl = tds[0].querySelector("a");
            const href = linkEl ? linkEl.getAttribute("href") : null;
            return { cells, href };
          })
          .filter(Boolean)
      )
      .catch(() => []);
    if (rows.length > 3) {
      console.log(`[${label}] matched selector "${sel}" — ${rows.length} rows`);
      return rows;
    }
  }
  console.warn(`[${label}] WARNING: no table matched.`);
  return [];
}

function parseGmpCell(text) {
  if (!text) return undefined;
  const m = text.match(/₹\s*(--|-?[\d,]+)/);
  if (!m || m[1] === "--") return undefined;
  const n = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function cleanScrapedName(raw) {
  if (!raw) return "";
  let cleaned = raw.split("\n")[0].trim();
  
  // 1. Remove L@... or @... listing suffix (e.g. L@500.00 (-38.12%) or IPOL@250.00)
  cleaned = cleaned.replace(/\s*(BSE SME|NSE SME|BSE|NSE|IPO)?[UOCL]?\s*L?@\s*-?[\d,.]+\s*\(?[-\d,.%]*\)?/i, "");
  
  // 2. Remove trailing exchange name with optional status letter (e.g. BSE SMEU, NSE SMEL, IPOU)
  cleaned = cleaned.replace(/\s*(BSE SME|NSE SME|BSE|NSE|IPO)[UOCL]?\s*$/i, "");
  
  // 3. Remove standalone trailing status letter if any (must have space before it)
  cleaned = cleaned.replace(/\s+[UOCL]$/i, "");
  
  return cleaned.trim();
}

function parseInvestorGainDate(dateText) {
  if (!dateText || dateText === "-" || dateText.includes("--") || dateText.toLowerCase().includes("tbd") || dateText.toLowerCase().includes("tba")) return null;
  // Discard subsequent lines (e.g. \nGMP: -28) before splitting on '-'
  const dateLine = dateText.split("\n")[0].trim();
  const parts = dateLine.split("-");
  if (parts.length < 2) return null;
  const day = parseInt(parts[0], 10);
  const monthStr = parts[1].toLowerCase();
  const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
  const month = months[monthStr.slice(0, 3)];
  if (!month) return null;
  let year = new Date().getFullYear();
  if (parts.length >= 3) {
    const y = parseInt(parts[2], 10);
    if (y < 100) year = 2000 + y;
    else year = y;
  }
  const pad = (n) => String(n).padStart(2, "0");
  return `${year}-${month}-${pad(day)}`;
}

function addDays(dateStr, days) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + "T00:00:00+05:30");
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}

function getSearchKeywords(company) {
  let name = company.replace(/Limited|Ltd\.|Co\.|Corporation|Trust|InvIT|Private|Pvt|and|&/gi, "").trim();
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 2) {
    return words.slice(0, 2).join(" ");
  }
  return name;
}

async function findCorrectDrhpUrl(companyName, browser) {
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
  });

  try {
    const searchKeyword = getSearchKeywords(companyName);
    console.log(`[SEBI SEARCH] Searching SEBI filings for: "${searchKeyword}"`);
    
    await page.goto("https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=3&ssid=15&smid=10", {
      waitUntil: "domcontentloaded",
      timeout: 20000
    });

    await page.waitForSelector("#search", { timeout: 5005 });
    await page.fill("#search", searchKeyword);
    await page.click(".go_search");
    
    await page.waitForTimeout(3000);

    const match = await page.evaluate(() => {
      const linkEl = document.querySelector("#sample_1 tbody tr td a.points");
      if (linkEl) {
        return {
          title: linkEl.innerText.trim(),
          href: linkEl.getAttribute("href")
        };
      }
      return null;
    });

    if (match && match.href) {
      console.log(`[SEBI SUCCESS] Found official URL for ${companyName}: ${match.href}`);
      return match.href;
    }
    return null;
  } catch (err) {
    console.warn(`[SEBI WARN] Error searching SEBI for "${companyName}":`, err.message);
    return null;
  } finally {
    await page.close();
  }
}

async function scrapeIpoDetailPage(page, href) {
  const url = href.startsWith("http") ? href : `https://www.investorgain.com${href}`;
  try {
    console.log(`[DETAIL SCRAPE] Fetching details from: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1000);
    
    const info = await page.evaluate(() => {
      const result = { registrar: "To Be Announced", leadManager: "To Be Announced" };
      
      const cells = Array.from(document.querySelectorAll("td, th, p, li, div, b, strong"));
      
      // Registrar search
      const regCell = cells.find(el => {
        const txt = el.innerText.trim().toLowerCase();
        return txt.includes("registrar:") || txt === "registrar";
      });
      if (regCell) {
        const text = regCell.parentElement ? regCell.parentElement.innerText : regCell.innerText;
        const m = text.match(/Registrar:\s*(.*)/i);
        if (m && m[1]) result.registrar = m[1].split("\n")[0].trim();
      }

      // Lead Manager search
      const lmCell = cells.find(el => {
        const txt = el.innerText.trim().toLowerCase();
        return txt.includes("lead manager:") || txt.includes("lead managers:") || txt === "lead manager";
      });
      if (lmCell) {
        const text = lmCell.parentElement ? lmCell.parentElement.innerText : lmCell.innerText;
        const m = text.match(/Lead Manager[s]?:\s*(.*)/i);
        if (m && m[1]) result.leadManager = m[1].split("\n")[0].trim();
      }
      
      return result;
    });
    return info;
  } catch (err) {
    console.warn(`[DETAIL WARN] Failed to scrape detail page:`, err.message);
    return { registrar: "To Be Announced", leadManager: "To Be Announced" };
  }
}

async function scrapeGmp(page) {
  await page.goto(GMP_URL, { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(2000);
  const rows = await extractTable(page, "gmp");

  const result = {};
  for (const { cells } of rows) {
    const rawName = cells[0];
    const id = resolveId(cleanScrapedName(rawName || ""));
    if (!id) continue;

    const gmp = parseGmpCell(cells[1]);
    const priceRaw = toNumber(cells[4]);
    const price = priceRaw && priceRaw > 0 ? priceRaw : undefined;
    if (gmp === undefined && price === undefined) continue;

    result[id] = {
      ...(gmp !== undefined ? { gmp } : {}),
      ...(price !== undefined ? { priceMax: price } : {}),
      ...(gmp !== undefined && price !== undefined ? { estListing: price + gmp } : {}),
    };
  }
  return { result, rows };
}

async function scrapeSubscription(page) {
  await page.goto(SUB_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(4000);
  const rows = await extractTable(page, "sub");

  const result = {};
  for (const { cells } of rows) {
    const rawName = cleanScrapedName(cells[0] || "");
    const id = resolveId(rawName);
    if (!id) continue;

    const overall = toNumber(cells[1]);
    const qib = toNumber(cells[2]);
    const snii = toNumber(cells[3]);
    const bnii = toNumber(cells[4]);
    const hni = toNumber(cells[5]);
    const retail = toNumber(cells[6]);
    if ([qib, hni, retail, overall, snii, bnii].every((v) => v === undefined)) continue;

    result[id] = {
      overall: overall ?? 0,
      qib: qib ?? 0,
      snii: snii ?? 0,
      bnii: bnii ?? 0,
      hni: hni ?? 0,
      retail: retail ?? 0
    };
  }
  return result;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  });

  // 1. Load ipos.json
  let iposBase = [];
  try {
    const content = await readFile(IPOS_JSON_PATH, "utf-8");
    iposBase = JSON.parse(content);
    console.log(`Loaded ${iposBase.length} baseline IPOs from ipos.json.`);
  } catch (e) {
    console.warn("Could not read ipos.json, starting with empty baseline.");
  }

  // Register baseline entries in NAME_TO_ID mapping dynamically
  for (const ipo of iposBase) {
    const norm = normalizeName(ipo.company || ipo.name);
    NAME_TO_ID[norm] = ipo.id;
  }

  let gmpPatches = {};
  let rawGmpRows = [];
  let subPatches = {};
  const errors = [];

  try {
    const gmpData = await scrapeGmp(page);
    gmpPatches = gmpData.result;
    rawGmpRows = gmpData.rows;
  } catch (err) {
    console.error("GMP scrape failed:", err.message);
    errors.push(`gmp: ${err.message}`);
  }

  // 2. Automated IPO Discovery & Pipeline Addition
  let databaseUpdated = false;
  for (const { cells, href } of rawGmpRows) {
    const rawName = cells[0];
    const cleanedName = cleanScrapedName(rawName || "");
    let id = resolveId(cleanedName);
    
    if (!id && cleanedName) {
      // Discovered new IPO!
      const generatedId = normalizeName(cleanedName).replace(/\s+/g, "-");
      id = generatedId;
      console.log(`[DISCOVERY] Found NEW IPO: "${cleanedName}" -> Generated ID: "${id}"`);
      
      // Register in NAME_TO_ID mapping dynamically
      NAME_TO_ID[normalizeName(cleanedName)] = id;

      const isSme = rawName.toLowerCase().includes("sme");
      const type = isSme ? "SME" : "Mainboard";
      
      let exchange = "BSE, NSE";
      if (rawName.toLowerCase().includes("bse sme")) exchange = "BSE SME";
      else if (rawName.toLowerCase().includes("nse sme") || rawName.toLowerCase().includes("nse emerge")) exchange = "NSE Emerge";

      const priceMaxVal = toNumber(cells[4]);
      const priceMax = priceMaxVal && priceMaxVal > 0 ? priceMaxVal : null;
      const priceMin = priceMax;
      const lot = toNumber(cells[6]) || null;
      const issueSize = toNumber(cells[5]) || null;
      
      const open = parseInvestorGainDate(cells[7]);
      const close = parseInvestorGainDate(cells[8]);
      const allotment = parseInvestorGainDate(cells[9]);
      const listing = parseInvestorGainDate(cells[10]);
      
      const refund = allotment ? addDays(allotment, 1) : null;
      const demat = allotment ? addDays(allotment, 1) : null;

      const gmp = parseGmpCell(cells[1]);
      const estListing = priceMax && gmp !== undefined ? priceMax + gmp : null;

      let sector = "General";
      const nameLower = cleanedName.toLowerCase();
      if (nameLower.includes("textile") || nameLower.includes("fabrics") || nameLower.includes("cotton") || nameLower.includes("yarn")) sector = "Textiles";
      else if (nameLower.includes("tech") || nameLower.includes("software") || nameLower.includes("digital") || nameLower.includes("cyber") || nameLower.includes("virtual")) sector = "IT Services & Technology";
      else if (nameLower.includes("steel") || nameLower.includes("metal") || nameLower.includes("forge") || nameLower.includes("alloy")) sector = "Metal & Forging";
      else if (nameLower.includes("logistics") || nameLower.includes("transport") || nameLower.includes("carrier")) sector = "Logistics";
      else if (nameLower.includes("chemical") || nameLower.includes("refinery") || nameLower.includes("catalyst")) sector = "Specialty Chemicals";
      else if (nameLower.includes("energy") || nameLower.includes("power") || nameLower.includes("solar")) sector = "Energy & Power";
      else if (nameLower.includes("packaging") || nameLower.includes("polyplast") || nameLower.includes("plast")) sector = "Packaging & Plastics";
      else if (nameLower.includes("retail") || nameLower.includes("supermarket") || nameLower.includes("mart")) sector = "Retail";
      else if (nameLower.includes("finance") || nameLower.includes("capital") || nameLower.includes("mutual") || nameLower.includes("fund")) sector = "Financial Services";

      let detailInfo = { registrar: "To Be Announced", leadManager: "To Be Announced" };
      if (href) {
        detailInfo = await scrapeIpoDetailPage(page, href);
      }

      const newIpo = {
        id,
        name: cleanedName,
        company: cleanedName + " Limited",
        type,
        status: "Upcoming",
        open,
        close,
        listing,
        allotment,
        refund,
        demat,
        priceMin,
        priceMax,
        faceValue: 10,
        lot,
        issueSize,
        freshIssue: issueSize,
        ofs: 0,
        gmp: gmp ?? 0,
        trend: gmp && gmp > 0 ? "up" : "stable",
        estListing,
        listedAt: null,
        currentPrice: null,
        gmpHistory: gmp !== undefined ? [{ d: new Date().toLocaleDateString("en-US", { day: "2-digit", month: "short" }), v: gmp }] : [],
        drhp: "https://www.sebi.gov.in/filings/public-issues.html",
        rhp: null,
        leadManager: detailInfo.leadManager,
        exchange,
        sub: null,
        fin: null,
        about: `${cleanedName} Limited is a newly announced ${type} IPO operating in the ${sector} sector. The company is launching its issue on ${exchange}.`,
        sector,
        registrar: detailInfo.registrar,
        strengths: [`Growing market footprint in the ${sector} sector`, "Experienced promoter group and management team"],
        risks: ["Operating scale limits relative to larger peers", "Highly competitive market segment and raw material cost exposure"]
      };

      // Search SEBI filings for the correct DRHP link
      const drhpUrl = await findCorrectDrhpUrl(newIpo.company, browser);
      if (drhpUrl) {
        newIpo.drhp = drhpUrl;
      }

      iposBase.push(newIpo);
      databaseUpdated = true;

      // Add patch so it has GMP right away
      if (gmp !== undefined || priceMax !== null) {
        gmpPatches[id] = {
          ...(gmp !== undefined ? { gmp } : {}),
          ...(priceMax !== null ? { priceMax } : {}),
          ...(gmp !== undefined && priceMax !== null ? { estListing } : {}),
        };
      }
    }
  }

  if (databaseUpdated) {
    console.log(`[DATABASE UPDATE] Writing ${iposBase.length} records back to ipos.json...`);
    await writeFile(IPOS_JSON_PATH, JSON.stringify(iposBase, null, 2), "utf-8");
  }

  try {
    subPatches = await scrapeSubscription(page);
  } catch (err) {
    console.error("Subscription scrape failed:", err.message);
    errors.push(`sub: ${err.message}`);
  }

  await browser.close();

  // 3. Update live-data.json
  let existingIpos = {};
  try {
    const existingContent = await readFile(OUTPUT_PATH, "utf-8");
    const parsed = JSON.parse(existingContent);
    if (parsed && parsed.ipos) {
      existingIpos = parsed.ipos;
    }
  } catch (e) {
    // Ignore
  }

  const ids = new Set([...Object.keys(existingIpos), ...Object.keys(gmpPatches), ...Object.keys(subPatches)]);
  const ipos = {};
  for (const id of ids) {
    const existingIpo = existingIpos[id] || {};
    const newGmp = gmpPatches[id] || {};
    const newSub = subPatches[id] || {};

    ipos[id] = {
      ...existingIpo,
      ...newGmp,
    };

    if (existingIpo.sub || newSub) {
      ipos[id].sub = {
        ...(existingIpo.sub || {}),
        ...newSub,
      };
    }
  }

  const output = { updatedAt: new Date().toISOString(), errors, ipos };

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log(`Wrote live-data.json with ${Object.keys(ipos).length} matched IPOs.`);
}

main().catch((err) => {
  console.error("Fatal scraper error:", err);
  process.exit(1);
});
