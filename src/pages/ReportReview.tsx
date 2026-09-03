import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { phases, users, userById } from '../data/reference'
import { standardData } from '../data/reports'
import PdfViewer from '../components/pdf/PdfViewer'
import CommentsPanel from '../components/review/CommentsPanel'
import {
  BasicSection,
  CuecsSection,
  ExceptionsSection,
  FailedSectionNotice,
  ObjectivesSection,
  SubserviceSection,
  VendorsSection,
} from '../components/review/sections'
import type { SectionCtx } from '../components/review/sections'
import {
  AlertIcon,
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  CheckIcon,
  CloseIcon,
  EmptyState,
  ExtractionStatusBadge,
  Label,
  Modal,
  PanelIcon,
  ReviewStatusBadge,
  Select,
  SheetIcon,
  Spinner,
  TextArea,
  RollIcon,
} from '../components/ui'
import type { Field, PhaseId, SourceAnnotation } from '../types'
import { classNames as cx, formatDateTime, getPath, uid } from '../lib/util'

/* --------------------------- field-walking helpers -------------------------- */

interface WalkedField {
  path: string
  field: Field<string>
}

function isField(value: unknown): value is Field<string> {
  return !!value && typeof value === 'object' && 'origin' in (value as object) && 'value' in (value as object)
}

/** Every extracted field in the report, with its dotted path. */
function walkFields(node: unknown, prefix = ''): WalkedField[] {
  if (isField(node)) return [{ path: prefix, field: node }]
  if (Array.isArray(node)) return node.flatMap((v, i) => walkFields(v, prefix ? `${prefix}.${i}` : String(i)))
  if (node && typeof node === 'object') {
    return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
      walkFields(v, prefix ? `${prefix}.${k}` : k),
    )
  }
  return []
}

const phaseOfPath = (path: string): PhaseId => path.split('.')[0] as PhaseId

export default function ReportReview() {
  const { reportId } = useParams()
  const navigate = useNavigate()
  const { state, reportById, dispatch, toast, logAudit } = useStore()
  const report = reportById(reportId)
  const currentUser = userById(state.currentUserId)

  const [phase, setPhase] = useState<PhaseId>('basic')
  const [showPdf, setShowPdf] = useState(true)
  const [focus, setFocus] = useState<{ annotation: SourceAnnotation; label: string } | null>(null)
  const [missingSource, setMissingSource] = useState<string | null>(null)
  const [activePath, setActivePath] = useState<string | null>(null)
  const [commentTarget, setCommentTarget] = useState<{ path?: string; label: string } | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportFail, setExportFail] = useState(false)
  const [saveFail, setSaveFail] = useState(false)
  const [changesOpen, setChangesOpen] = useState(false)
  const [changesDraft, setChangesDraft] = useState('')
  const [approveOpen, setApproveOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)

  /* ------------------------------ permissions ----------------------------- */

  const role = currentUser?.role
  const approved = report?.reviewStatus === 'approved'
  const canEdit = !approved && (role === 'Reviewer' || role === 'Approver' || role === 'Analyst')
  const canVerify = !approved && (role === 'Reviewer' || role === 'Approver')
  const canApprove = !approved && role === 'Approver'
  const readOnly = !canEdit

  const denied = useCallback(
    (action: string) => {
      toast(
        'error',
        'Not permitted',
        `Your role (${role}) cannot ${action}. Ask an assigned reviewer or approver to make this change.`,
      )
    },
    [role, toast],
  )

  /* --------------------------------- fields -------------------------------- */

  const allFields = useMemo(() => (report?.data ? walkFields(report.data) : []), [report?.data])

  const unconfirmed = useMemo(
    () =>
      allFields.filter(
        (f) =>
          !f.field.confirmed &&
          (f.field.origin === 'rolled_forward' || f.field.origin === 'ai_recommendation'),
      ),
    [allFields],
  )

  const unconfirmedInPhase = unconfirmed.filter((f) => phaseOfPath(f.path) === phase).length

  const commentCountFor = useCallback(
    (path: string) => report?.comments.filter((t) => t.anchorPath === path && !t.resolved).length ?? 0,
    [report?.comments],
  )

  /* -------------------------------- handlers ------------------------------- */

  const onSelect = useCallback((path: string, field: Field<string>, label: string) => {
    setActivePath(path)
    if (field.source) {
      setFocus({ annotation: field.source, label })
      setMissingSource(null)
      setShowPdf(true)
    } else {
      setFocus(null)
      setMissingSource(label)
    }
  }, [])

  const onEdit = useCallback(
    (path: string, value: string) => {
      if (!report) return
      if (!canEdit) return denied('edit extracted values')
      if (saveFail) {
        toast(
          'error',
          'Save failed',
          'The change could not be saved (409 Conflict — this report was updated by someone else). Reload the report and reapply your edit.',
        )
        return
      }
      dispatch({ type: 'set_field', id: report.id, path, value, userId: state.currentUserId })
      if (report.reviewStatus === 'ready_for_review') {
        dispatch({ type: 'patch_report', id: report.id, patch: { reviewStatus: 'in_review' } })
      }
    },
    [report, canEdit, denied, saveFail, dispatch, state.currentUserId, toast],
  )

  const onConfirm = useCallback(
    (path: string) => {
      if (!report) return
      if (!canEdit) return denied('confirm values')
      dispatch({ type: 'confirm_field', id: report.id, path, userId: state.currentUserId })
    },
    [report, canEdit, denied, dispatch, state.currentUserId],
  )

  const onComment = useCallback((path: string, label: string) => {
    setCommentTarget({ path, label })
    setCommentDraft('')
  }, [])

  function submitComment() {
    if (!report || !commentTarget || !commentDraft.trim()) return
    dispatch({
      type: 'add_thread',
      id: report.id,
      thread: {
        id: uid('th'),
        phase: commentTarget.path ? phaseOfPath(commentTarget.path) : phase,
        anchorPath: commentTarget.path,
        anchorLabel: commentTarget.label,
        resolved: false,
        entries: [
          {
            id: uid('c'),
            authorId: state.currentUserId,
            body: commentDraft.trim(),
            createdAt: new Date().toISOString(),
          },
        ],
      },
    })
    setCommentTarget(null)
    setCommentDraft('')
    toast('success', 'Comment added')
  }

  function toggleVerify() {
    if (!report) return
    if (!canVerify) return denied('mark sections as reviewed')
    if (report.verifications[phase]) {
      dispatch({ type: 'unverify', id: report.id, phase })
      logAudit(report.id, `Reopened the ${phases.find((p) => p.id === phase)?.label} section`)
    } else {
      dispatch({ type: 'verify', id: report.id, phase, userId: state.currentUserId })
      logAudit(report.id, `Marked ${phases.find((p) => p.id === phase)?.label} as reviewed`)
      if (report.reviewStatus === 'ready_for_review') {
        dispatch({ type: 'patch_report', id: report.id, patch: { reviewStatus: 'in_review' } })
      }
    }
  }

  function retryFailedExtractor(extractorId: string) {
    if (!report) return
    setRetrying(true)
    setTimeout(() => {
      const extractors = report.extractors.map((e) =>
        e.id === extractorId
          ? { ...e, status: 'completed' as const, progress: 100, error: undefined, itemsFound: 5 }
          : e,
      )
      const data = report.data ? { ...report.data, cuecs: standardData().cuecs } : null
      dispatch({
        type: 'patch_report',
        id: report.id,
        patch: { extractors, data, extractionStatus: 'completed' },
      })
      logAudit(report.id, 'Re-ran the Complementary User Entity Controls extractor — succeeded')
      toast('success', 'Section extracted', '5 CUECs were extracted and validated against the schema.')
      setRetrying(false)
    }, 1800)
  }

  function runExport() {
    if (!report) return
    setExporting(true)
    setTimeout(() => {
      setExporting(false)
      if (exportFail) {
        toast(
          'error',
          'Google Sheets export failed',
          'The Sheets API returned 401 Unauthorized — the workspace connection has expired. Reconnect Google Sheets in Settings and try again.',
        )
        return
      }
      const url = `https://docs.google.com/spreadsheets/d/${report.id.toLowerCase()}-soc1-export`
      dispatch({ type: 'patch_report', id: report.id, patch: { exportedSheetUrl: url } })
      logAudit(report.id, 'Exported review results to Google Sheets')
      toast('success', 'Exported to Google Sheets', `${report.name} · 6 tabs written`)
      setExportOpen(false)
    }, 1500)
  }

  /* ----------------------------- approval gating --------------------------- */

  const requirements = useMemo(() => {
    if (!report?.data) return []
    const d = report.data
    const verifiedCount = phases.filter((p) => report.verifications[p.id]).length
    const openThreads = report.comments.filter((t) => !t.resolved).length
    const unmappedApplicable = d.cuecs.filter(
      (c) => c.applicability.value === 'Applicable' && !c.mappedControl.value,
    ).length
    const vendorsPending = d.vendors.filter((v) => !v.reviewerDetermination.value).length
    const qualifying = d.exceptions.filter(
      (e) => e.qualifiedOpinionImpact.value === 'Contributes to qualification',
    )
    const qualifyingIncomplete = qualifying.filter(
      (e) => !e.reviewerComments.value || e.escalation.value === 'Not escalated',
    ).length

    const list = [
      {
        ok: verifiedCount === phases.length,
        label: `All ${phases.length} sections marked as reviewed`,
        detail: `${verifiedCount} of ${phases.length} complete`,
      },
      {
        ok: !!d.basic.conclusionOfReview.value,
        label: 'Conclusion of review recorded',
        detail: d.basic.conclusionOfReview.value ? 'Recorded' : 'Not yet written',
      },
      {
        ok: unconfirmed.length === 0,
        label: 'Rolled-forward and suggested values confirmed',
        detail: unconfirmed.length === 0 ? 'All confirmed' : `${unconfirmed.length} awaiting confirmation`,
      },
      {
        ok: unmappedApplicable === 0,
        label: 'Applicable CUECs mapped to an internal control',
        detail: unmappedApplicable === 0 ? 'All mapped' : `${unmappedApplicable} unmapped`,
      },
      {
        ok: vendorsPending === 0,
        label: 'Reviewer determination recorded for every vendor',
        detail: vendorsPending === 0 ? 'All recorded' : `${vendorsPending} outstanding`,
      },
      {
        ok: openThreads === 0,
        label: 'All comment threads resolved',
        detail: openThreads === 0 ? 'None open' : `${openThreads} open`,
      },
    ]
    if (qualifying.length > 0) {
      list.push({
        ok: qualifyingIncomplete === 0,
        label: 'Qualifying exceptions documented and escalated',
        detail:
          qualifyingIncomplete === 0
            ? 'Complete'
            : `${qualifyingIncomplete} of ${qualifying.length} incomplete`,
      })
    }
    return list
  }, [report, unconfirmed.length])

  const blockers = requirements.filter((r) => !r.ok)
  const readyToApprove = blockers.length === 0

  /* --------------------------------- guards -------------------------------- */

  if (!report) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <Card>
          <EmptyState
            title="Report not found"
            body="It may have been cancelled, or the demo data was reset."
            action={<Button variant="primary" onClick={() => navigate('/history')}>Back to history</Button>}
          />
        </Card>
      </div>
    )
  }

  if (!report.data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Card className="p-5">
          <Callout
            tone="error"
            title="This report has no extracted data"
            action={
              <Button size="sm" variant="secondary" onClick={() => navigate('/extract')}>
                Re-upload
              </Button>
            }
          >
            {report.extractors[0]?.error ??
              'Extraction did not produce any sections for this report. Upload a text-layer PDF and try again.'}
          </Callout>
        </Card>
      </div>
    )
  }

  const ctx: SectionCtx = {
    report,
    readOnly,
    activePath,
    onSelect,
    onEdit,
    onConfirm,
    onComment,
    commentCountFor,
  }

  const verification = report.verifications[phase]
  const verifier = userById(verification?.userId)
  const failedExtractor = report.extractors.find((e) => e.status === 'failed')
  const currentPhase = phases.find((p) => p.id === phase)!
  const qualifyingExceptions = report.data.exceptions.filter(
    (e) => e.qualifiedOpinionImpact.value === 'Contributes to qualification',
  )
  const rolledForwardCount = allFields.filter((f) => f.field.origin === 'rolled_forward').length

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* ================================ header =============================== */}
      <div className="shrink-0 border-b border-ink-200 bg-white px-5 py-3">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0">
            <button
              onClick={() => navigate('/history')}
              className="mb-0.5 text-[11.5px] text-ink-500 hover:text-brand-700 hover:underline"
            >
              ← Extraction History
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[16px] font-semibold text-ink-900">{report.name}</h1>
              <span className="font-mono text-[11.5px] text-ink-400">{report.id}</span>
              <ExtractionStatusBadge status={report.extractionStatus} />
              <ReviewStatusBadge status={report.reviewStatus} />
              {report.qualified && <Badge tone="red">Qualified opinion</Badge>}
              {approved && <Badge tone="green">Read-only</Badge>}
            </div>
            <p className="mt-1 text-[12px] text-ink-500">
              {report.serviceOrganization} · {report.application} · Control {report.controlId} · {report.periodLabel} ·{' '}
              {report.auditorFirm}
            </p>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPeopleOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-ink-200 px-2 py-1 hover:bg-ink-50"
              title="Reviewer and watchers"
            >
              <Avatar user={userById(report.assignedReviewerId)} size={20} />
              {report.watcherIds.slice(0, 3).map((id) => (
                <Avatar key={id} user={userById(id)} size={20} />
              ))}
              <span className="text-[12px] text-ink-600">
                {report.watcherIds.length > 0 ? `+${report.watcherIds.length} watching` : 'Add watchers'}
              </span>
            </button>

            <Button variant="secondary" size="sm" onClick={() => setShowPdf((v) => !v)}>
              <PanelIcon className="h-3.5 w-3.5" />
              {showPdf ? 'Hide PDF' : 'Show PDF'}
            </Button>

            <Button variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
              <SheetIcon className="h-3.5 w-3.5" /> Export
            </Button>

            {report.reviewStatus !== 'approved' && report.reviewStatus !== 'pending_approval' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  if (!canVerify) return denied('submit this report')
                  dispatch({ type: 'patch_report', id: report.id, patch: { reviewStatus: 'pending_approval' } })
                  logAudit(report.id, 'Submitted the report for approval')
                  toast('slack', 'Submitted for approval', `${report.name} was sent to the approver queue.`)
                }}
              >
                Submit for review
              </Button>
            )}

            {report.reviewStatus === 'pending_approval' && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!canApprove) return denied('request changes')
                    setChangesOpen(true)
                  }}
                >
                  Request changes
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    if (!canApprove) return denied('approve reports')
                    setApproveOpen(true)
                  }}
                >
                  Approve
                </Button>
              </>
            )}

            <div className="relative">
              <Button variant="ghost" size="sm" onClick={() => setDemoOpen((v) => !v)} title="Simulate error states">
                <AlertIcon className="h-3.5 w-3.5" />
              </Button>
              {demoOpen && (
                <div className="animate-fade-rise absolute right-0 z-40 mt-1 w-64 rounded-md border border-ink-200 bg-white p-3 shadow-lg">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Simulate error states
                  </p>
                  <label className="flex items-start gap-2 py-1 text-[12px] text-ink-700">
                    <input type="checkbox" checked={saveFail} onChange={(e) => setSaveFail(e.target.checked)} className="mt-0.5" />
                    <span>Save failure on every field edit</span>
                  </label>
                  <label className="flex items-start gap-2 py-1 text-[12px] text-ink-700">
                    <input type="checkbox" checked={exportFail} onChange={(e) => setExportFail(e.target.checked)} className="mt-0.5" />
                    <span>Google Sheets export failure</span>
                  </label>
                  <p className="mt-2 border-t border-ink-100 pt-2 text-[11.5px] leading-relaxed text-ink-500">
                    PDF load failure is in the viewer toolbar. Switch to a Read-only user to see unauthorized actions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================ qualified banner ========================= */}
      {report.qualified && (
        <div className="shrink-0 border-b border-red-200 bg-red-50 px-5 py-2.5">
          <div className="flex items-start gap-2.5">
            <AlertIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-red-900">
                Qualified auditor opinion — elevated review required
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-red-800">
                The auditor qualified their opinion on{' '}
                {qualifyingExceptions.length > 0 ? (
                  <>
                    {qualifyingExceptions.map((e) => e.number.value).join(', ')} affecting{' '}
                    {report.data.objectives
                      .filter((o) => o.activities.some((a) => a.exceptionRefs.some((r) => qualifyingExceptions.some((q) => q.number.value === r))))
                      .map((o) => `Control Objective ${o.number.value}`)
                      .join(', ')}
                    .
                  </>
                ) : (
                  'this report.'
                )}{' '}
                Document a compensating-control assessment on each qualifying exception and escalate before approval.
                Approval is blocked until those steps are complete.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              className="shrink-0"
              onClick={() => setPhase('exceptions')}
            >
              Go to exceptions
            </Button>
          </div>
        </div>
      )}

      {/* ================================ body ================================= */}
      <div className="flex min-h-0 flex-1">
        {/* ------------------------------ left pane ---------------------------- */}
        <div className={cx('flex min-w-0 flex-col', showPdf ? 'w-1/2' : 'w-full')}>
          {/* phase navigation */}
          <div className="shrink-0 border-b border-ink-200 bg-white px-3 pt-2">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {phases.map((p, i) => {
                const done = !!report.verifications[p.id]
                const active = p.id === phase
                return (
                  <button
                    key={p.id}
                    onClick={() => setPhase(p.id)}
                    className={cx(
                      'flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors',
                      active
                        ? 'border-brand-300 bg-brand-50 text-brand-700'
                        : 'border-transparent text-ink-600 hover:bg-ink-100',
                    )}
                  >
                    <span
                      className={cx(
                        'flex h-4 w-4 items-center justify-center rounded-full text-[10px]',
                        done ? 'bg-emerald-600 text-white' : 'border border-ink-300 text-ink-400',
                      )}
                    >
                      {done ? <CheckIcon className="h-2.5 w-2.5" /> : i + 1}
                    </span>
                    {p.shortLabel}
                  </button>
                )
              })}
            </div>
          </div>

          {/* phase content */}
          <div className="min-h-0 flex-1 overflow-y-auto bg-ink-50 px-3 py-3">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-[14px] font-semibold text-ink-900">{currentPhase.label}</h2>
                <p className="mt-0.5 text-[12px] text-ink-500">{currentPhase.description}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {verification ? (
                  <span className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[12px] text-emerald-800">
                    <CheckIcon className="h-3.5 w-3.5" />
                    Verified by {verifier?.name ?? 'a reviewer'} · {formatDateTime(verification.at)}
                  </span>
                ) : (
                  <span className="text-[12px] text-ink-500">Not yet reviewed</span>
                )}
                <Button
                  size="sm"
                  variant={verification ? 'secondary' : 'primary'}
                  onClick={toggleVerify}
                  disabled={approved}
                >
                  {verification ? 'Reopen section' : 'Mark section as reviewed'}
                </Button>
              </div>
            </div>

            {unconfirmedInPhase > 0 && (
              <div className="mb-3">
                <Callout tone="warning" title={`${unconfirmedInPhase} value${unconfirmedInPhase > 1 ? 's' : ''} in this section need confirmation`}>
                  Rolled-forward and suggested values are shown as prior-period judgements, not current conclusions.
                  Confirm or edit each one before signing off.
                </Callout>
              </div>
            )}

            {approved && (
              <div className="mb-3">
                <Callout tone="success" title="This report is approved and read-only">
                  Approved by {userById(report.audit.at(-1)?.userId)?.name ?? 'an approver'}. Reopen it from AuditBoard
                  if a correction is needed.
                </Callout>
              </div>
            )}

            {/* rolled-forward context on the sections that carry prior-year values */}
            {report.priorReportName && ['cuecs', 'subservice', 'vendors'].includes(phase) && rolledForwardCount > 0 && (
              <div className="mb-3">
                <Callout tone="info" title="Prior-year values carried forward">
                  <span className="inline-flex items-center gap-1">
                    <RollIcon className="h-3.5 w-3.5" />
                    Values marked <strong>Rolled forward</strong> came from {report.priorReportName}. They are proposals
                    for this period, not conclusions — each one has to be reconfirmed or replaced.
                  </span>
                </Callout>
              </div>
            )}

            {/* failed extractor for this phase */}
            {failedExtractor && phase === 'cuecs' && report.data.cuecs.length === 0 && (
              <div className="mb-3">
                <FailedSectionNotice
                  label={failedExtractor.label}
                  error={failedExtractor.error ?? 'The extractor failed.'}
                  retrying={retrying}
                  onRetry={() => retryFailedExtractor(failedExtractor.id)}
                />
              </div>
            )}

            {phase === 'basic' && <BasicSection ctx={ctx} />}
            {phase === 'objectives' && <ObjectivesSection ctx={ctx} />}
            {phase === 'exceptions' && <ExceptionsSection ctx={ctx} />}
            {phase === 'cuecs' && report.data.cuecs.length > 0 && <CuecsSection ctx={ctx} />}
            {phase === 'subservice' && <SubserviceSection ctx={ctx} />}
            {phase === 'vendors' && (
              <VendorsSection
                ctx={ctx}
                footer={
                  <Card className="p-4">
                    <h3 className="text-[13px] font-semibold text-ink-900">Final review</h3>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      Everything below must be complete before the report can be approved.
                    </p>
                    <ul className="mt-3 flex flex-col gap-1.5">
                      {requirements.map((r) => (
                        <li key={r.label} className="flex items-start gap-2">
                          <span
                            className={cx(
                              'mt-[1px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full',
                              r.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                            )}
                          >
                            {r.ok ? <CheckIcon className="h-2.5 w-2.5" /> : <span className="text-[10px]">!</span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={cx('text-[12.5px]', r.ok ? 'text-ink-700' : 'font-medium text-ink-900')}>
                              {r.label}
                            </span>
                            <span className="ml-1.5 text-[11.5px] text-ink-500">— {r.detail}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-100 pt-3">
                      <Button
                        variant="primary"
                        disabled={!readyToApprove || approved}
                        onClick={() => {
                          if (!canApprove) return denied('approve reports')
                          setApproveOpen(true)
                        }}
                      >
                        Approve report
                      </Button>
                      {!canApprove && !approved && (
                        <span className="text-[12px] text-ink-500">
                          Only an approver can sign off. You are signed in as {role}.
                        </span>
                      )}
                      {canApprove && !readyToApprove && (
                        <span className="text-[12px] text-amber-700">
                          {blockers.length} requirement{blockers.length > 1 ? 's' : ''} outstanding.
                        </span>
                      )}
                    </div>
                  </Card>
                }
              />
            )}

            <CommentsPanel
              report={report}
              phase={phase}
              currentUserId={state.currentUserId}
              readOnly={approved}
              onReply={(threadId, body) =>
                dispatch({
                  type: 'add_entry',
                  id: report.id,
                  threadId,
                  entry: { id: uid('c'), authorId: state.currentUserId, body, createdAt: new Date().toISOString() },
                })
              }
              onToggleResolved={(threadId, resolved) =>
                dispatch({ type: 'resolve_thread', id: report.id, threadId, resolved, userId: state.currentUserId })
              }
              onJumpToAnchor={(path) => {
                setPhase(phaseOfPath(path))
                setActivePath(path)
                const field = getPath(report.data, path)
                if (isField(field) && field.source) {
                  setFocus({ annotation: field.source, label: path })
                  setMissingSource(null)
                  setShowPdf(true)
                }
              }}
            />

            <div className="mt-3">
              <Button variant="secondary" size="sm" onClick={() => onComment('', `${currentPhase.label} (section)`)}>
                Add a section comment
              </Button>
            </div>

            {/* audit trail */}
            <Card className="mt-3 p-3.5">
              <h3 className="text-[13px] font-semibold text-ink-900">Activity</h3>
              <ul className="mt-2 flex flex-col gap-1.5">
                {report.audit.slice().reverse().map((a) => (
                  <li key={a.id} className="flex items-start gap-2 text-[12px]">
                    <Avatar user={userById(a.userId)} size={18} />
                    <span className="min-w-0 flex-1 text-ink-700">
                      <span className="font-medium text-ink-800">{userById(a.userId)?.name ?? 'Someone'}</span>{' '}
                      {a.summary}
                    </span>
                    <span className="shrink-0 text-[11px] text-ink-400">{formatDateTime(a.at)}</span>
                  </li>
                ))}
                {report.audit.length === 0 && <li className="text-[12px] text-ink-400">No activity recorded yet.</li>}
              </ul>
            </Card>

            {report.exportedSheetUrl && (
              <div className="mt-3">
                <Callout tone="success" title="Exported to Google Sheets">
                  <span className="break-all font-mono text-[11.5px]">{report.exportedSheetUrl}</span>
                </Callout>
              </div>
            )}
          </div>
        </div>

        {/* ------------------------------ right pane --------------------------- */}
        {showPdf && (
          <div className="w-1/2 min-w-0">
            <PdfViewer
              documentId={report.documentId}
              fileName={report.fileName ?? `${report.id.toLowerCase()}-soc1-report.pdf`}
              focus={focus}
              missingSource={missingSource}
              onHide={() => setShowPdf(false)}
            />
          </div>
        )}
      </div>

      {/* ================================ modals =============================== */}

      <Modal
        open={!!commentTarget}
        onClose={() => setCommentTarget(null)}
        title="Add a comment"
        description={commentTarget?.label ? `Anchored to: ${commentTarget.label}` : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCommentTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!commentDraft.trim()} onClick={submitComment}>
              Add comment
            </Button>
          </>
        }
      >
        <TextArea
          autoFocus
          rows={4}
          value={commentDraft}
          onChange={(e) => setCommentDraft(e.target.value)}
          placeholder="Describe what needs checking, or record your reasoning for the next reviewer."
        />
      </Modal>

      <Modal
        open={peopleOpen}
        onClose={() => setPeopleOpen(false)}
        title="Reviewers and watchers"
        description="Watchers receive Slack updates when this report changes status."
        footer={
          <Button variant="primary" onClick={() => setPeopleOpen(false)}>
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="reviewer">Assigned reviewer</Label>
            <Select
              id="reviewer"
              value={report.assignedReviewerId ?? ''}
              disabled={approved}
              onChange={(e) => {
                dispatch({
                  type: 'patch_report',
                  id: report.id,
                  patch: { assignedReviewerId: e.target.value || null },
                })
                logAudit(report.id, `Assigned ${userById(e.target.value)?.name ?? 'nobody'} as reviewer`)
              }}
            >
              <option value="">Unassigned</option>
              {users
                .filter((u) => u.role === 'Reviewer' || u.role === 'Approver')
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {u.role}
                  </option>
                ))}
            </Select>
          </div>

          <div>
            <Label>Watchers</Label>
            <ul className="flex flex-col gap-1">
              {users.map((u) => {
                const watching = report.watcherIds.includes(u.id)
                return (
                  <li key={u.id} className="flex items-center gap-2.5 rounded-md px-1.5 py-1 hover:bg-ink-50">
                    <Avatar user={u} size={22} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] text-ink-800">{u.name}</span>
                      <span className="block text-[11px] text-ink-500">
                        {u.role}
                        {u.id === report.createdById && ' · created this report'}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant={watching ? 'subtle' : 'secondary'}
                      disabled={approved}
                      onClick={() =>
                        dispatch({
                          type: 'patch_report',
                          id: report.id,
                          patch: {
                            watcherIds: watching
                              ? report.watcherIds.filter((w) => w !== u.id)
                              : [...report.watcherIds, u.id],
                          },
                        })
                      }
                    >
                      {watching ? (
                        <>
                          <CloseIcon className="h-3 w-3" /> Remove
                        </>
                      ) : (
                        'Add watcher'
                      )}
                    </Button>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </Modal>

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export to Google Sheets"
        description="Writes one tab per review phase, including source page citations and reviewer determinations."
        footer={
          <>
            <Button variant="ghost" onClick={() => setExportOpen(false)} disabled={exporting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={runExport} disabled={exporting}>
              {exporting ? (
                <>
                  <Spinner className="h-3.5 w-3.5" /> Exporting…
                </>
              ) : (
                'Export'
              )}
            </Button>
          </>
        }
      >
        <ul className="flex flex-col gap-1 text-[12.5px] text-ink-700">
          {phases.map((p) => (
            <li key={p.id} className="flex items-center gap-2">
              <SheetIcon className="h-3.5 w-3.5 text-ink-400" /> {p.label}
            </li>
          ))}
        </ul>
        {!readyToApprove && (
          <p className="mt-3 text-[12px] text-amber-700">
            This report is not fully reviewed. The export will be labelled “Draft — {blockers.length} requirement
            {blockers.length > 1 ? 's' : ''} outstanding”.
          </p>
        )}
      </Modal>

      <Modal
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request changes"
        description="The reviewer will be notified in Slack with your comment."
        footer={
          <>
            <Button variant="ghost" onClick={() => setChangesOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!changesDraft.trim()}
              onClick={() => {
                dispatch({
                  type: 'add_thread',
                  id: report.id,
                  thread: {
                    id: uid('th'),
                    phase,
                    anchorLabel: 'Changes requested',
                    resolved: false,
                    entries: [
                      {
                        id: uid('c'),
                        authorId: state.currentUserId,
                        body: changesDraft.trim(),
                        createdAt: new Date().toISOString(),
                      },
                    ],
                  },
                })
                dispatch({ type: 'patch_report', id: report.id, patch: { reviewStatus: 'changes_requested' } })
                logAudit(report.id, 'Requested changes')
                toast('slack', 'Changes requested', `${userById(report.assignedReviewerId)?.name ?? 'The reviewer'} was notified.`)
                setChangesDraft('')
                setChangesOpen(false)
              }}
            >
              Request changes
            </Button>
          </>
        }
      >
        <TextArea
          autoFocus
          rows={4}
          value={changesDraft}
          onChange={(e) => setChangesDraft(e.target.value)}
          placeholder="What needs to change before this can be approved?"
        />
      </Modal>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve this report"
        description="Approval is recorded against your name and locks the report to read-only."
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!readyToApprove}
              onClick={() => {
                dispatch({ type: 'patch_report', id: report.id, patch: { reviewStatus: 'approved' } })
                logAudit(report.id, 'Approved the report')
                toast('slack', 'Report approved', `${report.name} was approved by ${currentUser?.name}.`)
                setApproveOpen(false)
              }}
            >
              Approve report
            </Button>
          </>
        }
      >
        {readyToApprove ? (
          <Callout tone="success" title="All requirements are met">
            {report.qualified
              ? 'The qualified opinion has been assessed and escalated. Approving records your sign-off on that assessment.'
              : 'Every section has been reviewed and all outstanding items are cleared.'}
          </Callout>
        ) : (
          <Callout tone="warning" title="Approval is blocked">
            <ul className="mt-1 list-disc pl-4">
              {blockers.map((b) => (
                <li key={b.label}>
                  {b.label} — {b.detail}
                </li>
              ))}
            </ul>
          </Callout>
        )}
      </Modal>
    </div>
  )
}
