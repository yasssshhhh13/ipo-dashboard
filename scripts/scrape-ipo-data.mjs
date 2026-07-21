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
  "happy steels": "happy-steel",
  "happy steel": "happy-steel",
  "sbi funds management": "sbi-funds-management",
  "sbi funds": "sbi-funds-management",
  "kratikal tech": "kratikal-tech",
  "teja engineering": "teja-engineering",
  "teja engineering industries": "teja-engineering",
  "vinit mobile": "vinit-mobile",
  "sampark india logistics": "sampark-india-logistics",
  "sampark logistics": "sampark-india-logistics",
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
  "advit jewels": "advit-jewels",
  "laser power infra": "laser-power-infra",
  "laser power": "laser-power-infra",
  "alpine texworld": "alpine-texworld",
  "gulf lloyds": "gulf-lloyds",
  "millworks technologies": "millworks-technologies",
  "crazy snacks": "crazy-snacks",
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

function companyTokens(name) {
  return normalizeName(name)
    .replace(/\b(and|the|of|india)\b/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function isSameCompanyName(a, b) {
  const ta = companyTokens(a);
  const tb = companyTokens(b);
  if (!ta.length || !tb.length) return false;
  if (ta[0] !== tb[0]) return false;
  if (!ta[1] || !tb[1]) return true;
  return ta[1] === tb[1];
}

/** Fuzzy match against baseline so DRHP stubs don't spawn a second open IPO. */
function findExistingIpo(iposBase, cleanedName, generatedId) {
  const byId = iposBase.find((i) => i.id === generatedId);
  if (byId) return byId;
  return iposBase.find((i) => isSameCompanyName(i.company || i.name, cleanedName)) || null;
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

// Once an IPO lists, InvestorGain appends the listing price to the name cell
// as "...IPO L@574.00 (17.42%)" (L@ = "Listed at"; the % is listing gain vs
// issue price). Capture that so listedAt is filled automatically — no manual
// data entry. Returns { listedAt, listingGainPct } or null.
function parseListingInfo(rawName) {
  if (!rawName) return null;
  const m = rawName.match(/L@\s*(-?[\d,]+(?:\.\d+)?)\s*(?:\(\s*(-?[\d,]+(?:\.\d+)?)\s*%\s*\))?/i);
  if (!m) return null;
  const price = parseFloat(m[1].replace(/,/g, ""));
  if (!Number.isFinite(price) || price <= 0) return null;
  const gainPct = m[2] != null ? parseFloat(m[2].replace(/,/g, "")) : null;
  return { listedAt: price, listingGainPct: Number.isFinite(gainPct) ? gainPct : null };
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

function calculateStatus(ipo) {
  // If listed price or current price exists, it is Listed
  if (ipo.listedAt !== null && ipo.listedAt !== undefined) return "Listed";
  if (ipo.currentPrice !== null && ipo.currentPrice !== undefined) return "Listed";

  if (!ipo.open) return "Upcoming";
  const today = new Date();
  const d = (s) => new Date(s + "T00:00:00+05:30");
  const open = d(ipo.open);
  if (today < open) return "Upcoming";
  
  if (!ipo.close) return "Open";
  const closeEnd = new Date(d(ipo.close).getTime() + 24 * 60 * 60 * 1000 - 1);
  if (today <= closeEnd) return "Open";
  
  if (!ipo.listing) return "Closed";
  const listing = d(ipo.listing);
  if (today < listing) return "Closed";
  return "Listed";
}

function validateChronology(ipo) {
  const warnings = [];
  const d = (s) => (s ? new Date(s + "T00:00:00+05:30") : null);
  const open = d(ipo.open);
  const close = d(ipo.close);
  const allotment = d(ipo.allotment);
  const listing = d(ipo.listing);

  if (open && close && close < open) warnings.push("close date is before open date");
  if (close && allotment && allotment < close) warnings.push("allotment date is before close date");
  if (allotment && listing && listing < allotment) warnings.push("listing date is before allotment date");

  return warnings;
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

function isMissingRegistrar(value) {
  if (!value) return true;
  const n = String(value).trim().toLowerCase();
  return !n || n === "to be announced" || n === "tba" || n === "n/a" || n === "-";
}

function cleanDetailField(value) {
  if (!value) return null;
  let v = String(value)
    .replace(/\s+/g, " ")
    .replace(/\*\*/g, "")
    .split(/Website:|Phone:|Email:|Last Updated/i)[0]
    .trim();
  // Drop trailing junk from table cells / adjacent labels
  v = v.replace(/\s*(Lead Manager|Allotment Status|DRHP|RHP).*$/i, "").trim();
  if (!v || isMissingRegistrar(v)) return null;
  return v;
}

function toAbsoluteInvestorGainUrl(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  return `https://www.investorgain.com${href.startsWith("/") ? href : `/${href}`}`;
}

/** Convert GMP/subscription hrefs into the stable IPO detail page URL. */
function toInvestorGainDetailUrl(href) {
  const abs = toAbsoluteInvestorGainUrl(href);
  if (!abs) return null;
  const m =
    abs.match(/\/(?:gmp|subscription)\/([^/]+)\/(\d+)\/?/i) ||
    abs.match(/\/ipo\/([^/]+)\/(\d+)\/?/i);
  if (m) return `https://www.investorgain.com/ipo/${m[1]}/${m[2]}/`;
  return abs;
}

async function scrapeIpoDetailPage(page, href) {
  const url = toInvestorGainDetailUrl(href) || toAbsoluteInvestorGainUrl(href);
  if (!url) return { registrar: null, leadManager: null, detailUrl: null };
  try {
    console.log(`[DETAIL SCRAPE] Fetching details from: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1200);

    const info = await page.evaluate(() => {
      const result = { registrar: null, leadManager: null };

      const clean = (v) => {
        if (!v) return null;
        let s = String(v).replace(/\s+/g, " ").trim();
        s = s.split(/Website:|Phone:|Email:|Last Updated/i)[0].trim();
        s = s.replace(/\s*(Lead Manager|Allotment Status|DRHP|RHP).*$/i, "").trim();
        const low = s.toLowerCase();
        if (!s || low === "to be announced" || low === "tba" || low === "-" || low === "n/a") return null;
        return s;
      };

      // Prefer labeled table rows: | Registrar | Bigshare ... |
      const rows = Array.from(document.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("th, td")).map((c) => c.innerText.trim());
        if (cells.length < 2) continue;
        const label = cells[0].toLowerCase().replace(/:$/, "");
        const value = cells.slice(1).join(" ").trim();
        if ((label === "registrar" || label.includes("registrar")) && !result.registrar) {
          result.registrar = clean(value);
        }
        if ((label.includes("lead manager") || label.includes("book running")) && !result.leadManager) {
          result.leadManager = clean(value);
        }
      }

      const bodyText = document.body ? document.body.innerText : "";
      if (!result.registrar) {
        const m = bodyText.match(/Registrar(?:\s+to\s+the\s+[Ii]ssue)?\s*[:\n]\s*([^\n]+)/);
        if (m) result.registrar = clean(m[1]);
      }
      if (!result.leadManager) {
        const m = bodyText.match(/Lead Manager[s]?\s*[:\n]\s*([^\n]+)/);
        if (m) result.leadManager = clean(m[1]);
      }

      return result;
    });

    return {
      registrar: cleanDetailField(info.registrar),
      leadManager: cleanDetailField(info.leadManager),
      detailUrl: url,
    };
  } catch (err) {
    console.warn(`[DETAIL WARN] Failed to scrape detail page:`, err.message);
    return { registrar: null, leadManager: null, detailUrl: url };
  }
}

function applyDetailInfo(ipo, detailInfo) {
  if (!ipo || !detailInfo) return false;
  let changed = false;
  if (detailInfo.detailUrl && ipo.investorgainUrl !== detailInfo.detailUrl) {
    ipo.investorgainUrl = detailInfo.detailUrl;
    changed = true;
  }
  if (detailInfo.registrar && isMissingRegistrar(ipo.registrar)) {
    ipo.registrar = detailInfo.registrar;
    changed = true;
    console.log(`[REGISTRAR] "${ipo.name}" -> ${detailInfo.registrar}`);
  }
  if (detailInfo.leadManager && isMissingRegistrar(ipo.leadManager)) {
    ipo.leadManager = detailInfo.leadManager;
    changed = true;
  }
  return changed;
}

/** True when we still need registrar before / around allotment. */
function needsRegistrarRefresh(ipo) {
  if (!isMissingRegistrar(ipo?.registrar)) return false;
  const status = (ipo.status || "").toLowerCase();
  if (["open", "closed", "upcoming"].includes(status)) return true;
  if (!ipo.allotment) return status === "listed";
  // Keep trying until a few days after allotment so Closed→Listed IPOs get a link
  const today = new Date();
  const allot = new Date(`${ipo.allotment}T00:00:00+05:30`);
  const daysAfter = (today - allot) / (1000 * 60 * 60 * 24);
  return daysAfter <= 10;
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
    const listing = parseListingInfo(rawName);
    if (gmp === undefined && price === undefined && !listing) continue;

    result[id] = {
      ...(gmp !== undefined ? { gmp } : {}),
      ...(price !== undefined ? { priceMax: price } : {}),
      ...(gmp !== undefined && price !== undefined ? { estListing: price + gmp } : {}),
      // Listing price captured automatically the moment the IPO lists.
      ...(listing ? { listedAt: listing.listedAt, currentPrice: listing.listedAt } : {}),
    };
  }
  return { result, rows };
}

async function scrapeSubscription(page, iposBase) {
  await page.goto(SUB_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);

  // InvestorGain defaults to "Open" only — switch to All so Closed/Listed
  // IPOs keep getting subscription refreshes until figures stabilize.
  try {
    const allClicked = await page.evaluate(() => {
      const candidates = Array.from(document.querySelectorAll("a, button, label, span, li, div"));
      const allBtn = candidates.find((el) => {
        const t = (el.textContent || "").trim().toLowerCase();
        return t === "all" || t.startsWith("all ");
      });
      if (allBtn) {
        allBtn.click();
        return true;
      }
      return false;
    });
    if (allClicked) {
      console.log("[Subscription] Switched filter to All (Open+Closed+Listed)");
      await page.waitForTimeout(2500);
    }
  } catch (err) {
    console.warn("[Subscription] Could not switch to All filter:", err.message);
  }

  const rows = await extractTable(page, "sub");
  const result = {};

  for (const { cells, href } of rows) {
    const rawName = cleanScrapedName(cells[0] || "");
    let id = resolveId(rawName);
    if (!id && rawName) {
      const generatedId = normalizeName(rawName).replace(/\s+/g, "-");
      const existing = findExistingIpo(iposBase, rawName, generatedId);
      if (existing) id = existing.id;
    }
    if (!id) continue;

    const ipo = iposBase.find((i) => i.id === id);
    if (!ipo) continue;
    if (!ipo.open) continue;

    const today = new Date();
    const openDate = new Date(ipo.open + "T00:00:00+05:30");
    if (today < openDate) continue;
    if (!href) continue;

    const match = href.match(/\/gmp\/([^/]+)\/(\d+)\/?/) || href.match(/\/subscription\/([^/]+)\/(\d+)\/?/);
    if (!match) continue;

    const slug = match[1];
    const numericId = match[2];
    const subPageUrl = `https://www.investorgain.com/subscription/${slug}/${numericId}/`;

    console.log(`[Subscription] Fetching detailed subscription for ${id} from: ${subPageUrl}`);
    try {
      await page.goto(subPageUrl, { waitUntil: "load", timeout: 20000 });
      await page.waitForTimeout(1500);

      const parsed = await page.evaluate(() => {
        const out = { shares: {}, apps: {} };

        const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        for (const el of scripts) {
          try {
            const data = JSON.parse(el.innerText);
            if (data && data["@type"] === "Dataset" && Array.isArray(data.variableMeasured)) {
              const findValue = (name) => {
                const prop = data.variableMeasured.find((p) => p.name === name);
                return prop ? parseFloat(prop.value) : undefined;
              };
              out.shares.overall = findValue("Total Subscription");
              out.shares.qib = findValue("QIB Subscription");
              out.shares.snii = findValue("sNII Subscription") || findValue("Small NII Subscription");
              out.shares.bnii = findValue("bNII Subscription") || findValue("Big NII Subscription");
              out.shares.hni = findValue("NII Subscription");
              out.shares.retail = findValue("RII Subscription");
              out.shares.employee = findValue("Employee Subscription") || findValue("EMP Subscription") || findValue("Employee Individual Subscription");
              out.shares.shareholder = findValue("Shareholder Subscription") || findValue("SHR Subscription") || findValue("Share Holder Subscription");
              out.shares.policyholder = findValue("Policyholder Subscription") || findValue("POL Subscription") || findValue("Policy Holder Subscription");
            }
          } catch { /* ignore */ }
        }

        // Application-wise / allotment odds tables on InvestorGain often include
        // "Applications" or "Times (Apps)" style columns — parse when present.
        const tables = Array.from(document.querySelectorAll("table"));
        for (const table of tables) {
          const headers = Array.from(table.querySelectorAll("th")).map((th) => th.innerText.trim().toLowerCase());
          if (!headers.length) continue;
          const appsIdx = headers.findIndex((h) => h.includes("application") || h.includes("apps") || h.includes("allotment chance") || h.includes("odds"));
          const catIdx = headers.findIndex((h) => h.includes("category") || h.includes("investor") || h === "quota");
          if (appsIdx < 0) continue;

          for (const tr of Array.from(table.querySelectorAll("tbody tr"))) {
            const tds = Array.from(tr.querySelectorAll("td"));
            if (!tds.length) continue;
            const cat = (catIdx >= 0 ? tds[catIdx] : tds[0])?.innerText.trim().toLowerCase() || "";
            const appsRaw = tds[appsIdx]?.innerText || "";
            const m = appsRaw.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
            if (!m) continue;
            const appsVal = parseFloat(m[1]);
            if (!Number.isFinite(appsVal) || appsVal <= 0) continue;

            if (cat.includes("retail") || cat.includes("rii")) out.apps.retail_apps = appsVal;
            else if (cat.includes("snii") || cat.includes("s-nii") || cat.includes("small nii") || cat.includes("shni") || cat.includes("s-hni")) out.apps.shni_apps = appsVal;
            else if (cat.includes("bnii") || cat.includes("b-nii") || cat.includes("big nii") || cat.includes("bhni") || cat.includes("b-hni")) out.apps.bhni_apps = appsVal;
            else if (cat.includes("employee") || cat === "emp") out.apps.employee_apps = appsVal;
            else if (cat.includes("shareholder") || cat === "shr") out.apps.shareholder_apps = appsVal;
            else if (cat.includes("policyholder") || cat === "pol") out.apps.policyholder_apps = appsVal;
          }
        }

        return out;
      });

      const s = parsed.shares || {};
      const a = parsed.apps || {};
      if ([s.qib, s.hni, s.retail, s.overall, s.snii, s.bnii, s.employee, s.shareholder, s.policyholder].every((v) => v === undefined)) {
        continue;
      }

      result[id] = {
        overall: s.overall ?? 0,
        qib: s.qib ?? 0,
        snii: s.snii ?? 0,
        bnii: s.bnii ?? 0,
        hni: s.hni ?? 0,
        retail: s.retail ?? 0,
        ...(s.employee !== undefined ? { employee: s.employee } : {}),
        ...(s.shareholder !== undefined ? { shareholder: s.shareholder } : {}),
        ...(s.policyholder !== undefined ? { policyholder: s.policyholder } : {}),
        ...(a.retail_apps !== undefined ? { retail_apps: a.retail_apps } : {}),
        ...(a.shni_apps !== undefined ? { shni_apps: a.shni_apps } : {}),
        ...(a.bhni_apps !== undefined ? { bhni_apps: a.bhni_apps } : {}),
        ...(a.employee_apps !== undefined ? { employee_apps: a.employee_apps } : {}),
        ...(a.shareholder_apps !== undefined ? { shareholder_apps: a.shareholder_apps } : {}),
        ...(a.policyholder_apps !== undefined ? { policyholder_apps: a.policyholder_apps } : {}),
      };
      console.log(`[Subscription] Successfully scraped for ${id}:`, result[id]);
    } catch (err) {
      console.error(`[Subscription] Failed to scrape sub page for ${id}:`, err.message);
    }
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
    
    // Fuzzy-match against existing baseline before treating as brand-new
    if (!id && cleanedName) {
      const generatedId = normalizeName(cleanedName).replace(/\s+/g, "-");
      const existing = findExistingIpo(iposBase, cleanedName, generatedId);
      if (existing) {
        id = existing.id;
        NAME_TO_ID[normalizeName(cleanedName)] = id;
        console.log(`[DEDUP] "${cleanedName}" matched existing IPO "${existing.name}" (${id})`);
      }
    }

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

      let detailInfo = { registrar: null, leadManager: null, detailUrl: null };
      if (href) {
        detailInfo = await scrapeIpoDetailPage(page, href);
      }

      const newIpo = {
        id,
        name: cleanedName,
        company: cleanedName + " Limited",
        type,
        status: calculateStatus({ open, close, listing }),
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
        leadManager: detailInfo.leadManager || "To Be Announced",
        exchange,
        sub: null,
        fin: null,
        about: `${cleanedName} Limited is a newly announced ${type} IPO operating in the ${sector} sector. The company is launching its issue on ${exchange}.`,
        sector,
        registrar: detailInfo.registrar || "To Be Announced",
        investorgainUrl: detailInfo.detailUrl || toInvestorGainDetailUrl(href),
        strengths: [`Growing market footprint in the ${sector} sector`, "Experienced promoter group and management team"],
        risks: ["Operating scale limits relative to larger peers", "Highly competitive market segment and raw material cost exposure"]
      };

      const chronologyWarnings = validateChronology(newIpo);
      if (chronologyWarnings.length > 0) {
        console.warn(`[DATE WARN] "${newIpo.name}" has inconsistent IPO timeline: ${chronologyWarnings.join("; ")}`);
      }

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
    } else if (id) {
      // Existing IPO! Let's update its dates and status if we parsed newer/better values from the row.
      const existingIpo = iposBase.find(i => i.id === id);
      if (existingIpo) {
        let changed = false;

        const open = parseInvestorGainDate(cells[7]);
        const close = parseInvestorGainDate(cells[8]);
        const allotment = parseInvestorGainDate(cells[9]);
        const listing = parseInvestorGainDate(cells[10]);

        if (open && existingIpo.open !== open) { existingIpo.open = open; changed = true; }
        if (close && existingIpo.close !== close) { existingIpo.close = close; changed = true; }
        if (allotment && existingIpo.allotment !== allotment) { existingIpo.allotment = allotment; changed = true; }
        if (listing && existingIpo.listing !== listing) { existingIpo.listing = listing; changed = true; }

        // Auto-capture listing price from the name cell (e.g. "L@574 (17%)").
        const listingInfo = parseListingInfo(rawName);
        if (listingInfo && existingIpo.listedAt == null) {
          existingIpo.listedAt = listingInfo.listedAt;
          if (existingIpo.currentPrice == null) existingIpo.currentPrice = listingInfo.listedAt;
          changed = true;
          console.log(`[LISTING] "${existingIpo.name}" listed at ₹${listingInfo.listedAt}` +
            (listingInfo.listingGainPct != null ? ` (${listingInfo.listingGainPct}%)` : ""));
        }

        const chronologyWarnings = validateChronology(existingIpo);
        if (chronologyWarnings.length > 0) {
          console.warn(`[DATE WARN] "${existingIpo.name}" has inconsistent IPO timeline: ${chronologyWarnings.join("; ")}`);
        }

        const calculatedStatus = calculateStatus(existingIpo);
        if (existingIpo.status !== calculatedStatus) {
          console.log(`[STATUS UPDATE] Existing IPO "${existingIpo.name}" status changing from "${existingIpo.status}" to "${calculatedStatus}"`);
          existingIpo.status = calculatedStatus;
          changed = true;
        }

        // Persist InvestorGain detail URL and backfill missing registrar/lead manager
        const detailUrl = toInvestorGainDetailUrl(href);
        if (detailUrl && existingIpo.investorgainUrl !== detailUrl) {
          existingIpo.investorgainUrl = detailUrl;
          changed = true;
        }
        if (needsRegistrarRefresh(existingIpo) && (href || existingIpo.investorgainUrl)) {
          const detailInfo = await scrapeIpoDetailPage(page, href || existingIpo.investorgainUrl);
          if (applyDetailInfo(existingIpo, detailInfo)) changed = true;
        }

        if (changed) {
          console.log(`[UPDATE] Updated dates/status/registrar for existing IPO: "${existingIpo.name}"`);
          databaseUpdated = true;
        }
      }
    }
  }

  // Final sweep: status + registrar backfill for IPOs not on today's GMP table
  for (const ipo of iposBase) {
    const calculated = calculateStatus(ipo);
    if (ipo.status !== calculated) {
      console.log(`[SWEEP] Updating status of "${ipo.name}" from "${ipo.status}" to "${calculated}"`);
      ipo.status = calculated;
      databaseUpdated = true;
    }
    if (needsRegistrarRefresh(ipo) && ipo.investorgainUrl) {
      const detailInfo = await scrapeIpoDetailPage(page, ipo.investorgainUrl);
      if (applyDetailInfo(ipo, detailInfo)) databaseUpdated = true;
    }
  }

  // Defer ipos.json write until after subscription scrape so we can persist
  // both status/date updates and final subscription figures in one pass.

  try {
    subPatches = await scrapeSubscription(page, iposBase);
  } catch (err) {
    console.error("Subscription scrape failed:", err.message);
    errors.push(`sub: ${err.message}`);
  }

  await browser.close();

  // Persist freshly scraped subscription into ipos.json so Closed/Listed IPOs
  // keep final figures after they drop off InvestorGain's "Open" live table.
  let baselineSubUpdated = false;
  for (const [id, newSub] of Object.entries(subPatches)) {
    const baseIpo = iposBase.find((i) => i.id === id);
    if (!baseIpo || !newSub || Object.keys(newSub).length === 0) continue;
    const prev = baseIpo.sub || {};
    baseIpo.sub = { ...prev, ...newSub };
    baselineSubUpdated = true;
    console.log(`[BASELINE SUB] Persisted subscription for "${baseIpo.name}"`);
  }
  if (baselineSubUpdated || databaseUpdated) {
    console.log(`[DATABASE UPDATE] Writing ${iposBase.length} records back to ipos.json...`);
    await writeFile(IPOS_JSON_PATH, JSON.stringify(iposBase, null, 2), "utf-8");
  }

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

  const ids = new Set([
    ...Object.keys(existingIpos),
    ...Object.keys(gmpPatches),
    ...Object.keys(subPatches),
    ...iposBase.filter((i) => i.sub).map((i) => i.id),
  ]);
  const ipos = {};
  for (const id of ids) {
    const existingIpo = existingIpos[id] || {};
    const newGmp = gmpPatches[id] || {};
    const newSub = subPatches[id] || {};
    const baseIpo = iposBase.find((i) => i.id === id);

    const { sub: existingSub, ...existingIpoWithoutSub } = existingIpo;

    ipos[id] = {
      ...existingIpoWithoutSub,
      ...newGmp,
    };

    const latestStatus = baseIpo ? calculateStatus(baseIpo) : "Upcoming";
    const isUpcoming = latestStatus === "Upcoming" || latestStatus === "DRHP Filed";

    // Prefer fresh scrape → else previous live sub → else baseline ipos.json sub.
    // Never drop known subscription just because the IPO left the live Open table.
    if (!isUpcoming) {
      if (newSub && Object.keys(newSub).length > 0) {
        const baselineApps = {};
        if (baseIpo?.sub) {
          for (const k of ["retail_apps", "shni_apps", "bhni_apps", "snii_apps", "bnii_apps", "employee_apps", "shareholder_apps", "policyholder_apps"]) {
            if (baseIpo.sub[k] != null && newSub[k] == null) baselineApps[k] = baseIpo.sub[k];
          }
        }
        ipos[id].sub = { ...baselineApps, ...newSub };
      } else if (existingSub && Object.keys(existingSub).length > 0) {
        ipos[id].sub = existingSub;
      } else if (baseIpo?.sub && Object.keys(baseIpo.sub).length > 0) {
        ipos[id].sub = baseIpo.sub;
      }
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
