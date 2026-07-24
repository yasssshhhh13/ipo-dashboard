#!/usr/bin/env python3
import io, re, ssl, urllib.request, pdfplumber, sys
UA = "Mozilla/5.0"
ctx = ssl.create_default_context()

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, context=ctx, timeout=60) as r:
        return r.read()

drhp = sys.argv[1]
html = fetch(drhp).decode("utf-8", "replace")
m = re.search(r"sebi_data/commondocs/[^\"']+\.pdf", html, re.I)
print("pdf path", m.group(0) if m else None)
if not m:
    sys.exit(1)
pdf_url = "https://www.sebi.gov.in/" + m.group(0)
print("url", pdf_url)
data = fetch(pdf_url)
with pdfplumber.open(io.BytesIO(data)) as pdf:
    print("pages", len(pdf.pages))
    text = "\n".join((p.extract_text() or "") for p in pdf.pages[:8])
print("---TEXT SNIP---")
for line in text.splitlines():
    if re.search(r"income|revenue|profit|PAT|EBITDA|Financial KPI|Total Income", line, re.I):
        print(line[:200])
