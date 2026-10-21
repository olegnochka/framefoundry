#!/usr/bin/env python3
"""Frame Foundry - monthly LA gaming PC parts price report.

    python3 -E scripts/price-report.py            # report for the latest month in the price history
    python3 -E scripts/price-report.py 2026-10    # a given month

Reads public/data/price-history.csv (the daily price check) and data/pricing.json, and writes
public/price-report.html (always the latest report).
Header and footer are copied from about.html so the page matches the rest of the site.
Only market part prices are shown - never margins, fees or labor. Run seo.py afterwards (titles, sitemap).
"""
import csv, html, json, re, sys
from collections import defaultdict
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PUB = SITE / "public"
BASE = "https://framefoundrypc.com"


def money(v):
    return f"${v:,.2f}"


def pct(a, b):
    return (b - a) / a * 100 if a else 0.0


def nice_date(d):
    return date.fromisoformat(d).strftime("%b %-d")


def load(month):
    rows = list(csv.DictReader((PUB / "data" / "price-history.csv").open()))
    days_in = defaultdict(set)
    for r in rows:
        days_in[r["date"][:7]].add(r["date"])
    # The daily run regenerates this page; a new month takes over only once it has a week of data.
    months = sorted(days_in)
    month = month or next((m for m in reversed(months) if len(days_in[m]) >= 7), months[-1])
    rows = [r for r in rows if r["date"].startswith(month) and r["cost_basis"]]
    if not rows:
        sys.exit(f"no price data for {month}")
    by = defaultdict(dict)
    for r in rows:
        by[r["part_key"]][r["date"]] = float(r["cost_basis"])
    return month, by


def page_shell(title, desc, canonical):
    tpl = (PUB / "about.html").read_text()
    head = tpl.split("<body>")[0]
    head = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title)}</title>", head, flags=re.S)
    head = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{canonical}">', head)
    head = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{canonical}">', head)
    for attr in ('name="description"', 'property="og:description"'):
        head = re.sub(rf'<meta {attr} content="[^"]*">', f'<meta {attr} content="{html.escape(desc)}">', head)
    head = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(title)}">', head)
    head = re.sub(r"<!-- seo:jsonld -->.*?<!-- /seo:jsonld -->\n?", "", head, flags=re.S)
    head = re.sub(r'<meta name="robots"[^>]*>\n?', "", head)
    header = re.search(r"<header class=\"site-header\">.*?</header>", tpl, re.S).group(0).replace(' aria-current="page"', "")
    footer = re.search(r"<footer class=\"site-footer\">.*?</footer>", tpl, re.S).group(0)
    return head, header, footer


def main():
    month, by = load(sys.argv[1] if len(sys.argv) > 1 else None)
    cfg = json.loads((SITE / "data" / "pricing.json").read_text())
    parts = cfg["parts"]
    days = sorted({d for p in by.values() for d in p})
    first, last = days[0], days[-1]
    label = date.fromisoformat(first).strftime("%B %Y")

    moves = []
    for key, series in by.items():
        if key not in parts:
            continue
        ds = sorted(series)
        a, b = series[ds[0]], series[ds[-1]]
        moves.append({"key": key, "cat": parts[key]["category"], "item": parts[key]["item"].split(" (")[0].split(",")[0],
                      "a": a, "b": b, "pct": pct(a, b), "lo": min(series.values()), "hi": max(series.values()),
                      "upsell": parts[key].get("upsell_only", False)})
    order = [p["category"] for p in parts.values()]
    moves.sort(key=lambda m: (order.index(m["cat"]), m["item"]))

    up = sorted([m for m in moves if m["pct"] >= 0.5], key=lambda m: -m["pct"])
    down = sorted([m for m in moves if m["pct"] <= -0.5], key=lambda m: m["pct"])
    flat = [m for m in moves if -0.5 < m["pct"] < 0.5]

    build_line = ", ".join(f"{html.escape(b['name'])} ${b['set_price']:,}" for b in cfg["builds"].values())

    def line(m):
        return f"<li><strong>{html.escape(m['item'])}</strong>: {money(m['a'])} to {money(m['b'])} ({m['pct']:+.1f}%)</li>"

    upsell = ' <span class="muted">(upgrade option)</span>'

    def color(p):
        return "var(--accent)" if p >= 0.5 else ("#6FCF97" if p <= -0.5 else "var(--muted)")

    rows = "".join(
        f"<tr><td>{html.escape(m['cat'])}</td><td>{html.escape(m['item'])}{upsell if m['upsell'] else ''}</td>"
        f'<td class="num">{money(m["a"])}</td><td class="num">{money(m["b"])}</td>'
        f'<td class="num" style="color:{color(m["pct"])}">{m["pct"]:+.1f}%</td></tr>'
        for m in moves)
    title = f"LA Gaming PC Parts Price Report - {label} | Frame Foundry"
    desc = (f"What gaming PC parts cost in {label}: daily lowest prices for CPUs, graphics cards, DDR5 memory, SSDs, power supplies "
            f"and Windows, tracked by Frame Foundry in Canoga Park, Los Angeles. {nice_date(first)} to {nice_date(last)}.")
    canonical = f"{BASE}/price-report.html"
    head, header, footer = page_shell(title, desc, canonical)
    dataset = {"@context": "https://schema.org", "@type": "Dataset", "name": f"Gaming PC parts prices, {label}",
               "description": desc, "url": canonical, "temporalCoverage": f"{first}/{last}",
               "creator": {"@type": "Organization", "name": "Frame Foundry", "url": f"{BASE}/"},
               "isAccessibleForFree": True,
               "distribution": {"@type": "DataDownload", "encodingFormat": "text/csv", "contentUrl": f"{BASE}/data/price-history.csv"}}
    head = head.replace("</head>", f'<script type="application/ld+json">{json.dumps(dataset, separators=(",", ":"))}</script>\n</head>', 1)
    biggest = up[0] if up else None

    body = f"""<body>
{header}
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Price report</p>
    <h1>Gaming PC parts prices, {label}</h1>
    <p>What the parts in our current builds actually cost, tracked daily from {nice_date(first)} to {nice_date(last)}. {len(up)} of {len(moves)} parts went up, {len(down)} went down, {len(flat)} held steady.</p>
  </div>
</section>
<main>
  <div class="wrap narrow">
    <h2>The short version</h2>
    <ul>
      {f"<li>The biggest move was the <strong>{html.escape(biggest['item'])}</strong>: {money(biggest['a'])} on {nice_date(first)}, {money(biggest['b'])} on {nice_date(last)} ({biggest['pct']:+.1f}%).</li>" if biggest else ""}
      <li>Went up: {"; ".join(html.escape(m['item']) for m in up) or "none"}.</li>
      <li>Held steady: {"; ".join(html.escape(m['item']) for m in flat) or "none"}.</li>
      {f"<li>Got cheaper: {'; '.join(html.escape(m['item']) for m in down)}.</li>" if down else ""}
    </ul>

    <h2>Price changes, {nice_date(first)} to {nice_date(last)}</h2>
    <ul>
      {"".join(line(m) for m in up + down)}
    </ul>

    <h2>Every part we track</h2>
    <p class="muted">Lowest price on {nice_date(first)} and {nice_date(last)}, in US dollars, before sales tax.</p>
    <div class="table-scroll">
      <table>
        <thead><tr><th>Part</th><th>Model</th><th class="num">{nice_date(first)}</th><th class="num">{nice_date(last)}</th><th class="num">Change</th></tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>

    <h2>What this means for our builds</h2>
    <p>Current prices: {build_line}. Every part and price is on <a href="builds.html">the builds page</a>.</p>

    <h2>How we track prices</h2>
    <ul>
      <li>Every morning we check each part's lowest price on PCPartPicker, or Newegg's own price where Newegg sells it directly. These are national US online prices - the prices we pay to buy parts for PCs we build in Los Angeles.</li>
      <li>When a part moves more than 5% from the price on our builds page, we re-price the builds that use it. Your price is locked once you pay - if a part rises afterwards, we absorb it (<a href="terms.html">Terms of Sale</a>).</li>
      <li>The raw data is public: <a href="data/price-history.csv">price-history.csv</a> has every daily check since we started.</li>
    </ul>
    <p>Want a build around a different budget or part? <a href="quote.html">Ask for a free quote</a> - we price it the same way.</p>
    <p class="muted">Updated daily - last check {nice_date(last)}, {last[:4]}.</p>
  </div>
</main>
{footer}
</body>
</html>
"""
    (PUB / "price-report.html").write_text(head + body)
    print(f"price report: {label}, {nice_date(first)}-{nice_date(last)}, {len(moves)} parts, {len(up)} up / {len(down)} down / {len(flat)} flat")


if __name__ == "__main__":
    main()
