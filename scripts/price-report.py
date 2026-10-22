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

from pagekit import BASE, PUB, SITE, money, page_shell


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
               "isAccessibleForFree": True, "license": f"{BASE}/data-license.html",
               "copyrightHolder": {"@type": "Organization", "name": "Pacific Front Desk LLC dba Frame Foundry"},
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
      <li>The raw data is public to view: <a href="data/price-history.csv">price-history.csv</a> has every daily check since we started. It is ours - see <a href="data-license.html">how you may use it</a>.</li>
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
    license_page()
    print(f"price report: {label}, {nice_date(first)}-{nice_date(last)}, {len(moves)} parts, {len(up)} up / {len(down)} down / {len(flat)} flat")



def license_page():
    """data-license.html - the license the Dataset JSON-LD points to. All rights reserved (Oleg, 2026-10-22)."""
    url = f"{BASE}/data-license.html"
    head, header, footer = page_shell("Price Data License - Frame Foundry",
                                      "Frame Foundry's price report and price history are copyrighted, all rights reserved. How you may view, quote and link to them.", url)
    year = date.today().year
    body = f"""<body>
{header}
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Legal</p>
    <h1>Price data license</h1>
    <p>Our price report and price history are ours. Here is what you may do with them.</p>
  </div>
</section>
<main>
  <div class="wrap narrow">
    <h2>What this covers</h2>
    <p>The <a href="price-report.html">gaming PC parts price report</a>, the daily price history file
    (<a href="data/price-history.csv">price-history.csv</a>) and the other price files in our data folder, including the selection,
    arrangement and notes in them.</p>

    <h2>Copyright</h2>
    <p>Copyright {year} Pacific Front Desk LLC dba Frame Foundry. All rights reserved.</p>

    <h2>What you may do</h2>
    <ul>
      <li>View and download the data for your own personal, non-commercial use.</li>
      <li>Quote a few figures in an article, post or video, with credit to Frame Foundry and a link to <a href="price-report.html">framefoundrypc.com/price-report.html</a>.</li>
    </ul>

    <h2>What needs our written permission</h2>
    <ul>
      <li>Republishing, selling or redistributing the data, in whole or in large part.</li>
      <li>Copying it into another database, price tracker, product or website, or collecting it automatically on a schedule.</li>
      <li>Using it to train or feed software, including AI models, beyond reading and citing it.</li>
    </ul>
    <p>To ask, email <a href="mailto:hello@framefoundrypc.com">hello@framefoundrypc.com</a>.</p>

    <h2>No guarantee</h2>
    <p>The prices are what we saw at the stores we check, on the dates shown, before sales tax. They are not offers to sell at those prices,
    and stores change prices and stock without notice. We work to keep the data accurate but cannot guarantee it, and we are not liable
    for decisions made from it. Our own build prices are on the <a href="builds.html">builds page</a> and in our <a href="terms.html">terms of sale</a>.</p>
  </div>
</main>
{footer}
</body>
</html>
"""
    (PUB / "data-license.html").write_text(head + body)


if __name__ == "__main__":
    main()
