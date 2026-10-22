#!/usr/bin/env python3
"""Frame Foundry - blog posts.

    python3 -E scripts/blog.py

A post is one Markdown file: content/blog/YYYY-MM-DD-slug.md, starting with

    ---
    title: Why graphics card prices are climbing this fall
    description: One or two sentences for search results (150-160 characters).
    date: 2026-10-22
    tags: prices, graphics cards
    ---
    Body in Markdown (## and ### headings, paragraphs, lists, | tables |, > notes, links).

Each post becomes public/blog-<slug>.html (same header, footer and styles as the site, BlogPosting
JSON-LD), and public/blog.xml is the RSS feed. guides.py lists the posts on guides.html, and seo.py
adds them to the sitemap. Posts dated in the future are skipped until that day.
Facts in posts must be true and checkable: our own builds and prices, our price history, or a named
public source. No invented benchmarks, quotes or reviews; never show labor or margin figures.
"""
import html, json, math, re
from datetime import date

from pagekit import BASE, PUB, SITE, md, page_shell

POSTS = SITE / "content" / "blog"


def load_posts(today=None):
    today = today or date.today().isoformat()
    posts = []
    for f in sorted(POSTS.glob("*.md")):
        raw = f.read_text()
        m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.S)
        if not m:
            raise SystemExit(f"blog: {f.name} has no --- front matter")
        meta = dict(re.findall(r"^(\w+):\s*(.*)$", m.group(1), re.M))
        for k in ("title", "description", "date"):
            if not meta.get(k):
                raise SystemExit(f"blog: {f.name} is missing '{k}'")
        slug = re.sub(r"^\d{4}-\d{2}-\d{2}-", "", f.stem)
        if meta["date"] > today:
            continue
        body = m.group(2).strip()
        words = len(re.sub(r"[#|>*`\[\]()-]", " ", body).split())
        posts.append({**meta, "slug": slug, "page": f"blog-{slug}.html", "url": f"{BASE}/blog-{slug}.html", "body": body,
                      "tags": [t.strip() for t in meta.get("tags", "").split(",") if t.strip()],
                      "minutes": max(1, math.ceil(words / 220)), "words": words})
    return sorted(posts, key=lambda p: p["date"], reverse=True)


def nice(d):
    return date.fromisoformat(d).strftime("%b %-d, %Y")


def render(post, posts):
    title = f"{post['title']} | Frame Foundry"
    head, header, footer = page_shell(title, post["description"], post["url"], current="guides.html")
    head = head.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="article">')
    ld = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": post["title"], "description": post["description"],
          "url": post["url"], "datePublished": post["date"], "dateModified": post.get("updated", post["date"]),
          "image": f"{BASE}/img/og.jpg", "keywords": ", ".join(post["tags"]), "wordCount": post["words"],
          "author": {"@type": "Organization", "name": "Frame Foundry", "url": f"{BASE}/"},
          "publisher": {"@id": f"{BASE}/#business"}, "mainEntityOfPage": post["url"]}
    head = head.replace("</head>", f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False, separators=(",", ":"))}</script>\n'
                        f'<link rel="alternate" type="application/rss+xml" title="Frame Foundry blog" href="{BASE}/blog.xml">\n</head>', 1)
    others = [p for p in posts if p["slug"] != post["slug"]][:3]
    more = ("<h2>More from the blog</h2>\n    <ul>" + "".join(f'<li><a href="{p["page"]}">{html.escape(p["title"])}</a> <span class="muted">- {nice(p["date"])}</span></li>' for p in others)
            + "</ul>") if others else ""
    tags = " ".join(f'<span class="stamp">{html.escape(t)}</span>' for t in post["tags"])
    out = f"""{head}<body>
{header}
<section class="page-head">
  <div class="wrap">
    <p class="eyebrow">Blog - {nice(post['date'])}</p>
    <h1>{html.escape(post['title'])}</h1>
    <p>{html.escape(post['description'])}</p>
  </div>
</section>
<main>
  <article class="wrap narrow">
    <p class="muted" style="margin-top:2rem">{post['minutes']} min read {tags}</p>
{md(post['body'])}
    <hr style="border:0;border-top:1px solid var(--line);margin:3rem 0 0">
    <p style="margin-top:1.6rem">Thinking about a new PC or an upgrade? See our <a href="builds.html">current builds</a> with every part priced, or <a href="quote.html">ask for a free quote</a>.</p>
    {more}
    <p><a href="guides.html">All guides and posts</a></p>
  </article>
</main>
{footer}
</body>
</html>
"""
    (PUB / post["page"]).write_text(out)


def rss(posts):
    items = "".join(f"""
  <item>
    <title>{html.escape(p['title'])}</title>
    <link>{p['url']}</link>
    <guid>{p['url']}</guid>
    <pubDate>{date.fromisoformat(p['date']).strftime('%a, %d %b %Y')} 16:00:00 +0000</pubDate>
    <description>{html.escape(p['description'])}</description>
  </item>""" for p in posts[:30])
    (PUB / "blog.xml").write_text(f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>Frame Foundry blog</title>
  <link>{BASE}/guides.html</link>
  <description>Gaming PCs, parts, prices, upgrades and games - from a custom PC builder in Los Angeles.</description>
  <language>en-us</language>{items}
</channel>
</rss>
""")


def main():
    posts = load_posts()
    keep = {p["page"] for p in posts}
    for old in PUB.glob("blog-*.html"):  # a post renamed or removed from content/blog
        if old.name not in keep:
            old.unlink()
    for p in posts:
        render(p, posts)
    rss(posts)
    print(f"blog: {len(posts)} posts written, blog.xml updated")


if __name__ == "__main__":
    main()
