#!/usr/bin/env python3
"""Verify Chittorgarh URL map returns financials."""
import json
import time
from importlib.machinery import SourceFileLoader
from pathlib import Path

mod = SourceFileLoader("en", "scripts/enrich-financials.py").load_module()
ipos = json.loads(Path("public/ipos.json").read_text(encoding="utf-8"))
by_id = {i["id"]: i for i in ipos}

for iid, url in mod.CHITTORGARH_URLS.items():
    try:
        fin = mod.parse_fin_from_html(mod.fetch_html(url))
        ok = "OK" if fin else "NO_FIN"
        print(f"{ok} {iid}: {fin}")
    except Exception as exc:
        print(f"ERR {iid}: {exc}")
    time.sleep(0.3)
