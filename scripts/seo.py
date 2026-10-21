#!/usr/bin/env python3
"""Frame Foundry - search and AI-readability layer for the static site.

Run after any page or price change (apply-prices.py runs it automatically):
    python3 -E scripts/seo.py

It (re)writes, from the pages themselves and data/pricing.json:
- <title>, meta description (non-build pages), canonical link and robots meta on every page
- schema.org JSON-LD between <!-- seo:jsonld --> markers:
    index    -> ComputerStore (service-area business, no street address - home workshop, LAMC 12.05 A.16)
    builds   -> Product + Offer for each current build (prices from pricing.json)
    services -> Service + Offer for each priced service
    support  -> FAQPage built from the "Common questions" headings and answers
- public/sitemap.xml (indexable pages only)
- the Google Analytics 4 tag (GA_ID) right after <head> on every page
robots.txt and llms.txt are static files in public/.
Facts here must match the pages - never add claims the site does not make.
"""
import html, json, re
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PUB = SITE / "public"
BASE = "https://framefoundrypc.com"
BUSINESS = "Frame Foundry"
EMAIL = "hello@framefoundrypc.com"

AREAS = ["Canoga Park", "Woodland Hills", "West Hills", "Winnetka", "Reseda", "Northridge", "Chatsworth", "Porter Ranch",
         "Calabasas", "Hidden Hills", "Agoura Hills", "Oak Park", "Westlake Village", "Thousand Oaks", "Newbury Park",
         "Tarzana", "Encino", "Sherman Oaks", "Van Nuys", "Studio City", "North Hollywood", "Burbank", "Granada Hills",
         "Simi Valley", "Moorpark", "Camarillo", "Malibu", "Topanga", "Pacific Palisades", "Santa Monica", "Brentwood",
         "Beverly Hills", "West Hollywood", "Marina del Rey"]

# Page -> (title, description or None to keep the page's own, indexable)
PAGES = {
    "index.html": ("Custom Gaming PCs in the San Fernando Valley | Frame Foundry",
                   "Custom gaming PCs built to order in Canoga Park and hand-delivered across the San Fernando Valley, Conejo Valley, Simi Valley, Camarillo, Malibu and the Westside. Every part priced, in-home setup, 1-year local labor warranty.", True),
    "builds.html": ("Custom Gaming PC Builds with Every Part Priced | Frame Foundry", None, True),
    "services.html": ("PC Assembly, Upgrades, Tune-ups and Setup in LA | Frame Foundry", None, True),
    "about.html": ("About Frame Foundry - Custom PC Builder in Canoga Park", None, True),
    "support.html": ("Gaming PC Support and FAQ | Frame Foundry",
                     "How to reach Frame Foundry, answers to common questions about custom gaming PCs, delivery, payment and upgrades, and help with a PC we built.", True),
    "quote.html": ("Free Custom Gaming PC Quote - LA and the Valley | Frame Foundry", None, True),
    "price-report.html": (None, None, True),  # title, description and JSON-LD come from price-report.py
    "warranty.html": ("Warranty - Frame Foundry", None, True),
    "terms.html": ("Terms of Sale - Frame Foundry", None, True),
    "privacy.html": ("Privacy Policy - Frame Foundry", None, True),
    "checkout.html": ("Checkout - Frame Foundry", None, False),
    "order-thanks.html": ("Order received - Frame Foundry", "Thank you for your Frame Foundry order - what happens next.", False),
    "care-thanks.html": ("Thank you - Frame Foundry", None, False),
}


GA_ID = "G-6NCWVEJ7S0"  # Google Analytics 4 property "framefoundrypc.com" (account Frame Foundry)
GA_TAG = (f'<!-- ga -->\n<script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>\n'
          f"<script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag('js',new Date());gtag('config','{GA_ID}');</script>\n"
          "<!-- /ga -->")


def put_ga(s):
    if "<!-- ga -->" in s:
        return re.sub(r"<!-- ga -->.*?<!-- /ga -->", lambda m: GA_TAG, s, flags=re.S)
    return s.replace("<head>", "<head>\n" + GA_TAG, 1)


def url_of(page):
    return f"{BASE}/" if page == "index.html" else f"{BASE}/{page}"


def put_jsonld(s, data):
    block = "<!-- seo:jsonld -->\n" + "".join(
        f'<script type="application/ld+json">{json.dumps(d, ensure_ascii=False, separators=(",", ":"))}</script>\n' for d in data
    ) + "<!-- /seo:jsonld -->"
    if "<!-- seo:jsonld -->" in s:
        return re.sub(r"<!-- seo:jsonld -->.*?<!-- /seo:jsonld -->", lambda m: block, s, flags=re.S)
    return s.replace("</head>", block + "\n</head>", 1)


def set_head(s, page, title, desc, indexable):
    if title:
        s = re.sub(r"<title>.*?</title>", f"<title>{html.escape(title)}</title>", s, count=1, flags=re.S)
        s = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{html.escape(title)}">', s, count=1)
    if desc:
        s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{html.escape(desc)}">', s, count=1)
        s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{html.escape(desc)}">', s, count=1)
    canon = f'<link rel="canonical" href="{url_of(page)}">'
    s = re.sub(r'<link rel="canonical" href="[^"]*">', canon, s) if 'rel="canonical"' in s else s.replace("</title>", "</title>\n" + canon, 1)
    if not indexable and 'name="robots"' not in s:
        s = s.replace("</title>", '</title>\n<meta name="robots" content="noindex">', 1)
    return s


def org():
    return {"@type": "ComputerStore", "@id": f"{BASE}/#business", "name": BUSINESS,
            "legalName": "Pacific Front Desk LLC", "url": f"{BASE}/", "email": EMAIL, "image": f"{BASE}/img/og.jpg",
            "description": "Custom gaming PCs built to order in Canoga Park, Los Angeles, and hand-delivered with in-home setup. "
                           "Every part priced at cost plus 5%, a visible build fee, and a 1-year local labor warranty.",
            "address": {"@type": "PostalAddress", "addressLocality": "Canoga Park", "addressRegion": "CA", "postalCode": "91303", "addressCountry": "US"},
            "areaServed": [{"@type": "City", "name": f"{a}, CA"} for a in AREAS],
            "priceRange": "$$$", "currenciesAccepted": "USD", "paymentAccepted": "Credit card, debit card",
            "knowsAbout": ["Custom gaming PCs", "PC assembly", "PC upgrades", "PC tune-ups", "Gaming PC setup"]}


def builds_ld(cfg):
    items = []
    summaries = {"mainstream": "Ryzen 5 9600X, Radeon RX 9060 XT 16GB, 16GB DDR5, 1TB SSD - 1080p and 1440p gaming",
                 "performance": "Ryzen 5 9600X, Radeon RX 9070 XT 16GB, 32GB DDR5, 1TB SSD - high-refresh 1440p gaming",
                 "quiet-creator": "Ryzen 7 9800X3D, GeForce RTX 5070 Ti 16GB, 32GB DDR5, 2TB SSD - quiet build for gaming and creative work"}
    for bid, b in cfg["builds"].items():
        items.append({"@context": "https://schema.org", "@type": "Product", "name": f"Frame Foundry {b['name']} gaming PC",
                      "description": summaries.get(bid, ""), "image": f"{BASE}/img/build-{bid}.webp", "brand": {"@type": "Brand", "name": BUSINESS},
                      "url": f"{BASE}/builds.html#{bid}",
                      "offers": {"@type": "Offer", "price": f"{b['set_price']:.2f}", "priceCurrency": "USD", "availability": "https://schema.org/MadeToOrder",
                                 "url": f"{BASE}/checkout.html?build={bid}", "seller": {"@id": f"{BASE}/#business"}, "areaServed": "Los Angeles and Ventura counties, CA"}})
    return items


def services_ld():
    svc = [("Standard PC build", 249, "Assembly and tidy cable management, BIOS update and memory profile, Windows 11 with current drivers and no bloatware, stress test and temperature check with photos."),
           ("Premium PC build", 399, "Everything in Standard, plus fan curves tuned for low noise, small form factor cases, and showcase cable routing and lighting."),
           ("Standard in-home setup", 149, "Unbox and connect monitor and peripherals, network, Windows account and updates, game launchers installed, and a walkthrough of the PC."),
           ("Premium in-home setup", 249, "Everything in Standard, plus parental controls, desk cable management, monitor settings tuned and a 30-day check-in."),
           ("PC tune-up", 79, "About an hour at your home: dust cleaned out, fresh thermal paste, BIOS, driver and Windows updates, fan curves checked, stress test and a short report - any desktop PC.")]
    out = [{"@context": "https://schema.org", "@type": "Service", "name": n, "description": d, "provider": {"@id": f"{BASE}/#business"},
            "areaServed": "San Fernando Valley, Conejo Valley, Simi Valley, Camarillo, Malibu and the Westside, CA",
            "offers": {"@type": "Offer", "price": f"{p:.2f}", "priceCurrency": "USD"}} for n, p, d in svc]
    out.append({"@context": "https://schema.org", "@type": "Service", "name": "Frame Foundry Care",
                "description": "Yearly plan: one tune-up a year, free repair labor on PCs we built, priority replies and remote help. Renews yearly, cancel any time.",
                "provider": {"@id": f"{BASE}/#business"},
                "offers": {"@type": "Offer", "price": "99.00", "priceCurrency": "USD",
                           "priceSpecification": {"@type": "UnitPriceSpecification", "price": "99.00", "priceCurrency": "USD", "unitText": "year"}}})
    return out


def faq_ld(s):
    a = s.find("Common questions")
    if a < 0:
        return []
    part = s[a:s.find("</main>", a)]
    qa = []
    for m in re.finditer(r"<h3>(.*?)</h3>(.*?)(?=<h3>|$)", part, flags=re.S):
        q = re.sub(r"<[^>]+>", "", m.group(1)).strip()
        ans = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(2))).strip()
        if q and ans:
            qa.append({"@type": "Question", "name": html.unescape(q), "acceptedAnswer": {"@type": "Answer", "text": html.unescape(ans)}})
    return [{"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": qa}] if qa else []


def main():
    cfg = json.loads((SITE / "data" / "pricing.json").read_text())
    for page, (title, desc, indexable) in PAGES.items():
        p = PUB / page
        if not p.exists():
            continue
        s = put_ga(set_head(p.read_text(), page, title, desc, indexable))
        if page == "index.html":
            s = put_jsonld(s, [{"@context": "https://schema.org", **org()},
                               {"@context": "https://schema.org", "@type": "WebSite", "name": BUSINESS, "url": f"{BASE}/"}])
        elif page == "builds.html":
            s = put_jsonld(s, builds_ld(cfg))
        elif page == "services.html":
            s = put_jsonld(s, services_ld())
        elif page == "support.html":
            s = put_jsonld(s, faq_ld(s))
        p.write_text(s)
    today = date.today().isoformat()
    urls = "".join(f"  <url><loc>{url_of(pg)}</loc><lastmod>{today}</lastmod></url>\n" for pg, (_, _, ix) in PAGES.items() if ix and (PUB / pg).exists())
    (PUB / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    print("seo: pages, JSON-LD and sitemap written")


if __name__ == "__main__":
    main()
