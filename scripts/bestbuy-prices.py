#!/usr/bin/env python3
"""Frame Foundry - Best Buy prices for every part in data/pricing.json (Best Buy Products API).

    python3 -E scripts/bestbuy-prices.py            # print today's Best Buy price and stock per part (JSON)
    python3 -E scripts/bestbuy-prices.py --find     # also look up missing Best Buy SKUs and save them

The API key lives OUTSIDE the repo: ~/.config/framefoundry/bestbuy_api_key (Oleg saved it there; never commit it),
or the BESTBUY_API_KEY environment variable.

Matching: a part's "bestbuy_sku" in pricing.json if set (it only counts while "bestbuy_for" equals the part's
current "item", so a swapped part gets looked up again); otherwise --find searches Best Buy by the part's "mpn"
(manufacturer model number) and then by its name, and only accepts a result whose model number matches the mpn,
or - for parts with no mpn - whose name contains every word of our item name. Best Buy simply does not carry
some parts (many cases, coolers, PSUs); those print "not carried".

The daily price check (scheduled task frame-foundry-daily-rise-watch) treats Best Buy as a trusted store:
a Best Buy price that is in stock online counts like Amazon or Newegg under the next-cheapest-store rule.
"""
import json, os, re, sys, time, urllib.parse, urllib.request
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
PRICING = SITE / "data" / "pricing.json"
KEY_FILE = Path.home() / ".config" / "framefoundry" / "bestbuy_api_key"
API = "https://api.bestbuy.com/v1/products"
SHOW = "sku,name,modelNumber,manufacturer,salePrice,regularPrice,onlineAvailability,inStoreAvailability,url"


def key():
    k = os.environ.get("BESTBUY_API_KEY") or (KEY_FILE.read_text().strip() if KEY_FILE.exists() else "")
    if not k:
        sys.exit(f"bestbuy: no API key - save it to {KEY_FILE} (see the handoff file)")
    return k


def call(query):
    url = f"{API}({query})?" + urllib.parse.urlencode({"apiKey": key(), "show": SHOW, "pageSize": 10, "format": "json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                return json.load(r).get("products", [])
        except urllib.error.HTTPError as e:
            if e.code == 403:
                sys.exit("bestbuy: key refused (403) - a new key can take a few minutes to start working")
            if e.code == 429 and attempt < 2:
                time.sleep(2); continue
            raise
        finally:
            time.sleep(0.35)  # Best Buy allows 5 calls a second; stay well under it


def norm(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower())


def find_sku(part):
    mpn = part.get("mpn")
    if mpn:
        for p in call(f"modelNumber={urllib.parse.quote(mpn)}"):
            if norm(p.get("modelNumber")) == norm(mpn):
                return p
    words = [w for w in re.split(r"[^A-Za-z0-9]+", part["item"].split(" (")[0]) if len(w) > 1][:6]
    if not words:
        return None
    q = "&".join(f"search={urllib.parse.quote(w)}" for w in words)
    for p in call(q):
        name = norm(p.get("name"))
        if mpn and norm(p.get("modelNumber")) == norm(mpn):
            return p
        if not mpn and all(norm(w) in name for w in words):
            return p
    return None


def main():
    find = "--find" in sys.argv
    cfg = json.loads(PRICING.read_text())
    out, changed = {}, False
    for k, part in cfg["parts"].items():
        sku = part.get("bestbuy_sku")
        if sku and part.get("bestbuy_for") != part["item"]:  # the part was swapped since this SKU was found
            sku = None
        if not sku and find:
            p = find_sku(part)
            part["bestbuy_sku"] = sku = str(p["sku"]) if p else "none"  # "none" = checked, Best Buy does not carry it
            part["bestbuy_for"] = part["item"]; changed = True
        if not sku or sku == "none":
            out[k] = {"item": part["item"], "carried": False if sku == "none" else None}
            continue
        res = call(f"sku={sku}")
        if not res:
            out[k] = {"item": part["item"], "sku": sku, "carried": False, "note": "SKU not found any more"}
            continue
        p = res[0]
        out[k] = {"item": part["item"], "sku": sku, "carried": True, "bestbuy_name": p.get("name"),
                  "price": p.get("salePrice"), "online": bool(p.get("onlineAvailability")), "url": p.get("url")}
    if changed:
        PRICING.write_text(json.dumps(cfg, indent=2) + "\n")
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
