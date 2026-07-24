#!/usr/bin/env python3
import io, re, ssl, urllib.request, pdfplumber, sys
from pathlib import Path
UA = "Mozilla/5.0"
ctx = ssl.create_default_context()

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
        return r.read()

drhp = sys.argv[1]
html = fetch(drhp).decode("utf-8", "replace")
m = re.search(r"sebi_data/commondocs/[^\"']+\.pdf", html, re.I)
pdf_url = "https://www.sebi.gov.in/" + m.group(0)
data = fetch(pdf_url)
with pdfplumber.open(io.BytesIO(data)) as pdf:
    text = "\n".join((p.extract_text() or "") for p in pdf.pages)
# save to file for inspection
out = Path(__file__).resolve().parents[1] / "tmp-pdf-text.txt"
out.write_text(text, encoding="utf-8")
print("saved", out, "len", len(text))
for kw in ["Total Income", "Revenue from", "Profit After Tax", "Financial KPI", "EBITDA", "Net worth", "Borrowing"]:
    hits = [ln for ln in text.splitlines() if kw.lower() in ln.lower()]
    print(f"\n== {kw} ({len(hits)} hits) ==")
    for ln in hits[:5]:
        print(ln[:250])
