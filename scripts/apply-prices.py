#!/usr/bin/env python3
"""Frame Foundry - apply the day's part prices to the site.

Reads today's cost basis per part from public/data/price-history.csv (rows appended by the daily price task)
and data/pricing.json (the prices the site shows now, the builds and the pricing rules).

Rule (Oleg, 2026-10-16): if any part in a current build moved more than 5% from the price the site shows,
re-price ALL three builds with today's prices:
  set price = the lowest price ending in 99 that leaves at least $50 after labor
              (price - parts - card processing 2.9% + $0.30 - 3% reserve - packaging - hours x $35)
              and keeps the "Price lock" row on builds.html at zero or more.
Then builds.html (tables, prices, cards, meta), index.html cards, lib/catalog.mjs (checkout), chat.mjs and the
chat's site knowledge are rewritten. If a part has no price today (out of stock), nothing is re-priced.

Always writes public/data/prices-today.csv and builds-today.csv (read by the Google Sheet).

Usage: python3 -E scripts/apply-prices.py [--date YYYY-MM-DD] [--dry-run] [--deploy]
Prints a JSON summary on the last line.
"""
import csv, json, re, subprocess, sys
from datetime import date as Date
from decimal import Decimal as D, ROUND_HALF_UP
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PRICING = SITE / "data" / "pricing.json"
HISTORY = SITE / "public" / "data" / "price-history.csv"
BUILDS_HTML = SITE / "public" / "builds.html"
INDEX_HTML = SITE / "public" / "index.html"
CATALOG = SITE / "netlify" / "functions" / "lib" / "catalog.mjs"
CHAT = SITE / "netlify" / "functions" / "chat.mjs"
CENT = D("0.01")


def money(x):
    return f"${D(x):,.2f}"


def whole(x):
    return f"${int(x):,}"


def nice_date(iso):
    d = Date.fromisoformat(iso)
    return f"{d.strftime('%b')} {d.day}, {d.year}"


def todays_prices(day):
    rows = list(csv.DictReader(HISTORY.open()))
    if day is None:
        day = max(r["date"] for r in rows)
    prices = {}
    for r in rows:  # later rows of the same day win
        if r["date"] == day:
            prices[r["part_key"]] = D(r["cost_basis"]) if r["cost_basis"].strip() else None
    return day, prices


def economics(b, parts_total, price, rules):
    price = D(price)
    fee = (parts_total * D(str(rules["card_fee_rate"]))).quantize(CENT, ROUND_HALF_UP)
    processing = price * D(str(rules["processing_rate"])) + D(str(rules["processing_fixed"]))
    reserve = price * D(str(rules["reserve_rate"]))
    before_labor = price - parts_total - processing - reserve - D(str(b["packaging"]))
    after_labor = before_labor - D(str(b["hours"])) * D(str(rules["labor_rate"]))
    lock = price - parts_total - fee - D(str(b["assembly"]))
    return {"fee": fee, "lock": lock, "before_labor": before_labor.quantize(CENT), "after_labor": after_labor.quantize(CENT)}


def formula_price(b, parts_total, rules):
    end = rules["price_ending"]
    p = (int(parts_total) // 100) * 100 + end
    while True:
        e = economics(b, parts_total, p, rules)
        if e["after_labor"] >= rules["min_after_labor"] and e["lock"] >= 0:
            return p
        p += 100


def table_rows(b, parts, rules, price):
    total = sum(D(str(parts[k]["site_price"])) for k in b["parts"])
    e = economics(b, total, price, rules)
    out = "".join(
        f'          <tr><td>{parts[k]["category"]}</td><td>{parts[k]["item"]}</td><td class="num">{money(parts[k]["site_price"])}</td></tr>\n'
        for k in b["parts"])
    out += f'          <tr class="subtle"><td></td><td>Parts total</td><td class="num">{money(total)}</td></tr>\n'
    out += f'          <tr class="subtle"><td></td><td>Sourcing and card fees (5% of parts)</td><td class="num">{money(e["fee"])}</td></tr>\n'
    out += f'          <tr class="subtle"><td></td><td>{b["assembly_label"]}</td><td class="num">{money(b["assembly"])}</td></tr>\n'
    out += f'          <tr class="subtle"><td></td><td>Price lock (covers part price changes until delivery)</td><td class="num">{money(e["lock"])}</td></tr>\n'
    out += f'          <tr class="total"><td></td><td>Total before sales tax</td><td class="num">{money(price)}</td></tr>\n'
    return out


def sub1(pattern, repl, text, what):
    new, n = re.subn(pattern, repl, text, flags=re.S)
    if n == 0:
        raise SystemExit(f"apply-prices: could not find {what}")
    return new


def round10(x):
    return int((D(x) / 10).quantize(D("1"), ROUND_HALF_UP) * 10)


def rewrite_site(cfg):
    parts, builds, rules = cfg["parts"], cfg["builds"], cfg["rules"]
    s = BUILDS_HTML.read_text()
    for bid, b in builds.items():
        a = s.index(f'<section class="build" id="{bid}">')
        e = s.index("</section>", a)
        sec = s[a:e]
        ta = sec.index("<tbody>") + len("<tbody>\n")
        tb = sec.index("          </tbody>")
        sec = sec[:ta] + table_rows(b, parts, rules, b["set_price"]) + sec[tb:]
        sec = sub1(r'<p class="price">\$[\d,]+</p>', f'<p class="price">{whole(b["set_price"])}</p>', sec, f"{bid} price")
        sec = sub1(r'Priced on [A-Z][a-z]{2} \d{1,2}, \d{4}', f'Priced on {nice_date(b["priced_on"])}', sec, f"{bid} stamp")
        s = s[:a] + sec + s[e:]
    ram_up = round10(D(str(parts["ram_32gb"]["site_price"])) - D(str(parts["ram_16gb"]["site_price"])))
    cpu_up = round10(D(str(parts["cpu_7800x3d"]["site_price"])) - D(str(parts["cpu_9600x"]["site_price"])))
    s = sub1(r"Moving to 32GB adds about \$[\d,]+", f"Moving to 32GB adds about ${ram_up:,}", s, "32GB upsell")
    s = sub1(r"Ryzen 7 7800X3D processor \(about \+\$[\d,]+\)", f"Ryzen 7 7800X3D processor (about +${cpu_up:,})", s, "7800X3D upsell")
    trio = (f'Mainstream {whole(builds["mainstream"]["set_price"])}, Performance {whole(builds["performance"]["set_price"])} '
            f'and Quiet Creator {whole(builds["quiet-creator"]["set_price"])}')
    s = sub1(r"Mainstream \$[\d,]+, Performance \$[\d,]+ and Quiet Creator \$[\d,]+", trio, s, "meta prices")
    BUILDS_HTML.write_text(cards(s, builds))
    INDEX_HTML.write_text(cards(INDEX_HTML.read_text(), builds))

    c = CATALOG.read_text()
    for bid, b in builds.items():
        key = f'"{bid}"' if "-" in bid else bid
        c = sub1(rf'({re.escape(key)}: \{{.*?totalCents: )\d+', rf'\g<1>{b["set_price"] * 100}', c, f"catalog {bid}")
    CATALOG.write_text(c)

    ch = CHAT.read_text()
    ch = sub1(r"Mainstream \$[\d,]+, Performance \$[\d,]+, Quiet Creator \$[\d,]+",
              f'Mainstream {whole(builds["mainstream"]["set_price"])}, Performance {whole(builds["performance"]["set_price"])}, '
              f'Quiet Creator {whole(builds["quiet-creator"]["set_price"])}', ch, "chat prices")
    CHAT.write_text(ch)
    subprocess.run([sys.executable, "-E", str(SITE / "scripts" / "build-knowledge.py")], cwd=SITE, check=True,
                   stdout=subprocess.DEVNULL)
    # Keep search data current: Product prices in the builds page JSON-LD, sitemap dates, llms.txt prices.
    subprocess.run([sys.executable, "-E", str(SITE / "scripts" / "seo.py")], cwd=SITE, check=True, stdout=subprocess.DEVNULL)
    llms = SITE / "public" / "llms.txt"
    if llms.exists():
        t = llms.read_text()
        for name, key in (("Mainstream", "mainstream"), ("Performance", "performance"), ("Quiet Creator", "quiet-creator")):
            t = re.sub(rf"- {name} - \$[\d,]+:", f"- {name} - {whole(builds[key]['set_price'])}:", t)
        llms.write_text(t)


def cards(html, builds):
    for bid, b in builds.items():
        a = html.index(f'data-build="{bid}"')
        e = html.index("</article>", a)
        card = html[a:e]
        card = sub1(r'<span class="ffg-price">\$[\d,]+</span>', f'<span class="ffg-price">{whole(b["set_price"])}</span>', card, f"{bid} card price")
        card = sub1(r'priced on [A-Z][a-z]{2} \d{1,2}, \d{4}', f'priced on {nice_date(b["priced_on"])}', card, f"{bid} card date")
        html = html[:a] + card + html[e:]
    return html


def write_sheet_data(cfg, day, prices):
    parts, builds, rules = cfg["parts"], cfg["builds"], cfg["rules"]
    out = SITE / "public" / "data"
    with (out / "prices-today.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "part_key", "category", "item", "price_source", "today_cost", "site_price", "change_vs_site_pct", "used_in"])
        for k, p in parts.items():
            t = prices.get(k)
            used = ", ".join(b["name"] for b in builds.values() if k in b["parts"]) or "upsell only"
            pct = f"{(t / D(str(p['site_price'])) - 1) * 100:.1f}" if t is not None else ""
            w.writerow([day, k, p["category"], p["item"], "Newegg" if p["basis"] == "newegg" else "PCPartPicker",
                        f"{t:.2f}" if t is not None else "MISSING", f"{p['site_price']:.2f}", pct, used])
    # Margins are NOT written here (this file is public); the Google Sheet computes them from these columns.
    with (out / "builds-today.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["date", "build", "set_price", "priced_on", "parts_at_site_prices", "parts_today", "packaging", "labor_hours"])
        for b in builds.values():
            site_total = sum(D(str(parts[k]["site_price"])) for k in b["parts"])
            today = [prices.get(k) for k in b["parts"]]
            total = "MISSING" if any(t is None for t in today) else f"{sum(today):.2f}"
            w.writerow([day, b["name"], b["set_price"], b["priced_on"], f"{site_total:.2f}", total, b["packaging"], b["hours"]])


def write_dashboard_day(cfg, day, prices, summary, old_prices):
    """One document for the Price Desk dashboard (collection "days", doc id = date), written next to the project
    folder as price-dashboard-day.json. The daily task adds its own notes and stores it with ArtifactData."""
    parts, builds, rules = cfg["parts"], cfg["builds"], cfg["rules"]
    rows = []
    for bid, b in builds.items():
        today = [prices.get(k) for k in b["parts"]]
        row = {"name": b["name"], "set_price": b["set_price"], "old_price": old_prices[bid]}
        if all(t is not None for t in today):
            total = sum(today)
            e = economics(b, total, b["set_price"], rules)
            row.update(parts_today=float(total), before_labor=float(e["before_labor"]), after_labor=float(e["after_labor"]),
                       price_lock=float(e["lock"].quantize(CENT)))
        rows.append(row)
    if summary["missing"]:
        status = "attention"
        headline = "No price today for " + ", ".join(summary["missing"]) + " - builds not re-priced until you pick a replacement part."
    elif summary["repriced"]:
        status = "repriced"
        headline = "Re-priced: " + ", ".join(f'{c["build"]} {whole(c["old_price"])} -> {whole(c["new_price"])}' if c["old_price"] != c["new_price"]
                                              else f'{c["build"]} stays {whole(c["new_price"])}' for c in summary["changes"]) + "."
    else:
        status = "ok"
        headline = "No part moved more than 5% from the site's prices - site unchanged."
    thin = [r["name"] for r in rows if r.get("after_labor") is not None and r["after_labor"] < rules["min_after_labor"]]
    if thin and status == "ok":
        status = "attention"
        headline += " Thin margin after labor: " + ", ".join(thin) + "."
    doc = {"date": day, "status": status, "headline": headline, "builds": rows,
           "movers": summary["movers"], "missing": summary["missing"], "deployed": False, "notes": []}
    (SITE.parent / "price-dashboard-day.json").write_text(json.dumps(doc, indent=2) + "\n")


def main():
    args = sys.argv[1:]
    day = args[args.index("--date") + 1] if "--date" in args else None
    dry, deploy = "--dry-run" in args, "--deploy" in args
    cfg = json.loads(PRICING.read_text())
    parts, builds, rules = cfg["parts"], cfg["builds"], cfg["rules"]
    day, prices = todays_prices(day)

    used = sorted({k for b in builds.values() for k in b["parts"]} | set(parts))
    missing = [k for k in used if prices.get(k) is None and not parts[k].get("upsell_only")]
    movers = []
    for k in used:
        t = prices.get(k)
        if t is None:
            continue
        old = D(str(parts[k]["site_price"]))
        pct = (t / old - 1) * 100
        if abs(pct) > rules["trigger_change"] * 100 and not parts[k].get("upsell_only"):
            movers.append({"part": k, "item": parts[k]["item"], "site_price": float(old), "today": float(t), "change_pct": round(float(pct), 1)})

    old_prices = {bid: b["set_price"] for bid, b in builds.items()}
    summary = {"date": day, "missing": missing, "movers": movers, "repriced": False, "changes": [], "deployed": False}
    if movers and not missing:
        for k in parts:
            if prices.get(k) is not None:
                parts[k]["site_price"] = float(prices[k])
        for bid, b in builds.items():
            total = sum(D(str(parts[k]["site_price"])) for k in b["parts"])
            new = formula_price(b, total, rules)
            e = economics(b, total, new, rules)
            summary["changes"].append({"build": b["name"], "old_price": b["set_price"], "new_price": new,
                                       "parts_total": float(total), "after_labor": float(e["after_labor"]), "price_lock": float(e["lock"])})
            b["set_price"], b["priced_on"] = new, day
        summary["repriced"] = True
        if not dry:
            PRICING.write_text(json.dumps(cfg, indent=2) + "\n")
            rewrite_site(cfg)
    if not dry:
        write_sheet_data(cfg, day, prices)
        # Monthly price report page follows the daily data (month-to-date).
        subprocess.run([sys.executable, "-E", str(SITE / "scripts" / "price-report.py")], cwd=SITE, check=True,
                       stdout=subprocess.DEVNULL)
        # Blog posts whose date has come are published today; then the guides hub lists them and seo.py
        # adds them to the sitemap.
        subprocess.run([sys.executable, "-E", str(SITE / "scripts" / "blog.py")], cwd=SITE, check=True,
                       stdout=subprocess.DEVNULL)
        subprocess.run([sys.executable, "-E", str(SITE / "scripts" / "guides.py")], cwd=SITE, check=True,
                       stdout=subprocess.DEVNULL)
        subprocess.run([sys.executable, "-E", str(SITE / "scripts" / "seo.py")], cwd=SITE, check=True,
                       stdout=subprocess.DEVNULL)

    if not dry:
        write_dashboard_day(cfg, day, prices, summary, old_prices)

    if deploy and not dry:
        files = ["data/pricing.json", "public/data", "public/builds.html", "public/index.html", "public/llms.txt", "public/sitemap.xml",
                 "public/services.html", "public/support.html", "public/about.html", "public/quote.html", "public/price-report.html", "public/data-license.html", "public/guides.html", "public/best-gaming-pc-2026.html", "public/first-gaming-pc-guide.html", "public/prebuilt-vs-custom-pc.html", "public/blog.xml", "public/blog-*.html", "content/blog",
                 "netlify/functions/lib/catalog.mjs", "netlify/functions/chat.mjs", "netlify/functions/lib/site-knowledge.mjs"]
        subprocess.run(["git", "add", *files], cwd=SITE, check=True)
        if subprocess.run(["git", "diff", "--cached", "--quiet"], cwd=SITE).returncode != 0:
            msg = (f"Re-price builds from {day} part prices: " + ", ".join(f'{c["build"]} ${c["new_price"]:,}' for c in summary["changes"])
                   if summary["repriced"] else f"Daily part prices {day}")
            subprocess.run(["git", "commit", "-q", "-m", msg + "\n\nAutomated by the Frame Foundry daily price check."], cwd=SITE, check=True)
            subprocess.run(["git", "push", "-q", "origin", "main"], cwd=SITE, check=True)
            summary["deployed"] = True
            dash = SITE.parent / "price-dashboard-day.json"
            if dash.exists():
                d = json.loads(dash.read_text()); d["deployed"] = summary["repriced"]
                dash.write_text(json.dumps(d, indent=2) + "\n")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
