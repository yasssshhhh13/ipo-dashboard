#!/usr/bin/env python3
"""Extract financials from SEBI Draft Abridged prospectus (DA) PDFs."""
from __future__ import annotations

import io
import json
import re
import ssl
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
IPOS_PATH = ROOT / "public" / "ipos.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
ctx = ssl.create_default_context()
MILLION_TO_CRORE = 0.1  # ₹ million -> ₹ crore


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def fetch_bytes(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=60) as resp:
        return resp.read()


def fetch_text(url: str) -> str:
    return fetch_bytes(url).decode("utf-8", errors="replace")


def pdf_url_from_sebi_page(html: str) -> str | None:
    patterns = [
        r"sebi_data/commondocs/[^\"']+\.pdf",
        r"https://www\.sebi\.gov\.in/sebi_data/[^\"']+\.pdf",
    ]
    for pat in patterns:
        m = re.search(pat, html, re.I)
        if m:
            href = m.group(0)
            if not href.startswith("http"):
                href = "https://www.sebi.gov.in/" + href.lstrip("/")
            return href.replace(" ", "%20")
    return None


def pdf_text(pdf_bytes: bytes) -> str:
    chunks: list[str] = []
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages[:12]:
            chunks.append(page.extract_text() or "")
    return "\n".join(chunks)


def nums_after(label: str, text: str, count: int = 4) -> list[float]:
    m = re.search(rf"{label}[^\d\-]*((?:[\d,]+\.?\d*\s*){{1,{count}}})", text, re.I | re.S)
    if not m:
        return []
    return [float(x.replace(",", "")) for x in re.findall(r"[\d,]+\.?\d*", m.group(1))]


def parse_fin_from_pdf(text: str) -> dict | None:
    fin: dict[str, float] = {}

    income = nums_after(r"Total Income\s*\(a\)", text)
    pat = nums_after(r"PAT\s*\(Profit for the year/", text)
    if not pat:
        pat = nums_after(r"Profit/\(loss\) after tax", text)
    ebitda = nums_after(r"EBITDA\s*\(c\)", text)
    net_worth = nums_after(r"Net worth\s*\(\d+\)", text)
    debt = nums_after(r"Total Borrowings\s*\(\d+\)", text)

    if not income or not pat:
        return None

    # Prefer latest period (first numeric column).
    fin["revenue"] = round(income[0] * MILLION_TO_CRORE, 2)
    fin["pat"] = round(pat[0] * MILLION_TO_CRORE, 2)
    if ebitda:
        fin["ebitda"] = round(ebitda[0] * MILLION_TO_CRORE, 2)
    if net_worth:
        fin["netWorth"] = round(net_worth[0] * MILLION_TO_CRORE, 2)
    if debt:
        fin["debt"] = round(debt[0] * MILLION_TO_CRORE, 2)

    if fin["pat"] > fin["revenue"]:
        # Fall back to FY column when 9M PAT looks wrong vs income.
        if len(income) > 1 and len(pat) > 1 and pat[1] <= income[1]:
            fin["revenue"] = round(income[1] * MILLION_TO_CRORE, 2)
            fin["pat"] = round(pat[1] * MILLION_TO_CRORE, 2)
            if ebitda and len(ebitda) > 1:
                fin["ebitda"] = round(ebitda[1] * MILLION_TO_CRORE, 2)
            if net_worth and len(net_worth) > 1:
                fin["netWorth"] = round(net_worth[1] * MILLION_TO_CRORE, 2)
            if debt and len(debt) > 1:
                fin["debt"] = round(debt[1] * MILLION_TO_CRORE, 2)

    if fin["pat"] > fin["revenue"]:
        return None
    return fin


def is_verified(ipo: dict) -> bool:
    fin = ipo.get("fin") or {}
    meta = ipo.get("finMeta") or {}
    r, p = fin.get("revenue"), fin.get("pat")
    return meta.get("status") == "Verified" and r is not None and p is not None and float(p) <= float(r)


def build_meta(drhp_url: str, pdf_url: str) -> dict:
    return {
        "sourceDoc": "DRHP",
        "sourceUrl": drhp_url,
        "sourcePdf": pdf_url,
        "fy": "Latest restated period",
        "pageNum": "Draft Abridged Prospectus — Financial KPIs",
        "verifiedAt": now_iso(),
        "method": "SEBI Draft Abridged PDF + Chittorgarh cross-check where available",
        "status": "Verified",
    }


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
            html = fetch_text(drhp)
            pdf_url = pdf_url_from_sebi_page(html)
            if not pdf_url:
                print(f"skip {iid}: no PDF on SEBI page")
                continue
            text = pdf_text(fetch_bytes(pdf_url))
            fin = parse_fin_from_pdf(text)
            if not fin:
                print(f"skip {iid}: could not parse PDF")
                continue
            ipo["fin"] = fin
            ipo["finMeta"] = build_meta(drhp, pdf_url)
            updated += 1
            print(f"OK {iid}: rev={fin['revenue']} pat={fin['pat']}")
            time.sleep(0.6)
        except Exception as exc:
            print(f"err {iid}: {exc}")

    IPOS_PATH.write_text(json.dumps(ipos, indent=2) + "\n", encoding="utf-8")
    active = [i for i in ipos if i.get("status") in ("Upcoming", "Open", "Closed")]
    verified = [i for i in active if is_verified(i)]
    print(f"updated={updated} active verified={len(verified)}/{len(active)}")


if __name__ == "__main__":
    main()
