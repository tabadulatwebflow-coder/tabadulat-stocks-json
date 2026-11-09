# Tabadulat stocks.json

Daily export of the Webflow "Stocks" collection (published items) to `dist/stocks.json`,
served via jsDelivr: `https://cdn.jsdelivr.net/gh/<owner>/<repo>@main/dist/stocks.json`.

Setup: repo Settings → Secrets → Actions → `WEBFLOW_TOKEN` (CMS read-only). Arabic locale ID is set in the workflow.
Run once: Actions → "Build stocks.json" → Run workflow.

`set-letters.mjs` (runs first in the same daily job) fills the Stocks "Letter" reference → Halal Stocks A-Z
item (first character of the stock name; non-letters → "0-9"). Only changed items are written, to the staged
version; they go live with the next Webflow publish. Uses the same `WEBFLOW_TOKEN` secret, which must have CMS read + write.
If the token is read-only the step fails quietly and stocks.json still builds.

`embed/stocks-list.html` is the Webflow embed that renders the list from the JSON.
