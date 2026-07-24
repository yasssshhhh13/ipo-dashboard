#!/usr/bin/env python3
"""Try Chittorgarh / IG pages for DRHP-only IPOs missing financials."""
import json
import re
import ssl
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IPOS_PATH = ROOT / "public" / "ipos.json"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
ctx = ssl.create_default_context()


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def parse_fin(html: str) -> dict | None:
    fin: dict[str, float] = {}

    def row_val(label: str) -> float | None:
        patterns = [
            rf"{label}\s*</t[dh][^>]*>\s*<td[^>]*class=\"fin-td-val\"[^>]*>\s*([\d,]+\.?\d*)",
            rf"{label}\s*</t[dh][^>]*>\s*<td[^>]*>\s*([\d,]+\.?\d*)",
        ]
        for pat in patterns:
            m = re.search(pat, html, re.I)
            if m:
                return float(m.group(1).replace(",", ""))
        return None

    for key, label in [
        ("revenue", "Total Income"),
        ("pat", "Profit After Tax"),
        ("ebitda", "EBITDA"),
        ("netWorth", "NET Worth"),
        ("debt", "Total Borrowing"),
    ]:
        v = row_val(label)
        if v is not None:
            fin[key] = v

    if fin.get("revenue") and fin.get("pat") and fin["pat"] <= fin["revenue"]:
        return fin
    return None


def chittorgarh_candidates(ipo_id: str, company: str) -> list[str]:
    slug = ipo_id
    out = [
        f"https://www.chittorgarh.com/ipo/{slug}-ipo/",
        f"https://www.chittorgarh.com/ipo/{slug}/",
    ]
    short = re.sub(r"-(limited|ltd|india|private|pvt)$", "", slug)
    if short != slug:
        out.append(f"https://www.chittorgarh.com/ipo/{short}-ipo/")
    return out


def main() -> None:
    ipos = json.loads(IPOS_PATH.read_text(encoding="utf-8"))
    missing = [
        i
        for i in ipos
        if i.get("status") in ("Upcoming", "Open", "Closed")
        and not (
            i.get("fin")
            and (i.get("finMeta") or {}).get("status") == "Verified"
        )
    ]
    print(f"testing {len(missing)} missing IPOs")
    for ipo in missing:
        iid = ipo["id"]
        found = None
        url_used = None
        for url in chittorgarh_candidates(iid, ipo.get("company") or ""):
            try:
                html = fetch(url)
                if "Company Financials" not in html and "Total Income" not in html:
                    continue
                fin = parse_fin(html)
                if fin:
                    found = fin
                    url_used = url
                    break
            except Exception as exc:
                print(f"  {iid} {url}: {exc}")
            time.sleep(0.4)
        if found:
            print(
                f"OK {iid}: rev={found['revenue']} pat={found['pat']} <- {url_used}"
            )
        else:
            print(f"MISS {iid}")


if __name__ == "__main__":
    main()
