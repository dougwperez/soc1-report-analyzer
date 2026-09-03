import { Link } from 'react-router-dom'
import {
  Badge,
  Button,
  Callout,
  Card,
  CheckIcon,
  OriginBadge,
  SectionHeading,
  SparkIcon,
} from '../components/ui'
import { phases, extractorDefs } from '../data/reference'

export default function UserGuide() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-7">
      <SectionHeading
        title="User Guide"
        hint="How the SOC 1 Report Analyzer works, what the model does, and where your judgement is required."
      />

      <Callout tone="ai" title="What automation does and does not do">
        Extraction turns a 50–150 page SOC 1 report into structured, citable fields in a couple of minutes, replacing
        roughly three to four hours of manual transcription. It does not reach the compliance conclusion. Every value
        is a proposal until a reviewer confirms it against the source document, and approval is always a human act.
      </Callout>

      {/* ------------------------------- workflow ------------------------------- */}
      <Card className="mt-5 p-5">
        <h2 className="text-[14px] font-semibold text-ink-900">The workflow</h2>
        <ol className="mt-3 flex flex-col gap-3">
          {[
            {
              t: 'Upload the report',
              d: 'Choose the SOC 1 PDF, name the report, and link it to the application and internal control it supports. Password-protected files need the document password; copy-locked scans fall back to OCR.',
            },
            {
              t: 'Extraction runs',
              d: 'The document is validated and stored, then seven section-specific extractors run concurrently over the full text. Each returns structured JSON that is schema-validated before it is saved. You can leave the page — Slack tells you when it is done.',
            },
            {
              t: 'Validate against the source',
              d: 'Work through the six review phases. Selecting any field opens the cited page in the PDF panel and highlights the exact quotation the model matched on, with its confidence.',
            },
            {
              t: 'Record your determinations',
              d: 'Map CUECs to internal controls, assess each exception, and decide vendor relevance. Suggestions and prior-year values are labelled and require explicit confirmation.',
            },
            {
              t: 'Sign off',
              d: 'Mark each section as reviewed, submit for approval, and let an approver complete the final sign-off. Approved reports become read-only and can be exported to Google Sheets.',
            },
          ].map((s, i) => (
            <li key={s.t} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[12px] font-semibold text-brand-700">
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-ink-900">{s.t}</span>
                <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-600">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {/* ------------------------------ extractors ------------------------------ */}
      <Card className="mt-4 p-5">
        <h2 className="text-[14px] font-semibold text-ink-900">The seven extractors</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-500">
          Each runs its own prompt against the full document and returns page-referenced JSON. They run in parallel, so
          one failing does not discard the others — a failed section is retried on its own.
        </p>
        <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {extractorDefs.map((e) => (
            <li key={e.id} className="rounded-md border border-ink-200 px-3 py-2">
              <p className="text-[12.5px] font-medium text-ink-800">{e.label}</p>
              <p className="mt-0.5 text-[11.5px] text-ink-500">{e.blurb}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* -------------------------------- phases -------------------------------- */}
      <Card className="mt-4 p-5">
        <h2 className="text-[14px] font-semibold text-ink-900">The six review phases</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {phases.map((p, i) => (
            <li key={p.id} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-ink-300 text-[11px] text-ink-500">
                {i + 1}
              </span>
              <span>
                <span className="text-[13px] font-medium text-ink-900">{p.label}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-600">{p.description}</span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {/* ------------------------------ provenance ------------------------------ */}
      <Card className="mt-4 p-5">
        <h2 className="text-[14px] font-semibold text-ink-900">Reading the labels</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-500">
          Every value carries where it came from. Nothing suggested by the system is treated as decided.
        </p>
        <dl className="mt-3 flex flex-col gap-3">
          {[
            {
              badge: <OriginBadge origin="ai" />,
              d: 'Pulled from the PDF by an extractor. It carries a page number, the quotation it matched, bounding-box coordinates, and a confidence score. Click the page chip to see it highlighted in the source.',
            },
            {
              badge: <OriginBadge origin="ai_recommendation" />,
              d: 'Not in this document. Suggested from how comparable reports were handled before — for example a likely CUEC mapping. Open “Why this was suggested” for the supporting context, then confirm or replace it.',
            },
            {
              badge: <OriginBadge origin="rolled_forward" />,
              d: 'Carried over from last year’s review of the same service organization. It is a starting point, not a current conclusion: reconfirm it for this period or change it.',
            },
            {
              badge: <OriginBadge origin="ai" edited />,
              d: 'A reviewer changed the extracted value. The original extraction and the editor’s name are retained.',
            },
            {
              badge: <Badge tone="amber">No source citation</Badge>,
              d: 'The extractor produced a value but could not point to supporting text. Treat it as unverified and check the document yourself.',
            },
          ].map((r, i) => (
            <div key={i} className="flex flex-col gap-1 sm:flex-row sm:gap-4">
              <dt className="w-56 shrink-0">{r.badge}</dt>
              <dd className="text-[12.5px] leading-relaxed text-ink-600">{r.d}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* --------------------------- qualified opinions -------------------------- */}
      <Card className="mt-4 p-5">
        <h2 className="text-[14px] font-semibold text-ink-900">Exceptions and qualified opinions</h2>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
          An exception is a control instance that did not operate as described. Most reports contain some. An
          exception is <strong>not</strong> proof that the report is unusable, and it does not automatically make the
          opinion qualified — auditors regularly conclude that individual exceptions did not prevent a control
          objective from being achieved. Assess each one on its own facts: what failed, for how long, whether it
          touches a financially relevant process, and what management did about it.
        </p>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-600">
          A <strong>qualified opinion</strong> is different in kind. The auditor is saying a control objective was not
          achieved for some part of the period. When one is detected, the report is flagged, the affected objectives
          and exceptions are called out, a documented assessment is required on each qualifying exception, and final
          approval stays blocked until escalation is recorded.
        </p>
      </Card>

      {/* ------------------------------ error states ----------------------------- */}
      <Card className="mt-4 p-5">
        <h2 className="text-[14px] font-semibold text-ink-900">When something goes wrong</h2>
        <ul className="mt-3 flex flex-col gap-2 text-[12.5px] text-ink-600">
          {[
            'Upload failure — nothing is saved and no extraction starts. Retry from the upload screen.',
            'Incorrect PDF password — the file cannot be decrypted, so no text is read. Re-enter the password.',
            'OCR failure — a copy-locked scan whose recognised text falls below the confidence threshold. Request a text-layer copy from the service organization.',
            'A single extractor failing — every other section is kept. Retry just that section from inside the report.',
            'Invalid structured output — the model returned JSON that failed schema validation. The extractor is retried automatically twice before it is marked failed.',
            'PDF fails to display — extracted values and citations remain available; only the source view is affected.',
            'Save failure — your edit is not applied. Reload the report and reapply it rather than assuming it saved.',
            'AuditBoard or Google Sheets unavailable — extraction and review continue; only metadata loading and export are affected.',
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-400" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* -------------------------------- demo notes ----------------------------- */}
      <Card className="mt-4 p-5">
        <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink-900">
          <SparkIcon className="h-4 w-4 text-ai-600" /> About this mock
        </h2>
        <ul className="mt-2 flex flex-col gap-1.5 text-[12.5px] text-ink-600">
          {[
            'All data is fictional. No real service organization, vendor, employee, or control information appears anywhere.',
            'Extraction is simulated with timers. No model is called, no file is uploaded, and nothing leaves your browser.',
            'Your changes are kept in browser storage. “Reset demo data” in the user menu restores the original set.',
            'Switch users from the top-right menu to see role-based permissions — a Read-only user cannot verify or approve.',
            'Error states are reachable: sample documents on the upload screen, the state selector on Extraction History, and the alert icons in the report header and PDF toolbar.',
          ].map((t) => (
            <li key={t} className="flex gap-2">
              <CheckIcon className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <Link to="/extract">
            <Button variant="primary" size="sm">Extract a report</Button>
          </Link>
          <Link to="/history">
            <Button variant="secondary" size="sm">Browse extraction history</Button>
          </Link>
        </div>
      </Card>
    </div>
  )
}
