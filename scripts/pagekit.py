"""Frame Foundry - shared helpers for generated pages (price-report.py, guides.py).

page_shell() copies the <head>, header and footer from about.html, so a generated page always
matches the rest of the site (styles, fonts, Google Analytics tag, nav, footer links).
"""
import html, re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PUB = SITE / "public"
BASE = "https://framefoundrypc.com"


def money(v):
    return f"${v:,.2f}"


def whole(v):
    return f"${v:,.0f}"


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
