#!/usr/bin/env python3
"""Extract financials from SEBI DRHP / Draft Abridged PDFs."""
from __future__ import annotations

import io
import json
import re
import ssl
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
IPOS_PATH = ROOT / "public" / "ipos.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
ctx = ssl.create_default_context()
MILLION_TO_CRORE = 0.1


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=90) as resp:
        return resp.read()


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf-8", errors="replace")


def abs_sebi_pdf(path: str) -> str:
    path = path.replace("\\", "/")
    if path.startswith("http"):
        return path
    return "https://www.sebi.gov.in/" + path.lstrip("/")


def pdf_candidates_from_html(html: str) -> list[str]:
    found: list[str] = []
    for m in re.finditer(r"(?:https?://www\.sebi\.gov\.in/)?(sebi_data/[^\s\"'<>]+\.pdf)", html, re.I):
        found.append(abs_sebi_pdf(m.group(1)))
    # filing pages linked from corrigendum / addendum pages
    for m in re.finditer(
        r'href=["\']([^"\']*filings/public-issues/[^"\']+(?:drhp|rhp|abridged)[^"\']*)["\']',
        html,
        re.I,
    ):
        href = m.group(1)
        if href.startswith("/"):
            href = "https://www.sebi.gov.in" + href
        elif not href.startswith("http"):
            href = "https://www.sebi.gov.in/" + href
        found.append(href)
    out: list[str] = []
    seen = set()
    for u in found:
        u = urllib.parse.unquote(u)
        if u not in seen:
            seen.add(u)
            out.append(u)
    return out


def score_pdf_url(url: str) -> int:
    u = url.lower()
    if u.endswith(".html"):
        return 0
    if "abridged" in u or "_da_" in u or " da_" in u:
        return 100
    if u.endswith("_p.pdf") or "_p.pdf" in u:
        return 90
    if "corr" in u or "addendum" in u:
        return 25
    if "drhp" in u or "rhp" in u:
        return 15
    return 40


def pdf_text(pdf_bytes: bytes, max_pages: int = 18) -> str:
    chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages[:max_pages]:
            chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def parse_num(s: str) -> float | None:
    s = s.replace(",", "").strip()
    if not s or s in ("-", "NA", "N/A"):
        return None
    try:
        return float(s)
    except ValueError:
        return None


def first_nums(text: str, count: int = 4) -> list[float]:
    vals = []
    for m in re.finditer(r"-?\d[\d,]*\.?\d*", text):
        v = parse_num(m.group(0))
        if v is not None:
            vals.append(v)
        if len(vals) >= count:
            break
    return vals


def to_crore(million: float) -> float:
    return round(million * MILLION_TO_CRORE, 2)


def line_value(label_pattern: str, text: str) -> float | None:
    m = re.search(label_pattern, text, re.I | re.S)
    if not m:
        return None
    nums = first_nums(m.group(1), 1)
    return nums[0] if nums else None


def parse_fin_from_pdf(text: str) -> dict | None:
    fin: dict[str, float] = {}
    unit_million = bool(
        re.search(r"₹\s*in\s*million|Rs\.?\s*in\s*million|₹\s*million|in\s*Rs\s*million", text, re.I)
    )

    def set_crore(key: str, raw: float | None) -> None:
        if raw is None:
            return
        fin[key] = to_crore(raw) if unit_million or abs(raw) > 5000 else round(raw, 2)

    # --- Format A: Financial KPIs (GNI-style) ---
    income_a = line_value(r"Total Income\s*\(a\)[^0-9\-]*((?:[\d,\.\-]+\s*)+)", text)
    pat_a = line_value(
        r"PAT\s*\(Profit for the year/\s*period\)\s*\(e\)[^0-9\-]*((?:[\d,\.\-]+\s*)+)",
        text,
    )
    ebitda_a = line_value(r"EBITDA\s*\(c\)[^0-9\-]*((?:[\d,\.\-]+\s*)+)", text)
    if income_a is not None and pat_a is not None:
        set_crore("revenue", income_a)
        set_crore("pat", pat_a)
        set_crore("ebitda", ebitda_a)
        nw = line_value(r"Net worth\s*\(\d+\)[^0-9\-]*((?:[\d,\.\-]+\s*)+)", text)
        debt = line_value(r"Total Borrowings\s*\(\d+\)[^0-9\-]*((?:[\d,\.\-]+\s*)+)", text)
        set_crore("netWorth", nw)
        set_crore("debt", debt)

    # --- Format B: Summary of Restated Consolidated Financial Information ---
    if "revenue" not in fin or "pat" not in fin:
        rev = line_value(
            r"Revenue from operations(?:\(\d+\))?[\s\n]*((?:[\d,\.\-]+\s*){1,4})",
            text,
        )
        if rev is None:
            rev = line_value(
                r"Revenue from[\s\n]+Operations(?:\(\d+\))?[\s\n]*((?:[\d,\.\-]+\s*){1,4})",
                text,
            )
        pat = line_value(
            r"Restated Profit/\(loss\) after tax[\s\n]*((?:[\d,\.\-]+\s*){1,4})",
            text,
        )
        if pat is None:
            pat = line_value(r"Profit After Tax\(\d+\)[\s\n]*((?:[\d,\.\-]+\s*){1,4})", text)
        if pat is None:
            pat = line_value(r"Profit/\(loss\) after tax[\s\n]*((?:[\d,\.\-]+\s*){1,4})", text)
        total_income = line_value(
            r"Total income(?:\(\d+\))?[\s\n]*(?:₹\s*million[\s\n]*)?((?:[\d,\.\-]+\s*){1,4})",
            text,
        )
        if rev is not None and pat is not None:
            set_crore("revenue", total_income if total_income is not None else rev)
            set_crore("pat", pat)
            set_crore("ebitda", line_value(r"EBITDA\(\d+\)[\s\n]*((?:[\d,\.\-]+\s*){1,4})", text))
            set_crore(
                "netWorth",
                line_value(r"Net Worth\(\d+\)[\s\n]*((?:[\d,\.\-]+\s*){1,4})", text),
            )
            debt = line_value(
                r"Total Borrowings[^0-9\n]*[\s\n]*((?:[\d,\.\-]+\s*){1,4})",
                text,
            )
            if debt is None:
                debt = line_value(r"Total borrowings[\s\n]*((?:[\d,\.\-]+\s*){1,4})", text)
            set_crore("debt", debt)

    if fin.get("revenue") is None or fin.get("pat") is None:
        return None
    if fin["pat"] > fin["revenue"]:
        return None
    return fin


def is_verified(ipo: dict) -> bool:
    fin = ipo.get("fin") or {}
    meta = ipo.get("finMeta") or {}
    r, p = fin.get("revenue"), fin.get("pat")
    if meta.get("status") != "Verified" or r is None or p is None:
        return False
    return float(p) <= float(r)


def build_meta(drhp_url: str, pdf_url: str) -> dict:
    return {
        "sourceDoc": "DRHP",
        "sourceUrl": drhp_url,
        "sourcePdf": pdf_url,
        "fy": "Latest restated period",
        "pageNum": "Summary financial information",
        "verifiedAt": now_iso(),
        "method": "SEBI DRHP / Draft Abridged PDF extraction",
        "status": "Verified",
    }


def extract_for_ipo(ipo: dict) -> tuple[dict, str] | None:
    drhp = ipo.get("drhp") or ""
    if not drhp.startswith("https://www.sebi.gov.in/"):
        return None
    queue = sorted(pdf_candidates_from_html(fetch_text(drhp)), key=score_pdf_url, reverse=True)
    if drhp not in queue:
        queue.insert(0, drhp)
    tried = set()
    pdfs = [u for u in queue if u.lower().endswith(".pdf")]
    htmls = [u for u in queue if u.lower().endswith(".html")]
    for url in sorted(pdfs, key=score_pdf_url, reverse=True):
        if url in tried:
            continue
        tried.add(url)
        if score_pdf_url(url) < 50:
            continue
        try:
            fin = parse_fin_from_pdf(pdf_text(fetch_bytes(url)))
            if fin:
                return fin, url
        except Exception:
            continue
    for url in htmls:
        try:
            sub = sorted(pdf_candidates_from_html(fetch_text(url)), key=score_pdf_url, reverse=True)
            for sub_url in sub:
                if sub_url in tried or not sub_url.lower().endswith(".pdf"):
                    continue
                if score_pdf_url(sub_url) < 50:
                    continue
                tried.add(sub_url)
                try:
                    fin = parse_fin_from_pdf(pdf_text(fetch_bytes(sub_url)))
                    if fin:
                        return fin, sub_url
                except Exception:
                    continue
        except Exception:
            continue
    return None


def main() -> None:
    ipos = json.loads(IPOS_PATH.read_text(encoding="utf-8"))
    updated = 0
    for ipo in ipos:
        if is_verified(ipo):
            continue
        if ipo.get("status") not in ("Upcoming", "Open", "Closed"):
            continue
        drhp = ipo.get("drhp") or ""
        if not drhp.startswith("https://www.sebi.gov.in/filings/public-issues/"):
            continue
        iid = ipo["id"]
        try:
            result = extract_for_ipo(ipo)
            if not result:
                print(f"skip {iid}")
                continue
            fin, pdf_url = result
            ipo["fin"] = fin
            ipo["finMeta"] = build_meta(drhp, pdf_url)
            updated += 1
            print(f"OK {iid}: rev={fin['revenue']} pat={fin['pat']}")
            time.sleep(0.5)
        except Exception as exc:
            print(f"err {iid}: {exc}")

    IPOS_PATH.write_text(json.dumps(ipos, indent=2) + "\n", encoding="utf-8")
    active = [i for i in ipos if i.get("status") in ("Upcoming", "Open", "Closed")]
    verified = [i for i in active if is_verified(i)]
    print(f"updated={updated} active verified={len(verified)}/{len(active)}")


if __name__ == "__main__":
    main()
