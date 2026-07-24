#!/usr/bin/env python3
"""Audit verified financial coverage for active IPOs."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IPOS = json.loads((ROOT / "public" / "ipos.json").read_text(encoding="utf-8"))


def is_valid_fin(fin):
    if not fin:
        return False
    r, p = fin.get("revenue"), fin.get("pat")
    if r is None or p is None:
        return False
    return float(p) <= float(r)


def is_verified(ipo):
    return is_valid_fin(ipo.get("fin")) and (ipo.get("finMeta") or {}).get("status") == "Verified"


active = [i for i in IPOS if i.get("status") in ("Upcoming", "Open", "Closed")]
verified = [i for i in active if is_verified(i)]
missing = [i for i in active if not is_verified(i)]

print(f"active={len(active)} verified={len(verified)} missing={len(missing)}")
print("\n--- missing ---")
for i in missing:
    print(
        i["id"],
        i.get("status"),
        i.get("type"),
        "ig=" + ("Y" if i.get("investorgainUrl") else "N"),
        "fin=" + ("Y" if is_valid_fin(i.get("fin")) else "N"),
        (i.get("drhp") or "")[:60],
    )
