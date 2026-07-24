#!/usr/bin/env python3
import re, ssl, urllib.request
UA = "Mozilla/5.0"
ctx = ssl.create_default_context()
url = "https://www.chittorgarh.com/report/ipo-in-india-daily-report/85/"
req = urllib.request.Request(url, headers={"User-Agent": UA})
html = urllib.request.urlopen(req, context=ctx, timeout=30).read().decode("utf-8", "replace")
links = re.findall(r'href="(/ipo/[^"]+)"', html)
print("count", len(links))
for l in sorted(set(links))[:40]:
    print(l)
