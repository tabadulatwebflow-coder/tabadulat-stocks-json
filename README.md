# Tabadulat stocks.json

Daily export of the Webflow "Stocks" collection (published items) to `dist/stocks.json`,
served via jsDelivr: `https://cdn.jsdelivr.net/gh/<owner>/<repo>@main/dist/stocks.json`.

Setup: repo Settings → Secrets → Actions → `WEBFLOW_TOKEN` (CMS read-only). Arabic locale ID is set in the workflow.
Run once: Actions → "Build stocks.json" → Run workflow.

`embed/stocks-list.html` is the Webflow embed that renders the list from the JSON.
