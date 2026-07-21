// BSE (official) source adapter.
//
// BSE exposes public-issue data through its api.bseindia.com JSON endpoints
// (they require a bseindia.com Referer/cookies). Covers mainboard + BSE SME.
//
// NOTE: like NSE, BSE can rate-limit / block CI IPs and occasionally changes
// endpoint shapes. This adapter is best-effort: on any failure it returns an
// empty list and the consensus reconciler continues with the other sources.
// The endpoint list below is intentionally easy to update.

import { toNumber, toCrore } from "../lib/match.mjs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Candidate public-issue JSON endpoints. Flag/segment values cover
// mainboard + SME and current + forthcoming issues.
const API_URLS = [
  "https://api.bseindia.com/BseIndiaAPI/api/GetPublicIssData/w?Flag=P&type=0",
  "https://api.bseindia.com/BseIndiaAPI/api/GetPublicIssData/w?Flag=C&type=0",
  "https://api.bseindia.com/BseIndiaAPI/api/GetPublicIssData/w?Flag=P&type=1",
  "https://api.bseindia.com/BseIndiaAPI/api/GetPublicIssData/w?Flag=C&type=1",
];

function parseBseDate(s) {
  if (!s) return null;
  const str = String(s).trim();
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  const m = str.match(/(\d{1,2})[-\s]([A-Za-z]{3})[-\s](\d{4})/);
  if (m) {
    const months = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    const mm = months[m[2].toLowerCase()];
    if (mm) return `${m[3]}-${mm}-${String(m[1]).padStart(2, "0")}`;
  }
  return null;
}

function parseBand(s) {
  if (s == null) return { priceMin: null, priceMax: null };
  const nums = String(s).replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
  if (!nums) return { priceMin: null, priceMax: null };
  if (nums.length >= 2) return { priceMin: parseFloat(nums[0]), priceMax: parseFloat(nums[1]) };
  return { priceMin: parseFloat(nums[0]), priceMax: parseFloat(nums[0]) };
}

async function fetchJson(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    const text = await page.evaluate(() => (document.body ? document.body.innerText : ""));
    if (!text) return null;
    return JSON.parse(text);
  } catch (err) {
    console.warn(`[BSE] fetch failed (${url}):`, err.message);
    return null;
  }
}

function pick(rec, keys) {
  for (const k of keys) {
    if (rec[k] != null && rec[k] !== "") return rec[k];
  }
  return null;
}

function normalizeRecords(json) {
  const arr = Array.isArray(json)
    ? json
    : (json && Array.isArray(json.Table) ? json.Table
      : (json && Array.isArray(json.data) ? json.data : []));
  const out = [];
  for (const r of arr) {
    const name = pick(r, ["sCompanyName", "CompanyName", "companyName", "scrip_name", "Company"]);
    if (!name) continue;
    const band = parseBand(pick(r, ["PriceBand", "sPriceBand", "OfferPrice", "PdOfferPrice", "priceBand"]));
    const issueRaw = pick(r, ["IssueSize", "sIssueSize", "TotalIssueAmt", "issueSize"]);
    out.push({
      name: String(name).trim(),
      fields: {
        priceMin: band.priceMin,
        priceMax: band.priceMax,
        lot: toNumber(pick(r, ["MarketLot", "sMktLot", "lotSize", "LotSize"])) ?? null,
        issueSize: issueRaw != null ? (toCrore(issueRaw) ?? null) : null,
        open: parseBseDate(pick(r, ["dtOpen", "IssueOpenDate", "OpenDate", "openDate"])),
        close: parseBseDate(pick(r, ["dtClose", "IssueCloseDate", "CloseDate", "closeDate"])),
        listing: parseBseDate(pick(r, ["dtListing", "ListingDate", "listingDate"])),
      },
      meta: { source: "bse", url: "https://www.bseindia.com/publicissue.html", capturedAt: new Date().toISOString() },
    });
  }
  return out;
}

export async function fetchAll(browser) {
  const page = await browser.newPage({
    userAgent: UA,
    extraHTTPHeaders: {
      "Accept": "application/json, text/plain, */*",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.bseindia.com/publicissue.html",
      "Origin": "https://www.bseindia.com",
    },
  });
  const byName = new Map();
  try {
    await page.goto("https://www.bseindia.com/publicissue.html", { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    for (const url of API_URLS) {
      const json = await fetchJson(page, url);
      if (!json) continue;
      for (const rec of normalizeRecords(json)) {
        const existing = byName.get(rec.name);
        if (!existing) { byName.set(rec.name, rec); continue; }
        for (const [k, v] of Object.entries(rec.fields)) {
          if (existing.fields[k] == null && v != null) existing.fields[k] = v;
        }
      }
    }
  } catch (err) {
    console.warn("[BSE] adapter failed:", err.message);
  } finally {
    await page.close().catch(() => {});
  }
  const out = [...byName.values()];
  console.log(`[BSE] collected ${out.length} records`);
  return out;
}
