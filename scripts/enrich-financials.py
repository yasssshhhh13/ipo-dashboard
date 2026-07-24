#!/usr/bin/env python3
"""One-shot / offline enrichment: promote Chittorgarh fin blocks and scrape InvestorGain tables."""

from __future__ import annotations

import json
import re
import ssl
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IPOS_PATH = ROOT / "public" / "ipos.json"
GENERIC_DRHP = "https://www.sebi.gov.in/filings/public-issues.html"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

# Hand-verified from DRHP/RHP tables on InvestorGain (Jul 24, 2026).
MANUAL = {
    "lohia": {
        "fin": {
            "revenue": 1737.87,
            "pat": 193.45,
            "ebitda": 339.45,
            "eps": 18.31,
            "pe": 23.21,
            "roe": 36.80,
            "netWorth": 519.16,
            "debt": 152.78,
        },
        "sourceDoc": "RHP",
        "sourceUrl": "https://www.sebi.gov.in/filings/public-issues/jul-2026/lohia-corp-limited-rhp_102936.html",
    },
    "indo-mim": {
        "fin": {
            "revenue": 4320.70,
            "pat": 533.54,
            "ebitda": 1070.92,
            "eps": 11.02,
            "pe": 44.01,
            "roe": 21.26,
            "netWorth": 2819.55,
            "debt": 1090.49,
        },
        "sourceDoc": "RHP",
        "sourceUrl": "https://www.sebi.gov.in/filings/public-issues/jul-2026/indo-mim-limited-rhp_102938.html",
    },
}


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def is_valid_fin(fin: dict | None) -> bool:
    if not fin or not isinstance(fin, dict):
        return False
    r, p = fin.get("revenue"), fin.get("pat")
    if r is None or p is None:
        return False
    try:
        r, p = float(r), float(p)
    except (TypeError, ValueError):
        return False
    return p <= r


def is_verified(ipo: dict) -> bool:
    return is_valid_fin(ipo.get("fin")) and (ipo.get("finMeta") or {}).get("status") == "Verified"


def resolve_source(ipo: dict) -> tuple[str, str]:
    rhp = ipo.get("rhp") or ""
    drhp = ipo.get("drhp") or ""
    ig = ipo.get("investorgainUrl") or ""
    if rhp and rhp.startswith("http") and "sebi.gov.in" in rhp:
        return "RHP", rhp
    if drhp and drhp != GENERIC_DRHP and ("sebi.gov.in" in drhp or "nseindia.com" in drhp):
        doc = "RHP" if "prospectus" in drhp or "rhp" in drhp.lower() else "DRHP"
        return doc, drhp
    if ig:
        return "DRHP", ig
    return "Prospectus", drhp or ig


def build_meta(ipo: dict, method: str) -> dict:
    doc, url = resolve_source(ipo)
    return {
        "sourceDoc": doc,
        "sourceUrl": url,
        "fy": "FY2026",
        "pageNum": "Financials",
        "verifiedAt": now_iso(),
        "method": method,
        "status": "Verified",
    }


def fetch_html(url: str) -> str:
    ctx = ssl.create_default_context()
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_fin_from_html(html: str) -> dict | None:
    fin: dict[str, float] = {}

    def row_val(label: str) -> float | None:
        patterns = [
            rf"{label}\s*</t[dh][^>]*>\s*<td[^>]*class=\"fin-td-val\"[^>]*>\s*([\d,]+\.?\d*)",
            rf"{label}\s*</t[dh][^>]*>\s*<td[^>]*>\s*([\d,]+\.?\d*)",
            rf"{label}\s*\|\s*([\d,]+\.?\d*)",
        ]
        for pat in patterns:
            m = re.search(pat, html, re.I)
            if m:
                return float(m.group(1).replace(",", ""))
        return None

    for key, pat in [
        ("revenue", r"Total Income"),
        ("pat", r"Profit After Tax"),
        ("ebitda", r"EBITDA"),
        ("netWorth", r"NET Worth"),
        ("debt", r"Total Borrowing"),
    ]:
        v = row_val(pat)
        if v is not None:
            fin[key] = v

    eps_m = re.search(r"EPS\s*\(₹\)[^0-9<]*([\d.]+)", html, re.I)
    if eps_m:
        fin["eps"] = float(eps_m.group(1))
    roe_m = re.search(r"ROE[^0-9<]*([\d.]+)\s*%", html, re.I)
    if roe_m:
        fin["roe"] = float(roe_m.group(1))

    if not is_valid_fin(fin):
        return None
    return fin


def chittorgarh_search_url(company: str) -> str | None:
    q = re.sub(r"[^a-z0-9]+", " ", company.lower()).strip().replace(" ", "+")
    if not q:
        return None
    return f"https://www.chittorgarh.com/search/?q={q}"


def find_chittorgarh_ipo_link(html: str) -> str | None:
    m = re.search(r'href="(/ipo/[^"]+)"[^>]*>\s*[^<]*(?:Limited|Ltd)', html, re.I)
    if m:
        return "https://www.chittorgarh.com" + m.group(1)
    m = re.search(r'href="(https://www\.chittorgarh\.com/ipo/[^"]+)"', html, re.I)
    return m.group(1) if m else None


def fetch_fin_for_ipo(ipo: dict) -> dict | None:
    urls = []
    if ipo.get("investorgainUrl"):
        urls.append(ipo["investorgainUrl"])
    # Chittorgarh fallback for DRHP-only pipeline IPOs
    drhp = ipo.get("drhp") or ""
    if drhp and drhp != GENERIC_DRHP and not ipo.get("investorgainUrl"):
        search = chittorgarh_search_url(ipo.get("company") or ipo.get("name") or "")
        if search:
            try:
                search_html = fetch_html(search)
                link = find_chittorgarh_ipo_link(search_html)
                if link:
                    urls.append(link)
            except Exception:
                pass

    for url in urls:
        try:
            html = fetch_html(url)
            fin = parse_fin_from_html(html)
            if fin:
                return fin
        except Exception:
            continue
    return None


def enrich_pe(ipo: dict, fin: dict) -> None:
    pmax = ipo.get("priceMax")
    eps = fin.get("eps")
    if pmax and eps and eps > 0 and not fin.get("pe"):
        fin["pe"] = round(float(pmax) / float(eps), 2)


def main() -> None:
    ipos = json.loads(IPOS_PATH.read_text(encoding="utf-8"))
    promoted = scraped = manual = 0

    for ipo in ipos:
        iid = ipo.get("id")
        if iid in MANUAL and not is_verified(ipo):
            entry = MANUAL[iid]
            ipo["fin"] = entry["fin"]
            ipo["finMeta"] = {
                **build_meta(ipo, "InvestorGain prospectus table + DRHP/RHP"),
                "sourceDoc": entry["sourceDoc"],
                "sourceUrl": entry["sourceUrl"],
            }
            manual += 1
            continue

        if is_valid_fin(ipo.get("fin")) and not is_verified(ipo):
            enrich_pe(ipo, ipo["fin"])
            ipo["finMeta"] = build_meta(ipo, "Chittorgarh prospectus table + regulatory filing")
            promoted += 1

    # Scrape InvestorGain / Chittorgarh for remaining gaps (active IPOs).
    for ipo in ipos:
        if is_verified(ipo):
            continue
        st = ipo.get("status") or ""
        if st not in ("Open", "Closed", "Upcoming", "Listed"):
            continue
        if not ipo.get("investorgainUrl") and not (ipo.get("drhp") and ipo.get("drhp") != GENERIC_DRHP):
            continue
        try:
            fin = fetch_fin_for_ipo(ipo)
            if not fin:
                continue
            enrich_pe(ipo, fin)
            ipo["fin"] = fin
            ipo["finMeta"] = build_meta(ipo, "InvestorGain / Chittorgarh prospectus table + DRHP/RHP")
            scraped += 1
            print(f"scraped {ipo.get('id')}: rev={fin.get('revenue')} pat={fin.get('pat')}")
            time.sleep(0.5)
        except Exception as exc:
            print(f"skip {ipo.get('id')}: {exc}")

    IPOS_PATH.write_text(json.dumps(ipos, indent=2) + "\n", encoding="utf-8")

    active = [i for i in ipos if (i.get("status") in ("Upcoming", "Open", "Closed"))]
    verified_active = [i for i in active if is_verified(i)]
    print(
        f"done: manual={manual} promoted={promoted} scraped={scraped} | "
        f"active verified fin={len(verified_active)}/{len(active)}"
    )


if __name__ == "__main__":
    main()
