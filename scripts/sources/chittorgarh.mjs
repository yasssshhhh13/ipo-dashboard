// Chittorgarh source adapter.
//
// Chittorgarh is an independent IPO aggregator (NOT downstream of InvestorGain),
// which makes it a strong second opinion for hard facts: price band, lot size,
// issue size, fresh issue / OFS, face value, the timeline dates, and prospectus
// financials. It contributes votes to the consensus reconciler.

import { isSameCompanyName } from "../lib/match.mjs";

// Report pages that list current + recent IPOs with links to each detail page.
const LIST_URLS = [
  { url: "https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-bse-nse/84/", type: "Mainboard" },
  { url: "https://www.chittorgarh.com/report/sme-ipo-list-in-india-bse-nse-sme/85/", type: "SME" },
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// Cap detail-page visits per run so the CI job stays bounded. We only deep-scrape
// IPOs that match one we already track.
const MAX_DETAIL_VISITS = 25;

async function collectListLinks(page) {
  const links = [];
  for (const { url } of LIST_URLS) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(1500);
      const rows = await page.$$eval("table tbody tr", (trs) =>
        trs
          .map((tr) => {
            const a = tr.querySelector("td a[href*='/ipo/']");
            if (!a) return null;
            return { name: a.innerText.trim(), href: a.getAttribute("href") };
          })
          .filter((r) => r && r.name)
      ).catch(() => []);
      for (const r of rows) links.push(r);
    } catch (err) {
      console.warn(`[Chittorgarh] list page failed (${url}):`, err.message);
    }
  }
  return links;
}

function toAbsolute(href) {
  if (!href) return null;
  if (href.startsWith("http")) return href;
  return `https://www.chittorgarh.com${href.startsWith("/") ? href : `/${href}`}`;
}

async function scrapeDetail(page, url) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1000);
    return await page.evaluate(() => {
      const firstNum = (s) => {
        if (s == null) return null;
        const m = String(s).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
        return m ? parseFloat(m[0]) : null;
      };
      const toCr = (s) => {
        if (s == null) return null;
        const str = String(s).replace(/,/g, "");
        const m = str.match(/([\d.]+)\s*(?:cr|crore|crores)\b/i);
        if (m) return parseFloat(m[1]);
        // Chittorgarh sometimes shows "aggregating up to X Cr" after a share count.
        const m2 = str.match(/agg[^0-9]*([\d.]+)\s*cr/i);
        if (m2) return parseFloat(m2[1]);
        return null;
      };
      const parseDate = (s) => {
        if (!s) return null;
        // e.g. "Mon, Jul 21, 2026" or "Jul 21, 2026" or "21 Jul 2026"
        const cleaned = String(s).replace(/^[A-Za-z]{3},\s*/, "").trim();
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) {
          const pad = (n) => String(n).padStart(2, "0");
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        }
        return null;
      };

      const fields = {
        priceMin: null, priceMax: null, lot: null, issueSize: null,
        freshIssue: null, ofs: null, faceValue: null,
        open: null, close: null, allotment: null, listing: null,
      };

      const rows = Array.from(document.querySelectorAll("tr"));
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("th, td")).map((c) => c.innerText.trim());
        if (cells.length < 2) continue;
        const label = cells[0].toLowerCase().replace(/:$/, "");
        const value = cells.slice(1).join(" ").trim();
        if (!value) continue;

        if (fields.priceMax == null && (label.includes("price band") || label === "issue price" || label.includes("ipo price"))) {
          const nums = value.replace(/,/g, "").match(/\d+(?:\.\d+)?/g);
          if (nums && nums.length >= 2) { fields.priceMin = parseFloat(nums[0]); fields.priceMax = parseFloat(nums[1]); }
          else if (nums && nums.length === 1) { fields.priceMin = parseFloat(nums[0]); fields.priceMax = parseFloat(nums[0]); }
        }
        if (fields.lot == null && label.includes("lot size")) fields.lot = firstNum(value);
        if (fields.faceValue == null && label.includes("face value")) fields.faceValue = firstNum(value);
        if (fields.issueSize == null && label.includes("total issue size")) fields.issueSize = toCr(value);
        if (fields.issueSize == null && label === "issue size") fields.issueSize = toCr(value);
        if (fields.freshIssue == null && label.includes("fresh issue")) fields.freshIssue = toCr(value);
        if (fields.ofs == null && label.includes("offer for sale")) fields.ofs = toCr(value);

        if (fields.open == null && (label === "ipo date" || label.includes("ipo open") || label.includes("open date"))) {
          // "23 to 25 Jan, 2017" style range or a single date
          const rangeM = value.match(/([A-Za-z0-9 ,]+?)\s+to\s+([A-Za-z0-9 ,]+)/);
          if (rangeM) { fields.open = parseDate(rangeM[1]); fields.close = parseDate(rangeM[2]); }
          else fields.open = parseDate(value);
        }
        if (fields.close == null && (label.includes("ipo close") || label.includes("close date"))) fields.close = parseDate(value);
        if (fields.allotment == null && label.includes("allotment")) fields.allotment = parseDate(value);
        if (fields.listing == null && (label === "listing date" || label.includes("listed on") || label.includes("listing at date"))) fields.listing = parseDate(value);
      }

      // Prospectus financials (revenue / PAT / EBITDA) when present in a
      // "Financial Information" table. Best-effort; only capture clean numbers.
      const fin = {};
      for (const row of rows) {
        const cells = Array.from(row.querySelectorAll("th, td")).map((c) => c.innerText.trim());
        if (cells.length < 2) continue;
        const label = cells[0].toLowerCase();
        const val = firstNum(cells[cells.length - 1]);
        if (val == null) continue;
        if (fin.revenue == null && (label.includes("revenue") || label.includes("total income"))) fin.revenue = val;
        if (fin.pat == null && (label.includes("profit after tax") || label === "pat" || label.includes("net profit"))) fin.pat = val;
        if (fin.netWorth == null && label.includes("net worth")) fin.netWorth = val;
      }

      return { fields, fin: Object.keys(fin).length ? fin : null };
    });
  } catch (err) {
    console.warn(`[Chittorgarh] detail failed (${url}):`, err.message);
    return null;
  }
}

/**
 * @param {import('playwright').Browser} browser
 * @param {Array} iposBase - only deep-scrape IPOs we already track, to bound runtime.
 * @returns {Promise<Array<{name, fields, fin, meta}>>}
 */
export async function fetchAll(browser, iposBase) {
  const page = await browser.newPage({ userAgent: UA });
  const out = [];
  try {
    const links = await collectListLinks(page);
    console.log(`[Chittorgarh] collected ${links.length} IPO links`);

    // Keep only links matching an IPO we track, de-duplicated by url.
    const seen = new Set();
    const relevant = [];
    for (const l of links) {
      const match = iposBase.find((i) => isSameCompanyName(i.company || i.name, l.name));
      if (!match) continue;
      const url = toAbsolute(l.href);
      if (!url || seen.has(url)) continue;
      seen.add(url);
      relevant.push({ ...l, url });
      if (relevant.length >= MAX_DETAIL_VISITS) break;
    }
    console.log(`[Chittorgarh] deep-scraping ${relevant.length} tracked IPOs`);

    for (const l of relevant) {
      const detail = await scrapeDetail(page, l.url);
      if (!detail) continue;
      out.push({
        name: l.name,
        fields: detail.fields,
        fin: detail.fin,
        meta: { source: "chittorgarh", url: l.url, capturedAt: new Date().toISOString() },
      });
    }
  } catch (err) {
    console.warn("[Chittorgarh] adapter failed:", err.message);
  } finally {
    await page.close().catch(() => {});
  }
  return out;
}
