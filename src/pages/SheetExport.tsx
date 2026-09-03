/* ------------------------------------------------------------------ *
 * Static stand-in for the Google Sheets export. Renders the report's
 * extracted values as a spreadsheet — one tab per review phase — so the
 * export flow has somewhere real to land. Nothing here talks to Google.
 * ------------------------------------------------------------------ */

import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { phases } from '../data/reference'
import type { Field, FieldOrigin, PhaseId, Report } from '../types'
import { classNames as cx, formatDate } from '../lib/util'

/* ------------------------------- cell values ------------------------------ */

const val = (f: Field<string> | undefined): string => f?.value ?? ''

const originLabels: Record<FieldOrigin, string> = {
  ai: 'AI extracted',
  ai_recommendation: 'AI recommendation',
  rolled_forward: 'Rolled forward',
  manual: 'Manual entry',
}

/** The distinct source pages behind a row, formatted the way the review shows them. */
function pagesOf(...fields: (Field<string> | undefined)[]): string {
  const pages = [...new Set(fields.map((f) => f?.source?.page).filter((p): p is number => !!p))].sort((a, b) => a - b)
  return pages.length ? pages.map((p) => `p. ${p}`).join(', ') : '—'
}

function determination(f: Field<string> | undefined): string {
  if (!f) return ''
  if (f.edited) return 'Edited by reviewer'
  if (f.confirmed) return 'Confirmed'
  if (f.origin === 'rolled_forward' || f.origin === 'ai_recommendation') return 'Awaiting confirmation'
  return '—'
}

/* --------------------------------- tabs ---------------------------------- */

interface Tab {
  id: PhaseId
  label: string
  columns: string[]
  widths: string[]
  rows: string[][]
}

function buildTabs(report: Report): Tab[] {
  const data = report.data
  if (!data) return []
  const b = data.basic

  const basicRows: [string, Field<string>][] = [
    ['Service organization', b.serviceOrganization],
    ['Application name', b.applicationName],
    ['Control ID', b.controlId],
    ['Report type', b.reportType],
    ['Reporting period', b.reportingPeriod],
    ['Auditor firm', b.auditorFirm],
    ['Auditor opinion', b.auditorOpinion],
    ['Auditor opinion date', b.auditorOpinionDate],
    ['Locations covered', b.locationsCovered],
    ['Conclusion of review', b.conclusionOfReview],
    ['Reporting period gaps', b.reportingPeriodGaps],
    ['Bridge letter', b.bridgeLetter],
  ]

  return [
    {
      id: 'basic',
      label: 'Basics',
      columns: ['Field', 'Value', 'Origin', 'Source', 'Confidence', 'Reviewer determination'],
      widths: ['w-52', 'w-96', 'w-40', 'w-24', 'w-28', 'w-48'],
      rows: basicRows.map(([label, f]) => [
        label,
        val(f),
        originLabels[f.origin],
        f.source ? `p. ${f.source.page}` : '—',
        f.source ? `${Math.round(f.source.confidence * 100)}%` : '—',
        determination(f),
      ]),
    },
    {
      id: 'objectives',
      label: 'Objectives',
      columns: [
        'Objective',
        'Objective title',
        'Control ref',
        'Control activity',
        'Testing performed',
        'Test result',
        'Exceptions',
        'Source',
      ],
      widths: ['w-24', 'w-64', 'w-24', 'w-96', 'w-96', 'w-44', 'w-28', 'w-28'],
      rows: data.objectives.flatMap((o) =>
        o.activities.map((a) => [
          val(o.number),
          val(o.title),
          a.ref,
          val(a.description),
          val(a.testingPerformed),
          val(a.testResult),
          a.exceptionRefs.join(', ') || '—',
          pagesOf(a.description, a.testingPerformed, a.testResult),
        ]),
      ),
    },
    {
      id: 'exceptions',
      label: 'Exceptions',
      columns: [
        'Exception',
        'Related control',
        'Auditor test result',
        'Management response',
        'Financial reporting relevance',
        'Qualified opinion impact',
        'Escalation',
        'Reviewer comments',
        'Source',
      ],
      widths: ['w-28', 'w-36', 'w-96', 'w-96', 'w-44', 'w-52', 'w-52', 'w-80', 'w-28'],
      rows: data.exceptions.map((e) => [
        val(e.number),
        val(e.relatedControl),
        val(e.auditorTestResult),
        val(e.managementResponse),
        val(e.financialReportingRelevance),
        val(e.qualifiedOpinionImpact),
        val(e.escalation),
        val(e.reviewerComments) || '—',
        pagesOf(e.auditorTestResult, e.managementResponse),
      ]),
    },
    {
      id: 'cuecs',
      label: 'CUECs',
      columns: [
        'CUEC',
        'Control text',
        'Related objective',
        'Applicability',
        'Mapped control',
        'Control owner',
        'Evidence status',
        'Reviewer comments',
        'Source',
      ],
      widths: ['w-24', 'w-[32rem]', 'w-40', 'w-40', 'w-40', 'w-40', 'w-44', 'w-72', 'w-28'],
      rows: data.cuecs.map((c) => [
        c.id.toUpperCase(),
        val(c.text),
        val(c.relatedObjective),
        val(c.applicability),
        val(c.mappedControl) || '—',
        val(c.controlOwner) || '—',
        val(c.evidenceStatus),
        val(c.reviewerComments) || '—',
        pagesOf(c.text),
      ]),
    },
    {
      id: 'subservice',
      label: 'Subservice',
      columns: [
        'Subservice organization',
        'Service category',
        'Designation',
        'Relevance',
        'Related objectives',
        'Additional evidence',
        'Reviewer comments',
        'Source',
      ],
      widths: ['w-56', 'w-56', 'w-32', 'w-40', 'w-52', 'w-80', 'w-72', 'w-28'],
      rows: data.subservice.map((s) => [
        val(s.name),
        val(s.serviceCategory),
        val(s.designation),
        val(s.relevance),
        val(s.relatedObjectives),
        val(s.additionalEvidence) || '—',
        val(s.reviewerComments) || '—',
        s.pageRefs.length ? s.pageRefs.map((p) => `p. ${p}`).join(', ') : pagesOf(s.name),
      ]),
    },
    {
      id: 'vendors',
      label: 'Final review',
      columns: ['Vendor', 'Service category', 'Relevance', 'Reviewer determination', 'Source'],
      widths: ['w-56', 'w-56', 'w-40', 'w-96', 'w-28'],
      rows: data.vendors.map((v) => [
        val(v.name),
        val(v.serviceCategory),
        val(v.relevance),
        val(v.reviewerDetermination) || '—',
        pagesOf(v.name, v.serviceCategory),
      ]),
    },
  ]
}

/** A, B, … Z, AA, AB … for the column-letter gutter row. */
function columnLetter(i: number): string {
  let n = i
  let out = ''
  do {
    out = String.fromCharCode(65 + (n % 26)) + out
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return out
}

/* --------------------------------- page ---------------------------------- */

const menus = ['File', 'Edit', 'View', 'Insert', 'Format', 'Data', 'Tools', 'Extensions', 'Help']

export default function SheetExport() {
  const { reportId } = useParams()
  const { reportById } = useStore()
  const report = reportById(reportId)

  const [active, setActive] = useState<PhaseId>('basic')
  const [wrap, setWrap] = useState(true)

  const tabs = useMemo(() => (report ? buildTabs(report) : []), [report])
  const tab = tabs.find((t) => t.id === active) ?? tabs[0]

  if (!report || !tab) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 bg-white text-center">
        <p className="text-[15px] font-semibold text-ink-900">That export is not available</p>
        <p className="max-w-md text-[12.5px] text-ink-500">
          The report has no extracted data to export. Run an extraction first, then export from the review screen.
        </p>
        <Link to="/history" className="text-[12.5px] text-brand-700 hover:underline">
          ← Extraction History
        </Link>
      </div>
    )
  }

  const phaseLabel = (id: PhaseId) => phases.find((p) => p.id === id)?.label ?? id

  return (
    <div className="flex h-full flex-col bg-white">
      {/* ------------------------------- title bar ------------------------------ */}
      <div className="shrink-0 border-b border-ink-200 px-4 pt-2.5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#0f9d58] text-white">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="2" y="2" width="12" height="12" rx="1.5" />
              <path d="M2 6.5h12M2 10h12M6.5 6.5V14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[15px] text-ink-900">{report.name} — SOC 1 export</h1>
              <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-amber-800">
                Mock preview — not a real Google Sheet
              </span>
            </div>
            <div className="-ml-1.5 mt-0.5 flex flex-wrap items-center gap-0.5">
              {menus.map((m) => (
                <span key={m} className="rounded px-1.5 py-0.5 text-[12px] text-ink-500">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <Link
            to={`/reports/${report.id}`}
            className="mt-0.5 shrink-0 rounded-md border border-ink-300 px-2 py-1 text-[12px] text-ink-700 hover:bg-ink-50"
          >
            ← Back to review
          </Link>
        </div>
      </div>

      {/* -------------------------------- toolbar ------------------------------- */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-ink-200 bg-ink-50 px-4 py-1.5">
        <span className="text-[11.5px] text-ink-500">
          {report.id} · {report.serviceOrganization} · {report.periodLabel}
        </span>
        <span className="h-3.5 w-px bg-ink-200" />
        <span className="text-[11.5px] text-ink-500">
          Exported {formatDate(report.updatedAt)} · {tabs.length} tabs · {tab.rows.length} row
          {tab.rows.length === 1 ? '' : 's'} on this tab
        </span>
        <button
          onClick={() => setWrap((v) => !v)}
          className={cx(
            'ml-auto rounded border px-2 py-0.5 text-[11.5px]',
            wrap ? 'border-ink-300 bg-white text-ink-700' : 'border-transparent text-ink-500 hover:bg-ink-100',
          )}
        >
          {wrap ? 'Wrap text: on' : 'Wrap text: off'}
        </button>
      </div>

      {/* --------------------------------- grid --------------------------------- */}
      <div className="min-h-0 flex-1 overflow-auto bg-white">
        <table className="w-full border-separate border-spacing-0 text-[12px]">
          <thead>
            {/* column letters */}
            <tr>
              <th className="sticky left-0 top-0 z-30 w-10 border-b border-r border-ink-300 bg-ink-100" />
              {tab.columns.map((_, i) => (
                <th
                  key={i}
                  className={cx(
                    'sticky top-0 z-20 border-b border-r border-ink-200 bg-ink-100 px-2 py-0.5',
                    'text-center text-[11px] font-normal text-ink-500',
                    tab.widths[i],
                  )}
                >
                  {columnLetter(i)}
                </th>
              ))}
              <th className="sticky top-0 z-20 w-auto min-w-8 border-b border-ink-200 bg-ink-100" />
            </tr>
            {/* frozen header row */}
            <tr>
              <th className="sticky left-0 top-[21px] z-30 border-b border-r border-ink-300 bg-ink-100 px-1 text-center text-[11px] font-normal text-ink-500">
                1
              </th>
              {tab.columns.map((c) => (
                <th
                  key={c}
                  className="sticky top-[21px] z-20 border-b-2 border-r border-b-ink-300 border-r-ink-200 bg-white px-2 py-1.5 text-left align-top text-[12px] font-semibold text-ink-900"
                >
                  {c}
                </th>
              ))}
              <th className="sticky top-[21px] z-20 border-b-2 border-b-ink-300 bg-white" />
            </tr>
          </thead>
          <tbody>
            {tab.rows.map((row, r) => (
              <tr key={r} className="group">
                <td className="sticky left-0 z-10 border-b border-r border-ink-300 bg-ink-100 px-1 text-center align-top text-[11px] text-ink-500 group-hover:bg-ink-200">
                  {r + 2}
                </td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    title={wrap ? undefined : cell}
                    className={cx(
                      'border-b border-r border-ink-200 px-2 py-1 align-top text-ink-800 group-hover:bg-brand-50/40',
                      wrap ? 'whitespace-pre-wrap break-words' : 'max-w-0 truncate',
                    )}
                  >
                    {cell}
                  </td>
                ))}
                <td className="border-b border-ink-200 group-hover:bg-brand-50/40" />
              </tr>
            ))}
            {tab.rows.length === 0 && (
              <tr>
                <td className="sticky left-0 z-10 border-b border-r border-ink-300 bg-ink-100 px-1 text-center text-[11px] text-ink-500">
                  2
                </td>
                <td colSpan={tab.columns.length} className="border-b border-ink-200 px-2 py-2 text-[12px] text-ink-400">
                  No rows — this extractor returned nothing for {report.id}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------- tab strip ------------------------------ */}
      <div className="flex shrink-0 items-center gap-1 border-t border-ink-200 bg-ink-50 px-3 py-1.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            title={phaseLabel(t.id)}
            className={cx(
              'rounded-t border-b-2 px-2.5 py-1 text-[12px]',
              t.id === active
                ? 'border-[#0f9d58] bg-white font-semibold text-ink-900'
                : 'border-transparent text-ink-600 hover:bg-ink-100',
            )}
          >
            {t.label}
            <span className="ml-1.5 text-[11px] font-normal text-ink-400">{t.rows.length}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
