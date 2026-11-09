// Sets the "Letter" reference on every Stocks item (first character of the stock name → A–Z item).
// Only writes items whose letter is missing or wrong, so daily runs are cheap.
// Writes the STAGED version; the live site picks it up on the next Webflow publish.
// Env: WEBFLOW_WRITE_TOKEN (CMS read + write), COLLECTION_ID (Stocks), AZ_COLLECTION_ID (Halal Stocks A-Z)
// Node 18+ (global fetch). No dependencies.

const TOKEN = process.env.WEBFLOW_WRITE_TOKEN;
const STOCKS = process.env.COLLECTION_ID || "694a72b4bc39c8103c7fd5b1";
const AZ = process.env.AZ_COLLECTION_ID || "6af04bdb3248edbb382544f5";
const FIELD = "letter";
if (!TOKEN) throw new Error("WEBFLOW_WRITE_TOKEN is missing");

const API = "https://api.webflow.com/v2";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(method, path, body) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, accept: "application/json", "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`);
    return res.json();
  }
  throw new Error("Rate limited too many times");
}

async function getAll(collectionId) {
  const items = [];
  let offset = 0, total = Infinity;
  while (offset < total) {
    const page = await call("GET", `/collections/${collectionId}/items?limit=100&offset=${offset}`);
    items.push(...page.items);
    total = page.pagination.total;
    offset += page.pagination.limit;
    await sleep(1100); // stay under 60 requests/minute
  }
  return items;
}

// Same rule as the A–Z pages: first character of the name; anything that isn't a–z goes to "0-9".
function letterSlug(name) {
  const c = (name || "").trim().charAt(0).toLowerCase();
  return c >= "a" && c <= "z" ? c : "0-9";
}

const letters = await getAll(AZ);
const letterId = Object.fromEntries(letters.map((i) => [i.fieldData.slug, i.id]));
console.log(`A–Z items: ${letters.length}`);

const stocks = await getAll(STOCKS);
const todo = [];
for (const s of stocks) {
  if (s.isArchived) continue;
  const want = letterId[letterSlug(s.fieldData.name)];
  if (!want) { console.warn(`No A–Z item for "${s.fieldData.name}"`); continue; }
  if (s.fieldData[FIELD] !== want) todo.push({ id: s.id, fieldData: { [FIELD]: want } });
}
console.log(`Stocks: ${stocks.length}, need update: ${todo.length}`);

for (let i = 0; i < todo.length; i += 100) {
  await call("PATCH", `/collections/${STOCKS}/items`, { items: todo.slice(i, i + 100) });
  console.log(`Updated ${Math.min(i + 100, todo.length)} / ${todo.length}`);
  await sleep(1100);
}
console.log("Done. Publish the Webflow site to push letters live.");
