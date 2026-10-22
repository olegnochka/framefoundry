"""Frame Foundry - shared helpers for generated pages (price-report.py, guides.py, blog.py).

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


def page_shell(title, desc, canonical, current=None):
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
    if current:  # mark the nav link for this section, e.g. "guides.html"
        header = header.replace(f'<a href="{current}">', f'<a href="{current}" aria-current="page">', 1)
    footer = re.search(r"<footer class=\"site-footer\">.*?</footer>", tpl, re.S).group(0)
    return head, header, footer


def md_inline(t):
    """Escape text, then apply **bold**, *italic*, `code` and [text](url)."""
    t = html.escape(t, quote=False)
    t = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<![*\w])\*(?!\s)(.+?)(?<!\s)\*(?![*\w])", r"<em>\1</em>", t)
    t = re.sub(r"`(.+?)`", r"<code>\1</code>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", lambda m: f'<a href="{html.escape(m.group(2))}">{m.group(1)}</a>', t)
    return t


def md(text):
    """Small Markdown subset for blog posts: ## / ### headings, paragraphs, - and 1. lists, > notes,
    | tables |, and inline bold, italic, code and links. Enough for posts, no dependencies."""
    out, para, lst, table = [], [], None, []

    def flush():
        nonlocal para, lst, table
        if para:
            out.append("<p>" + md_inline(" ".join(para)) + "</p>"); para = []
        if lst:
            tag, items = lst
            out.append(f"<{tag}>" + "".join(f"<li>{md_inline(i)}</li>" for i in items) + f"</{tag}>"); lst = None
        if table:
            rows = [[c.strip() for c in r.strip().strip("|").split("|")] for r in table if not re.match(r"^\|?\s*:?-{3,}", r.strip())]
            head, body = rows[0], rows[1:]
            num = lambda c: ' class="num"' if re.match(r"^[-+$]?[\d,.]+%?$", c) else ""
            out.append('<div class="table-scroll"><table><thead><tr>' + "".join(f"<th>{md_inline(c)}</th>" for c in head) + "</tr></thead><tbody>"
                       + "".join("<tr>" + "".join(f"<td{num(c)}>{md_inline(c)}</td>" for c in r) + "</tr>" for r in body) + "</tbody></table></div>")
            table = []

    for raw in text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush(); continue
        if line.startswith("|"):
            if para or lst: flush()
            table.append(line); continue
        if table: flush()
        m = re.match(r"^(#{2,3})\s+(.*)", line)
        if m:
            flush(); lvl = len(m.group(1)); out.append(f"<h{lvl}>{md_inline(m.group(2))}</h{lvl}>"); continue
        m = re.match(r"^\s*(?:[-*]|(\d+)\.)\s+(.*)", line)
        if m:
            tag = "ol" if m.group(1) else "ul"
            if para: flush()
            if not lst or lst[0] != tag:
                flush(); lst = (tag, [])
            lst[1].append(m.group(2)); continue
        if line.startswith(">"):
            flush(); out.append('<p class="notice">' + md_inline(line.lstrip("> ").strip()) + "</p>"); continue
        if lst:
            lst[1][-1] += " " + line.strip(); continue
        para.append(line.strip())
    flush()
    return "\n".join(out)
