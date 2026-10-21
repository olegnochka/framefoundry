#!/usr/bin/env python3
"""Frame Foundry - buyer guides that answer what people search for.

    python3 -E scripts/guides.py

Writes, from data/pricing.json (so every price matches the builds page on the day it runs):
    public/guides.html                    hub
    public/best-gaming-pc-2026.html       best gaming PC at each current build price
    public/first-gaming-pc-guide.html     a parent's guide to a first gaming PC
    public/prebuilt-vs-custom-pc.html     prebuilt vs custom vs build it yourself
apply-prices.py runs this on every daily price run. Facts here must match the site
(builds, services, warranty, support pages) - never add claims the site does not make,
and never show labor or margin figures.
"""
import html, json
from datetime import date

from pagekit import BASE, PUB, SITE, money, page_shell, whole

PUBLISHED = "2026-10-21"
GAMES = "Fortnite, Valorant, Minecraft, Roblox, Rocket League and Marvel Rivals"


def load():
    cfg = json.loads((SITE / "data" / "pricing.json").read_text())
    parts = cfg["parts"]
    builds = {}
    for bid, b in cfg["builds"].items():
        pl = [parts[k] for k in b["parts"]]
        total = sum(p["site_price"] for p in pl)
        gpu = next(p for p in pl if p["category"].startswith("Graphics"))
        builds[bid] = {**b, "id": bid, "part_list": pl, "parts_total": total, "gpu": gpu,
                       "pick": {p["category"]: p["item"] for p in pl}}
    return cfg, builds


def short(item):
    return item.split(" (")[0].split(",")[0]


def mem_size(b):
    import re
    m = re.search(r"(\d+GB) \(", b["pick"]["Memory (RAM)"])
    return m.group(1) if m else ""


def faq_html(qa):
    return "".join(f"<h3>{html.escape(q)}</h3>\n<p>{a}</p>\n" for q, a in qa)


def faq_ld(qa):
    import re
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": html.unescape(re.sub(r"<[^>]+>", "", a))}} for q, a in qa]}


def article_ld(title, desc, url, today):
    return {"@context": "https://schema.org", "@type": "Article", "headline": title, "description": desc,
            "url": url, "datePublished": PUBLISHED, "dateModified": today, "image": f"{BASE}/img/og.jpg",
            "author": {"@type": "Organization", "name": "Frame Foundry", "url": f"{BASE}/"},
            "publisher": {"@id": f"{BASE}/#business"}}


def write(page, title, desc, eyebrow, h1, lede, body, ld, today):
    url = f"{BASE}/{page}"
    head, header, footer = page_shell(title, desc, url)
    scripts = "".join(f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False, separators=(",", ":"))}</script>\n' for d in ld)
    head = head.replace("</head>", scripts + "</head>", 1)
    out = f"""{head}<body>
{header}
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">{eyebrow}</p>
    <h1>{h1}</h1>
    <p>{lede}</p>
  </div>
</section>
<main>
  <div class="wrap narrow">
{body}
    <p class="muted">Updated {date.fromisoformat(today).strftime("%b %-d, %Y")}. Prices are in US dollars before sales tax and follow our daily part price check.</p>
  </div>
</main>
{footer}
</body>
</html>
"""
    (PUB / page).write_text(out)


def best_by_budget(builds, today):
    m, p, q = builds["mainstream"], builds["performance"], builds["quiet-creator"]
    title = f"Best Gaming PC for {whole(m['set_price'])}, {whole(p['set_price'])} and {whole(q['set_price'])} in 2026 | Frame Foundry"
    desc = (f"Which gaming PC to buy at {whole(m['set_price'])}, {whole(p['set_price'])} and {whole(q['set_price'])} in 2026: "
            "the exact parts, what each build is good at, where the money goes, and what to upgrade first. Built and delivered in Los Angeles.")
    rows = "".join(
        f'<tr><td><strong>{whole(b["set_price"])}</strong></td><td><a href="builds.html#{b["id"]}">{html.escape(b["name"])}</a></td>'
        f'<td>{html.escape(who)}</td><td>{html.escape(short(b["pick"]["Processor (CPU)"]))}, {html.escape(short(b["gpu"]["item"]))}, '
        f'{mem_size(b)} memory</td></tr>'
        for b, who in ((m, "1080p high settings, comfortable 1440p, a first gaming PC"),
                       (p, "high frame rates at 1440p, competitive shooters, streaming"),
                       (q, "quiet room, gaming plus video editing and creative work")))

    def share(b):
        return round(b["gpu"]["site_price"] / b["parts_total"] * 100)

    def section(b, does, note):
        lines = "".join(f'<tr><td>{html.escape(c)}</td><td>{html.escape(short(i))}</td></tr>' for c, i in b["pick"].items())
        return f"""
    <h2 id="{b['id']}">{whole(b['set_price'])}: {html.escape(b['name'])}</h2>
    <p>{does}</p>
    <div class="table-scroll"><table><thead><tr><th>Part</th><th>Pick</th></tr></thead><tbody>{lines}</tbody></table></div>
    <p>{note} The graphics card is {share(b)}% of this build's parts cost ({money(b['gpu']['site_price'])} of {money(b['parts_total'])}) - that is normal for a gaming PC, and it is the part that decides how games look and run.</p>
    <p><a href="builds.html#{b['id']}">Every part and price for the {html.escape(b['name'])} build</a>.</p>"""

    body = f"""
    <p>Short answer: at about {whole(m['set_price'])} you get a PC that plays today's popular games smoothly at 1080p and comfortably at 1440p.
    Around {whole(p['set_price'])} buys high frame rates at 1440p and twice the memory. Around {whole(q['set_price'])} gets you one of the fastest gaming processors
    and a quieter build that also handles video editing. Below are the exact parts we use at each price and why.</p>

    <h2>Quick pick</h2>
    <div class="table-scroll"><table><thead><tr><th>Budget</th><th>Build</th><th>Best for</th><th>Key parts</th></tr></thead><tbody>{rows}</tbody></table></div>
{section(m, f"Smooth 1080p at high settings and comfortable 1440p in today's popular games - {GAMES}. This is the build we suggest for a first gaming PC.",
         "Memory prices are unusually high right now, so this build uses 16GB; moving to 32GB is the first upgrade we suggest.")}
{section(p, "High frame rates at 1440p for competitive shooters and big single-player games, with 32GB of memory so streaming, Discord or a browser full of tabs does not slow it down.",
         "The most popular upgrade here is the Ryzen 7 7800X3D processor, which is noticeably faster in many games.")}
{section(q, "Quiet enough for a living room or a home office. The Ryzen 7 9800X3D is one of the fastest gaming processors you can buy, and the build gets premium assembly with fan curves tuned for low noise.",
         "It uses an NVIDIA card because many video and creative apps are built around NVIDIA's hardware encoders and drivers.")}

    <h2>Where the rest of the money goes</h2>
    <p>Every build here lists the price of each part, a 5% line for sourcing and card fees, and the assembly fee on its own line, so you can check every number.
    Parts are bought new for your PC after your deposit. Each PC is assembled, updated, stress-tested and delivered by hand, and comes with a 1-year local labor warranty plus each part's manufacturer warranty.</p>

    <h2>Common questions</h2>
{faq_html(FAQ_BUDGET(m, p))}
    <p>Want something between these? <a href="quote.html">Ask for a free quote</a> with your budget and the games you play.</p>"""
    write("best-gaming-pc-2026.html", title, desc, "Buyer's guide",
          f"Best gaming PC for {whole(m['set_price'])}, {whole(p['set_price'])} and {whole(q['set_price'])}",
          "Three budgets, the exact parts we build with at each one, and what you actually get for the money.",
          body, [article_ld(title, desc, f"{BASE}/best-gaming-pc-2026.html", today), faq_ld(FAQ_BUDGET(m, p))], today)


def FAQ_BUDGET(m, p):
    return [
        (f"Is {whole(m['set_price'])} enough for 1440p gaming?",
         f"For today's popular games, yes: the {html.escape(m['name'])} build runs them comfortably at 1440p and smoothly at 1080p on high settings. For the newest, heaviest games at high frame rates, the {html.escape(p['name'])} build is the better match."),
        ("16GB or 32GB of memory?",
         "16GB plays games fine. 32GB helps when you stream, keep Discord and a browser open while playing, or edit video. Memory prices are high right now, so we start the entry build at 16GB and suggest 32GB as the first upgrade."),
        ("Do these prices include tax and delivery?",
         'The prices are before sales tax, which is added at checkout for your delivery address. Delivery is free within 10 miles of Canoga Park; farther areas are listed on the <a href="services.html#delivery">services page</a>.'),
        ("Will the prices change?",
         'We check every part price daily. If a part moves more than 5%, the build price is updated. Once you pay, your price is locked - if a part rises afterwards, we absorb it. This month\'s price moves are in our <a href="price-report.html">price report</a>.'),
    ]


def first_pc(builds, today):
    m = builds["mainstream"]
    title = "A Parent's Guide to Buying a First Gaming PC (2026) | Frame Foundry"
    desc = ("What a first gaming PC needs for Fortnite, Roblox, Minecraft and Valorant, desktop vs laptop, the extras people forget, "
            "and how to set up parental controls and screen time. From a custom PC builder in Los Angeles.")
    qa = [
        ("What gaming PC does a kid need for Fortnite, Roblox and Minecraft?",
         f"Not the most expensive one. Our {html.escape(m['name'])} build ({whole(m['set_price'])}) runs {GAMES} smoothly at 1080p on high settings, which is what most first setups use."),
        ("Desktop or gaming laptop?",
         "For a PC that stays on a desk, a desktop gives more performance for the money, runs cooler and quieter, and can be upgraded part by part later. A laptop makes sense only if it really needs to travel."),
        ("How do I set parental controls on a gaming PC?",
         "Use a Microsoft family group (Microsoft Family Safety) for Windows screen time, app and game age limits and purchase approval, then turn on the family settings in each game launcher (Steam, Epic Games, Xbox app) and in the games themselves. Our premium in-home setup sets these up with you."),
        ("Can the PC be upgraded as they get older?",
         "Yes. A desktop like this has room for more memory, a bigger drive or a faster graphics card later. We do upgrades at your home and quote the work before we start."),
    ]
    body = f"""
    <p>If your kid is asking for a gaming PC, the good news is that the games most kids play - {GAMES} - do not need a top-end machine.
    What they need is a reliable PC that runs those games smoothly, a decent monitor, and parental controls set up before the first login.
    This guide covers what to buy, what people forget, and how to set it up.</p>

    <h2>What a first gaming PC actually needs</h2>
    <ul>
      <li><strong>A current graphics card with enough memory.</strong> This decides how games look and run. Our entry build uses a {html.escape(short(m['gpu']['item']))}.</li>
      <li><strong>A modern 6-core processor</strong> such as the {html.escape(short(m['pick']['Processor (CPU)']))}.</li>
      <li><strong>16GB of memory</strong> is enough for these games; 32GB is a sensible upgrade later.</li>
      <li><strong>A 1TB SSD (solid state drive).</strong> Games are large; 1TB holds several at once and loads them quickly.</li>
      <li><strong>Wi-Fi built in</strong>, in case the router is in another room - though a cable is better for online games when you can run one.</li>
    </ul>
    <p>That is exactly our <a href="builds.html#mainstream">{html.escape(m['name'])} build</a>, at {whole(m['set_price'])} before sales tax.</p>

    <h2>The extras people forget</h2>
    <ul>
      <li><strong>A monitor.</strong> A 1080p or 1440p gaming monitor with a high refresh rate makes a bigger difference than most upgrades inside the PC.</li>
      <li><strong>Keyboard, mouse and a headset with a microphone</strong> for talking to friends.</li>
      <li><strong>A spot with airflow.</strong> Not inside a closed cabinet; leave space behind and on the sides.</li>
      <li><strong>Accounts.</strong> A Microsoft account set up as a child account, plus accounts for the launchers and games they play.</li>
    </ul>
    <p>We sell monitors, keyboards and headsets at the same cost plus 5% as everything else and set them up with the PC.</p>

    <h2>Parental controls and screen time</h2>
    <p>Set these up on day one - it is much harder to add limits later.</p>
    <ol>
      <li><strong>Windows:</strong> create a Microsoft family group and add your child's account. Microsoft Family Safety handles screen-time limits, age ratings for apps and games, content filters and approval before anything is bought.</li>
      <li><strong>Game launchers:</strong> Steam, Epic Games and the Xbox app each have their own family settings - turn them on and set a PIN.</li>
      <li><strong>In each game:</strong> many games, Roblox and Fortnite included, have their own parental controls for chat and spending.</li>
    </ol>
    <p>Our <a href="services.html">premium in-home setup</a> includes setting parental controls and screen-time limits with you, along with the monitor, network and accounts.</p>

    <h2>Common questions</h2>
{faq_html(qa)}
    <p>Not sure what fits? <a href="quote.html">Ask for a free quote</a> - tell us the games they play and your budget, and we will suggest the right build.</p>"""
    write("first-gaming-pc-guide.html", title, desc, "Parent's guide", "A parent's guide to a first gaming PC",
          "What a first gaming PC needs, the extras people forget, and how to set up parental controls before the first login.",
          body, [article_ld(title, desc, f"{BASE}/first-gaming-pc-guide.html", today), faq_ld(qa)], today)


def prebuilt_vs_custom(cfg, builds, today):
    m = builds["mainstream"]
    fee = round(m["parts_total"] * cfg["rules"]["card_fee_rate"], 2)
    lock = round(m["set_price"] - m["parts_total"] - fee - m["assembly"], 2)
    title = "Prebuilt vs Custom Gaming PC: What You Actually Pay For | Frame Foundry"
    desc = ("Prebuilt, custom-built or build it yourself? How to compare gaming PC prices part by part, what a prebuilt spec sheet often leaves out, "
            "and when each option is the better deal. With a real itemized price.")
    lines = "".join(f'<tr><td>{html.escape(p["category"])}</td><td>{html.escape(short(p["item"]))}</td><td class="num">{money(p["site_price"])}</td></tr>' for p in m["part_list"])
    qa = [
        ("Is it cheaper to buy a prebuilt gaming PC?",
         "Sometimes, especially during big sales - and if a prebuilt is the better deal for you, we will say so. Compare the full parts list, not just the processor and graphics card, before deciding."),
        ("Is building your own PC cheaper?",
         "On parts alone, yes - you skip the assembly fee. You also take on choosing compatible parts, the build itself, BIOS and driver setup, testing, and handling any warranty claim yourself."),
        ("What should a prebuilt spec sheet list?",
         "The exact model of every part: processor, graphics card, motherboard, memory (size and speed), SSD, power supply (wattage and rating), case and cooler. Vague entries such as an unnamed power supply or 'RGB memory' are where costs are usually cut."),
        ("What warranty does a custom PC get?",
         'Each part keeps its manufacturer\'s warranty. Ours adds one year of local labor: if something fails, we diagnose it and swap the part at your home. See the <a href="warranty.html">warranty</a>.'),
    ]
    body = f"""
    <p>There are three ways to get a gaming PC: buy a prebuilt from a brand or a store, have one built for you, or build it yourself.
    None is always the cheapest. The way to compare them is the same every time: look at the exact parts, then at what you get on top of them.</p>

    <h2>Compare the whole parts list, not just two parts</h2>
    <p>Most listings lead with the processor and the graphics card. Those matter most for games, but the parts that decide how long a PC lasts and how quiet it is - the power supply, motherboard, memory, SSD and cooling - are often listed vaguely or not at all. Before comparing prices, make sure you know the exact model of:</p>
    <ul>
      <li>Processor (CPU) and graphics card (GPU)</li>
      <li>Memory: size, speed and number of sticks</li>
      <li>SSD: capacity and model (not just "1TB SSD")</li>
      <li>Power supply: brand, wattage and efficiency rating</li>
      <li>Motherboard, case and CPU cooler</li>
    </ul>

    <h2>A real itemized price</h2>
    <p>This is our {html.escape(m['name'])} build as priced today. Every line is something you can look up yourself.</p>
    <div class="table-scroll"><table><thead><tr><th>Part</th><th>Pick</th><th class="num">Price</th></tr></thead><tbody>{lines}
      <tr class="subtle"><td></td><td>Parts total</td><td class="num">{money(m['parts_total'])}</td></tr>
      <tr class="subtle"><td></td><td>Sourcing and card fees (5% of parts)</td><td class="num">{money(fee)}</td></tr>
      <tr class="subtle"><td></td><td>{html.escape(m['assembly_label'])}</td><td class="num">{money(m['assembly'])}</td></tr>
      <tr class="subtle"><td></td><td>Price lock (covers part price changes until delivery)</td><td class="num">{money(lock)}</td></tr>
      <tr class="total"><td></td><td>Total before sales tax</td><td class="num">{money(m['set_price'])}</td></tr>
    </tbody></table></div>
    <p>The same breakdown for every build is on the <a href="builds.html">builds page</a>, and how part prices moved this month is in the <a href="price-report.html">price report</a>.</p>

    <h2>When each option makes sense</h2>
    <h3>Prebuilt</h3>
    <p>Good when a sale brings the price well below the parts cost, or when you want one box from one store. Check the full parts list and how warranty repairs work - often the whole PC has to be shipped back.</p>
    <h3>Custom-built for you</h3>
    <p>Good when you want specific parts, a quiet or compact build, every price shown, and someone local to deliver it, set it up and fix it if something goes wrong.</p>
    <h3>Build it yourself</h3>
    <p>Good if you enjoy it and have the time. You save the assembly fee and take on part compatibility, the build, BIOS and Windows setup, testing, and warranty claims yourself.</p>

    <h2>Common questions</h2>
{faq_html(qa)}
    <p>Have a prebuilt listing you are weighing up? <a href="quote.html">Send it with a quote request</a> and we will tell you honestly how it compares.</p>"""
    write("prebuilt-vs-custom-pc.html", title, desc, "Buyer's guide", "Prebuilt vs custom gaming PC",
          "How to compare gaming PC prices part by part, and when prebuilt, custom or do-it-yourself is the better deal.",
          body, [article_ld(title, desc, f"{BASE}/prebuilt-vs-custom-pc.html", today), faq_ld(qa)], today)


def hub(builds, today):
    m, p, q = builds["mainstream"], builds["performance"], builds["quiet-creator"]
    title = "Gaming PC Buying Guides | Frame Foundry"
    desc = "Plain-language guides to buying a gaming PC: what to buy at each budget, a parent's guide to a first gaming PC, prebuilt vs custom, and monthly part prices."
    items = [
        ("best-gaming-pc-2026.html", f"Best gaming PC for {whole(m['set_price'])}, {whole(p['set_price'])} and {whole(q['set_price'])}", "The exact parts at each budget, what each build is good at, and what to upgrade first."),
        ("first-gaming-pc-guide.html", "A parent's guide to a first gaming PC", "What kids actually need for Fortnite, Roblox and Minecraft, the extras people forget, and parental controls."),
        ("prebuilt-vs-custom-pc.html", "Prebuilt vs custom gaming PC", "How to compare prices part by part, with a real itemized build."),
        ("price-report.html", "Gaming PC parts price report", "What graphics cards, memory, SSDs and processors cost this month, checked daily."),
    ]
    cards = "".join(f'<div class="card"><h3><a href="{u}">{html.escape(t)}</a></h3><p>{html.escape(d)}</p></div>' for u, t, d in items)
    body = f'    <div class="grid grid-2" style="margin-top:2.4rem">{cards}</div>\n    <p style="margin-top:2rem">Have a question these do not answer? <a href="quote.html">Ask us</a> - a real person on our team replies within one business day.</p>'
    url = f"{BASE}/guides.html"
    ld = {"@context": "https://schema.org", "@type": "CollectionPage", "name": "Gaming PC buying guides", "url": url, "description": desc,
          "hasPart": [{"@type": "Article", "headline": t, "url": f"{BASE}/{u}"} for u, t, _ in items]}
    write("guides.html", title, desc, "Guides", "Gaming PC buying guides",
          "Straight answers to the questions people ask before buying a gaming PC, written from the builds and prices we work with every day.",
          body, [ld], today)


def main():
    cfg, builds = load()
    today = date.today().isoformat()
    best_by_budget(builds, today)
    first_pc(builds, today)
    prebuilt_vs_custom(cfg, builds, today)
    hub(builds, today)
    print("guides: hub + 3 guides written")


if __name__ == "__main__":
    main()
