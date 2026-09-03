# SOC 1 Report Analyzer — frontend mockup

A polished, front-end-only mockup of an internal enterprise application for reviewing
third-party **SOC 1 Type 2** reports. Extraction, notifications, and every backend call
are simulated with timers and local mock data — no LLM is called, no file is uploaded,
and nothing leaves the browser.

**Stack:** React 19 · TypeScript · Tailwind CSS v4 · Vite · React Router (hash routing)

## Running locally

```bash
npm install
npm run dev
```

## Deploying to GitHub Pages

`vite.config.ts` sets `base: '/soc1-report-analyzer/'`, and the app uses `HashRouter`
so deep links survive static hosting.

```bash
npm run deploy        # builds and pushes dist/ to the gh-pages branch
```

Then in the repo: **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.

> This uses the `gh-pages` package rather than a GitHub Actions workflow on purpose —
> pushing a `.github/workflows/` file needs the `workflow` OAuth scope, which this
> machine's `gh` token does not have. If you would rather deploy via Actions, run
> `gh auth refresh -h github.com -s workflow` first.

If the repo name differs, update `base` in `vite.config.ts` to match.

## Screens

| Route | Screen |
| --- | --- |
| `#/extract` | Upload — centered drag-and-drop drawer, document-state validation |
| `#/progress/:id` | Extraction progress — seven concurrent extractors with per-extractor status |
| `#/history` | Extraction History — filterable table with loading / empty / error / populated states |
| `#/reports/:id` | Report Review — split-screen extracted data + source PDF, six review phases |
| `#/guide` | User Guide |

## What the mock demonstrates

- **Source evidence.** Every AI-extracted value carries a page number, verbatim quotation,
  bounding-box coordinates, and match confidence. Selecting a field opens the cited page and
  highlights the quote. Fields without a citation say so explicitly.
- **Provenance.** AI-extracted, AI-suggested, rolled-forward, reviewer-edited, and manual
  values are visually distinct. Suggestions and prior-year values require explicit human
  confirmation and never decide anything on their own.
- **Qualified-opinion workflow.** A qualified report is flagged, its affected objectives and
  exceptions are named, reviewer comments and escalation are required, and approval stays
  blocked until they are complete — while ordinary testing exceptions are assessed
  individually rather than treated as disqualifying.
- **Collaboration.** Assigned reviewer, watchers, threaded comments with resolve/reopen,
  section-level verification with identity and timestamp, changes-requested loop, final
  approval, and a read-only approved state. Role determines what is permitted.
- **Error states.** Upload failure, wrong PDF password, OCR failure, whole-extraction
  failure, single-extractor failure with retry (completed sections preserved), schema
  validation failure, PDF load failure, save failure, AuditBoard unavailable, Sheets export
  failure, and unauthorized actions.

### Reaching the error states

- **Upload screen** — the document's state is read from the file name, so dropping (or
  browsing to) any file exercises a path. Anything ending `.pdf` is a standard document;
  a name containing `protected` / `password` is encrypted (password `demo1234`),
  `scanned` / `ocr` / `locked` triggers the OCR failure, `fail` / `503` triggers the upload
  failure, `reissued` / `qualified` produces the qualified-opinion report, and a non-PDF
  extension is rejected as an invalid file. The five fictional reports are matched by their
  exact file names, e.g. `northwind-paycycle-fy2025-soc1.pdf`.
- **Extraction History** — the "State:" selector switches between populated, loading, empty,
  and error.
- **Report Review** — the alert icon in the header toggles save and export failures; the
  alert icon in the PDF toolbar toggles a document load failure.
- **Permissions** — switch to a Read-only user from the top-right menu.

Report `RPT-2038` is the qualified-opinion path and `RPT-2030` has a failed CUEC extractor
you can retry.

## Data

All content is fictional. Service organizations, vendors, auditors, people, control IDs,
and report text were invented for this mock. Reviewer changes persist in `localStorage`;
"Reset demo data" in the user menu restores the seed set.
