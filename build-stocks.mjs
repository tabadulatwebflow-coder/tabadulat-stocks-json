// Builds dist/stocks.json from the Webflow "Stocks" CMS collection (published items only).
// Env: WEBFLOW_TOKEN (CMS read), COLLECTION_ID, optional AR_LOCALE_ID (cmsLocaleId of ar-ae)
// Node 18+ (global fetch). No dependencies.
import { mkdir, writeFile } from "node:fs/promises";

const TOKEN = process.env.WEBFLOW_TOKEN;
const COLLECTION_ID = process.env.COLLECTION_ID || "694a72b4bc39c8103c7fd5b1";
const AR_LOCALE_ID = process.env.AR_LOCALE_ID || "";
if (!TOKEN) throw new Error("WEBFLOW_TOKEN is missing");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getPage(offset, localeId) {
  const qs = new URLSearchParams({ limit: "100", offset: String(offset) });
  if (localeId) qs.set("cmsLocaleId", localeId);
  const url = `https://api.webflow.com/v2/collections/${COLLECTION_ID}/items/live?${qs}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, accept: "application/json" } });
    if (res.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`Webflow API ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error("Rate limited too many times");
}

async function getAll(localeId) {
  const items = [];
  let offset = 0, total = Infinity;
  while (offset < total) {
    const page = await getPage(offset, localeId);
    items.push(...page.items);
    total = page.pagination.total;
    offset += page.pagination.limit;
    await sleep(700); // stay well under 60 req/min
  }
  return items;
}

// Short keys keep the file small (~4,800 stocks).
function slim(item) {
  const f = item.fieldData || {};
  return {
    s: f["tv-symbol"] || "",                 // symbol, e.g. MSFT
    n: f.company || f.name || "",            // company name
    x: f.ticker || "",                       // exchange, e.g. NASDAQ
    sec: f.sector || "",
    h: (f["shariah-compliant"] || "").toUpperCase(), // PASS / FAIL / ""
    v: f["verdict-label"] || "",             // badge text from pipeline
    l: (f["stocks-logo"] && f["stocks-logo"].url) || "",
    u: f.slug || "",
    p: f["popular-stocks"] ? 1 : 0,
  };
}

const order = (a, b) => (b.p - a.p) || a.n.localeCompare(b.n);

async function build(localeId, file) {
  const rows = (await getAll(localeId)).filter((i) => !i.isArchived && !i.isDraft).map(slim).sort(order);
  await mkdir("dist", { recursive: true });
  await writeFile(`dist/${file}`, JSON.stringify({ updated: new Date().toISOString(), count: rows.length, items: rows }));
  console.log(`${file}: ${rows.length} stocks`);
}

await build("", "stocks.json");
if (AR_LOCALE_ID) await build(AR_LOCALE_ID, "stocks-ar.json");
