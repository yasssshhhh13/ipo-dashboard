import re
html = open("tmp-cg.html", encoding="utf-8").read()
m = re.search(r"id=['\"]financialTable['\"].*?</table>", html, re.S)
if m:
    tbl = m.group(0)
    for r in re.findall(r"<tr>(.*?)</tr>", tbl, re.S):
        cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", r, re.S)
        clean = [re.sub(r"<[^>]+>", "", c).strip() for c in cells]
        if clean:
            print(clean)
