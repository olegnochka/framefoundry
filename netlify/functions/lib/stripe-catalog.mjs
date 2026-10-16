// Keeps Frame Foundry's products and prices in the Stripe catalog in sync with lib/catalog.mjs.
// Each sellable item has a fixed lookup key (e.g. ff_build_mainstream_deposit). On checkout we look the
// price up by that key; if it is missing, or its amount no longer matches catalog.mjs, we create the
// product/price and move the lookup key to the new price. So prices are only ever edited in catalog.mjs,
// and the Stripe dashboard shows real products (tagged metadata.brand = "frame-foundry", which keeps them
// apart from Pacific Front Desk's own products in the same Stripe account).
import { BUILDS, SERVICES, depositCents } from "./catalog.mjs";

const cache = new Map(); // lookupKey -> { id, amount } for the life of the function instance

// Every sellable item, keyed by lookup key.
export function catalogItems() {
  const items = {};
  for (const [id, b] of Object.entries(BUILDS)) {
    items[`ff_build_${id}_full`] = {
      product: `ff_build_${id}`, name: `Frame Foundry ${b.name}`, description: b.summary,
      amountCents: b.totalCents, nickname: "Pay in full",
    };
    items[`ff_build_${id}_deposit`] = {
      product: `ff_build_${id}`, name: `Frame Foundry ${b.name}`, description: b.summary,
      amountCents: depositCents(b.totalCents), nickname: "30% deposit",
    };
  }
  items.ff_care_yearly = {
    product: "ff_care", name: SERVICES.care.name, description: SERVICES.care.description,
    amountCents: SERVICES.care.amountCents, recurring: { interval: SERVICES.care.interval }, nickname: "Yearly",
  };
  items.ff_tuneup = {
    product: "ff_tuneup", name: SERVICES.tuneup.name, description: SERVICES.tuneup.description,
    amountCents: SERVICES.tuneup.amountCents, nickname: "Per visit",
  };
  return items;
}

function matches(price, item) {
  return price && price.active && price.unit_amount === item.amountCents && price.currency === "usd" &&
    Boolean(price.recurring) === Boolean(item.recurring) &&
    (!item.recurring || price.recurring.interval === item.recurring.interval);
}

// Our own product id (e.g. "ff_build_mainstream") is used as the Stripe product id, so it is stable.
async function ensureProduct(stripe, item) {
  try {
    const p = await stripe.products.retrieve(item.product);
    if (!p.active || p.name !== item.name || p.description !== item.description) {
      return await stripe.products.update(item.product, { active: true, name: item.name, description: item.description });
    }
    return p;
  } catch (err) {
    if (err?.code !== "resource_missing" && err?.statusCode !== 404) throw err;
    return stripe.products.create({
      id: item.product, name: item.name, description: item.description,
      metadata: { brand: "frame-foundry" },
    });
  }
}

// Returns the Stripe price id for a lookup key, creating or updating the product/price when needed.
export async function priceId(stripe, lookupKey) {
  const item = catalogItems()[lookupKey];
  if (!item) throw new Error(`Unknown catalog item ${lookupKey}`);
  const hit = cache.get(lookupKey);
  if (hit && hit.amount === item.amountCents) return hit.id;

  const found = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  let price = found.data[0];
  if (!matches(price, item)) {
    await ensureProduct(stripe, item);
    price = await stripe.prices.create({
      product: item.product,
      currency: "usd",
      unit_amount: item.amountCents,
      tax_behavior: "exclusive",
      nickname: item.nickname,
      lookup_key: lookupKey,
      transfer_lookup_key: true, // moves the key off an old price whose amount changed
      ...(item.recurring ? { recurring: item.recurring } : {}),
      metadata: { brand: "frame-foundry" },
    });
    if (found.data[0] && found.data[0].id !== price.id) {
      await stripe.prices.update(found.data[0].id, { active: false }).catch(() => {});
    }
  }
  cache.set(lookupKey, { id: price.id, amount: item.amountCents });
  return price.id;
}
