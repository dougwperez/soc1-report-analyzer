import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { extractorDefs } from '../data/reference'
import { qualifiedData, standardData } from '../data/reports'
import {
  AlertIcon,
  Badge,
  Button,
  Callout,
  Card,
  CheckIcon,
  EmptyState,
  Modal,
  ProgressBar,
  SectionHeading,
  SlackIcon,
  Spinner,
} from '../components/ui'
import type { ExtractorId, ExtractorRun, ExtractorStatus, Report } from '../types'
import { classNames as cx, formatElapsed } from '../lib/util'

/* ------------------------------------------------------------------ *
 * The seven extractors run concurrently against the full document.
 * Progress is derived from elapsed time rather than an interval
 * counter, so leaving the page and coming back resumes correctly.
 * ------------------------------------------------------------------ */

interface Step {
  id: ExtractorId
  delay: number
  duration: number
  items: number
}

const PLAN: Step[] = [
  { id: 'basic_procedures', delay: 300, duration: 5200, items: 12 },
  { id: 'control_objectives', delay: 500, duration: 8600, items: 5 },
  { id: 'control_activities', delay: 700, duration: 11800, items: 8 },
  { id: 'exceptions', delay: 900, duration: 9400, items: 3 },
  { id: 'cuecs', delay: 1100, duration: 7600, items: 5 },
  { id: 'subservice_orgs', delay: 1400, duration: 6400, items: 3 },
  { id: 'vendors', delay: 1600, duration: 10200, items: 5 },
]

const OCR_DURATION = 6000
const TOTAL_MS = Math.max(...PLAN.map((s) => s.delay + s.duration)) + 800

const FAILURES: Record<string, { id: ExtractorId; error: string }> = {
  cuecs: {
    id: 'cuecs',
    error:
      'Structured output failed schema validation on 2 retries: 3 of 6 CUEC objects were missing the required "related_objective" field.',
  },
}

const OCR_ERROR =
  'OCR pre-processing failed. The document has no text layer and the recognised text averaged 61% confidence, below the 85% threshold required for extraction. Re-upload a text-layer PDF, or request an unlocked copy from the service organization.'

function statusMeta(status: ExtractorStatus) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', tone: 'green' as const }
    case 'running':
      return { label: 'Running', tone: 'blue' as const }
    case 'failed':
      return { label: 'Failed', tone: 'red' as const }
    default:
      return { label: 'Pending', tone: 'neutral' as const }
  }
}

/** Compute every extractor's state at `elapsed` ms into the run. */
function computeExtractors(report: Report, elapsed: number): ExtractorRun[] {
  const ocr = report.scenario === 'ocr_fail'
  return extractorDefs.map((def) => {
    const step = PLAN.find((s) => s.id === def.id)!
    const base = { id: def.id, label: def.label, blurb: def.blurb }

    if (ocr) {
      // Nothing runs until OCR produces text, and here it never does.
      return elapsed < OCR_DURATION
        ? { ...base, status: 'pending' as const, progress: 0 }
        : { ...base, status: 'failed' as const, progress: 0, error: OCR_ERROR, retryable: true }
    }

    const start = step.delay
    const end = step.delay + step.duration
    const failure = report.scenario === 'partial' ? FAILURES.cuecs : undefined
    const willFail = failure?.id === def.id

    if (elapsed < start) return { ...base, status: 'pending' as const, progress: 0 }
    if (elapsed >= end) {
      return willFail
        ? { ...base, status: 'failed' as const, progress: 100, error: failure!.error, retryable: true }
        : { ...base, status: 'completed' as const, progress: 100, itemsFound: step.items }
    }
    const pct = ((elapsed - start) / step.duration) * 100
    return { ...base, status: 'running' as const, progress: Math.min(97, Math.round(pct)) }
  })
}

export default function ExtractionProgress() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const { reportById, dispatch, toast, logAudit } = useStore()
  const report = reportById(reportId)

  const [now, setNow] = useState(() => Date.now())
  const [cancelOpen, setCancelOpen] = useState(false)
  const finishedRef = useRef(false)
  const unmountedRef = useRef(false)

  // The hand-off timer must survive this effect re-running when the report is
  // patched, but must not fire after the reviewer has navigated away.
  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
    }
  }, [])

  // Anchor the run to upload time, falling back to first mount for seeded rows
  // whose upload timestamp is long past.
  const [mountedAt] = useState(() => Date.now())
  const startedAt = useMemo(() => {
    if (!report) return mountedAt
    const created = new Date(report.createdAt).getTime()
    return mountedAt - created > TOTAL_MS + 60_000 ? mountedAt : created
  }, [report, mountedAt])

  const live = report?.extractionStatus === 'processing'
  const elapsed = Math.max(0, now - startedAt)

  useEffect(() => {
    if (!live) return
    const t = setInterval(() => setNow(Date.now()), 180)
    return () => clearInterval(t)
  }, [live])

  const extractors = useMemo(
    () => (report && live ? computeExtractors(report, elapsed) : (report?.extractors ?? [])),
    [report, live, elapsed],
  )

  const done = extractors.filter((e) => e.status === 'completed').length
  const failed = extractors.filter((e) => e.status === 'failed').length
  const settled = done + failed === extractors.length && extractors.length > 0
  const overall = extractors.length
    ? extractors.reduce((sum, e) => sum + (e.status === 'completed' || e.status === 'failed' ? 100 : e.progress), 0) /
      extractors.length
    : 0

  // Persist the outcome once, then hand off to the reviewer.
  useEffect(() => {
    if (!report || !live || !settled || finishedRef.current) return
    finishedRef.current = true

    const allFailed = failed === extractors.length
    const patch: Partial<Report> = {
      extractors,
      extractionStatus: allFailed ? 'failed' : failed > 0 ? 'partial' : 'completed',
      reviewStatus: allFailed ? 'not_started' : 'ready_for_review',
      data: allFailed ? null : report.documentId === 'qualified' ? qualifiedData() : standardData(),
    }
    dispatch({ type: 'patch_report', id: report.id, patch })
    logAudit(
      report.id,
      allFailed
        ? 'Extraction failed — no sections were produced'
        : `Extraction completed — ${done} of ${extractors.length} extractors succeeded`,
    )

    if (allFailed) {
      toast('error', 'Extraction failed', 'OCR could not produce usable text from this document.')
      return
    }

    setTimeout(() => {
      if (unmountedRef.current) return
      toast(
        'slack',
        `${report.name} is ready for review`,
        failed > 0
          ? `${done} of ${extractors.length} sections extracted. 1 section failed and can be retried. Opening the report now.`
          : `All ${extractors.length} sections extracted. Opening the report now.`,
      )
      navigate(`/reports/${report.id}`)
    }, 1600)
  }, [report, live, settled, extractors, failed, done, dispatch, logAudit, navigate, toast])

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Card>
          <EmptyState
            title="Report not found"
            body="This extraction may have been cancelled, or the demo data was reset."
            action={<Button variant="primary" onClick={() => navigate('/history')}>Go to Extraction History</Button>}
          />
        </Card>
      </div>
    )
  }

  const ocrPhase = report.scenario === 'ocr_fail' && live && elapsed < OCR_DURATION
  const ocrFailed = report.scenario === 'ocr_fail' && (!live || elapsed >= OCR_DURATION)

  return (
    <div className="mx-auto max-w-5xl px-6 py-7">
      <SectionHeading
        title={report.name}
        hint={
          <>
            Report <span className="font-mono text-[12px] text-ink-600">{report.id}</span> · {report.application} ·
            Control {report.controlId}
            {report.fileName && <> · {report.fileName}</>}
          </>
        }
        right={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => navigate('/history')}>
              Return to history
            </Button>
            {live && (
              <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
                Cancel extraction
              </Button>
            )}
          </div>
        }
      />

      {/* --------------------------- overall status --------------------------- */}
      <Card className="mt-4 px-5 py-4">
        <div className="flex items-baseline justify-between gap-6">
          <p className="text-[15px] font-semibold text-ink-900">
            {ocrPhase ? (
              'Running OCR…'
            ) : (
              <>
                <span className="tnum text-[20px]">{done}</span>
                <span className="text-[20px] text-ink-400"> / {extractors.length}</span>{' '}
                <span className="font-medium text-ink-600">sections extracted</span>
              </>
            )}
          </p>
          <p className="tnum shrink-0 text-[13px] text-ink-500">
            {formatElapsed(live ? elapsed : TOTAL_MS)} elapsed
          </p>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={ocrPhase ? (elapsed / OCR_DURATION) * 100 : overall}
            tone={failed > 0 ? (done === 0 ? 'red' : 'amber') : 'brand'}
          />
        </div>
        {live && !ocrFailed && (
          <p className="mt-2.5 text-[12px] text-ink-500">
            {ocrPhase
              ? 'The document has no text layer, so it is being recognised before extraction can start.'
              : 'Runs in the background — you can leave this page. Slack will tell you when it is ready.'}
          </p>
        )}
      </Card>

      {ocrFailed && (
        <div className="mt-4">
          <Callout
            tone="error"
            title="OCR failed — extraction could not start"
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate('/extract')}>
                Upload a different file
              </Button>
            }
          >
            {OCR_ERROR}
          </Callout>
        </div>
      )}

      {/* --------------------------- extractor list --------------------------- */}
      <Card className="mt-4">
        <div className="border-b border-ink-100 px-4 py-2.5">
          <h3 className="text-[12px] font-medium uppercase tracking-wide text-ink-500">
            Extractors · run in parallel over the full document
          </h3>
        </div>
        <ul className="divide-y divide-ink-100">
          {extractors.map((e) => (
            <li
              key={e.id}
              className={cx('flex items-start gap-3 px-4 py-3', e.status === 'failed' && 'bg-red-50/50')}
            >
              <span className="mt-[1px] shrink-0">
                {e.status === 'completed' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white">
                    <CheckIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                {e.status === 'running' && <Spinner className="h-5 w-5 text-brand-600" />}
                {e.status === 'failed' && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-700">
                    <AlertIcon className="h-3.5 w-3.5" />
                  </span>
                )}
                {e.status === 'pending' && (
                  <span className="block h-5 w-5 rounded-full border border-dashed border-ink-300" />
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p
                  className={cx(
                    'text-[13px] font-medium',
                    e.status === 'pending' ? 'text-ink-400' : 'text-ink-900',
                  )}
                >
                  {e.label}
                </p>
                {e.status === 'completed' && e.itemsFound !== undefined ? (
                  <p className="mt-0.5 text-[12px] text-emerald-700">
                    {e.itemsFound} item{e.itemsFound === 1 ? '' : 's'} extracted · schema validated
                  </p>
                ) : e.status === 'failed' && e.error ? (
                  <p className="mt-0.5 text-[12px] leading-relaxed text-red-700">{e.error}</p>
                ) : (
                  <p className="mt-0.5 text-[12px] text-ink-500">{e.blurb}</p>
                )}
              </div>

              <span className="shrink-0 pt-[1px]">
                <Badge tone={statusMeta(e.status).tone}>{statusMeta(e.status).label}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {settled && !live && !ocrFailed && (
        <div className="mt-5">
          <Callout
            tone={failed > 0 ? 'warning' : 'success'}
            title={failed > 0 ? 'Extraction finished with one failed section' : 'Extraction complete'}
            action={
              <Button size="sm" variant="primary" onClick={() => navigate(`/reports/${report.id}`)}>
                Open report
              </Button>
            }
          >
            {failed > 0
              ? 'Completed sections are saved and ready to review. The failed section can be retried from inside the report.'
              : 'All sections are saved and ready for reviewer validation.'}
          </Callout>
        </div>
      )}

      {live && (
        <p className="mt-5 flex items-center gap-1.5 text-[12px] text-ink-400">
          <SlackIcon className="h-3.5 w-3.5" />
          A Slack notification will be sent to #controls-soc-reviews when extraction finishes.
        </p>
      )}

      <Modal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this extraction?"
        description="The uploaded document and any sections extracted so far will be discarded. This cannot be undone."
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)}>
              Keep extracting
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                dispatch({ type: 'delete_report', id: report.id })
                toast('info', 'Extraction cancelled', `${report.name} was discarded.`)
                navigate('/history')
              }}
            >
              Cancel extraction
            </Button>
          </>
        }
      />
    </div>
  )
}
